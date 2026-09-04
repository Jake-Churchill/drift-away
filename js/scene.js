import * as THREE from 'three';
import { TILES } from './tiles.js';

export const GRID_ROWS = 6;
export const GRID_COLS = 6;

const HEX_RADIUS = 1.6;
const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS;
const HEX_HEIGHT = 2 * HEX_RADIUS;
const ROW_SPACING = 0.75 * HEX_HEIGHT;
const WALL_HEIGHT = 0.35;

const WOOD_TOP = 0xc9975b;
const BOOSTER_TRIM = 0xe0b84b;
const MARKER_COLOR = 0xbcd8e8;
const CAMERA_FRUSTUM_HALF_SIZE = 12;

function gridBounds() {
  return {
    width: GRID_COLS * HEX_WIDTH + HEX_WIDTH / 2,
    depth: (GRID_ROWS - 1) * ROW_SPACING + HEX_HEIGHT,
  };
}

function hexLocalPosition(row, col) {
  const bounds = gridBounds();
  const x = col * HEX_WIDTH + (row % 2 === 1 ? HEX_WIDTH / 2 : 0) + HEX_WIDTH / 2 - bounds.width / 2;
  const z = row * ROW_SPACING + HEX_HEIGHT / 2 - bounds.depth / 2;
  return { x, z };
}

function hexShape(radius) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 90);
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function hexOutlinePoints(radius) {
  const points = [];
  for (let i = 0; i <= 6; i++) {
    const angle = (Math.PI / 180) * (60 * (i % 6) - 90);
    points.push(new THREE.Vector3(radius * Math.cos(angle), 0, radius * Math.sin(angle)));
  }
  return points;
}

function buildFishProp(group) {
  const material = new THREE.MeshStandardMaterial({ color: 0x5fa8d3, roughness: 0.4, metalness: 0.15 });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 12), material);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.25;
  body.castShadow = true;
  group.add(body);
}

function buildKelpProp(group) {
  const material = new THREE.MeshStandardMaterial({ color: 0x4c9a6a, roughness: 0.7 });
  for (const offset of [-0.3, 0, 0.3]) {
    const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.6, 6), material);
    strand.position.set(offset, 0.3, 0);
    strand.castShadow = true;
    group.add(strand);
  }
}

function buildDriftwoodProp(group) {
  const material = new THREE.MeshStandardMaterial({ color: 0x5a3f22, roughness: 0.9 });
  const logA = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8), material);
  logA.rotation.z = Math.PI / 2;
  logA.rotation.y = 0.2;
  logA.position.y = 0.1;
  logA.castShadow = true;
  const logB = logA.clone();
  logB.rotation.y = -0.3;
  logB.position.y = 0.18;
  logB.castShadow = true;
  group.add(logA, logB);
}

function buildCropsProp(group) {
  const material = new THREE.MeshStandardMaterial({ color: 0xd9b545, roughness: 0.6 });
  for (const offset of [-0.3, -0.1, 0.1, 0.3]) {
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), material);
    stalk.position.set(offset, 0.25, 0);
    stalk.castShadow = true;
    group.add(stalk);
  }
}

function buildBoosterProp(group, tileId) {
  const material = new THREE.MeshStandardMaterial({ color: BOOSTER_TRIM, roughness: 0.5, metalness: 0.2 });
  if (tileId === 'booster_windmill') {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.06), material);
    post.position.y = 0.35;
    post.castShadow = true;
    group.add(post);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.35, 4), material);
      blade.position.y = 0.7;
      blade.rotation.z = Math.PI / 2;
      blade.rotation.x = (Math.PI / 2) * i;
      blade.castShadow = true;
      group.add(blade);
    }
  } else {
    const pyramid = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 4), material);
    pyramid.position.y = 0.3;
    pyramid.castShadow = true;
    group.add(pyramid);
  }
}

function addProp(raftMesh, tile) {
  const propGroup = new THREE.Group();
  propGroup.position.y = WALL_HEIGHT;
  switch (tile.family) {
    case 'fish': buildFishProp(propGroup); break;
    case 'kelp': buildKelpProp(propGroup); break;
    case 'driftwood': buildDriftwoodProp(propGroup); break;
    case 'crops': buildCropsProp(propGroup); break;
    case 'booster': buildBoosterProp(propGroup, tile.id); break;
  }
  raftMesh.add(propGroup);
}

