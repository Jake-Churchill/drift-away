import { loadState, tick } from './state.js';
import { drawScene } from './render.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let state = loadState();

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let lastFrameTime = performance.now();

function loop(now) {
  const dt = Math.min(0.25, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  tick(state, dt);
  drawScene(ctx, canvas, state, now);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
