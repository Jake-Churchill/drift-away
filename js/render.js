import * as THREE from 'three';
import { TILES, TILE_BY_ID } from './tiles.js';
import { getLevel, isDiscovered, isEligible, isLit, isUnlocked } from './state.js';
import {
  buildScene,
  frameCamera,
  aimSun,
  CAMERA_OFFSET,
  BASE_VIEW_HALF,
  MIN_VIEW_HALF,
  MAX_VIEW_HALF,
  FOG_NEAR,
  FOG_FAR,
} from './scene.js';
import { updateCloudField, renderCloudField, resizeCloudField, setCloudTint } from './clouds.js';
import { DEFAULT_PALETTE, PALETTES } from './palettes.js';
import { createEffects } from './effects.js';

let renderer, scene, camera, sun, waterMesh, waterUniforms, foamMesh, tileObjects, worldBounds;
let cloudField, effects;

// The camera looks at `camTarget` (a point on the water) from a fixed direction; `viewHalf` is the
// half-height of what it sees, in world units, so a bigger number is zoomed further out.
const camTarget = new THREE.Vector3();
let viewHalf = BASE_VIEW_HALF;
let framedHalf = null;
let canvasSize = { width: 1, height: 1 };
let flight = null;

const START_TILE_ID = TILES.find((t) => t.unlock.type === 'start').id;
const PAN_MARGIN = 10;
const FLIGHT_MS = 900;
const SCREEN_RIGHT = new THREE.Vector3(1, 0, -1).normalize();
const SCREEN_UP_ON_GROUND = new THREE.Vector3(-1, 0, -1).normalize();
const ELEVATION_SIN = CAMERA_OFFSET.y / CAMERA_OFFSET.length();

// The scene's own clock, in ms. It stops for a moment when an unlock lands (the frame hold), which
// freezes water, clouds, foam and effects together while the economy and the HUD carry on.
let visualMs = 0;
let lastFrameMs = null;
let holdMs = 0;
let kick = null;
const kickApplied = new THREE.Vector3();

let appliedPalette = 'default';

const TINT_READY = 0xffd23d;
const TINT_WAIT = 0x7fa8c4;

const FOAM_Y = 0.012;
const foamDummy = new THREE.Object3D();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

