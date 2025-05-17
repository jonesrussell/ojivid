package webview

import (
	"fmt"
	"kiosk-video-recorder/config"

	webview "github.com/webview/webview_go"
)

const (
	// Default window dimensions
	DefaultWindowWidth  = 800
	DefaultWindowHeight = 600
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
	a.view.SetTitle("Kiosk Video Recorder")
	a.view.SetSize(DefaultWindowWidth, DefaultWindowHeight, webview.HintNone)

	// Initialize JavaScript
	a.initJavaScript()

	// Load the local server URL
	a.view.Navigate(fmt.Sprintf("http://localhost:%s", config.Port))

	// Run the webview
	a.view.Run()
}

// initJavaScript initializes the JavaScript environment
func (a *App) initJavaScript() {
	a.view.Init(a.getEnvironmentCheckJS() + a.getMediaAccessJS())
}

// getEnvironmentCheckJS returns the JavaScript code for environment checking
func (a *App) getEnvironmentCheckJS() string {
	return `
		// Diagnostic function to check environment
		async function checkEnvironment() {
			console.log('Checking environment...');
			console.log('User Agent:', navigator.userAgent);
			console.log('Platform:', navigator.platform);
			
			// Check if we're in WSL
			const isWSL = navigator.userAgent.includes('Linux') && 
				!navigator.userAgent.includes('Android');
			console.log('Running in WSL:', isWSL);
			
			// Check available permissions
			if (navigator.permissions) {
				const permissions = await Promise.all([
					navigator.permissions.query({ name: 'camera' }),
					navigator.permissions.query({ name: 'microphone' })
				]);
				console.log('Camera permission:', permissions[0].state);
				console.log('Microphone permission:', permissions[1].state);
			}
		}
	`
}

// getMediaAccessJS returns the JavaScript code for media access
func (a *App) getMediaAccessJS() string {
	return `
		// Wait for DOM to be ready
		document.addEventListener('DOMContentLoaded', async () => {
			// Run diagnostics first
			await checkEnvironment();
			
			try {
				// First check available devices
				const devices = await navigator.mediaDevices.enumerateDevices();
				console.log('Available devices:', devices.map(d => ({
					kind: d.kind,
					label: d.label,
					deviceId: d.deviceId
				})));

				// Find the integrated camera
				const videoDevices = devices.filter(device => device.kind === 'videoinput');
				console.log('Video devices:', videoDevices);

				if (videoDevices.length === 0) {
					throw new Error('No video devices found');
				}

				// Try to get basic media access with minimal constraints
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: false,
					video: {
						deviceId: videoDevices[0].deviceId,
						width: { ideal: 640 },
						height: { ideal: 480 }
					}
				});
				
				// Log success and available tracks
				const tracks = stream.getTracks();
				console.log('Media access successful. Available tracks:', tracks.map(t => ({
					kind: t.kind,
					label: t.label,
					enabled: t.enabled,
					muted: t.muted,
					readyState: t.readyState
				})));
				
				// Set up video element
				const video = document.createElement('video');
				video.srcObject = stream;
				video.autoplay = true;
				video.playsInline = true;
				video.style.width = '640px';
				video.style.height = '480px';
				video.style.border = '1px solid #ccc';
				document.body.appendChild(video);
				
				// Log video element properties
				video.onloadedmetadata = () => {
					console.log('Video element properties:', {
						width: video.videoWidth,
						height: video.videoHeight,
						readyState: video.readyState,
						error: video.error
					});
				};

				// Add error handling for video element
				video.onerror = (error) => {
					console.error('Video element error:', error);
				};
			} catch (error) {
				console.error('Media access error:', error);
				// Try to get more detailed error information
				if (error.name === 'NotFoundError') {
					console.error('No media devices found. Please check WSL2 device access.');
				} else if (error.name === 'NotAllowedError') {
					console.error('Permission denied. Please check WSL2 permissions.');
				} else if (error.name === 'NotReadableError') {
					console.error('Device is busy or not readable. Please check if another application is using the camera.');
				}
				
				// Add error message to page
				const errorDiv = document.createElement('div');
				errorDiv.style.color = 'red';
				errorDiv.style.padding = '20px';
				errorDiv.textContent = 'Error accessing camera: ' + error.message;
				document.body.appendChild(errorDiv);
			}
		});
	`
}
