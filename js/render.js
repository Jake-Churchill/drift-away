import * as THREE from 'three';
import { TILES } from './tiles.js';
import { isDiscovered, isEligible } from './state.js';
import { buildScene } from './scene.js';

let renderer, scene, camera, resizeFn, waterMesh, waterBasePositions, tileObjects;

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

  function handleResize() {
    resizeFn(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', handleResize);
  handleResize();
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
  updateWater(time / 1000);

  for (const tile of TILES) {
    const objects = tileObjects.get(tile.id);
    const unlocked = state.unlocked.includes(tile.id);
    const discovered = isDiscovered(tile, state); // already true when `unlocked` is true

    objects.raftMesh.visible = unlocked;
    objects.markerMesh.visible = !unlocked && discovered;

    if (!unlocked && discovered) {
      const eligible = isEligible(tile, state);
      const pulse = eligible ? 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(time / 300)) : 0.35;
      objects.markerMesh.userData.outlineMaterial.opacity = pulse;
    }
  }

  renderer.render(scene, camera);
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
