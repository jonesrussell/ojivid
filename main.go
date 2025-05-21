package main

import (
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"os"
	"path/filepath"
	"time"

	"kiosk-video-recorder/config"
	"kiosk-video-recorder/handlers"
	"kiosk-video-recorder/webview"

	"github.com/gorilla/mux"
)

// setupLogger configures the logger with timestamp and file:line information
func setupLogger() {
	log.SetFlags(log.Ldate | log.Ltime | log.Lmicroseconds | log.Lshortfile)
	log.SetOutput(os.Stdout)
	log.Println("Logger initialized")
}

func startServer() {
	setupLogger()
	log.Printf("Starting server initialization...")
	log.Printf("Environment variables: APP_ENV=%q, APP_DEBUG=%q", os.Getenv("APP_ENV"), os.Getenv("APP_DEBUG"))

	// Create main router
	r := mux.NewRouter()
	log.Printf("Created main router")

	// Create API router
	apiRouter := mux.NewRouter()
	log.Printf("Created API router")

	// Register API routes
	apiRouter.HandleFunc("/api/upload", handlers.UploadVideo).Methods("POST")
	apiRouter.HandleFunc("/api/videos", handlers.GetVideos).Methods("GET")
	log.Printf("Registered API routes: /api/upload (POST), /api/videos (GET)")

	// In development mode, proxy requests to Vite dev server
	if os.Getenv("APP_ENV") == "development" {
		log.Printf("Development mode enabled - configuring Vite proxy")

		// Create a proxy handler for Vite
		viteProxy := &httputil.ReverseProxy{
			Director: func(req *http.Request) {
				req.URL.Scheme = "http"
				req.URL.Host = "localhost:3000"
				log.Printf("Proxying request to Vite: %s %s", req.Method, req.URL.String())
			},
			ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
				log.Printf("Proxy error for %s %s: %v", r.Method, r.URL.Path, err)
				http.Error(w, fmt.Sprintf("Proxy error: %v", err), http.StatusBadGateway)
			},
		}
		log.Printf("Vite proxy handler configured")

		// Handle API routes
		r.PathPrefix("/api/").Handler(apiRouter)
		log.Printf("Mounted API router at /api/")

		// Handle all other routes with Vite proxy
		r.PathPrefix("/").Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			log.Printf("Incoming request: %s %s", r.Method, r.URL.Path)
			viteProxy.ServeHTTP(w, r)
		}))
		log.Printf("Mounted Vite proxy handler for all other routes")
	} else {
		log.Printf("Production mode - configuring static file serving")
		// Production mode - serve static files from dist directory
		distDir := "webview/dist"
		fs := http.FileServer(http.Dir(distDir))
		log.Printf("Static file server configured for directory: %s", distDir)

		// Add MIME type handlers
		r.PathPrefix("/assets/").Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
		log.Printf("Mounted asset handler with MIME type support")

		// Serve splash.html for root route
		r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			log.Printf("Handling root request: %s", r.URL.Path)
			
			// Try multiple possible locations for splash.html
			possiblePaths := []string{
				filepath.Join(distDir, "splash.html"),        // Production build
				filepath.Join(distDir, "assets", "splash.html"), // Alternative location
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
				log.Printf("Found index.html at: %s", indexPath)
				w.Header().Set("Content-Type", "text/html")
				http.ServeFile(w, r, indexPath)
				return
			}

			// If neither file is found, return 404
			log.Printf("No index file found, returning 404")
			http.Error(w, "Not Found", http.StatusNotFound)
		})
		log.Printf("Mounted root handler with splash/index.html support")
	}

	http.Handle("/", r)
	log.Printf("Mounted main router at root path")

	log.Printf("Server starting on 0.0.0.0:%s...", config.Port)

	// Create server with timeouts
	srv := &http.Server{
		Addr:         "0.0.0.0:" + config.Port,
		Handler:      r,
		ReadTimeout:  config.ReadTimeout,
		WriteTimeout: config.WriteTimeout,
		IdleTimeout:  config.IdleTimeout,
	}
	log.Printf("Server configured with timeouts: Read=%v, Write=%v, Idle=%v",
		config.ReadTimeout, config.WriteTimeout, config.IdleTimeout)

	go func() {
		log.Printf("Starting server goroutine...")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
		log.Printf("Server goroutine ended")
	}()
	log.Printf("Server goroutine started")
}

func main() {
	log.Printf("Application starting...")
	startTime := time.Now()

	// Setup environment
	if err := config.SetupEnvironment(); err != nil {
		log.Fatalf("Failed to setup environment: %v", err)
	}
	log.Printf("Environment setup completed")

	// Start the HTTP server
	startServer()
	log.Printf("HTTP server started")

	// Create and start webview
	log.Printf("Initializing webview...")
	app := webview.New()
	log.Printf("Starting webview...")
	app.Start()
	log.Printf("Webview started")

	log.Printf("Application startup completed in %v", time.Since(startTime))
}
