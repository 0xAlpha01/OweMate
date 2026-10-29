package routes

import (
	"fmt"

	"github.com/0xAlpha01/OweMate/backend/internal/handlers"
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
