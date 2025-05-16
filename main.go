package main

import (
	"log"
	"net/http"
	"time"

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

	// Serve static files
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("static")))

	http.Handle("/", r)

	log.Printf("Server starting on :%s...", config.Port)

	// Create server with timeouts
	srv := &http.Server{
		Addr:         ":" + config.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
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

	// Start the webview application
	app := webview.New()
	app.Start()
}
