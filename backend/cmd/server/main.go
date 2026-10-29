package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/0xAlpha01/OweMate/backend/internal/config"
	"github.com/0xAlpha01/OweMate/backend/internal/database"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	client, err := database.Connect(ctx, cfg.MongoURI)
	cancel()
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		if err := client.Disconnect(context.Background()); err != nil {
			log.Printf("disconnect MongoDB: %v", err)
		}
	}()

	router := gin.Default()
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}