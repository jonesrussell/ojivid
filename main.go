package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"kiosk-video-recorder/config"
	"kiosk-video-recorder/handlers"
	"kiosk-video-recorder/webview"

	"github.com/gorilla/mux"
)

func startServer() {
	r := mux.NewRouter()

	// API routes
	r.HandleFunc("/api/upload", handlers.UploadVideo).Methods("POST")
	r.HandleFunc("/api/videos", handlers.GetVideos).Methods("GET")

	// Serve splash.html for root route
	r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Try multiple possible locations for splash.html
		possiblePaths := []string{
			filepath.Join("webview", "dist", "src", "splash.html"), // Vite build output
			filepath.Join("webview", "dist", "splash.html"),        // Alternative location
			filepath.Join("webview", "src", "splash.html"),         // Source location
		}

		// Try each possible path
		for _, path := range possiblePaths {
			if _, err := os.Stat(path); err == nil {
				http.ServeFile(w, r, path)
				return
			}
		}

		// If splash.html is not found, serve index.html
		http.ServeFile(w, r, filepath.Join("webview", "dist", "index.html"))
	})

	// Serve other static files from dist directory
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("webview/dist")))

	http.Handle("/", r)

	log.Printf("Server starting on :%s...", config.Port)

	// Create server with timeouts
	srv := &http.Server{
		Addr:         ":" + config.Port,
		Handler:      r,
		ReadTimeout:  config.ReadTimeout,
		WriteTimeout: config.WriteTimeout,
		IdleTimeout:  config.IdleTimeout,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()
}

func main() {
	// Setup environment
	if err := config.SetupEnvironment(); err != nil {
		log.Fatalf("Failed to setup environment: %v", err)
	}

	// Start the HTTP server
	startServer()

	// Create and start webview
	app := webview.New()
	app.Start()
}
