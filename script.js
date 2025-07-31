const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const fpsDisplay = document.getElementById("fps");
const handCountDisplay = document.getElementById("handCount");

let lastFrameTime = performance.now();

function updateFPS() {
  const now = performance.now();
  const delta = now - lastFrameTime;
  const fps = Math.round(1000 / delta);
  lastFrameTime = now;
  fpsDisplay.textContent = `FPS: ${fps}`;
}

function resizeCanvas() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
}

// Hand tracking setup
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});
hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.6,
});

let latestHands = [];
hands.onResults((results) => {
  latestHands = results.multiHandLandmarks || [];
});

// FaceMesh for eye tracking
const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/facemesh/${file}`,
});
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

let latestFace = null;
faceMesh.onResults((results) => {
  latestFace = results.multiFaceLandmarks?.[0] || null;
});

// Drawing loop
async function drawLoop() {
  if (video.readyState >= 2) {
    resizeCanvas();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateFPS();

    // Draw hand landmarks
    if (latestHands.length > 0) {
      handCountDisplay.textContent = `Hands: ${latestHands.length}`;
      for (const landmarks of latestHands) {
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: "#00ffcc", lineWidth: 3 });
        drawLandmarks(ctx, landmarks, { color: "#ffcc00", lineWidth: 2 });
      }
    } else {
      handCountDisplay.textContent = `Hands: 0`;
    }

    // Draw eyes from FaceMesh
    if (latestFace) {
      const LEFT_EYE = [33, 133];
      const RIGHT_EYE = [362, 263];

      ctx.fillStyle = "#00ff00";
      for (const idx of LEFT_EYE) {
        const { x, y } = latestFace[idx];
        ctx.beginPath();
        ctx.arc(x * canvas.width, y * canvas.height, 4, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.fillStyle = "#ff0000";
      for (const idx of RIGHT_EYE) {
        const { x, y } = latestFace[idx];
        ctx.beginPath();
        ctx.arc(x * canvas.width, y * canvas.height, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }

  requestAnimationFrame(drawLoop);
}

// Camera setup
const camera = new Camera(video, {
  onFrame: async () => {
    await Promise.all([
      hands.send({ image: video }),
      faceMesh.send({ image: video })
    ]);
  },
  width: 1280,
  height: 720,
});
camera.start();

// Theme toggle
document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
});

// Start drawing loop
drawLoop();
