// Diagnostic function to check environment
async function checkEnvironment() {
    console.log('Checking environment...');
    console.log('User Agent:', navigator.userAgent);
    console.log('Platform:', navigator.platform);
    
    // Check if we're in WSL
    const isWSL = navigator.userAgent.includes('Linux') && 
        !navigator.userAgent.includes('Android');
    console.log('Running in WSL:', isWSL);
    
    // Check available permissions
    if (navigator.permissions) {
        const permissions = await Promise.all([
            navigator.permissions.query({ name: 'camera' }),
            navigator.permissions.query({ name: 'microphone' })
        ]);
        console.log('Camera permission:', permissions[0].state);
        console.log('Microphone permission:', permissions[1].state);
    }
}

// Clean up existing video elements and streams
function cleanupExistingVideo() {
    // Stop all existing video tracks
    document.querySelectorAll('video').forEach(video => {
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        video.remove();
    });
    
    // Remove any existing selectors
    const existingSelector = document.querySelector('.camera-selector');
    if (existingSelector) {
        existingSelector.remove();
    }
    
    // Remove any existing error messages
    document.querySelectorAll('.error-message').forEach(error => error.remove());
}

// Create device selector UI
function createDeviceSelector(videoDevices) {
    cleanupExistingVideo();
    
    const container = document.createElement('div');
    container.className = 'camera-selector control-panel';
    
    const title = document.createElement('h3');
    title.textContent = 'Select Camera';
    container.appendChild(title);

    const select = document.createElement('select');
    select.id = 'camera-select';
    
    videoDevices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label;
        select.appendChild(option);
    });

    const button = document.createElement('button');
    button.textContent = 'Start Camera';
    button.className = 'primary';

    button.onclick = async () => {
        const selectedDeviceId = select.value;
        try {
            const stream = await initCamera(selectedDeviceId);
            const video = setupVideo(stream, videoDevices);
            container.remove(); // Remove the selector after camera starts
            document.body.appendChild(video);
        } catch (error) {
            showError(error);
        }
    };

    container.appendChild(select);
    container.appendChild(button);
    return container;
}

// Initialize camera access
async function initCamera(deviceId) {
    try {
        // Try to get basic media access with minimal constraints
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });
        
        // Log success and available tracks
        const tracks = stream.getTracks();
        console.log('Media access successful. Available tracks:', tracks.map(t => ({
            kind: t.kind,
            label: t.label,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState,
            settings: t.getSettings()
        })));
        
        return stream;
    } catch (error) {
        console.error('Media access error:', error);
        // Try to get more detailed error information
        if (error.name === 'NotFoundError') {
            console.error('No media devices found. Please check WSL2 device access.');
        } else if (error.name === 'NotAllowedError') {
            console.error('Permission denied. Please check WSL2 permissions.');
        } else if (error.name === 'NotReadableError') {
            console.error('Device is busy or not readable. Please check if another application is using the camera.');
        }
        throw error;
    }
}

// Set up video element
function setupVideo(stream, videoDevices) {
    cleanupExistingVideo();
    
    const container = document.createElement('div');
    container.className = 'camera-container';
    
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    
    // Create camera controls
    const controls = document.createElement('div');
    controls.className = 'camera-controls';
    
    // Add switch camera button if multiple cameras are available
    if (videoDevices.length > 1) {
        const switchButton = document.createElement('button');
        switchButton.textContent = 'Switch Camera';
        switchButton.className = 'secondary';
        switchButton.onclick = async () => {
            try {
                const currentDeviceId = stream.getVideoTracks()[0].getSettings().deviceId;
                const currentIndex = videoDevices.findIndex(d => d.deviceId === currentDeviceId);
                const nextIndex = (currentIndex + 1) % videoDevices.length;
                const nextDeviceId = videoDevices[nextIndex].deviceId;
                
                const newStream = await initCamera(nextDeviceId);
                const newVideo = setupVideo(newStream, videoDevices);
                container.remove();
                document.body.appendChild(newVideo);
            } catch (error) {
                showError(error);
            }
        };
        controls.appendChild(switchButton);
    }
    
    container.appendChild(video);
    container.appendChild(controls);
    
    // Log video element properties
    video.onloadedmetadata = () => {
        const settings = stream.getVideoTracks()[0].getSettings();
        console.log('Video element properties:', {
            width: video.videoWidth,
            height: video.videoHeight,
            readyState: video.readyState,
            error: video.error,
            deviceId: settings.deviceId,
            label: stream.getVideoTracks()[0].label,
            frameRate: settings.frameRate,
            aspectRatio: settings.aspectRatio
        });
    };

    // Add error handling for video element
    video.onerror = (error) => {
        console.error('Video element error:', error);
        showError(error);
    };

    return container;
}

// Show error message
function showError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = 'Error accessing camera: ' + error.message;
    document.body.appendChild(errorDiv);
}

// Track initialization state
let isInitialized = false;

// Initialize camera and video
export async function initCameraAndVideo() {
    // Prevent multiple initializations
    if (isInitialized) {
        console.log('Camera already initialized');
        return;
    }
    isInitialized = true;

    await checkEnvironment();
    try {
        // First check available devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log('Available devices:', devices.map(d => ({
            kind: d.kind,
            label: d.label,
            deviceId: d.deviceId,
            groupId: d.groupId
        })));

        // Find the video devices
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Video devices:', videoDevices.map(d => ({
            label: d.label,
            deviceId: d.deviceId,
            groupId: d.groupId
        })));

        if (videoDevices.length === 0) {
            throw new Error('No video devices found');
        }

        // Create and show device selector
        const selector = createDeviceSelector(videoDevices);
        document.body.appendChild(selector);
    } catch (error) {
        showError(error);
        isInitialized = false; // Reset initialization state on error
    }
} 