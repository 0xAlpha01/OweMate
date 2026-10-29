package config

import (
	"errors"
	"os"
	"strings"
)

type Config struct {
	MongoURI          string
	MongoDatabase     string
	DevelopmentOwnerID string
	Port              string
}

func Load() (Config, error) {
	mongoURI := os.Getenv("MONGODB_URI")
	if strings.TrimSpace(mongoURI) == "" {
		return Config{}, errors.New("MONGODB_URI is required")
	}
	ownerID := strings.TrimSpace(os.Getenv("DEVELOPMENT_OWNER_ID"))
	if ownerID == "" {
		return Config{}, errors.New("DEVELOPMENT_OWNER_ID is required until authentication is implemented")
	}

	port := strings.TrimSpace(os.Getenv("PORT"))	
	if port == "" {
		port = "8080"
	}

	database := strings.TrimSpace(os.Getenv("MONGODB_DATABASE"))
	if database == "" {
		database = "owemate"
	}

	return Config{MongoURI: mongoURI, MongoDatabase: database, DevelopmentOwnerID: ownerID, Port: port}, nil
}
