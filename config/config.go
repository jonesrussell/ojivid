package config

import (
	"log"
	"os"
	"time"
)

const (
	UploadDir     = "uploads"
	Port          = "8080"
	WindowWidth   = 1024
	WindowHeight  = 768
	MaxUploadSize = 32 << 20 // 32MB

	// Server timeouts
	ReadTimeout  = 15 * time.Second
	WriteTimeout = 15 * time.Second
	IdleTimeout  = 60 * time.Second
)

// SetupEnvironment configures the application environment
func SetupEnvironment() error {
	// Create uploads directory if it doesn't exist
	if err := os.MkdirAll(UploadDir, os.ModePerm); err != nil {
		return err
	}

	// Set WebKit environment variables for WSL2
	envVars := map[string]string{
		"WEBKIT_DISABLE_COMPOSITING_MODE": "1",
		"WEBKIT_DISABLE_SANDBOX":          "1",
		"DISPLAY":                         ":0",
		"LIBVA_DRIVER_NAME":               "i965",
		"LIBVA_DRIVERS_PATH":              "/usr/lib/x86_64-linux-gnu/dri",
		"WEBKIT_INSPECTOR_SERVER":         "127.0.0.1:9222",
		"WEBKIT_DEBUG":                    "1",
	}

	for key, value := range envVars {
		os.Setenv(key, value)
		log.Printf("%s=%s", key, os.Getenv(key))
	}

	return nil
}
