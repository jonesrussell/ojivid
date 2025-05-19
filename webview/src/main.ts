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

// Debug mode handling
const isDebug = window.location.search.includes('debug=true');

// Debug panel element - only used in debug mode
let debugPanel: HTMLDivElement | undefined;

// Function to append debug messages to the debug panel
function appendToDebugPanel(type: 'log' | 'error' | 'warn' | 'info', ...args: unknown[]): void {
    if (!debugPanel) return;
    
    const line = document.createElement('div');
    line.style.color = type === 'error' ? '#ff6b6b' : 
                      type === 'warn' ? '#ffd93d' : 
                      type === 'info' ? '#4dabf7' : '#fff';
    line.textContent = `[${type}] ${args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')}`;
    debugPanel.appendChild(line);
    debugPanel.scrollTop = debugPanel.scrollHeight;
}

if (isDebug) {
    // Enable debug logging
    console.log('Debug mode enabled');
    
    // Add debug UI
    debugPanel = document.createElement('div');
    debugPanel.style.cssText = `
        position: fixed;
        bottom: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.8);
        color: #fff;
        padding: 10px;
        font-family: monospace;
        font-size: 12px;
        z-index: 9999;
        max-width: 300px;
        max-height: 200px;
        overflow: auto;
    `;
    document.body.appendChild(debugPanel);

    // Override console methods to show in debug panel
    const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info
    };

    console.log = (...args) => {
        originalConsole.log(...args);
        appendToDebugPanel('log', ...args);
    };
    console.error = (...args) => {
        originalConsole.error(...args);
        appendToDebugPanel('error', ...args);
    };
    console.warn = (...args) => {
        originalConsole.warn(...args);
        appendToDebugPanel('warn', ...args);
    };
    console.info = (...args) => {
        originalConsole.info(...args);
        appendToDebugPanel('info', ...args);
    };

    // Add debug info
    console.log('Webview initialized');
    console.log('User Agent:', navigator.userAgent);
    console.log('Window size:', window.innerWidth, 'x', window.innerHeight);
} 