package config

import "testing"

func TestLoadDefaults(t *testing.T) {
	t.Setenv("MONGODB_URI", "mongodb://localhost:27017")
	t.Setenv("PORT", "")
	t.Setenv("MONGODB_DATABASE", "")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.Port != "8080" {
		t.Errorf("Port = %q, want %q", cfg.Port, "8080")
	}
	if cfg.MongoDatabase != "owemate" {
		t.Errorf("MongoDatabase = %q, want %q", cfg.MongoDatabase, "owemate")
	}
}

func TestLoadConfiguredValues(t *testing.T) {
	t.Setenv("MONGODB_URI", "mongodb://db.example.test:27017")
	t.Setenv("PORT", "9090")
	t.Setenv("MONGODB_DATABASE", "owemate_test")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.Port != "9090" || cfg.MongoDatabase != "owemate_test" {
		t.Errorf("Load() = %+v, want configured port and database", cfg)
	}
}

func TestLoadRequiresMongoURI(t *testing.T) {
	t.Setenv("MONGODB_URI", " ")
	if _, err := Load(); err == nil {
		t.Fatal("Load() error = nil, want missing MONGODB_URI error")
	}
}
