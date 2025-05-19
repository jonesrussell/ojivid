package main

import (
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"os"
	"path/filepath"

	"kiosk-video-recorder/config"
	"kiosk-video-recorder/handlers"
	"kiosk-video-recorder/webview"

	"github.com/gorilla/mux"
)

func startServer() {
	// Create main router
	r := mux.NewRouter()

	// Create API router
	apiRouter := mux.NewRouter()
	apiRouter.HandleFunc("/api/upload", handlers.UploadVideo).Methods("POST")
	apiRouter.HandleFunc("/api/videos", handlers.GetVideos).Methods("GET")

	// In development mode, proxy requests to Vite dev server
	if os.Getenv("DEV") == "1" {
		log.Printf("Development mode enabled - proxying to Vite dev server")

		// Create a proxy handler for Vite
		viteProxy := &httputil.ReverseProxy{
			Director: func(req *http.Request) {
				req.URL.Scheme = "http"
				req.URL.Host = "localhost:3000"
				log.Printf("Proxying to Vite: %s", req.URL.String())
			},
			ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
				log.Printf("Proxy error for %s: %v", r.URL.Path, err)
				http.Error(w, fmt.Sprintf("Proxy error: %v", err), http.StatusBadGateway)
			},
		}

		// Handle API routes
		r.PathPrefix("/api/").Handler(apiRouter)

		// Handle all other routes with Vite proxy
		r.PathPrefix("/").Handler(viteProxy)
	} else {
		// Production mode - serve static files from dist directory
		distDir := "webview/dist"
		fs := http.FileServer(http.Dir(distDir))

		// Add MIME type handlers
		r.PathPrefix("/assets/").Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Log the request path
			log.Printf("Serving asset: %s", r.URL.Path)

			// Set appropriate MIME types based on file extension
			switch filepath.Ext(r.URL.Path) {
			case ".css":
				w.Header().Set("Content-Type", "text/css; charset=utf-8")
			case ".js":
				w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
			case ".html":
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
			case ".svg":
				w.Header().Set("Content-Type", "image/svg+xml")
			}
			fs.ServeHTTP(w, r)
		}))

		// Serve splash.html for root route
		r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			// Try multiple possible locations for splash.html
			possiblePaths := []string{
				filepath.Join(distDir, "src", "splash.html"), // Production build
				filepath.Join(distDir, "splash.html"),        // Alternative location
			}

			// Log the current working directory and paths being checked
			cwd, _ := os.Getwd()
			log.Printf("Current working directory: %s", cwd)
			for _, path := range possiblePaths {
				log.Printf("Checking path: %s", path)
				if _, err := os.Stat(path); err == nil {
					log.Printf("Found splash.html at: %s", path)
					w.Header().Set("Content-Type", "text/html")
					http.ServeFile(w, r, path)
					return
				} else {
					log.Printf("File not found at %s: %v", path, err)
				}
			}

			// If splash.html is not found, serve index.html
			indexPath := filepath.Join(distDir, "index.html")
			log.Printf("Splash.html not found, trying index.html at: %s", indexPath)
			if _, err := os.Stat(indexPath); err == nil {
				w.Header().Set("Content-Type", "text/html")
				http.ServeFile(w, r, indexPath)
				return
			}

			// If neither file is found, return 404
			log.Printf("No index file found, returning 404")
			http.Error(w, "Not Found", http.StatusNotFound)
		})
	}

	http.Handle("/", r)

	log.Printf("Server starting on 0.0.0.0:%s...", config.Port)

	// Create server with timeouts
	srv := &http.Server{
		Addr:         "0.0.0.0:" + config.Port,
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
