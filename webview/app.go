package webview

import (
	"fmt"
	"kiosk-video-recorder/config"

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

	// Load the local server URL
	a.view.Navigate(fmt.Sprintf("http://localhost:%s", config.Port))

	// Run the webview
	a.view.Run()
}
