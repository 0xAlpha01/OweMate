package config

import (
	"errors"
	"os"
)

type Config struct {
	MongoURI string
	Port     string
}

func Load() (Config, error) {
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		return Config{}, errors.New("MONGODB_URI is required")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	return Config{MongoURI: mongoURI, Port: port}, nil
}