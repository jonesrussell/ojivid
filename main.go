package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	webview "github.com/webview/webview_go"
)

const (
	uploadDir = "uploads"
	port      = "8080"
	// Window dimensions
	windowWidth  = 1024
	windowHeight = 768
	// Max upload size (32MB)
	maxUploadSize = 32 << 20
	// Server timeouts
	readTimeout  = 15 * time.Second
	writeTimeout = 15 * time.Second
	idleTimeout  = 60 * time.Second
)

func init() {
	// Create uploads directory if it doesn't exist
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		log.Fatalf("Failed to create upload directory: %v", err)
	}

	// Set WebKit environment variables for WSL2
	os.Setenv("WEBKIT_DISABLE_COMPOSITING_MODE", "1")
	os.Setenv("WEBKIT_DISABLE_SANDBOX", "1")
	os.Setenv("DISPLAY", ":0")
	os.Setenv("LIBVA_DRIVER_NAME", "i965")
	os.Setenv("LIBVA_DRIVERS_PATH", "/usr/lib/x86_64-linux-gnu/dri")
	os.Setenv("WEBKIT_INSPECTOR_SERVER", "127.0.0.1:9222")
	os.Setenv("WEBKIT_DEBUG", "1")

	// Log environment for debugging
	log.Printf("DISPLAY=%s", os.Getenv("DISPLAY"))
	log.Printf("XAUTHORITY=%s", os.Getenv("XAUTHORITY"))
}

func startServer() {
	r := mux.NewRouter()

	r.HandleFunc("/api/upload", uploadVideo).Methods("POST")
	r.HandleFunc("/api/videos", getVideos).Methods("GET")

	// Serve static files
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("static")))

	http.Handle("/", r)

	log.Printf("Server starting on :%s...", port)

	// Create server with timeouts
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  readTimeout,
		WriteTimeout: writeTimeout,
		IdleTimeout:  idleTimeout,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()
}

func main() {
	// Start the HTTP server in a goroutine
	startServer()

	// Create and configure webview with debug mode
	w := webview.New(true)
	defer w.Destroy()

	// Set window properties
	w.SetTitle("Video Upload Kiosk")
	w.SetSize(windowWidth, windowHeight, 0)

	// Inject JavaScript to handle media access and diagnostics
	w.Init(`
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
	`)

	// Load the local server URL
	w.Navigate(fmt.Sprintf("http://localhost:%s", port))

	// Run the webview
	w.Run()
}

func uploadVideo(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	file, handler, err := r.FormFile("video")
	if err != nil {
		http.Error(w, "Failed to get file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	filename := fmt.Sprintf("video_%d_%s", time.Now().Unix(), handler.Filename)
	uploadPath := filepath.Join(uploadDir, filename)

	f, err := os.OpenFile(uploadPath, os.O_WRONLY|os.O_CREATE, 0666)
	if err != nil {
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}
	defer f.Close()

	if _, err = io.Copy(f, file); err != nil {
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	encoder := json.NewEncoder(w)
	if encodeErr := encoder.Encode(map[string]string{
		"message":  "Video uploaded successfully",
		"filename": filename,
	}); encodeErr != nil {
		log.Printf("Failed to encode response: %v", encodeErr)
	}
}

func getVideos(w http.ResponseWriter, r *http.Request) {
	files, err := os.ReadDir(uploadDir)
	if err != nil {
		http.Error(w, "Failed to read videos", http.StatusInternalServerError)
		return
	}

	videos := make([]map[string]string, 0)
	for _, file := range files {
		if !file.IsDir() {
			fileInfo, statErr := os.Stat(filepath.Join(uploadDir, file.Name()))
			if statErr != nil {
				log.Printf("Failed to stat file %s: %v", file.Name(), statErr)
				continue
			}
			videos = append(videos, map[string]string{
				"filename":  file.Name(),
				"timestamp": strconv.FormatInt(fileInfo.ModTime().Unix(), 10),
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	encoder := json.NewEncoder(w)
	if encodeErr := encoder.Encode(videos); encodeErr != nil {
		log.Printf("Failed to encode response: %v", encodeErr)
	}
}