export function initScene(canvas) {
  const built = buildScene(canvas);
  renderer = built.renderer;
  scene = built.scene;
  camera = built.camera;
  sun = built.sun;
  waterMesh = built.waterMesh;
  waterUniforms = built.waterUniforms;
  foamMesh = built.foamMesh;
  tileObjects = built.tileObjects;
  worldBounds = built.worldBounds;
  cloudField = built.cloudField;
  effects = createEffects(scene, tileObjects, () => visualMs / 1000);

  function handleResize() {
    canvasSize = { width: window.innerWidth, height: window.innerHeight };
    renderer.setSize(canvasSize.width, canvasSize.height, false);
    resizeCloudField(renderer, cloudField);
    framedHalf = null;
  }
  window.addEventListener('resize', handleResize);
  handleResize();
  resetCamera();
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clampTarget() {
  camTarget.x = Math.min(worldBounds.maxX + PAN_MARGIN, Math.max(worldBounds.minX - PAN_MARGIN, camTarget.x));
  camTarget.z = Math.min(worldBounds.maxZ + PAN_MARGIN, Math.max(worldBounds.minZ - PAN_MARGIN, camTarget.z));
}

// Puts the camera, fog and sun where the current target and zoom say they should be.
function applyView() {
  const scale = viewHalf / BASE_VIEW_HALF;
  if (framedHalf !== viewHalf) {
    frameCamera(camera, canvasSize.width, canvasSize.height, viewHalf);
    framedHalf = viewHalf;
  }
  camera.position.copy(camTarget).addScaledVector(CAMERA_OFFSET, scale);
  camera.lookAt(camTarget);
  scene.fog.near = FOG_NEAR * scale;
  scene.fog.far = FOG_FAR * scale;
  aimSun(sun, camTarget, viewHalf);
}

// Drags the map by a screen-space amount: the point under the cursor stays under the cursor.
export function panByPixels(dx, dy) {
  flight = null;
  const unitsPerPixel = (2 * viewHalf) / canvasSize.height;
  camTarget.addScaledVector(SCREEN_RIGHT, -dx * unitsPerPixel);
  camTarget.addScaledVector(SCREEN_UP_ON_GROUND, (dy * unitsPerPixel) / ELEVATION_SIN);
  clampTarget();
}

// factor > 1 zooms out, < 1 zooms in.
export function zoomBy(factor) {
  viewHalf = Math.min(MAX_VIEW_HALF, Math.max(MIN_VIEW_HALF, viewHalf * factor));
}

// Glides the camera to centre on a tile, keeping the current zoom.
export function flyToTile(tileId) {
  const { raftMesh } = tileObjects.get(tileId);
  flight = {
    from: camTarget.clone(),
    to: new THREE.Vector3(raftMesh.position.x, 0, raftMesh.position.z),
    start: performance.now(),
  };
}

// Back to the starting tile at the default zoom (a restart, a prestige or an import all begin there).
export function resetCamera() {
  flight = null;
  const start = tileObjects.get(START_TILE_ID).raftMesh.position;
  camTarget.set(start.x, 0, start.z);
  viewHalf = BASE_VIEW_HALF;
  applyView();
}

function advanceFlight() {
  if (!flight) return;
  const t = Math.min(1, (performance.now() - flight.start) / FLIGHT_MS);
  camTarget.lerpVectors(flight.from, flight.to, easeInOutCubic(t));
  if (t >= 1) flight = null;
}

// Every impact does the same things at different strength: hold the frame for a beat, kick the
// camera a few pixels, then play the effect. `intensity` runs from 0 to 1.
function impact(intensity) {
  holdMs = 30 + 50 * intensity;
  kick = { start: visualMs, amplitude: 0.05 + 0.17 * intensity, angle: Math.random() * Math.PI * 2 };
}

export function playUnlockImpact(tile, intensity) {
  impact(intensity);
  effects.unlock(tile, intensity);
}

export function playLevelUpImpact(tile, level, intensity) {
  impact(intensity);
  effects.levelUp(tile, level, intensity);
}

// Screen position (CSS pixels) of a tile's marker, for labels drawn over the board.
const projected = new THREE.Vector3();
export function projectTile(tileId) {
  const marker = tileObjects.get(tileId).markerMesh;
  projected.copy(marker.position).project(camera);
  const canvas = renderer.domElement;
  return {
    x: (projected.x * 0.5 + 0.5) * canvas.clientWidth,
    y: (-projected.y * 0.5 + 0.5) * canvas.clientHeight,
  };
}

// The shop's looks: water, sky and cloud colours. Applied when the chosen look changes, which also
// covers loading a save, importing one, and restarting.
function applyPalette(id) {
  const palette = PALETTES[id] ?? DEFAULT_PALETTE;
  waterMesh.material.color.setHex(palette.water);
  scene.background.setHex(palette.background);
  scene.fog.color.setHex(palette.background);
  setCloudTint(cloudField, palette.cloud);
  appliedPalette = id;
}

export function updateScene(state, time, { boardTint }) {
  if (state.shop.palette !== appliedPalette) applyPalette(state.shop.palette);

  const frameMs = lastFrameMs === null ? 0 : Math.max(0, Math.min(100, time - lastFrameMs));
  lastFrameMs = time;
  if (holdMs > 0) holdMs -= frameMs;
  else visualMs += frameMs;

  advanceFlight();
  applyView();
  kickApplied.set(0, 0, 0);
  if (kick) {
    const t = (visualMs - kick.start) / 1000;
    if (t > 0.5) kick = null;
    else {
      const offset = kick.amplitude * Math.exp(-t * 9) * Math.cos(t * 42);
      kickApplied.set(Math.cos(kick.angle) * offset, 0, Math.sin(kick.angle) * offset);
      camera.position.add(kickApplied);
    }
  }

  updateCloudField(cloudField, state.unlocked, visualMs);
  const seconds = visualMs / 1000;
  waterUniforms.uTime.value = seconds;

  for (const tile of TILES) {
    const objects = tileObjects.get(tile.id);
    const unlocked = isUnlocked(state.unlocked, tile.id);
    const discovered = isDiscovered(tile, state); // already true when `unlocked` is true

    objects.raftMesh.visible = unlocked;
    objects.markerMesh.visible = !unlocked && discovered;

    // Foam rings only exist around unlocked rafts: one per cell, in the instance order scene.js gave.
    objects.cellWorld.forEach((cell, k) => {
      const index = objects.foamStart + k;
      const swell = unlocked ? 1 + 0.025 * Math.sin(seconds * 1.3 + index * 2.4) : 0;
      foamDummy.position.set(cell.x, FOAM_Y, cell.z);
      foamDummy.scale.set(swell, 1, swell);
      foamDummy.updateMatrix();
      foamMesh.setMatrixAt(index, foamDummy.matrix);
    });

    if (unlocked) {
      // Props are built the first time a level is shown; a level that hasn't been shown has no group.
      const level = getLevel(state, tile.id);
      const shown = objects.ensureProps(level);
      for (const lvl of [1, 2, 3]) {
        if (objects.propGroups[lvl]) objects.propGroups[lvl].visible = lvl === level;
        if (objects.trimMeshes) objects.trimMeshes[lvl].visible = lvl === level;
      }

      // The Abyssal Trench's bioluminescence: a producer's materials were built in their normal
      // ("lit") appearance (see js/abyssal-props.js's track()) with both states remembered on each
      // one, so a dim producer is just a color/emissive swap here, not a rebuild -- and it can flip
      // back and forth as the player unlocks or (on prestige/restart) loses a nearby booster.
      if (tile.zone === 'zone4' && tile.kind === 'producer') {
        const lit = isLit(tile, state.unlocked);
        for (const d of shown.userData.darken) {
          d.material.color.setHex(lit ? d.litColor : d.dimColor);
          d.material.emissiveIntensity = lit ? d.litEmissiveIntensity : d.dimEmissiveIntensity;
        }
      }
    }

    if (!unlocked && discovered) {
      const eligible = isEligible(tile, state);
      const outline = objects.markerMesh.userData.outlineMaterial;
      const pulse = 0.5 + 0.5 * Math.sin(visualMs / 300);
      if (boardTint) {
        outline.color.setHex(eligible ? TINT_READY : TINT_WAIT);
        outline.opacity = eligible ? 0.7 + 0.3 * pulse : 0.5;
      } else {
        outline.color.setHex(objects.markerMesh.userData.baseColor);
        outline.opacity = eligible ? 0.35 + 0.4 * pulse : 0.35;
      }
    }
  }

  foamMesh.instanceMatrix.needsUpdate = true;
  foamMesh.material.opacity = 0.5 + 0.12 * Math.sin(seconds * 0.9);
  effects.update();

  renderer.render(scene, camera);
  renderCloudField(renderer, cloudField, camera);
}

// The tile under a screen point, or null. Only what is currently drawn can be hit: the rafts of
// unlocked tiles and the marker hexes of discovered locked ones.
export function pickTile(screenX, screenY, canvasWidth, canvasHeight) {
  pointer.x = (screenX / canvasWidth) * 2 - 1;
  pointer.y = -(screenY / canvasHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hitTargets = [];
  for (const objects of tileObjects.values()) {
    if (objects.raftMesh.visible) hitTargets.push(...objects.raftCells);
    if (objects.markerMesh.visible) hitTargets.push(...objects.markerCells);
  }
  const intersections = raycaster.intersectObjects(hitTargets, false);
  if (intersections.length === 0) return null;
  return TILE_BY_ID.get(intersections[0].object.userData.tileId) ?? null;
}
