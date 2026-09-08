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
const PROP_SCALE = 1.8;
const BOOSTER_PROP_SCALE = 1.5;
const LARGE_BOOSTER_IDS = new Set([
  'booster_windmill',
  'booster_smokehouse',
  'booster_drying_rack',
  'booster_composting_shed',
  'booster_lighthouse',
]);

function addOutline(mesh, scale, color) {
  const outline = new THREE.Mesh(
    mesh.geometry,
    new THREE.MeshBasicMaterial({ color: color || 0x14201a, side: THREE.BackSide })
  );
  outline.scale.setScalar(scale || 1.12);
  mesh.add(outline);
  return outline;
}

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

// ---------- FISH (chubby cartoon style) ----------
const FISH_BODY_COLOR = 0x5c7a4e;
const FISH_BODY_DARK = 0x46603a;
const FISH_SPOT_COLOR = 0x33481f;
const FISH_OUTLINE = 0x16210f;

function buildFishBodyGeometry() {
  // Chubby profile: full round belly shifted toward the head, tapering
  // sharply into a narrow peduncle before the tail.
  const points = [
    new THREE.Vector2(0, -0.35),
    new THREE.Vector2(0.14, -0.30),
    new THREE.Vector2(0.22, -0.12),
    new THREE.Vector2(0.24, 0.05),
    new THREE.Vector2(0.20, 0.18),
    new THREE.Vector2(0.11, 0.28),
    new THREE.Vector2(0.04, 0.36),
    new THREE.Vector2(0, 0.40),
  ];
  const geo = new THREE.LatheGeometry(points, 14);
  geo.rotateZ(Math.PI / 2); // nose -> +X, tail -> -X
  geo.scale(1, 1, 0.85); // slight lateral compression
  return geo;
}

function buildSpikeLobe(mat, radius, height, zDegRotation, flattenZ) {
  const geo = new THREE.ConeGeometry(radius, height, 5);
  geo.scale(1, 1, flattenZ);
  if (zDegRotation) geo.rotateZ((Math.PI / 180) * zDegRotation);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  addOutline(mesh, 1.18, FISH_OUTLINE);
  return mesh;
}

function buildFishProp(group) {
  const bodyMat = new THREE.MeshStandardMaterial({ color: FISH_BODY_COLOR, roughness: 0.55 });
  const body = new THREE.Mesh(buildFishBodyGeometry(), bodyMat);
  body.castShadow = true;
  addOutline(body, 1.06, FISH_OUTLINE);
  group.add(body);

  const finMat = new THREE.MeshStandardMaterial({ color: FISH_BODY_DARK, roughness: 0.55 });

  // Small, modestly-forked tail (subtle, not a dominant feature).
  const tailA = buildSpikeLobe(finMat, 0.05, 0.15, 75, 0.3);
  tailA.position.set(-0.42, 0.03, 0);
  group.add(tailA);
  const tailB = buildSpikeLobe(finMat, 0.05, 0.15, 105, 0.3);
  tailB.position.set(-0.42, -0.03, 0);
  group.add(tailB);

  // Jagged dorsal ridge: a row of spikes rising and falling along the back.
  const ridgeSpec = [
    { x: 0.16, h: 0.09 }, { x: 0.07, h: 0.14 }, { x: -0.02, h: 0.17 },
    { x: -0.11, h: 0.12 }, { x: -0.20, h: 0.07 },
  ];
  for (const s of ridgeSpec) {
    const spike = buildSpikeLobe(finMat, 0.06, s.h, 0, 0.35);
    spike.position.set(s.x, 0.19, 0);
    group.add(spike);
  }

  // Small pectoral fins, sticking out sideways near the head.
  function buildPectoral(zSign) {
    const geo = new THREE.ConeGeometry(0.045, 0.16, 5);
    geo.scale(0.3, 1, 1); // thin fin, spread in Y-Z plane
    geo.rotateX((Math.PI / 2) * zSign);
    geo.rotateY(-0.3 * zSign);
    const mesh = new THREE.Mesh(geo, finMat);
    mesh.castShadow = true;
    addOutline(mesh, 1.15, FISH_OUTLINE);
    mesh.position.set(0.10, 0.00, zSign * 0.16);
    return mesh;
  }
  group.add(buildPectoral(1));
  group.add(buildPectoral(-1));

  // Dark body spots.
  const spotMat = new THREE.MeshStandardMaterial({ color: FISH_SPOT_COLOR, roughness: 0.6 });
  const spots = [
    { x: 0.06, y: 0.15, z: 0.15, r: 0.03 }, { x: -0.07, y: 0.16, z: -0.13, r: 0.026 },
    { x: 0.00, y: 0.02, z: 0.20, r: 0.022 }, { x: -0.14, y: 0.06, z: 0.13, r: 0.024 },
  ];
  for (const s of spots) {
    const spot = new THREE.Mesh(new THREE.SphereGeometry(s.r, 6, 6), spotMat);
    spot.scale.set(1, 0.6, 1);
    spot.position.set(s.x, s.y, s.z);
    group.add(spot);
  }

  // Eye.
  const eyeWhite = new THREE.Mesh(
    new THREE.SphereGeometry(0.038, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xf4f7f0, roughness: 0.3 })
  );
  eyeWhite.position.set(0.24, 0.08, 0.13);
  group.add(eyeWhite);
  const pupil = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 })
  );
  pupil.position.set(0.265, 0.08, 0.145);
  group.add(pupil);

  group.rotation.y = 0.6;
  group.position.y += 0.20;
}

