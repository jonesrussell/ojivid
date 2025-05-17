/// <reference types="vite/client" />
/// <reference lib="dom" />

interface ViewData {
    title?: string;
    nav?: string;
    content?: string;
    footer?: string;
    [key: string]: string | undefined;
}

export class Template {
    private static templates: Map<string, string> = new Map();

    static register(name: string, template: string): void {
        this.templates.set(name, template);
    }

    static render(name: string, data: ViewData): string {
        const template = this.templates.get(name);
        if (!template) {
            throw new Error(`Template '${name}' not found`);
        }

        return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
            return data[key] || '';
        });
    }
}

// Layout Components
export const layouts = {
    main: `
        <div class="app">
            <header class="header">
                <h1>{{title}}</h1>
                <nav class="nav">
                    {{nav}}
                </nav>
            </header>
            <main class="main">
                {{content}}
            </main>
            <footer class="footer">
                {{footer}}
            </footer>
        </div>
    `,
    camera: `
        <div class="camera-container">
            <div class="video-container">
                {{video}}
            </div>
            <div class="camera-controls">
                {{controls}}
            </div>
        </div>
    `,
    settings: `
        <div class="settings-container">
            <div class="settings-section">
                <h2>Camera Settings</h2>
                {{cameraSettings}}
            </div>
            <div class="settings-section">
                <h2>Recording Settings</h2>
                {{recordingSettings}}
            </div>
            <div class="settings-section">
                <h2>Storage Settings</h2>
                {{storageSettings}}
            </div>
        </div>
    `,
    editor: `
        <div class="editor-container">
            <div class="video-list">
                {{list}}
            </div>
            <div class="editor-preview">
                {{preview}}
            </div>
        </div>
    `,
    viewer: `
        <div class="viewer-container">
            <div class="video-gallery">
                {{gallery}}
            </div>
        </div>
    `
};

// UI Components
export const components = {
    navButton: (text: string, active: boolean): string => {
        const view = text.toLowerCase();
        return `
            <button class="nav-btn ${active ? 'active' : ''}" data-view="${view}">
                ${text}
            </button>
        `;
    },
    deviceSelector: (devices: Array<{ id: string; label: string }>): string => {
        return `
            <div class="device-selector">
                <h3>Camera Settings</h3>
                <select class="camera-select">
                    ${devices.map(device => 
                        `<option value="${device.id}">${device.label}</option>`
                    ).join('')}
                </select>
            </div>
        `;
    },
    recordingControls: (): string => {
        return `
            <div class="recording-controls">
                <button class="btn btn-danger record-btn">Start Recording</button>
                <button class="btn btn-primary stop-btn" disabled>Stop Recording</button>
                <div class="recording-status">Ready to record</div>
            </div>
        `;
    },
    recordingSettings: (): string => {
        return `
            <div class="recording-settings">
                <h3>Recording Settings</h3>
                <div class="setting">
                    <label>
                        <input type="checkbox" id="enable-audio" checked>
                        Enable Audio
                    </label>
                </div>
                <div class="setting">
                    <label>Video Quality</label>
                    <select class="quality-select">
                        <option value="high">High (1080p)</option>
                        <option value="medium" selected>Medium (720p)</option>
                        <option value="low">Low (480p)</option>
                    </select>
                </div>
                <div class="setting">
                    <label>Maximum Duration (minutes)</label>
                    <input type="number" class="duration-input" value="30" min="1" max="120">
                </div>
            </div>
        `;
    },
    storageSettings: (): string => {
        return `
            <div class="storage-settings">
                <h3>Storage Settings</h3>
                <div class="setting">
                    <button class="btn btn-danger clear-storage">Clear All Recordings</button>
                </div>
            </div>
        `;
    },
    videoItem: (id: string, title: string, thumbnail: string) => `
        <div class="video-item" data-id="${id}">
            <img src="${thumbnail}" alt="${title}" class="video-thumbnail">
            <h3>${title}</h3>
            <div class="video-actions">
                <button class="btn btn-primary edit-btn">Edit</button>
                <button class="btn btn-danger delete-btn">Delete</button>
            </div>
        </div>
    `,
    message: (text: string, type: 'success' | 'error' = 'success') => `
        <div class="message ${type}">
            ${text}
        </div>
    `
};

// Register all templates
Object.entries(layouts).forEach(([name, template]) => {
    Template.register(name, template);
});

// Helper function to create a view
export function createView(name: string, data: ViewData): HTMLElement {
    const template = Template.render(name, data);
    const div = document.createElement('div');
    div.innerHTML = template;
    return div.firstElementChild as HTMLElement;
}

// Example usage:
/*
const mainView = createView('main', {
    title: 'Kiosk Video Recorder',
    nav: components.navButton('Record', true) + components.navButton('Edit') + components.navButton('View'),
    content: Template.render('camera', {
        selector: components.deviceSelector([]),
        video: '<video class="camera-feed"></video>',
        controls: components.recordingControls()
    }),
    footer: '© 2024 Kiosk Video Recorder'
});
*/ 