// Check if WebRTC is supported
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
	console.log('WebRTC is supported');
} else {
	alert('WebRTC is not supported by your browser');
}

let cameraStream;
let cameraContainer = document.getElementById('camera-container');
let cameraView = document.getElementById('camera-view');
let hideOnCaptureEls = document.querySelectorAll('.hide-on-capture');
let canvas = document.getElementById('canvas');
let photoInfo = document.getElementById('photo-info');
let photo = document.getElementById('photo');
let captureBtn = document.getElementById('capture-btn');

let width = 1920;
let height = 0;

let geoWatchId;
let photoInfoInterval;
let isRearCamera = true;
let isStreaming = false;

// Ask for camera permission
const askForCameraPermission = async () => {
	const stream = await navigator.mediaDevices.getUserMedia({
		video: true,
		audio: false,
	});
	cameraStream = stream;
	stopCameraStream();
};

// Get list of cameras
const getCameraDevices = async () => {
	const devices = await navigator.mediaDevices.enumerateDevices();
	return devices.filter((device) => device.kind === 'videoinput' && device.deviceId);
};

// Start camera stream
const startCameraStream = async () => {
	let constraints = {
		video: {
			facingMode: isRearCamera ? 'environment' : 'user',
			width: { min: 1280, ideal: 1920, max: 2048 },
		},
		audio: false,
	};

	try {
		stopCameraStream();
		cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
	} catch (error) {
		stopCameraStream();
		isRearCamera = !isRearCamera;
		constraints.video.facingMode = isRearCamera ? 'environment' : 'user';
		cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
	}
};

// Stop camera stream
const stopCameraStream = () => {
	if (cameraStream) {
		cameraStream.getTracks().forEach((track) => track.stop());
	}
};

const switchCamera = async () => {
	isRearCamera = !isRearCamera;
	await startCameraStream();
	cameraView.srcObject = cameraStream;
	cameraView.play();
};

const onVideoCanPlayHandler = () => {
	cameraView.addEventListener('canplay', (event) => {
		if (!isStreaming) {
			height = (cameraView.videoHeight / cameraView.videoWidth) * width;
			cameraView.style.width = '100%';
			cameraView.style.height = '100%';
			canvas.setAttribute('width', width);
			canvas.setAttribute('height', height);
			isStreaming = true;
		}
	});
};

// Display camera view
const startCamera = async () => {
	try {
		onVideoCanPlayHandler();
		cameraContainer.style.display = 'flex';
		hideOnCaptureEls.forEach((el) => (el.hidden = true));

		await startCameraStream();
		displayPhotoInfo();

		cameraView.srcObject = cameraStream;
		cameraView.play();
	} catch (error) {
		alert('Error starting camera: ' + error);
	}
};

const stopCamera = () => {
	stopCameraStream();
	cameraContainer.style.display = 'none';
	hideOnCaptureEls.forEach((el) => (el.hidden = false));
	photoInfo.hidden = true;
	navigator.geolocation.clearWatch(geoWatchId);
};

const takePhoto = async (event) => {
	event.preventDefault();
	const context = canvas.getContext('2d');
	if (width && height) {
		canvas.width = 1920;
		canvas.height = (1920 / width) * height;
		context.drawImage(cameraView, 0, 0, width, height);
		stopCamera();

		// Box properties
		const boxWidth = 1000;
		const boxHeight = 220;
		const boxX = canvas.width - boxWidth; // Position on the right
		const boxY = 0; // Position at the top
		const borderRadius = 30;

		// Draw a semi-transparent rectangle with only the bottom-left corner rounded
		context.beginPath();
		context.moveTo(boxX, boxY); // Top-left corner
		context.lineTo(boxX + boxWidth, boxY); // Top side
		context.lineTo(boxX + boxWidth, boxY + boxHeight); // Right side
		context.lineTo(boxX + borderRadius, boxY + boxHeight); // Bottom side before the curve
		context.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - borderRadius); // Bottom-left curve
		context.lineTo(boxX, boxY); // Close the path to the top-left
		context.closePath();
		context.fillStyle = 'rgba(255, 255, 255, 0.5)'; // Semi-transparent white
		context.fill();

		// Add text inside the box
		context.font = '52px Arial';
		context.fillStyle = '#000'; // Black text
		context.textAlign = 'left'; // Align text to the left
		context.textBaseline = 'top'; // Align text to the top

		// Draw the text dynamically
		const padding = 50; // Padding inside the box
		const lineHeight = 80;
		const timeText = `Thời gian: ${window.currentTime}`;
		const coordsText = `Tọa độ: (${window.currentGeo.latitude}, ${window.currentGeo.longitude})`;
		context.fillText(timeText, boxX + padding, boxY + padding); // Text with padding from top-left
		context.fillText(coordsText, boxX + padding, boxY + padding + lineHeight);

		let url;
		canvas.toBlob((blob) => {
			url = URL.createObjectURL(blob);
			photo.setAttribute('src', url);
		}, 'image/jpeg');

		const download = document.getElementById('download');
		download.addEventListener('click', () => {
			const link = document.createElement('a');
			link.href = url;
			link.download = 'photo.jpg'; // File name
			link.click();
		});
	} else {
		clearPhoto();
	}
};

const clearPhoto = () => {
	const context = canvas.getContext('2d');
	context.fillStyle = '#AAA';
	context.fillRect(0, 0, canvas.width, canvas.height);

	const data = canvas.toDataURL('image/png');
	photo.setAttribute('src', data);
};

const displayPhotoInfo = () => {
	photoInfo.hidden = false;

	const success = (position) => {
		window.currentGeo = position.coords;
		if (photoInfoInterval) clearInterval(photoInfoInterval);
		photoInfoInterval = setInterval(() => {
			window.currentTime = new Date().toLocaleTimeString();
			photoInfo.innerHTML = `
			<p>Thời gian: ${window.currentTime}</p>
			<p>Tọa độ: (${window.currentGeo.latitude}, ${window.currentGeo.longitude})</p>
			`;
		}, 50);
	};

	const options = {
		enableHighAccuracy: true,
		maximumAge: 0,
		timeout: 3000,
	};

	geoWatchId = navigator.geolocation.watchPosition(success, null, options);
};