// ---------- KELP ----------
function buildKelpBlade(colorHex, segments, baseHeight) {
  const bladeGroup = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.7 });
  let y = 0;
  let lean = 0;
  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const segHeight = baseHeight / segments;
    const topR = 0.06 * (1 - t) + 0.012;
    const botR = 0.06 * (1 - (i - 1) / segments) + 0.012;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(topR, Math.max(botR, topR + 0.005), segHeight, 6), mat);
    seg.position.y = y + segHeight / 2;
    seg.rotation.z = lean;
    seg.castShadow = true;
    bladeGroup.add(seg);
    y += segHeight * Math.cos(lean);
    lean += 0.12;
  }
  const bladder = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 8, 8),
    new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5 })
  );
  bladder.position.set(0.05, baseHeight * 0.55, 0);
  bladeGroup.add(bladder);
  return bladeGroup;
}

function buildKelpProp(group) {
  const specs = [
    { color: 0x3f8a5c, x: -0.28, h: 0.62 },
    { color: 0x4c9a6a, x: 0, h: 0.75 },
    { color: 0x5aab78, x: 0.28, h: 0.58 },
  ];
  for (const s of specs) {
    const blade = buildKelpBlade(s.color, 5, s.h);
    blade.position.x = s.x;
    blade.rotation.y = s.x * 0.6;
    group.add(blade);
  }
}

// ---------- DRIFTWOOD ----------
function buildLog(colorHex, length, radius, x, z, rotY, tilt) {
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.9 });
  const log = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.7, radius, length, 8), mat);
  log.rotation.z = Math.PI / 2;
  log.rotation.y = rotY;
  log.rotation.x = tilt;
  log.position.set(x, radius + 0.03, z);
  log.castShadow = true;
  return log;
}

function buildDriftwoodProp(group) {
  group.add(buildLog(0x5a3f22, 0.85, 0.075, -0.05, 0.05, 0.15, 0));
  group.add(buildLog(0x8a7f6e, 0.65, 0.06, 0.12, -0.08, -0.6, 0.05));
  group.add(buildLog(0x6b4c2a, 0.42, 0.045, -0.2, -0.15, 1.1, -0.08));

  const twigMat = new THREE.MeshStandardMaterial({ color: 0x7a6a52, roughness: 0.9 });
  for (const t of [{ x: 0.22, z: 0.1, r: 0.3 }, { x: -0.15, z: 0.18, r: -0.4 }]) {
    const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.28, 6), twigMat);
    twig.rotation.z = Math.PI / 2.4;
    twig.rotation.y = t.r;
    twig.position.set(t.x, 0.14, t.z);
    twig.castShadow = true;
    group.add(twig);
  }
}

// ---------- CROPS (dense wheat/sorghum cluster) ----------
function buildGrainHead(mat, h) {
  // A tapering stack of beaded segments, mimicking a dense seed-head
  // instead of one smooth capsule.
  const headGroup = new THREE.Group();
  const sizes = [0.05, 0.045, 0.038, 0.03, 0.02];
  let y = 0;
  for (const s of sizes) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(s, 6, 5), mat);
    seg.scale.set(1, 1.25, 1);
    seg.position.y = y;
    seg.castShadow = true;
    headGroup.add(seg);
    y += s * 1.5;
  }
  headGroup.position.y = h;
  return headGroup;
}

