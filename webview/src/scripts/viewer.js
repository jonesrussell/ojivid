// Function to format duration in seconds to MM:SS format
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Function to format date to a readable format
function formatDate(date) {
    return new Date(date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    });
}

// Function to create a video card element
function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
        <div class="video-thumbnail">
            <img src="${video.thumbnail || 'data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>📹</text></svg>'}" alt="Video thumbnail">
        </div>
        <div class="video-info">
            <div class="video-title">${video.filename}</div>
            <div class="video-meta">
                <div>Duration: ${formatDuration(video.duration)}</div>
                <div>Recorded: ${formatDate(video.recordedAt)}</div>
            </div>
            <div class="video-actions">
                <button class="play-video" data-video-id="${video.id}">Play</button>
                <button class="secondary" data-video-id="${video.id}">Edit</button>
                <button class="danger" data-video-id="${video.id}">Delete</button>
            </div>
        </div>
    `;
    return card;
}

// Function to fetch videos from the server
async function fetchVideos(dateRange = 'all') {
    try {
        const response = await fetch(`/api/videos?dateRange=${dateRange}`);
        if (!response.ok) {
            throw new Error('Failed to fetch videos');
        }
        const videos = await response.json();
        return videos;
    } catch (error) {
        console.error('Error fetching videos:', error);
        return [];
    }
}

// Function to update the video grid
async function updateVideoGrid(dateRange) {
    const videoGrid = document.querySelector('.video-grid');
    const videos = await fetchVideos(dateRange);
    
    // Clear existing videos
    videoGrid.innerHTML = '';
    
    if (videos.length === 0) {
        videoGrid.innerHTML = '<div class="no-videos">No videos found</div>';
        return;
    }
    
    // Add video cards
    videos.forEach(video => {
        const card = createVideoCard(video);
        videoGrid.appendChild(card);
    });
}

// Function to handle video playback
function handleVideoPlayback(videoId) {
    const videoPlayer = document.querySelector('.video-player');
    const video = videoPlayer.querySelector('video');
    const closeButton = videoPlayer.querySelector('.video-player-close');
    
    // Set video source
    video.src = `/api/videos/${videoId}/stream`;
    
    // Show player
    videoPlayer.classList.add('active');
    
    // Play video
    video.play();
    
    // Handle close button
    closeButton.onclick = () => {
        videoPlayer.classList.remove('active');
        video.pause();
        video.src = '';
    };
    
    // Handle escape key
    document.addEventListener('keydown', function closeOnEscape(e) {
        if (e.key === 'Escape') {
            videoPlayer.classList.remove('active');
            video.pause();
            video.src = '';
            document.removeEventListener('keydown', closeOnEscape);
        }
    });
}

// Function to handle video deletion
async function handleVideoDeletion(videoId) {
    if (!confirm('Are you sure you want to delete this video?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/videos/${videoId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete video');
        }
        
        // Refresh video grid
        const dateRange = document.getElementById('date-range').value;
        await updateVideoGrid(dateRange);
    } catch (error) {
        console.error('Error deleting video:', error);
        alert('Failed to delete video. Please try again.');
    }
}

// Function to handle video editing
function handleVideoEdit(videoId) {
    window.location.href = `/edit.html?id=${videoId}`;
}

// Initialize the viewer
export function initViewer() {
    // Initial load of videos
    updateVideoGrid('all');
    
    // Handle date range filter
    const dateRangeSelect = document.getElementById('date-range');
    dateRangeSelect.addEventListener('change', (e) => {
        updateVideoGrid(e.target.value);
    });
    
    // Handle video grid events
    document.querySelector('.video-grid').addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        
        const videoId = button.dataset.videoId;
        if (!videoId) return;
        
        if (button.classList.contains('play-video')) {
            handleVideoPlayback(videoId);
        } else if (button.classList.contains('danger')) {
            handleVideoDeletion(videoId);
        } else if (button.classList.contains('secondary')) {
            handleVideoEdit(videoId);
        }
    });
} 