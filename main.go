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
	webview_go "github.com/webview/webview_go"
)

const (
	UPLOAD_DIR = "uploads"
	PORT       = "8080"
)

func init() {
	// Create uploads directory if it doesn't exist
	os.MkdirAll(UPLOAD_DIR, os.ModePerm)
}

func startServer() {
	r := mux.NewRouter()

	r.HandleFunc("/api/upload", uploadVideo).Methods("POST")
	r.HandleFunc("/api/videos", getVideos).Methods("GET")

	// Serve static files
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("static")))

	http.Handle("/", r)

	fmt.Printf("Server starting on :%s...\n", PORT)
	go func() {
		log.Fatal(http.ListenAndServe(":"+PORT, nil))
	}()
}

func main() {
	// Start the HTTP server in a goroutine
	startServer()

	// Create and configure webview
	w := webview_go.New(true)
	defer w.Destroy()

	w.SetTitle("Video Upload Kiosk")
	w.SetSize(1024, 768, 0) // 0 is the default hint value

	// Load the local server URL
	w.Navigate(fmt.Sprintf("http://localhost:%s", PORT))

	// Run the webview
	w.Run()
}

func uploadVideo(w http.ResponseWriter, r *http.Request) {
	r.ParseMultipartForm(32 << 20) // 32MB max upload size

	file, handler, err := r.FormFile("video")
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	defer file.Close()

	filename := fmt.Sprintf("video_%d_%s", time.Now().Unix(), handler.Filename)
	filepath := filepath.Join(UPLOAD_DIR, filename)

	f, err := os.OpenFile(filepath, os.O_WRONLY|os.O_CREATE, 0666)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer f.Close()

	_, err = io.Copy(f, file)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Video uploaded successfully", "filename": filename})
}

func getVideos(w http.ResponseWriter, r *http.Request) {
	files, err := os.ReadDir(UPLOAD_DIR)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	videos := []map[string]string{}
	for _, file := range files {
		if !file.IsDir() {
			fileInfo, err := os.Stat(filepath.Join(UPLOAD_DIR, file.Name()))
			if err != nil {
				continue
			}
			videos = append(videos, map[string]string{
				"filename":  file.Name(),
				"timestamp": strconv.FormatInt(fileInfo.ModTime().Unix(), 10),
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(videos)
}
