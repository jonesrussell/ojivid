/// <reference types="vite/client" />
/// <reference lib="dom" />

import { CameraManager } from './camera';
import { createView, components, Template } from './templates';

type ViewName = 'record' | 'edit' | 'view' | 'settings';

class App {
    private currentView: ViewName = 'record';
    private views: Map<string, HTMLElement> = new Map();
    private cameraManager: CameraManager;

    constructor() {
        this.cameraManager = new CameraManager();
        this.initializeApp();
    }

    private async initializeApp(): Promise<void> {
        // Create main layout
        const mainView = createView('main', {
            title: 'Ojiosk',
            nav: this.createNavigation(),
            content: this.createRecordView(),
            footer: '© 2025 Ojiosk'
        });

        document.body.appendChild(mainView);
        this.views.set('main', mainView);

        // Initialize camera manager
        await this.cameraManager.init();
    }

    private createNavigation(): string {
        return [
            components.navButton('Record', this.currentView === 'record'),
            components.navButton('Edit', this.currentView === 'edit'),
            components.navButton('View', this.currentView === 'view'),
            components.navButton('Settings', this.currentView === 'settings')
        ].join('');
    }

    private createRecordView(): string {
        return Template.render('camera', {
            video: '<video class="camera-feed"></video>',
            controls: components.recordingControls()
        });
    }

    private createSettingsView(): string {
        return Template.render('settings', {
            cameraSettings: components.deviceSelector([]),
            recordingSettings: components.recordingSettings(),
            storageSettings: components.storageSettings()
        });
    }

    private createEditView(): string {
        return Template.render('editor', {
            list: '<div class="empty-state">No videos available</div>',
            preview: '<div class="empty-state">Select a video to edit</div>'
        });
    }

    private createViewerView(): string {
        return Template.render('viewer', {
            gallery: '<div class="empty-state">No videos available</div>'
        });
    }

    public switchView(view: ViewName): void {
        if (view === this.currentView) return;

        const mainView = this.views.get('main');
        if (!mainView) return;

        this.currentView = view;
        
        // Update navigation
        const nav = mainView.querySelector('.nav');
        if (nav) {
            nav.innerHTML = this.createNavigation();
        }

        // Update content
        const main = mainView.querySelector('.main');
        if (main) {
            switch (view) {
                case 'record':
                    main.innerHTML = this.createRecordView();
                    break;
                case 'edit':
                    main.innerHTML = this.createEditView();
                    break;
                case 'view':
                    main.innerHTML = this.createViewerView();
                    break;
                case 'settings':
                    main.innerHTML = this.createSettingsView();
                    this.setupSettingsHandlers();
                    break;
            }
        }

        // Add event listeners to new buttons
        this.addEventListeners();
    }

    private setupSettingsHandlers(): void {
        // Camera selection
        const cameraSelect = document.querySelector('.camera-select') as HTMLSelectElement;
        if (cameraSelect) {
            cameraSelect.addEventListener('change', (e) => {
                const select = e.target as HTMLSelectElement;
                this.cameraManager.startCamera(select.value);
            });
        }

        // Recording settings
        const enableAudio = document.querySelector('#enable-audio') as HTMLInputElement;
        if (enableAudio) {
            enableAudio.addEventListener('change', (e) => {
                const checkbox = e.target as HTMLInputElement;
                this.cameraManager.setAudioEnabled(checkbox.checked);
            });
        }

        const qualitySelect = document.querySelector('.quality-select') as HTMLSelectElement;
        if (qualitySelect) {
            qualitySelect.addEventListener('change', (e) => {
                const select = e.target as HTMLSelectElement;
                const quality = select.value as 'high' | 'medium' | 'low';
                this.cameraManager.setVideoQuality(quality);
            });
        }

        const durationInput = document.querySelector('.duration-input') as HTMLInputElement;
        if (durationInput) {
            durationInput.addEventListener('change', (e) => {
                const input = e.target as HTMLInputElement;
                const minutes = parseInt(input.value, 10);
                if (!isNaN(minutes)) {
                    this.cameraManager.setMaxDuration(minutes);
                }
            });
        }

        // Storage settings
        const clearStorage = document.querySelector('.clear-storage') as HTMLButtonElement;
        if (clearStorage) {
            clearStorage.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all recordings?')) {
                    // TODO: Implement storage clearing
                    console.log('Clearing storage...');
                }
            });
        }
    }

    private addEventListeners(): void {
        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const view = target.getAttribute('data-view') as ViewName;
                if (view) this.switchView(view);
            });
        });
    }
}

// Initialize the app
new App();

// Add HMR support
if (import.meta.hot) {
    import.meta.hot.accept();
} 