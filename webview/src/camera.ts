/// <reference types="vite/client" />
/// <reference lib="dom" />

type MediaDeviceInfoExt = MediaDeviceInfo & { label: string };

export class CameraManager {
    private stream: MediaStream | null = null;
    private videoDevices: MediaDeviceInfoExt[] = [];
    private mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];
    private isRecording: boolean = false;

    async init(): Promise<void> {
        this.videoDevices = await this.getVideoDevices();
        if (this.videoDevices.length === 0) throw new Error("No video devices found");

        this.createDeviceSelector();
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
                video: deviceId ? { deviceId: { exact: deviceId } } : true,
                audio: true
            });

            this.setupVideo();
            this.setupRecordingControls();
        } catch (error) {
            this.handleError(error);
        }
    }

    private setupVideo(): void {
        if (!this.stream) return;

        const videoContainer = document.querySelector('.video-container');
        if (!videoContainer) return;

        const video = document.createElement("video");
        video.srcObject = this.stream;
        video.autoplay = true;
        video.playsInline = true;
        video.className = 'camera-feed';

        const controls = this.createCameraControls();
        videoContainer.innerHTML = ''; // Clear existing content
        videoContainer.append(video, controls);
    }

    private createDeviceSelector(): void {
        const selectorContainer = document.querySelector('.camera-selector');
        if (!selectorContainer) return;

        selectorContainer.innerHTML = `
            <div class="device-selector">
                <h3>Select Camera</h3>
                <select class="camera-select">
                    ${this.videoDevices.map(device => 
                        `<option value="${device.deviceId}">${device.label}</option>`
                    ).join('')}
                </select>
                <button class="btn btn-primary start-camera">Start Camera</button>
            </div>
        `;

        const select = selectorContainer.querySelector('.camera-select') as HTMLSelectElement;
        const startButton = selectorContainer.querySelector('.start-camera') as HTMLButtonElement;

        startButton.onclick = () => this.startCamera(select.value);
    }

    private setupRecordingControls(): void {
        const controlsContainer = document.querySelector('.camera-controls');
        if (!controlsContainer) return;

        controlsContainer.innerHTML = `
            <div class="recording-controls">
                <button class="btn btn-danger record-btn" ${this.isRecording ? 'disabled' : ''}>
                    ${this.isRecording ? 'Recording...' : 'Start Recording'}
                </button>
                <button class="btn btn-primary stop-btn" ${!this.isRecording ? 'disabled' : ''}>
                    Stop Recording
                </button>
                <div class="recording-status">
                    ${this.isRecording ? 'Recording in progress...' : 'Ready to record'}
                </div>
            </div>
        `;

        const recordBtn = controlsContainer.querySelector('.record-btn') as HTMLButtonElement;
        const stopBtn = controlsContainer.querySelector('.stop-btn') as HTMLButtonElement;

        recordBtn.onclick = () => this.startRecording();
        stopBtn.onclick = () => this.stopRecording();
    }

    private startRecording(): void {
        if (!this.stream || this.isRecording) return;

        this.recordedChunks = [];
        this.mediaRecorder = new MediaRecorder(this.stream, {
            mimeType: 'video/webm;codecs=vp9,opus'
        });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            this.saveRecording(url);
        };

        this.mediaRecorder.start();
        this.isRecording = true;
        this.setupRecordingControls();
    }

    private stopRecording(): void {
        if (!this.mediaRecorder || !this.isRecording) return;

        this.mediaRecorder.stop();
        this.isRecording = false;
        this.setupRecordingControls();
    }

    private async saveRecording(url: string): Promise<void> {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const formData = new FormData();
            formData.append('video', blob, `recording-${Date.now()}.webm`);

            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload recording');
            }

            this.showMessage('Recording saved successfully!');
        } catch (error) {
            this.handleError(error);
        }
    }

    private createCameraControls(): HTMLDivElement {
        const controls = document.createElement("div");
        controls.className = "camera-controls";

        if (this.videoDevices.length > 1) {
            const switchButton = document.createElement("button");
            switchButton.textContent = "Switch Camera";
            switchButton.className = "btn btn-primary";
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
        if (this.isRecording) {
            this.stopRecording();
        }

        document.querySelectorAll("video").forEach(video => {
            (video.srcObject as MediaStream)?.getTracks().forEach(track => track.stop());
            video.remove();
        });

        this.stream = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
    }

    private handleError(error: Error | unknown): void {
        console.error("Camera Error:", error);
        this.showMessage(`Error: ${error instanceof Error ? error.message : String(error)}`, true);
    }

    private showMessage(message: string, isError: boolean = false): void {
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${isError ? 'error' : 'success'}`;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
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
