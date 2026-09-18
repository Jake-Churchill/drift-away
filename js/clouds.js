import * as THREE from 'three';

// The cloud field fills everything outside the land, leaving an even strip of open sea around every
// open zone. A zone is "open" once any of its tiles is unlocked; the first zone is open from the
// start. Opening a zone clears the clouds over it and pulls the cloud edge out to the same sea gap
// around the newly larger map. Zones are assumed to open in ZONES order, since each is reached by
// adjacency from the previous one.
const CLOUD_OPACITY = 0.4;
const SEA_GAP = 2;
const EDGE_WIDTH = 10.5;
// A puff's visible body reaches about this fraction of its width from its center, along the ground.
const VISIBLE_HALF = 0.4;
const MAX_ASPECT = 2.5;
const VIEW_MARGIN = 6;
const DISSOLVE_MS = 1100;
const DISSOLVE_DELAY_PER_UNIT = 40;

function paintCloud(shadowSpots, topSpots) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  function blob(x, y, r, color, hardness) {
    const g = ctx.createRadialGradient(x, y, r * hardness, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const [x, y, r] of shadowSpots) blob(x, y, r, 'rgba(96,112,146,0.95)', 0.72);
  for (const [x, y, r] of topSpots) blob(x, y, r, 'rgba(214,220,232,1)', 0.8);
  return new THREE.CanvasTexture(canvas);
}

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function minDist(list, x, z) {
  let d = Infinity;
  for (const c of list) d = Math.min(d, Math.hypot(x - c.x, z - c.z));
  return d;
}

