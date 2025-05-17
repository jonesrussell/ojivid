import { CameraManager } from './camera';
import './styles.css';

class App {
    private cameraManager: CameraManager;
    private currentView: string = 'record';

    constructor() {
        this.cameraManager = new CameraManager();
        this.initializeNavigation();
        this.initializeApp();
    }

    private async initializeApp(): Promise<void> {
        try {
            await this.cameraManager.init();
        } catch (error) {
            console.error('Failed to initialize camera:', error);
            this.showError('Failed to initialize camera. Please check your camera permissions.');
        }
    }

    private initializeNavigation(): void {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const view = button.getAttribute('data-view');
                if (view) {
                    this.switchView(view);
                }
            });
        });
    }

    private switchView(view: string): void {
        if (view === this.currentView) return;

        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-view') === view);
        });

        // Update views
        document.querySelectorAll('.view').forEach(v => {
            v.classList.toggle('active', v.id === `${view}-view`);
        });

        this.currentView = view;

        // Handle view-specific initialization
        switch (view) {
            case 'record':
                this.cameraManager.cleanupExistingVideo();
                this.cameraManager.init().catch(console.error);
                break;
            case 'edit':
                // Initialize editor view
                break;
            case 'view':
                // Initialize viewer view
                break;
        }
    }

    private showError(message: string): void {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        // Remove error message after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

// Initialize the application
new App();

// Add HMR support
if (import.meta.hot) {
    import.meta.hot.accept(() => {
        // Cleanup and reinitialize
        const cameraManager = new CameraManager();
        cameraManager.cleanupExistingVideo();
        cameraManager.init().catch(console.error);
    });
} 