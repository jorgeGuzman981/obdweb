// Variables globales que almacenarán la transmisión de la cámara, el objeto MediaRecorder y los fragmentos de video.
let stream;
let mediaRecorder;
let chunks = [];
let currentDeviceId = null;

// Esta función inicia la cámara.
async function startCamera() {
    // Si no hay un dispositivo actualmente seleccionado...
    if (!currentDeviceId) {
        // Solicita acceso a la cámara y micrófono del usuario.
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        // Almacena el ID del dispositivo actual.
        currentDeviceId = stream.getVideoTracks()[0].getSettings().deviceId;
    } else {
        // Si ya hay un dispositivo seleccionado, cambiamos a la otra cámara (delantera o trasera).
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

    // Muestra la transmisión de la cámara en el elemento <video>.
    document.getElementById('preview').srcObject = stream;
}

// Esta función captura una foto.
function takePhoto() {
    // Crea un elemento canvas para capturar y almacenar la foto.
    const canvas = document.createElement('canvas');
    canvas.width = stream.getVideoTracks()[0].getSettings().width;
    canvas.height = stream.getVideoTracks()[0].getSettings().height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(document.getElementById('preview'), 0, 0, canvas.width, canvas.height);
    const photo = canvas.toDataURL('image/jpeg');
    // Envía la foto al servidor.
    sendDataToServer(photo);

    // Crea un enlace para descargar la foto.
    const photoLink = document.createElement('a');
    photoLink.href = photo;
    photoLink.download = 'photo.jpeg';
    photoLink.innerText = 'Descargar Foto';
    document.getElementById('downloadLinks').appendChild(photoLink);
}

// Esta función inicia la grabación de video.
function startRecording() {
    chunks = [];
    // Configura el MediaRecorder para grabar.
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/mp4' });
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        sendDataToServer(blob);

        // Crea un enlace para descargar el video.
        const videoUrl = URL.createObjectURL(blob);
        const videoLink = document.createElement('a');
        videoLink.href = videoUrl;
        videoLink.download = 'recordedVideo.mp4';
        videoLink.innerText = 'Descargar Video';
        document.getElementById('downloadLinks').appendChild(videoLink);
    };
    mediaRecorder.start();
}

// Esta función detiene la grabación de video.
function stopRecording() {
    mediaRecorder.stop();
}

// Esta función cambia entre la cámara frontal y trasera.
function switchCamera() {
    stopStreamedVideo(document.getElementById('preview'));
    startCamera();
}

// Esta función envía datos (foto o video) al servidor.
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

// Esta función detiene la transmisión de video.
function stopStreamedVideo(videoElem) {
    const stream = videoElem.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach((track) => {
        track.stop();
    });

    videoElem.srcObject = null;
}

// Esta función obtiene la lista de cámaras disponibles.
async function getCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
}