function buildCropsProp(group) {
  const stalkMat = new THREE.MeshStandardMaterial({ color: 0xac9138, roughness: 0.65 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xe9c85a, roughness: 0.5 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x8f8a3a, roughness: 0.6, side: THREE.DoubleSide });

  const count = 14;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.4;
    const radius = 0.10 + (i % 4) * 0.065;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.6;
    const lean = (((i * 7) % 5) - 2) * 0.09;
    const h = 0.46 + (i % 3) * 0.09;

    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.015, h, 5), stalkMat);
    stalk.position.set(x, h / 2, z);
    stalk.rotation.z = lean;
    stalk.rotation.x = (((i * 5) % 4) - 1.5) * 0.05;
    stalk.castShadow = true;
    group.add(stalk);

    const head = buildGrainHead(headMat, h);
    head.position.set(x + Math.sin(lean) * h, 0, z);
    head.rotation.z = lean;
    group.add(head);
  }

  // A few broad leaf blades poking out at the base for texture.
  const leafSpecs = [
    { x: -0.24, z: 0.06, rot: 0.7 }, { x: 0.24, z: -0.10, rot: -0.6 },
    { x: 0.02, z: 0.22, rot: 0.15 }, { x: -0.10, z: -0.22, rot: -0.2 },
  ];
  for (const l of leafSpecs) {
    const leafGeo = new THREE.ConeGeometry(0.05, 0.34, 3);
    leafGeo.scale(1, 1, 0.15);
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(l.x, 0.15, l.z);
    leaf.rotation.z = l.rot;
    leaf.rotation.x = 0.35;
    leaf.castShadow = true;
    group.add(leaf);
  }
}

// ---------- BOOSTERS ----------
function cylinderBetween(p1, p2, radius, mat) {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const length = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 6), mat);
  mesh.position.copy(p1).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  mesh.castShadow = true;
  return mesh;
}

function buildWindmill(group) {
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x9c8058, roughness: 0.75 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xdcdcd4, roughness: 0.4, metalness: 0.25, side: THREE.DoubleSide });

  // 4-legged tapering lattice tower with X-braced levels, like a real farm windmill.
  const towerHeight = 0.85;
  const topRadius = 0.045;
  const baseRadius = 0.30;
  const legAngle = (i) => i * (Math.PI / 2) + Math.PI / 4;
  const ringPoint = (level, i) => {
    const t = level / 4;
    const r = baseRadius + (topRadius - baseRadius) * t;
    const a = legAngle(i);
    return new THREE.Vector3(r * Math.cos(a), towerHeight * t, r * Math.sin(a));
  };

  for (let i = 0; i < 4; i++) {
    group.add(cylinderBetween(ringPoint(0, i), ringPoint(4, i), 0.022, towerMat));
  }
  for (let level = 0; level <= 4; level++) {
    for (let i = 0; i < 4; i++) {
      group.add(cylinderBetween(ringPoint(level, i), ringPoint(level, (i + 1) % 4), 0.012, towerMat));
    }
    if (level < 4) {
      for (let i = 0; i < 4; i++) {
        group.add(cylinderBetween(ringPoint(level, i), ringPoint(level + 1, (i + 1) % 4), 0.01, towerMat));
        group.add(cylinderBetween(ringPoint(level, (i + 1) % 4), ringPoint(level + 1, i), 0.01, towerMat));
      }
    }
  }

  // Fan hub with many thin blades -- reads as a circular wheel, not a plus sign.
  const hub = new THREE.Group();
  hub.position.set(0, towerHeight + 0.04, 0);
  const hubCore = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8), towerMat);
  hubCore.rotation.x = Math.PI / 2;
  hub.add(hubCore);

  const bladeCount = 14;
  for (let i = 0; i < bladeCount; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.045, 0.01), bladeMat);
    blade.position.x = 0.13;
    blade.castShadow = true;
    const pivot = new THREE.Group();
    pivot.rotation.z = (i / bladeCount) * Math.PI * 2;
    pivot.add(blade);
    hub.add(pivot);
  }

  // Tail vane extending behind the wheel along the spin axis.
  const vaneRod = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 6), towerMat);
  vaneRod.rotation.x = Math.PI / 2;
  vaneRod.position.set(0, 0, -0.15);
  hub.add(vaneRod);
  const vaneFin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.01), bladeMat);
  vaneFin.position.set(0, 0, -0.31);
  hub.add(vaneFin);

  group.add(hub);
}

