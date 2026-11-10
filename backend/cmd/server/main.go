package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/0xAlpha01/OweMate/backend/internal/config"
	"github.com/0xAlpha01/OweMate/backend/internal/database"
	"github.com/0xAlpha01/OweMate/backend/internal/handlers"
	"github.com/0xAlpha01/OweMate/backend/internal/repositories"
	"github.com/0xAlpha01/OweMate/backend/internal/routes"
	"github.com/0xAlpha01/OweMate/backend/internal/services"
)

func main() {
	if err := run(); err != nil {
		log.Printf("server stopped: %v", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	client, err := database.NewClient(cfg.MongoURI, cfg.MongoDatabase)
	if err != nil {
		return err
	}

	startupCtx, cancelStartup := context.WithTimeout(context.Background(), 10*time.Second)
	debtRepository := repositories.NewMongoDebtRepository(client.Database())
	if err := client.Ping(startupCtx); err != nil {
		log.Printf("MongoDB startup check failed; API will start with readiness unavailable")
	} else {
		if err := debtRepository.EnsureIndexes(startupCtx); err != nil {
			log.Printf("MongoDB index setup failed; database-backed requests may be unavailable")
		}
	}
	cancelStartup()

	router := routes.NewRouter(client)
	routes.RegisterDebtRoutes(router, handlers.NewDebtHandler(services.NewDebtService(debtRepository)), cfg.DevelopmentOwnerID)

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	stopSignals, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	serverErrors := make(chan error, 1)
	go func() {
		serverErrors <- server.ListenAndServe()
	}()

	var runErr error
	select {
	case <-stopSignals.Done():
		log.Printf("shutdown signal received")
	case err := <-serverErrors:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			runErr = errors.New("HTTP server failed")
		}
	}

	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	if err := server.Shutdown(shutdownCtx); err != nil {
		_ = server.Close()
		if runErr == nil {
			runErr = errors.New("HTTP server shutdown failed")
		}
	}
	cancelShutdown()

	disconnectCtx, cancelDisconnect := context.WithTimeout(context.Background(), 10*time.Second)
	if err := client.Disconnect(disconnectCtx); err != nil && runErr == nil {
		runErr = err
	}
	cancelDisconnect()

	return runErr
}
