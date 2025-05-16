package handlers

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"kiosk-video-recorder/config"
)

// UploadVideo handles video file uploads
func UploadVideo(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(config.MaxUploadSize); err != nil {
		WriteErrorResponse(w, http.StatusBadRequest, "Failed to parse form")
		return
	}

	file, handler, err := r.FormFile("video")
	if err != nil {
		WriteErrorResponse(w, http.StatusBadRequest, "Failed to get file")
		return
	}
	defer file.Close()

	filename := fmt.Sprintf("video_%d_%s", time.Now().Unix(), handler.Filename)
	uploadPath := filepath.Join(config.UploadDir, filename)

	f, err := os.OpenFile(uploadPath, os.O_WRONLY|os.O_CREATE, 0666)
	if err != nil {
		WriteErrorResponse(w, http.StatusInternalServerError, "Failed to save file")
		return
	}
	defer f.Close()

	if _, err = io.Copy(f, file); err != nil {
		WriteErrorResponse(w, http.StatusInternalServerError, "Failed to save file")
		return
	}

	WriteJSONResponse(w, http.StatusOK, map[string]string{
		"message":  "Video uploaded successfully",
		"filename": filename,
	})
}

// GetVideos retrieves the list of uploaded videos
func GetVideos(w http.ResponseWriter, r *http.Request) {
	files, err := os.ReadDir(config.UploadDir)
	if err != nil {
		WriteErrorResponse(w, http.StatusInternalServerError, "Failed to read videos")
		return
	}

	videos := make([]map[string]string, 0)
	for _, file := range files {
		if !file.IsDir() {
			fileInfo, statErr := os.Stat(filepath.Join(config.UploadDir, file.Name()))
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

	WriteJSONResponse(w, http.StatusOK, videos)
}
