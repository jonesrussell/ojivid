package webview

import (
	"fmt"
	"kiosk-video-recorder/config"
	"os"
	"path/filepath"
	"strings"

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
		// Get current working directory
		cwd, err := os.Getwd()
		if err != nil {
			fmt.Printf("Error getting working directory: %v\n", err)
			a.view.Navigate(fmt.Sprintf("http://localhost:%s", config.Port))
			a.view.Run()
			return
		}

		// Try multiple possible locations for the dist directory
		possiblePaths := []string{
			filepath.Join(cwd, "webview", "dist", "splash.html"),     // Relative to current directory
			filepath.Join(cwd, "dist", "splash.html"),                // In dist directory
			filepath.Join(cwd, "static", "dist", "splash.html"),      // In static/dist
		}

		// If we're running from a built executable, also check its directory
		if execPath, err := os.Executable(); err == nil {
			execDir := filepath.Dir(execPath)
			possiblePaths = append(possiblePaths, filepath.Join(execDir, "webview", "dist", "splash.html"))
		}

		// Try each possible path
		var foundPath string
		for _, path := range possiblePaths {
			if _, err := os.Stat(path); err == nil {
				foundPath = path
				break
			}
		}

		if foundPath != "" {
			// Convert to absolute file URL
			absPath, err := filepath.Abs(foundPath)
			if err != nil {
				fmt.Printf("Error getting absolute path: %v\n", err)
				a.view.Navigate(fmt.Sprintf("http://localhost:%s", config.Port))
				a.view.Run()
				return
			}

			// Convert Windows path to URL format
			fileURL := fmt.Sprintf("file:///%s", strings.ReplaceAll(filepath.ToSlash(absPath), "\\", "/"))
			fmt.Printf("Loading from: %s\n", fileURL)
			a.view.Navigate(fileURL)
		} else {
			fmt.Printf("Dist file not found in any of the expected locations, falling back to server\n")
			a.view.Navigate(fmt.Sprintf("http://localhost:%s", config.Port))
		}
	}

	// Run the webview
	a.view.Run()
}
