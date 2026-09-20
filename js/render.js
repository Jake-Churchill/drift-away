import * as THREE from 'three';
import { TILES } from './tiles.js';
import { getLevel, isDiscovered, isEligible } from './state.js';
import { buildScene } from './scene.js';
import { updateCloudField, renderCloudField } from './clouds.js';

let renderer, scene, camera, resizeFn, waterUniforms, foamMesh, tileObjects, cameraPositions;
let cloudField;
let currentZone = 'zone1';
let cameraLookTarget = new THREE.Vector3(0, 0, 0);
let sailAnimation = null;

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
  waterUniforms = built.waterUniforms;
  foamMesh = built.foamMesh;
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

export function updateScene(state, time) {
  advanceSail();
  updateCloudField(cloudField, state.unlocked, time);
  const seconds = time / 1000;
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

    if (!unlocked && discovered) {
      const eligible = isEligible(tile, state);
      const pulse = eligible ? 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(time / 300)) : 0.35;
      objects.markerMesh.userData.outlineMaterial.opacity = pulse;
    }
  }

  foamMesh.instanceMatrix.needsUpdate = true;
  foamMesh.material.opacity = 0.5 + 0.12 * Math.sin(seconds * 0.9);

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