// Points on the outline of "everything within rho of a tile center": an even offset around the land.
function contourPoints(centers, rho, step) {
  const pts = [];
  for (const c of centers) {
    const n = Math.ceil((2 * Math.PI * rho) / step);
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2;
      const x = c.x + rho * Math.cos(th);
      const z = c.z + rho * Math.sin(th);
      if (minDist(centers, x, z) < rho - 0.02) continue;
      if (pts.some((q) => Math.hypot(q.x - x, q.z - z) < step * 0.6)) continue;
      pts.push({ x, z });
    }
  }
  return pts;
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// zoneTiles: Map zoneId -> [{ id, x, z }] in world coordinates. cameraTargets: one framing target
// per zone, in zone order, used to work out how far the field has to reach.
export function buildCloudField({ zoneIds, zoneTiles, landRadius, viewHalfHeight, cameraTargets, cameraOffset }) {
  const scene = new THREE.Scene();
  const target = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });

  // The puffs overlap heavily. Drawn straight into the main scene their transparency would stack
  // into a near-solid blanket, so they're drawn into their own layer and blended once.
  const compositeMaterial = new THREE.ShaderMaterial({
    uniforms: { tMap: { value: target.texture }, uOpacity: { value: CLOUD_OPACITY } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D tMap;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec4 c = texture2D(tMap, vUv);
        vec3 rgb = c.a > 0.0001 ? c.rgb / c.a : vec3(0.0);
        gl_FragColor = vec4(rgb, c.a * uOpacity);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const compositeScene = new THREE.Scene();
  compositeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compositeMaterial));
  const compositeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const textures = [
    paintCloud(
      [[380, 390, 220], [520, 360, 260], [660, 396, 210], [300, 424, 156], [740, 416, 156]],
      [[380, 290, 200], [510, 244, 256], [650, 286, 196], [300, 336, 144], [730, 326, 144]]
    ),
    paintCloud(
      [[420, 400, 200], [590, 372, 240], [730, 410, 170], [330, 430, 130]],
      [[420, 306, 180], [580, 264, 236], [720, 312, 160], [340, 344, 120]]
    ),
  ];

  // Which ground points can ever be on screen, across every zone framing and the sail between them.
  const viewCam = new THREE.OrthographicCamera();
  viewCam.position.copy(cameraOffset);
  viewCam.lookAt(0, 0, 0);
  viewCam.updateMatrixWorld();
  const viewRot = new THREE.Matrix3().setFromMatrix4(viewCam.matrixWorldInverse);
  const sampleTargets = [];
  cameraTargets.forEach((t, i) => {
    if (i === 0) sampleTargets.push(t.clone());
    else for (let s = 1; s <= 6; s++) sampleTargets.push(cameraTargets[i - 1].clone().lerp(t, s / 6));
  });
  const halfH = viewHalfHeight + VIEW_MARGIN;
  const halfW = halfH * MAX_ASPECT;
  const canBeVisible = (x, z) =>
    sampleTargets.some((t) => {
      const d = new THREE.Vector3(x - t.x, -t.y, z - t.z).applyMatrix3(viewRot);
      return Math.abs(d.y) <= halfH && Math.abs(d.x) <= halfW;
    });

  // A puff floating at height h shows up h * cos(elevation) higher on screen, which would widen the
  // sea gap on the north side and squeeze it on the south. Sliding it back toward the camera along
  // the ground by the matching amount keeps the gap even all the way around.
  const groundDist = Math.hypot(cameraOffset.x, cameraOffset.z);
  const lift = groundDist / cameraOffset.y;
  const compX = (cameraOffset.x / groundDist) * lift;
  const compZ = (cameraOffset.z / groundDist) * lift;

  const puffs = [];
  const rnd = seeded(7);

  function addPuff(x, z, width, bright) {
    const material = new THREE.SpriteMaterial({
      map: textures[rnd() < 0.5 ? 0 : 1],
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    // Overlapping puffs of identical brightness melt into a flat wash; varying them keeps the billows readable.
    material.color.setScalar(bright ? 1 : 0.6 + rnd() * 0.4);
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(width * (rnd() < 0.5 ? -1 : 1), width * 0.625, 1);
    scene.add(sprite);

    const ownRho = landRadius + SEA_GAP + VISIBLE_HALF * width;
    puffs.push({
      sprite,
      x,
      z,
      y: 1 + rnd() * 0.6,
      factor: 0.9 + rnd() * 0.1,
      phase: rnd() * Math.PI * 2,
      out: new THREE.Vector2(),
      // The zones whose land, once open, would leave this puff inside their sea gap.
      clearedBy: zoneIds.filter((id) => minDist(zoneTiles.get(id), x, z) < ownRho - 0.05),
      dissolve: null,
      gone: false,
    });
  }

  const homeCenters = zoneTiles.get(zoneIds[0]);
  const allCenters = zoneIds.flatMap((id) => zoneTiles.get(id));
  const rho = landRadius + SEA_GAP + VISIBLE_HALF * EDGE_WIDTH;

  // One row of puffs exactly on the even-gap outline for each stage of the map (first zone only,
  // first two zones, ...). The outlines for later stages start out hidden inside the fog.
  zoneIds.forEach((_, k) => {
    const centers = zoneIds.slice(0, k + 1).flatMap((id) => zoneTiles.get(id));
    for (const p of contourPoints(centers, rho, 3.1)) {
      if (canBeVisible(p.x, p.z)) addPuff(p.x, p.z, EDGE_WIDTH, true);
    }
  });

  // Everything beyond the edge row, out past the screen edges. Puffs get bigger and sparser with
  // distance so the far field stays cheap.
  const xs = allCenters.map((c) => c.x);
  const zs = allCenters.map((c) => c.z);
  const pad = halfW + halfH;
  const STEP = 4;
  for (let gx = Math.min(...xs) - pad; gx <= Math.max(...xs) + pad; gx += STEP) {
    for (let gz = Math.min(...zs) - pad; gz <= Math.max(...zs) + pad; gz += STEP) {
      const x = gx + (rnd() - 0.5) * STEP * 0.8;
      const z = gz + (rnd() - 0.5) * STEP * 0.8;
      if (minDist(homeCenters, x, z) < rho + 1.6) continue;
      if (!canBeVisible(x, z)) continue;
      const far = Math.max(0, minDist(allCenters, x, z) - rho);
      const cell = Math.min(9, 4.4 + far * 0.2);
      if (rnd() > (4.4 / cell) ** 2) continue;
      addPuff(x, z, Math.min(24, 11 + far * 0.4 + rnd() * 2), false);
    }
  }

  return {
    scene, target, compositeScene, compositeCamera, puffs, zoneIds, zoneTiles,
    lift, compX, compZ,
    openZones: null,
  };
}

export function resizeCloudField(renderer, field) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  field.target.setSize(size.x, size.y);
}

function applyOpenZones(field, open, unlocked, now) {
  const firstApply = field.openZones === null;
  // Where the ripple starts: a tile of a zone that just opened.
  let origin = null;
  if (!firstApply) {
    for (const id of open) {
      if (field.openZones.has(id)) continue;
      origin = field.zoneTiles.get(id).find((t) => unlocked.has(t.id)) ?? null;
      if (origin) break;
    }
  }

  for (const p of field.puffs) {
    const shouldBeGone = p.clearedBy.some((id) => open.has(id));
    if (shouldBeGone && !p.gone && !p.dissolve) {
      if (firstApply || !origin) {
        p.gone = true;
      } else {
        p.out.set(p.x - origin.x, p.z - origin.z).normalize();
        p.dissolve = { start: now + Math.hypot(p.x - origin.x, p.z - origin.z) * DISSOLVE_DELAY_PER_UNIT };
      }
    } else if (!shouldBeGone && (p.gone || p.dissolve)) {
      p.gone = false;
      p.dissolve = null;
    }
  }
  field.openZones = open;
}

export function updateCloudField(field, unlockedIds, now) {
  const unlocked = new Set(unlockedIds);
  const open = new Set(field.zoneIds.filter((id) => field.zoneTiles.get(id).some((t) => unlocked.has(t.id))));
  const changed = field.openZones === null || open.size !== field.openZones.size || [...open].some((id) => !field.openZones.has(id));
  if (changed) applyOpenZones(field, open, unlocked, now);

  for (const p of field.puffs) {
    let e = 0;
    if (p.dissolve) {
      const raw = (now - p.dissolve.start) / DISSOLVE_MS;
      e = raw <= 0 ? 0 : easeInOut(Math.min(1, raw));
      if (raw >= 1) {
        p.gone = true;
        p.dissolve = null;
      }
    }
    p.sprite.visible = !p.gone;
    if (p.gone) continue;

    const height = p.y + Math.sin(now / 1800 + p.phase) * 0.12 + e * 2.5;
    p.sprite.position.set(
      p.x + Math.sin(now / 4000 + p.phase) * 0.3 + p.out.x * e * 2.5 + height * field.compX,
      height,
      p.z + Math.cos(now / 5000 + p.phase) * 0.25 + p.out.y * e * 2.5 + height * field.compZ
    );
    p.sprite.material.opacity = p.factor * (1 - e);
  }
}

export function renderCloudField(renderer, field, camera) {
  renderer.setRenderTarget(field.target);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(field.scene, camera);
  renderer.setRenderTarget(null);
  renderer.autoClear = false;
  renderer.render(field.compositeScene, field.compositeCamera);
  renderer.autoClear = true;
}
