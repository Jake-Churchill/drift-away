import * as THREE from 'three';
import { TILES } from './tiles.js';
import { getLevel, isDiscovered, isEligible, isLit } from './state.js';
import { buildScene } from './scene.js';
import { updateCloudField, renderCloudField, setCloudTint } from './clouds.js';
import { DEFAULT_PALETTE, PALETTES } from './palettes.js';
import { createEffects } from './effects.js';

let renderer, scene, camera, resizeFn, waterMesh, waterUniforms, foamMesh, tileObjects, cameraPositions;
let cloudField, effects;
let currentZone = 'zone1';
let cameraLookTarget = new THREE.Vector3(0, 0, 0);
let sailAnimation = null;

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
  resizeFn = built.resize;
  waterMesh = built.waterMesh;
  waterUniforms = built.waterUniforms;
  foamMesh = built.foamMesh;
  tileObjects = built.tileObjects;
  cameraPositions = built.cameraPositions;
  cloudField = built.cloudField;
  effects = createEffects(scene, tileObjects, () => visualMs / 1000);

  function handleResize() {
    resizeFn(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', handleResize);
  handleResize();
}

const SAIL_DURATION_MS = 1200;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function getCurrentZone() {
  return currentZone;
}

export function sailToZone(zoneId) {
  if (sailAnimation || zoneId === currentZone) return;
  const dest = cameraPositions.get(zoneId);
  if (!dest) return;
  sailAnimation = {
    fromPos: camera.position.clone(),
    fromTarget: cameraLookTarget.clone(),
    toPos: dest.position.clone(),
    toTarget: dest.target.clone(),
    startTime: performance.now(),
    destZone: zoneId,
  };
}

export function resetCamera() {
  sailAnimation = null;
  currentZone = 'zone1';
  const dest = cameraPositions.get('zone1');
  camera.position.copy(dest.position);
  kickApplied.set(0, 0, 0);
  cameraLookTarget.copy(dest.target);
  camera.lookAt(cameraLookTarget);
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

function advanceSail() {
  if (!sailAnimation) return;
  const t = Math.min(1, (performance.now() - sailAnimation.startTime) / SAIL_DURATION_MS);
  const e = easeInOutCubic(t);
  camera.position.lerpVectors(sailAnimation.fromPos, sailAnimation.toPos, e);
  cameraLookTarget.lerpVectors(sailAnimation.fromTarget, sailAnimation.toTarget, e);
  camera.lookAt(cameraLookTarget);
  if (t >= 1) {
    currentZone = sailAnimation.destZone;
    sailAnimation = null;
  }
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

  camera.position.sub(kickApplied);
  advanceSail();
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

  for (let i = 0; i < TILES.length; i++) {
    const tile = TILES[i];
    const objects = tileObjects.get(tile.id);
    const unlocked = state.unlocked.includes(tile.id);
    const discovered = isDiscovered(tile, state); // already true when `unlocked` is true

    objects.raftMesh.visible = unlocked;
    objects.markerMesh.visible = !unlocked && discovered;

    // Foam rings only exist around unlocked rafts; the index matches the instance order in scene.js.
    const raft = objects.raftMesh.position;
    const swell = unlocked ? 1 + 0.025 * Math.sin(seconds * 1.3 + i * 2.4) : 0;
    foamDummy.position.set(raft.x, FOAM_Y, raft.z);
    foamDummy.scale.set(swell, 1, swell);
    foamDummy.updateMatrix();
    foamMesh.setMatrixAt(i, foamDummy.matrix);

    const level = getLevel(state, tile.id);
    for (const lvl of [1, 2, 3]) {
      objects.propGroups[lvl].visible = lvl === level;
      if (objects.trimMeshes) objects.trimMeshes[lvl].visible = lvl === level;
    }

    // Zone 3's bioluminescence: a producer's materials were built in their normal ("lit")
    // appearance (see js/zone3-props.js's track()) with both states remembered on each one, so a
    // dim producer is just a color/emissive swap here, not a rebuild — and it can flip back and
    // forth as the player unlocks or (on prestige/restart) loses a nearby booster.
    if (unlocked && tile.zone === 'zone3' && tile.kind === 'producer') {
      const lit = isLit(tile, state.unlocked);
      for (const d of objects.propGroups[level].userData.darken || []) {
        d.material.color.setHex(lit ? d.litColor : d.dimColor);
        d.material.emissiveIntensity = lit ? d.litEmissiveIntensity : d.dimEmissiveIntensity;
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

export function screenToGrid(screenX, screenY, canvasWidth, canvasHeight) {
  pointer.x = (screenX / canvasWidth) * 2 - 1;
  pointer.y = -(screenY / canvasHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hitTargets = [...tileObjects.values()]
    .flatMap((t) => [t.raftMesh, t.markerMesh])
    .filter((mesh) => mesh.visible);
  const intersections = raycaster.intersectObjects(hitTargets, false);
  if (intersections.length === 0) return null;

  const tileId = intersections[0].object.userData.tileId;
  const tile = TILES.find((t) => t.id === tileId);
  return tile ? tile.gridPos : null;
}
