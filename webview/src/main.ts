/// <reference types="vite/client" />
/// <reference lib="dom" />

import { createView } from './templates';
import { CameraManager } from './camera';

// Initialize the app
function initApp() {
    const app = document.getElementById('app');
    if (!app) {
        console.error('App element not found');
        return;
    }

    // Create the camera view
    const cameraView = createView('camera', { content: '' });
    app.appendChild(cameraView);

    // Initialize camera manager
    const cameraManager = new CameraManager(
        cameraView.querySelector('.camera-selector') as HTMLElement,
        cameraView.querySelector('.video-container') as HTMLElement,
        cameraView.querySelector('.camera-controls') as HTMLElement
    );

    // Start the camera
    cameraManager.init();
}

// Start the app when the DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

// Add HMR support
if (import.meta.hot) {
    import.meta.hot.accept();
} 