function buildRaftMesh(tile) {
  const raftGeometry = new THREE.ExtrudeGeometry(hexShape(HEX_RADIUS), {
    depth: WALL_HEIGHT,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  raftGeometry.rotateX(-Math.PI / 2);

  const raftMaterial = new THREE.MeshStandardMaterial({ color: WOOD_TOP, roughness: 0.85, metalness: 0.05 });
  const raftMesh = new THREE.Mesh(raftGeometry, raftMaterial);
  raftMesh.castShadow = true;
  raftMesh.receiveShadow = true;
  raftMesh.userData.tileId = tile.id;

  if (tile.kind === 'booster') {
    const trimGeometry = new THREE.TorusGeometry(HEX_RADIUS * 0.92, 0.03, 8, 24);
    const trimMaterial = new THREE.MeshStandardMaterial({ color: BOOSTER_TRIM, roughness: 0.4, metalness: 0.3 });
    const trim = new THREE.Mesh(trimGeometry, trimMaterial);
    trim.rotation.x = Math.PI / 2;
    trim.position.y = WALL_HEIGHT + 0.01;
    trim.userData.tileId = tile.id;
    raftMesh.add(trim);
  }

  addProp(raftMesh, tile);
  return raftMesh;
}

function buildMarkerMesh(tile) {
  // Invisible filled hex, sized to cover the whole tile area — this is what
  // gets raycast-tested, so clicking anywhere inside a locked tile registers,
  // not just near its visible outline (a LineLoop alone would only be
  // hit-testable in a thin ring near the edge, per THREE.Raycaster's line
  // threshold — that would regress the original full-hex clickable area).
  const hitGeometry = new THREE.ShapeGeometry(hexShape(HEX_RADIUS));
  hitGeometry.rotateX(-Math.PI / 2);
  // DoubleSide: ShapeGeometry's face winding after rotateX isn't hand-verified here,
  // and a raycast against a FrontSide-only mesh silently misses back-facing triangles —
  // DoubleSide guarantees this invisible hit-plane always registers clicks regardless.
  const hitMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const markerMesh = new THREE.Mesh(hitGeometry, hitMaterial);
  markerMesh.position.y = 0.02;
  markerMesh.userData.tileId = tile.id;

  const outlineMaterial = new THREE.LineBasicMaterial({ color: MARKER_COLOR, transparent: true, opacity: 0.35 });
  const outline = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(hexOutlinePoints(HEX_RADIUS)),
    outlineMaterial
  );
  markerMesh.add(outline);

  const buoy = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 8),
    new THREE.MeshBasicMaterial({ color: MARKER_COLOR, transparent: true, opacity: 0.6 })
  );
  markerMesh.add(buoy);

  markerMesh.userData.outlineMaterial = outlineMaterial;
  return markerMesh;
}

function buildWater() {
  const waterGeometry = new THREE.PlaneGeometry(80, 80, 140, 140);
  waterGeometry.rotateX(-Math.PI / 2);
  const waterBasePositions = Float32Array.from(waterGeometry.attributes.position.array);
  const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x2e7ba8, roughness: 0.25, metalness: 0.2 });
  const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
  waterMesh.position.y = -0.05;
  waterMesh.receiveShadow = true;
  return { waterMesh, waterBasePositions };
}

function updateCameraFrustum(camera, width, height) {
  const aspect = width / height;
  camera.left = -CAMERA_FRUSTUM_HALF_SIZE * aspect;
  camera.right = CAMERA_FRUSTUM_HALF_SIZE * aspect;
  camera.top = CAMERA_FRUSTUM_HALF_SIZE;
  camera.bottom = -CAMERA_FRUSTUM_HALF_SIZE;
  camera.near = 0.1;
  camera.far = 100;
  camera.updateProjectionMatrix();
}

export function buildScene(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e2f42);
  scene.fog = new THREE.Fog(0x0e2f42, 10, 40);

  const camera = new THREE.OrthographicCamera();
  camera.position.set(14, 16, 14);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene.add(new THREE.AmbientLight(0xbcd8e8, 0.55));

  const sun = new THREE.DirectionalLight(0xfff4d6, 1.4);
  sun.position.set(10, 16, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 40;
  scene.add(sun);

  const { waterMesh, waterBasePositions } = buildWater();
  scene.add(waterMesh);

  const tileObjects = new Map();
  for (const tile of TILES) {
    const { x, z } = hexLocalPosition(tile.gridPos.row, tile.gridPos.col);

    const raftMesh = buildRaftMesh(tile);
    raftMesh.position.set(x, 0, z);
    raftMesh.visible = false;
    scene.add(raftMesh);

    const markerMesh = buildMarkerMesh(tile);
    markerMesh.position.x = x;
    markerMesh.position.z = z;
    markerMesh.visible = true;
    scene.add(markerMesh);

    tileObjects.set(tile.id, { raftMesh, markerMesh });
  }

  function resize(width, height) {
    updateCameraFrustum(camera, width, height);
    renderer.setSize(width, height, false);
  }

  return { renderer, scene, camera, resize, waterMesh, waterBasePositions, tileObjects };
}
