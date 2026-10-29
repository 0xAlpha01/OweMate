package routes

import (
	"fmt"

	"github.com/0xAlpha01/OweMate/backend/internal/handlers"
	"github.com/0xAlpha01/OweMate/backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func NewRouter(pinger handlers.Pinger) *gin.Engine {
	router := gin.New()
	router.Use(gin.LoggerWithFormatter(func(params gin.LogFormatterParams) string {
		return fmt.Sprintf("%s %s %d %s\n", params.Method, params.Path, params.StatusCode, params.Latency)
	}))
	router.Use(gin.Recovery())

	router.GET("/health", handlers.Health)
	router.GET("/ready", handlers.Ready(pinger))
	return router
}

func RegisterDebtRoutes(router *gin.Engine, debtHandler *handlers.DebtHandler, developmentOwnerID string) {
	debts := router.Group("/api/v1/debts", middleware.DevelopmentOwner(developmentOwnerID))
	debts.POST("", debtHandler.Create)
	debts.GET("", debtHandler.List)
	debts.GET("/", debtHandler.List)
	debts.GET("/:id", debtHandler.Get)
	debts.PATCH("/:id", debtHandler.Update)
	debts.DELETE("/:id", debtHandler.Delete)
}
