/// <reference types="vite/client" />
/// <reference lib="dom" />
/* global MediaTrackConstraints */

type MediaDeviceInfoExt = MediaDeviceInfo & { label: string };

interface CameraSettings {
    audioEnabled: boolean;
    videoQuality: 'high' | 'medium' | 'low';
    maxDuration: number;
}

export class CameraManager {
    private stream: MediaStream | null = null;
    private videoDevices: MediaDeviceInfoExt[] = [];
    private mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];
    private isRecording: boolean = false;
    private settings: CameraSettings = {
        audioEnabled: true,
        videoQuality: 'medium',
        maxDuration: 30
    };

    async init(): Promise<void> {
        try {
            // Request camera permission first
            await navigator.mediaDevices.getUserMedia({ video: true });
            this.videoDevices = await this.getVideoDevices();
            if (this.videoDevices.length === 0) throw new Error("No video devices found");

            this.createDeviceSelector();
        } catch (error) {
            this.handleError(error);
        }
    }

    private async getVideoDevices(): Promise<MediaDeviceInfoExt[]> {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices
            .filter(device => device.kind === "videoinput")
            .map(device => ({ ...device, label: device.label || `Camera ${device.deviceId}` }));
    }

    public async startCamera(deviceId?: string): Promise<void> {
        try {
            this.cleanupExistingVideo();

            const constraints: MediaStreamConstraints = {
                video: this.getVideoConstraints(deviceId),
                audio: this.settings.audioEnabled
            };

            try {
                this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (error) {
                console.log('Falling back to basic constraints');
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'user'
                    },
                    audio: this.settings.audioEnabled
                });
            }

            this.setupVideo();
            this.setupRecordingControls();
            this.updateDeviceStatus('Connected');
        } catch (error) {
            this.handleError(error);
            this.updateDeviceStatus('Error');
        }
    }

    private getVideoConstraints(deviceId?: string): MediaTrackConstraints {
        const baseConstraints = deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' };
        
        switch (this.settings.videoQuality) {
            case 'high':
                return { ...baseConstraints, width: { ideal: 1920 }, height: { ideal: 1080 } };
            case 'medium':
                return { ...baseConstraints, width: { ideal: 1280 }, height: { ideal: 720 } };
            case 'low':
                return { ...baseConstraints, width: { ideal: 854 }, height: { ideal: 480 } };
            default:
                return baseConstraints;
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

        const videoTrack = this.stream.getVideoTracks()[0];
        if (!videoTrack) return;

        const settings = videoTrack.getSettings();
        if (!settings.deviceId) return;

        const nextDevice = this.videoDevices.find(d => d.deviceId !== settings.deviceId);
        if (nextDevice) await this.startCamera(nextDevice.deviceId);
    }

    public cleanupExistingVideo(): void {
        if (this.isRecording) {
            this.stopRecording();
        }

        document.querySelectorAll("video").forEach(video => {
            const stream = video.srcObject as MediaStream;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            video.remove();
        });

        this.stream = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
    }

    private handleError(error: unknown): void {
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

    public setAudioEnabled(enabled: boolean): void {
        this.settings.audioEnabled = enabled;
        if (this.stream) {
            this.stream.getAudioTracks().forEach(track => {
                track.enabled = enabled;
            });
        }
    }

    public setVideoQuality(quality: 'high' | 'medium' | 'low'): void {
        this.settings.videoQuality = quality;
        if (this.stream) {
            const videoTrack = this.stream.getVideoTracks()[0];
            if (videoTrack) {
                const settings = videoTrack.getSettings();
                if (settings.deviceId) {
                    this.startCamera(settings.deviceId);
                }
            }
        }
    }

    public setMaxDuration(minutes: number): void {
        this.settings.maxDuration = minutes;
    }

    private updateDeviceStatus(status: string): void {
        const statusElement = document.querySelector('.device-status .status-text');
        if (statusElement) {
            statusElement.textContent = status;
        }
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
