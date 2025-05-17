/// <reference types="vite/client" />
/// <reference lib="dom" />

import { createView } from './templates';
import { CameraManager } from './camera';

// Initialize the app
async function initApp() {
    const app = document.getElementById('app');
    const splash = document.querySelector('.splash');
    if (!app || !splash) {
        console.error('Required elements not found');
        return;
    }

    try {
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
        await cameraManager.init();

        // Fade out splash screen and show app
        splash.classList.add('fade-out');
        app.style.display = 'block';
        app.classList.add('fade-in');

        // Remove splash screen after animation
        setTimeout(() => {
            splash.remove();
        }, 500);
    } catch (error) {
        console.error('Failed to initialize app:', error);
        splash.innerHTML = `
            <div class="error">
                <h2>Failed to start camera</h2>
                <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
            </div>
        `;
    }
}

// Start the app when the DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

// Add HMR support
if (import.meta.hot) {
    import.meta.hot.accept();
} 