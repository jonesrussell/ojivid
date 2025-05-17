type MediaDeviceInfoExt = MediaDeviceInfo & {
    label: string;
};

interface CameraSettings {
    audio: boolean;
    videoQuality: 'high' | 'medium' | 'low';
    maxDuration: number;
}

export class CameraManager {
    private stream: MediaStream | null = null;
    private recorder: MediaRecorder | null = null;
    private videoElement: HTMLVideoElement | null = null;
    private settings: CameraSettings = {
        audio: true,
        videoQuality: 'high',
        maxDuration: 5
    };

    constructor(
        private selectorContainer: HTMLElement,
        private videoContainer: HTMLElement,
        private controlsContainer: HTMLElement
    ) {}

    async init(): Promise<void> {
        try {
            // Create video element
            this.videoElement = document.createElement('video');
            this.videoElement.className = 'camera-feed';
            this.videoElement.autoplay = true;
            this.videoElement.playsInline = true;
            this.videoContainer.appendChild(this.videoElement);

            // Get available devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');

            // Create device selector
            const select = document.createElement('select');
            select.className = 'camera-select';
            videoDevices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Camera ${videoDevices.indexOf(device) + 1}`;
                select.appendChild(option);
            });
            this.selectorContainer.appendChild(select);

            // Create controls
            this.createControls();

            // Start with first camera
            if (videoDevices.length > 0) {
                await this.startCamera(videoDevices[0].deviceId);
            }

            // Add event listeners
            select.addEventListener('change', (e) => {
                const target = e.target as HTMLSelectElement;
                this.startCamera(target.value);
            });
        } catch (error) {
            this.handleError(error);
        }
    }

    private createControls(): void {
        const controls = document.createElement('div');
        controls.className = 'recording-controls';

        // Record button
        const recordBtn = document.createElement('button');
        recordBtn.className = 'record-btn';
        recordBtn.textContent = 'Start Recording';
        recordBtn.addEventListener('click', () => this.toggleRecording());

        // Status indicator
        const status = document.createElement('div');
        status.className = 'recording-status';

        controls.appendChild(recordBtn);
        controls.appendChild(status);
        this.controlsContainer.appendChild(controls);
    }

    private async startCamera(deviceId: string): Promise<void> {
        try {
            // Stop existing stream
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }

            // Get new stream
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: { exact: deviceId },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: this.settings.audio
            });

            // Update video element
            if (this.videoElement) {
                this.videoElement.srcObject = this.stream;
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    private toggleRecording(): void {
        if (!this.stream) return;

        if (this.recorder && this.recorder.state === 'recording') {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    private startRecording(): void {
        if (!this.stream) return;

        try {
            const options = {
                mimeType: 'video/webm;codecs=vp9,opus',
                videoBitsPerSecond: 2500000
            };

            this.recorder = new MediaRecorder(this.stream, options);
            const chunks: Blob[] = [];

            this.recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            this.recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `recording-${new Date().toISOString()}.webm`;
                a.click();
                URL.revokeObjectURL(url);
            };

            this.recorder.start();
            this.updateRecordingUI(true);
        } catch (error) {
            this.handleError(error);
        }
    }

    private stopRecording(): void {
        if (this.recorder && this.recorder.state === 'recording') {
            this.recorder.stop();
            this.updateRecordingUI(false);
        }
    }

    private updateRecordingUI(isRecording: boolean): void {
        const recordBtn = this.controlsContainer.querySelector('.record-btn');
        const status = this.controlsContainer.querySelector('.recording-status');

        if (recordBtn) {
            recordBtn.textContent = isRecording ? 'Stop Recording' : 'Start Recording';
            recordBtn.classList.toggle('recording', isRecording);
        }

        if (status) {
            status.textContent = isRecording ? 'Recording...' : '';
            status.classList.toggle('active', isRecording);
        }
    }

    private handleError(error: unknown): void {
        console.error('Camera error:', error);
        let message = 'An error occurred';
        
        if (error instanceof Error) {
            message = error.message;
        } else if (typeof error === 'string') {
            message = error;
        }

        this.showMessage(message, 'error');
    }

    private showMessage(message: string, type: 'success' | 'error'): void {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;

        document.body.appendChild(messageEl);

        // Remove after 3 seconds
        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    }
} 