package middleware

import "github.com/gin-gonic/gin"

const ownerContextKey = "owemate.owner_id"

func DevelopmentOwner(ownerID string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set(ownerContextKey, ownerID)
		c.Next()
	}
}

func OwnerID(c *gin.Context) (string, bool) {
	ownerID, ok := c.Get(ownerContextKey)
	if !ok {
		return "", false
	}
	value, ok := ownerID.(string)
	return value, ok && value != ""
}