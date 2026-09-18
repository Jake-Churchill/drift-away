import * as THREE from 'three';
import { TILES } from './tiles.js';
import { getLevel, isDiscovered, isEligible } from './state.js';
import { buildScene } from './scene.js';
import { updateCloudField, renderCloudField } from './clouds.js';

let renderer, scene, camera, resizeFn, waterMesh, waterBasePositions, tileObjects, cameraPositions;
let cloudField;
let currentZone = 'zone1';
let cameraLookTarget = new THREE.Vector3(0, 0, 0);
let sailAnimation = null;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

export function initScene(canvas) {
  const built = buildScene(canvas);
  renderer = built.renderer;
  scene = built.scene;
  camera = built.camera;
  resizeFn = built.resize;
  waterMesh = built.waterMesh;
  waterBasePositions = built.waterBasePositions;
  tileObjects = built.tileObjects;
  cameraPositions = built.cameraPositions;
  cloudField = built.cloudField;

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
  cameraLookTarget.copy(dest.target);
  camera.lookAt(cameraLookTarget);
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

function updateWater(elapsedSeconds) {
  const positions = waterMesh.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = waterBasePositions[i * 3];
    const z = waterBasePositions[i * 3 + 2];
    const y =
      Math.sin(x * 0.35 + elapsedSeconds * 1.1) * 0.05 +
      Math.sin(z * 0.5 + elapsedSeconds * 0.7) * 0.04 +
      Math.sin((x + z) * 0.2 + elapsedSeconds * 1.6) * 0.025;
    positions.setY(i, y);
  }
  positions.needsUpdate = true;
  waterMesh.geometry.computeVertexNormals();
}

export function updateScene(state, time) {
  advanceSail();
  updateCloudField(cloudField, state.unlocked, time);
  updateWater(time / 1000);

  for (const tile of TILES) {
    const objects = tileObjects.get(tile.id);
    const unlocked = state.unlocked.includes(tile.id);
    const discovered = isDiscovered(tile, state); // already true when `unlocked` is true

    objects.raftMesh.visible = unlocked;
    objects.markerMesh.visible = !unlocked && discovered;

    const level = getLevel(state, tile.id);
    for (const lvl of [1, 2, 3]) {
      objects.propGroups[lvl].visible = lvl === level;
      if (objects.trimMeshes) objects.trimMeshes[lvl].visible = lvl === level;
    }

    if (!unlocked && discovered) {
      const eligible = isEligible(tile, state);
      const pulse = eligible ? 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(time / 300)) : 0.35;
      objects.markerMesh.userData.outlineMaterial.opacity = pulse;
    }
  }

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
