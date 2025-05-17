// Initialize the video viewer
export function initViewer() {
    console.log('Viewer initialized');
    
    // Get DOM elements
    const dateRangeSelect = document.getElementById('date-range') as HTMLSelectElement;
    const videoPlayer = document.querySelector('.video-player') as HTMLDivElement;
    const videoPlayerClose = document.querySelector('.video-player-close') as HTMLDivElement;
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    const playButtons = document.querySelectorAll('.play-video');
    const editButtons = document.querySelectorAll('.video-actions .secondary');
    const deleteButtons = document.querySelectorAll('.video-actions .danger');

    // Add event listeners
    dateRangeSelect?.addEventListener('change', () => {
        console.log('Date range changed:', dateRangeSelect.value);
        // TODO: Implement date range filtering
    });

    videoPlayerClose?.addEventListener('click', () => {
        videoPlayer.style.display = 'none';
        videoElement.pause();
        videoElement.src = '';
    });

    playButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const videoCard = (e.target as HTMLElement).closest('.video-card');
            const videoTitle = videoCard?.querySelector('.video-title')?.textContent;
            console.log('Play video:', videoTitle);
            // TODO: Implement video playback
            videoPlayer.style.display = 'flex';
        });
    });

    editButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const videoCard = (e.target as HTMLElement).closest('.video-card');
            const videoTitle = videoCard?.querySelector('.video-title')?.textContent;
            console.log('Edit video:', videoTitle);
            // TODO: Implement edit functionality
            window.location.href = '/edit.html';
        });
    });

    deleteButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const videoCard = (e.target as HTMLElement).closest('.video-card');
            const videoTitle = videoCard?.querySelector('.video-title')?.textContent;
            console.log('Delete video:', videoTitle);
            // TODO: Implement delete functionality
        });
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initViewer); 