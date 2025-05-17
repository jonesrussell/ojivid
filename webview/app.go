package webview

import (
	"fmt"
	"kiosk-video-recorder/config"
	"os"
	"path/filepath"

	webview "github.com/webview/webview_go"
)

const (
	// Default window dimensions
	DefaultWindowWidth  = 1280
	DefaultWindowHeight = 720
)

// App represents the webview application
type App struct {
	view webview.WebView
}

// New creates a new webview application
func New() *App {
	return &App{
		view: webview.New(true),
	}
}

// Start initializes and runs the webview application
func (a *App) Start() {
	defer a.view.Destroy()

	// Set window properties
	a.view.SetTitle("Ojiosk")
	a.view.SetSize(DefaultWindowWidth, DefaultWindowHeight, webview.HintNone)

	// Check if we're in development mode
	if os.Getenv("DEV") == "1" {
		// In development, use the Vite dev server
		a.view.Navigate("http://localhost:3000")
	} else {
		// Get the absolute path to the dist directory
		execPath, err := os.Executable()
		if err != nil {
			fmt.Printf("Error getting executable path: %v\n", err)
			a.view.Navigate(fmt.Sprintf("http://localhost:%s", config.Port))
			a.view.Run()
			return
		}

		// Get the directory containing the executable
		execDir := filepath.Dir(execPath)
		
		// Construct the absolute path to index.html
		distPath := filepath.Join(execDir, "webview", "dist", "index.html")
		
		// Convert to file URL
		fileURL := fmt.Sprintf("file://%s", filepath.ToSlash(distPath))
		
		if _, err := os.Stat(distPath); err == nil {
			fmt.Printf("Loading from: %s\n", fileURL)
			a.view.Navigate(fileURL)
		} else {
			fmt.Printf("Dist file not found at %s, falling back to server\n", distPath)
			a.view.Navigate(fmt.Sprintf("http://localhost:%s", config.Port))
		}
	}

	// Run the webview
	a.view.Run()
}
