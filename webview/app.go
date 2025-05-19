package webview

import (
	"fmt"
	"kiosk-video-recorder/config"
	"log"
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

// findDistFile searches for the dist file in various possible locations
func findDistFile() (string, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}

	// Try multiple possible locations for the dist directory
	possiblePaths := []string{
		filepath.Join(cwd, "webview", "dist", "splash.html"), // Relative to current directory
		filepath.Join(cwd, "dist", "splash.html"),            // In dist directory
		filepath.Join(cwd, "static", "dist", "splash.html"),  // In static/dist
	}

	// If we're running from a built executable, also check its directory
	execPath, execErr := os.Executable()
	if execErr == nil {
		execDir := filepath.Dir(execPath)
		possiblePaths = append(possiblePaths, filepath.Join(execDir, "webview", "dist", "splash.html"))
	}

	// Try each possible path
	for _, path := range possiblePaths {
		if _, statErr := os.Stat(path); statErr == nil {
			return path, nil
		}
	}

	return "", nil
}

// loadLocalFile attempts to load the application from a local file
func (a *App) loadLocalFile(foundPath string) error {
	// Convert to absolute file URL
	absPath, err := filepath.Abs(foundPath)
	if err != nil {
		return fmt.Errorf("error getting absolute path: %w", err)
	}

	// Convert Windows path to URL format
	fileURL := fmt.Sprintf("file:///%s", strings.ReplaceAll(filepath.ToSlash(absPath), "\\", "/"))
	log.Printf("Loading from: %s", fileURL)
	a.view.Navigate(fileURL)
	return nil
}

// Start initializes and runs the webview application
func (a *App) Start() {
	defer a.view.Destroy()

	// Set window properties
	a.view.SetTitle("Ojiosk")
	a.view.SetSize(DefaultWindowWidth, DefaultWindowHeight, 0)

	// Handle development mode
	if os.Getenv("DEV") == "1" {
		a.view.Navigate("http://localhost:3000")
		a.view.Run()
		return
	}

	// Production mode - try to load from local files first
	foundPath, findErr := findDistFile()
	if findErr != nil {
		log.Printf("Error finding dist file: %v", findErr)
		a.view.Navigate(fmt.Sprintf("http://localhost:%s", config.Port))
		a.view.Run()
		return
	}

	if foundPath != "" {
		if loadErr := a.loadLocalFile(foundPath); loadErr != nil {
			log.Printf("%v", loadErr)
			a.view.Navigate(fmt.Sprintf("http://localhost:%s", config.Port))
		}
	} else {
		log.Printf("Dist file not found in any of the expected locations, falling back to server")
		a.view.Navigate(fmt.Sprintf("http://localhost:%s", config.Port))
	}

	// Run the webview
	a.view.Run()
}
