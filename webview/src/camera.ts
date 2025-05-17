/// <reference types="vite/client" />

type MediaDeviceInfoExt = MediaDeviceInfo & { label: string };

class CameraManager {
    private stream: MediaStream | null = null;
    private videoDevices: MediaDeviceInfoExt[] = [];

    async init(): Promise<void> {
        await this.checkEnvironment();
        this.videoDevices = await this.getVideoDevices();
        if (this.videoDevices.length === 0) throw new Error("No video devices found");

        this.createDeviceSelector();
    }

    private async checkEnvironment(): Promise<void> {
        console.log("Checking environment...");
        console.log("User Agent:", navigator.userAgent);
        console.log("Platform:", navigator.platform);

        if (navigator.permissions) {
            const [camera, microphone] = await Promise.all([
                navigator.permissions.query({ name: "camera" as PermissionName }),
                navigator.permissions.query({ name: "microphone" as PermissionName })
            ]);
            console.log("Camera permission:", camera.state);
            console.log("Microphone permission:", microphone.state);
        }
    }

    private async getVideoDevices(): Promise<MediaDeviceInfoExt[]> {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices
            .filter(device => device.kind === "videoinput")
            .map(device => ({ ...device, label: device.label || `Camera ${device.deviceId}` }));
    }

    private async startCamera(deviceId?: string): Promise<void> {
        try {
            this.cleanupExistingVideo();
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: deviceId ? { deviceId: { exact: deviceId } } : true
            });

            this.setupVideo();
        } catch (error) {
            this.handleError(error);
        }
    }

    private setupVideo(): void {
        if (!this.stream) return;

        const video = document.createElement("video");
        video.srcObject = this.stream;
        video.autoplay = true;
        video.playsInline = true;

        const controls = this.createCameraControls();
        document.body.append(video, controls);
    }

    private createDeviceSelector(): void {
        this.cleanupExistingVideo();

        const container = document.createElement("div");
        container.className = "camera-selector";

        const select = document.createElement("select");
        this.videoDevices.forEach(device => {
            const option = document.createElement("option");
            option.value = device.deviceId;
            option.textContent = device.label;
            select.appendChild(option);
        });

        const button = document.createElement("button");
        button.textContent = "Start Camera";
        button.onclick = () => this.startCamera(select.value);

        container.append(select, button);
        document.body.appendChild(container);
    }

    private createCameraControls(): HTMLDivElement {
        const controls = document.createElement("div");
        controls.className = "camera-controls";

        if (this.videoDevices.length > 1) {
            const switchButton = document.createElement("button");
            switchButton.textContent = "Switch Camera";
            switchButton.onclick = () => this.switchCamera();
            controls.appendChild(switchButton);
        }

        return controls;
    }

    private async switchCamera(): Promise<void> {
        if (!this.stream) return;

        const currentDeviceId = this.stream.getVideoTracks()[0].getSettings().deviceId;
        const nextDevice = this.videoDevices.find(d => d.deviceId !== currentDeviceId);
        if (nextDevice) await this.startCamera(nextDevice.deviceId);
    }

    public cleanupExistingVideo(): void {
        document.querySelectorAll("video").forEach(video => {
            (video.srcObject as MediaStream)?.getTracks().forEach(track => track.stop());
            video.remove();
        });
        document.querySelector(".camera-selector")?.remove();
    }

    private handleError(error: Error | unknown): void {
        console.error("Camera Error:", error);
        const errorDiv = document.createElement("div");
        errorDiv.className = "error-message";
        errorDiv.textContent = `Error accessing camera: ${error instanceof Error ? error.message : String(error)}`;
        document.body.appendChild(errorDiv);
    }
}

// Initialize the CameraManager
const cameraManager = new CameraManager();
cameraManager.init().catch(err => console.error("Initialization error:", err));

// Add HMR support
if (import.meta.hot) {
    import.meta.hot.accept(() => {
        // Cleanup existing instance
        cameraManager.cleanupExistingVideo();
        // Reinitialize
        cameraManager.init().catch(err => console.error("HMR reinitialization error:", err));
    });
}