function buildSmokehouse(group) {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.8 });
  const roofMat = new THREE.MeshStandardMaterial({ color: BOOSTER_TRIM, roughness: 0.6, metalness: 0.15 });
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.32, 0.4), wallMat);
  cabin.position.y = 0.16;
  cabin.castShadow = true;
  group.add(cabin);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.22, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 0.43;
  roof.castShadow = true;
  group.add(roof);
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.28, 8), wallMat);
  chimney.position.set(0.1, 0.6, 0.05);
  chimney.castShadow = true;
  group.add(chimney);
}

function buildDryingRack(group) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x6b4c2a, roughness: 0.85 });
  for (const x of [-0.22, 0.22]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), mat);
    post.position.set(x, 0.25, 0);
    post.castShadow = true;
    group.add(post);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), mat);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 0.46;
  bar.castShadow = true;
  group.add(bar);
  const hangMat = new THREE.MeshStandardMaterial({ color: 0xb08a55, roughness: 0.7 });
  for (const x of [-0.14, 0.02, 0.16]) {
    const hang = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), hangMat);
    hang.scale.set(0.7, 1.3, 0.7);
    hang.position.set(x, 0.34, 0);
    group.add(hang);
  }
}

function buildNetWeavers(group) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x6b4c2a, roughness: 0.85 });
  const postGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.55, 6);
  const posts = [[-0.24, -0.15], [0.24, -0.15], [-0.24, 0.15], [0.24, 0.15]];
  for (const [x, z] of posts) {
    const post = new THREE.Mesh(postGeo, mat);
    post.position.set(x, 0.275, z);
    post.castShadow = true;
    group.add(post);
  }
  const netMat = new THREE.LineBasicMaterial({ color: 0xdfe9ee, transparent: true, opacity: 0.8 });
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    const a = new THREE.Vector3(-0.24 + t * 0.48, 0.45, -0.15);
    const b = new THREE.Vector3(-0.24 + t * 0.48, 0.45, 0.15);
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    group.add(new THREE.Line(geo, netMat));
  }
  for (let i = 0; i <= 3; i++) {
    const t = i / 3;
    const a = new THREE.Vector3(-0.24, 0.45, -0.15 + t * 0.3);
    const b = new THREE.Vector3(0.24, 0.45, -0.15 + t * 0.3);
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    group.add(new THREE.Line(geo, netMat));
  }
}

function buildCompostingShed(group) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x5a4a34, roughness: 0.85 });
  const lidMat = new THREE.MeshStandardMaterial({ color: BOOSTER_TRIM, roughness: 0.6, metalness: 0.15 });
  const bin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.36), mat);
  bin.position.y = 0.13;
  bin.castShadow = true;
  group.add(bin);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.03, 0.4), lidMat);
  lid.position.set(-0.03, 0.27, 0);
  lid.rotation.z = 0.25;
  lid.castShadow = true;
  group.add(lid);
}

function buildLighthouse(group) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xd8d3c8, roughness: 0.6 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: BOOSTER_TRIM, roughness: 0.5 });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 0.7, 10), mat);
  tower.position.y = 0.35;
  tower.castShadow = true;
  group.add(tower);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.093, 0.12, 0.14, 10), stripeMat);
  stripe.position.y = 0.3;
  group.add(stripe);
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.14, 8), new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4 }));
  lantern.position.y = 0.77;
  group.add(lantern);
  const light = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xfff2c0, emissiveIntensity: 1.2, roughness: 0.3 })
  );
  light.position.y = 0.77;
  group.add(light);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.12, 10), stripeMat);
  roof.position.y = 0.9;
  roof.castShadow = true;
  group.add(roof);
}

function buildBoosterProp(group, tileId) {
  switch (tileId) {
    case 'booster_windmill': buildWindmill(group); break;
    case 'booster_smokehouse': buildSmokehouse(group); break;
    case 'booster_drying_rack': buildDryingRack(group); break;
    case 'booster_net_weavers': buildNetWeavers(group); break;
    case 'booster_composting_shed': buildCompostingShed(group); break;
    case 'booster_lighthouse': buildLighthouse(group); break;
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
  const extraScale = LARGE_BOOSTER_IDS.has(tile.id) ? BOOSTER_PROP_SCALE : 1;
  propGroup.scale.setScalar(PROP_SCALE * extraScale);
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
  scene.fog = new THREE.Fog(0x0e2f42, 36, 60);

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
    markerMesh.visible = false;
    scene.add(markerMesh);

    tileObjects.set(tile.id, { raftMesh, markerMesh });
  }

  function resize(width, height) {
    updateCameraFrustum(camera, width, height);
    renderer.setSize(width, height, false);
  }

  return { renderer, scene, camera, resize, waterMesh, waterBasePositions, tileObjects };
}
