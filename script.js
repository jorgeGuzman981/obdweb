let stream;
let mediaRecorder;
let chunks = [];
let currentDeviceId = null;

async function startCamera() {
    if (!currentDeviceId) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        currentDeviceId = stream.getVideoTracks()[0].getSettings().deviceId;
    } else {
        getCameras().then(devices => {
            const nextDevice = devices.find(device => device.deviceId !== currentDeviceId);
            if (nextDevice) {
                currentDeviceId = nextDevice.deviceId;
                navigator.mediaDevices.getUserMedia({
                    video: { deviceId: nextDevice.deviceId },
                    audio: true
                }).then(newStream => {
                    document.getElementById('preview').srcObject = newStream;
                    stream = newStream;
                });
            }
        });
    }

    document.getElementById('preview').srcObject = stream;
}

function takePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = stream.getVideoTracks()[0].getSettings().width;
    canvas.height = stream.getVideoTracks()[0].getSettings().height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(document.getElementById('preview'), 0, 0, canvas.width, canvas.height);
    const photo = canvas.toDataURL('image/jpeg');
    sendDataToServer(photo);
}

function startRecording() {
    chunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/mp4' });
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        sendDataToServer(blob);
    };
    mediaRecorder.start();
}

function stopRecording() {
    mediaRecorder.stop();
}

function switchCamera() {
    stopStreamedVideo(document.getElementById('preview'));
    startCamera();
}

function sendDataToServer(data) {
    const formData = new FormData();
    if (data instanceof Blob) {
        formData.append('video', data, 'recordedVideo.mp4');
    } else {
        formData.append('photo', data);
    }
    fetch('ruta_al_servidor', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

function stopStreamedVideo(videoElem) {
    const stream = videoElem.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach((track) => {
        track.stop();
    });

    videoElem.srcObject = null;
}

async function getCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
}
