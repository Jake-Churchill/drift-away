import * as THREE from 'three';

// Textures are generated at startup from a little noise, so there are no image files to ship or load.

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Periodic value noise: cx x cy lattice cells across the tile, so the result repeats seamlessly.
function valueNoise(size, cx, cy, seed) {
  const r = rng(seed);
  const lat = new Float32Array(cx * cy);
  for (let i = 0; i < lat.length; i++) lat[i] = r();
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const fy = (y / size) * cy;
    const iy = Math.floor(fy);
    const ty = fy - iy;
    const sy = ty * ty * (3 - 2 * ty);
    const y0 = iy % cy;
    const y1 = (iy + 1) % cy;
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * cx;
      const ix = Math.floor(fx);
      const tx = fx - ix;
      const sx = tx * tx * (3 - 2 * tx);
      const x0 = ix % cx;
      const x1 = (ix + 1) % cx;
      const a = lat[y0 * cx + x0];
      const b = lat[y0 * cx + x1];
      const c = lat[y1 * cx + x0];
      const d = lat[y1 * cx + x1];
      const top = a + (b - a) * sx;
      const bottom = c + (d - c) * sx;
      out[y * size + x] = top + (bottom - top) * sy;
    }
  }
  return out;
}

function fbm(size, cx, cy, octaves, seed) {
  const out = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = valueNoise(size, cx << o, cy << o, seed + o * 101);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

// Height field -> tangent-space normal map (green up), wrapping at the edges so it tiles.
function normalFromHeight(h, size, strength) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    const yu = (y - 1 + size) % size;
    const yd = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xl = (x - 1 + size) % size;
      const xr = (x + 1) % size;
      const dx = (h[y * size + xr] - h[y * size + xl]) * strength;
      const dy = (h[yd * size + x] - h[yu * size + x]) * strength;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      data[i] = (-dx * inv * 0.5 + 0.5) * 255;
      data[i + 1] = (-dy * inv * 0.5 + 0.5) * 255;
      data[i + 2] = (inv * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  return data;
}

export function createWaterNormalTexture(anisotropy) {
  const size = 512;
  const broad = fbm(size, 6, 6, 5, 201);
  const fine = fbm(size, 14, 14, 3, 203);
  const height = broad.map((v, i) => v * 0.75 + fine[i] * 0.25);
  const texture = new THREE.DataTexture(normalFromHeight(height, size, 9), size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

// A hex-shaped foam edge sized to sit just outside a raft (hex radius 100px of the 256px canvas),
// hollow in the middle so the deck's own colour is untouched.
export function createFoamTexture(anisotropy) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const cx = 128;
  const cy = 128;
  const radius = 100;
  const hex = (r) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i - 90);
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  ctx.shadowColor = 'rgba(255,255,255,0.9)';
  for (const [width, blur, alpha] of [[16, 22, 0.35], [8, 12, 0.55], [3, 4, 0.8]]) {
    ctx.shadowBlur = blur;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = width;
    hex(radius + 6);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  const r = rng(17);
  for (let i = 0; i < 90; i++) {
    const a = r() * Math.PI * 2;
    const d = radius + 4 + (r() - 0.35) * 22;
    ctx.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.5})`;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d * 0.98, cy + Math.sin(a) * d * 0.98, 1 + r() * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0,0,0,1)';
  hex(radius - 6);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}
