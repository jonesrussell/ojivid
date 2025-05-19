/// <reference types="vite/client" />
/// <reference lib="dom" />

import { html, render } from 'lit-html';

// Define our template types
interface ViewData {
    content?: string;
    title?: string;
}

// Define our template functions
const layoutTemplate = (data: ViewData) => html`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark">
    <meta name="theme-color" content="#1a1a1a">
    <title>${data.title || 'Ojiosk'}</title>
    <link rel="icon" type="image/svg+xml"
        href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📹</text></svg>">
    <link rel="stylesheet" href="/src/styles.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="app">
        <header class="header">
            <h1>Ojiosk</h1>
        </header>

        <main class="main">
            ${data.content ? html`${data.content}` : ''}
        </main>

        <footer class="footer">
            <p>© 2025 Ojiosk</p>
        </footer>
    </div>
    <script type="module" src="/src/main.ts"></script>
</body>
</html>
`;

const splashTemplate = () => html`
<div class="splash">
    <img src="/assets/logo.svg" alt="Ojiosk Logo" class="splash-logo">
    <h1 class="splash-title">Ojiosk</h1>
    <div class="loading-spinner"></div>
</div>
<div id="app" style="display: none;"></div>

<style>
    .splash {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: var(--background);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .splash-logo {
        width: 120px;
        height: 120px;
        margin-bottom: 2rem;
        animation: pulse 2s infinite;
    }

    .splash-title {
        font-size: 2rem;
        color: var(--text);
        margin-bottom: 1rem;
    }

    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid var(--border);
        border-top: 4px solid var(--primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
</style>
`;

const cameraTemplate = () => html`
<div class="camera-container">
    <div class="camera-selector"></div>
    <div class="video-container"></div>
    <div class="camera-controls"></div>
</div>
`;

// Helper function to create a view
export function createView(name: string, data: ViewData = {}): HTMLElement {
    let template;
    switch (name) {
        case 'layout':
            template = layoutTemplate(data);
            break;
        case 'splash':
            template = splashTemplate();
            break;
        case 'camera':
            template = cameraTemplate();
            break;
        default:
            throw new Error(`Template '${name}' not found`);
    }

    const container = document.createElement('div');
    render(template, container);
    return container.firstElementChild as HTMLElement;
} 