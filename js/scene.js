import * as THREE from 'three';
import { TILES } from './tiles.js';
import { ZONES } from './zones.js';
import { buildZone2Prop } from './zone2-props.js';
import { buildAbyssalProp } from './abyssal-props.js';
import { buildTimberlineProp } from './timberline-props.js';
import { buildCloudField } from './clouds.js';
import { createFoamTexture, createWaterNormalTexture } from './textures.js';
import { DEFAULT_PALETTE } from './palettes.js';

const HEX_RADIUS = 1.6;
const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS;
const HEX_HEIGHT = 2 * HEX_RADIUS;
const ROW_SPACING = 0.75 * HEX_HEIGHT;
const WALL_HEIGHT = 0.35;

const ZONE_RAFT_COLOR = new Map(ZONES.map((z) => [z.id, z.raftColor]));
const BOOSTER_TRIM = 0xe0b84b;
const MARKER_COLOR = 0xbcd8e8;
const PROP_SCALE = 1.8;
const BOOSTER_PROP_SCALE = 1.5;
const LARGE_BOOSTER_IDS = new Set([
  'booster_windmill',
  'booster_smokehouse',
  'booster_drying_rack',
  'booster_composting_shed',
  'booster_lighthouse',
  'frozen_booster_windmill',
  'frozen_booster_smokehouse',
  'frozen_booster_drying_rack',
  'frozen_booster_composting_shed',
  'frozen_booster_lighthouse',
  'abyssal_booster_windmill',
  'abyssal_booster_smokehouse',
  'abyssal_booster_drying_rack',
  'abyssal_booster_composting_shed',
  'abyssal_booster_lighthouse',
  'timberline_booster_tool_shed',
  'timberline_booster_drying_frames',
  'timberline_booster_grain_silo',
  'timberline_booster_timber_yard',
  'timberline_booster_millhouse',
]);

const LEVEL_SCALE = { 1: 1.0, 2: 1.15, 3: 1.3 };
const BADGE_COLOR = { 2: 0xb8752f, 3: 0xffd23d };
const BADGE_EMISSIVE = { 2: 0x000000, 3: 0xffb300 };
const BADGE_SIZE = { 2: 0.06, 3: 0.08 };
const BADGE_ANCHOR_HEIGHT = {
  fish: 0.32,
  kelp: 0.85,
  driftwood: 0.35,
  crops: 0.95,
  booster_windmill: 1.18,
  booster_smokehouse: 0.8,
  booster_drying_rack: 0.8,
  booster_net_weavers: 0.6,
  booster_composting_shed: 0.35,
  booster_lighthouse: 1.05,
  // Zone 2's re-skinned props are taller/differently-proportioned than zone
  // 1's for several archetypes, so they need their own anchors rather than
  // falling back to the zone-1 values above (measured live per-archetype at
  // level 3, the tallest case — see buildLevelProps's zone-qualified lookup).
  'zone2:fish': 0.80,
  'zone2:kelp': 1.44,
  'zone2:driftwood': 0.60,
  'zone2:crops': 0.95,
  'zone2:frozen_booster_windmill': 1.55,
  'zone2:frozen_booster_smokehouse': 0.8,
  'zone2:frozen_booster_drying_rack': 0.95,
  'zone2:frozen_booster_net_weavers': 0.6,
  'zone2:frozen_booster_composting_shed': 0.5,
  'zone2:frozen_booster_lighthouse': 1.75,
  // Zone 4's redesigned props, measured the same way.
  'zone4:fish': 0.85,
  'zone4:kelp': 0.95,
  'zone4:driftwood': 0.45,
  'zone4:crops': 0.65,
  'zone4:abyssal_booster_windmill': 0.95,
  'zone4:abyssal_booster_smokehouse': 0.9,
  'zone4:abyssal_booster_drying_rack': 0.65,
  'zone4:abyssal_booster_net_weavers': 0.4,
  'zone4:abyssal_booster_composting_shed': 0.6,
  'zone4:abyssal_booster_lighthouse': 1.0,
  // Zone 3's generators/boosters, measured the same way (no zone-1 archetype to fall back to --
  // planks/kelp_rope/bread have no equivalent there).
  'zone3:planks': 1.1,
  'zone3:kelp_rope': 1.3,
  'zone3:bread': 1.3,
  'zone3:timberline_booster_tool_shed': 0.75,
  'zone3:timberline_booster_drying_frames': 0.8,
  'zone3:timberline_booster_grain_silo': 1.25,
  'zone3:timberline_booster_timber_yard': 0.85,
  'zone3:timberline_booster_provision_store': 0.7,
  'zone3:timberline_booster_millhouse': 1.5,
};
const TRIM_THICKNESS = { 1: 0.03, 2: 0.045, 3: 0.06 };
const TRIM_COLOR = { 1: BOOSTER_TRIM, 2: 0xf0c94f, 3: 0xfff0a0 };

function addLevelBadge(propGroup, level, anchorHeight) {
  if (level === 1) return;
  // Anchor is a per-archetype fixed height, not a computed bounding box: a
  // live Box3 badge anchor was prototyped and found to run away for tall
  // archetypes (e.g. the windmill) relative to short ones (fish/kelp).
  // Must be called before propGroup.scale.setScalar(...) — see buildLevelProps
  // below — so this local offset is the badge's correct final position
  // once the group's own scale is applied on top of it.
  const size = BADGE_SIZE[level];
  const geo = new THREE.OctahedronGeometry(size, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: BADGE_COLOR[level],
    roughness: 0.3,
    metalness: 0.6,
    emissive: BADGE_EMISSIVE[level],
    emissiveIntensity: level === 3 ? 0.7 : 0,
  });
  const badge = new THREE.Mesh(geo, mat);
  badge.position.set(0, anchorHeight + size * 1.4, 0);
  badge.rotation.y = Math.PI / 6;
  propGroup.add(badge);
}

function addOutline(mesh, scale, color) {
  const outline = new THREE.Mesh(
    mesh.geometry,
    new THREE.MeshBasicMaterial({ color: color || 0x14201a, side: THREE.BackSide })
  );
  outline.scale.setScalar(scale || 1.12);
  mesh.add(outline);
  return outline;
}

function hexLocalPosition(row, col) {
  // row % 2 === 1 silently breaks for negative rows (JS's % keeps the sign of the dividend, so
  // -1 % 2 is -1, not 1) -- the map reaches well into negative rows, so this checks oddness, not
  // equality to positive 1, or every odd-numbered row up there renders at the wrong horizontal offset.
  const isOddRow = row % 2 !== 0;
  return { x: col * HEX_WIDTH + (isOddRow ? HEX_WIDTH / 2 : 0), z: row * ROW_SPACING };
}

// Where a tile's cells sit in the world, and the point they average to. A tile's groups are placed
// at that centre, with each cell offset from it, so scaling or lifting a group moves the whole tile.
function tileCells(tile) {
  const world = tile.cells.map((c) => hexLocalPosition(c.row, c.col));
  const center = {
    x: world.reduce((sum, p) => sum + p.x, 0) / world.length,
    z: world.reduce((sum, p) => sum + p.z, 0) / world.length,
  };
  return { center, world, offsets: world.map((p) => ({ dx: p.x - center.x, dz: p.z - center.z })) };
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

// Real fish (koi/goldfish) grow longer, more pointed, more saturated fins as
// they mature — not more numerous. Tail/dorsal/pectoral fins share one
// level-colored material so they all mature together; only the tail and
// dorsal spikes also grow longer (pectorals keep their original size).
const FISH_FIN_COLOR = { 1: FISH_BODY_DARK, 2: 0xb8752f, 3: 0xffd23d };
const FISH_FIN_LENGTH_MULT = { 1: 1.0, 2: 1.35, 3: 1.75 };
const FISH_FIN_EMISSIVE = { 1: 0x000000, 2: 0x000000, 3: 0x664400 };

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

function buildFishProp(group, level) {
  const bodyMat = new THREE.MeshStandardMaterial({ color: FISH_BODY_COLOR, roughness: 0.55 });
  const body = new THREE.Mesh(buildFishBodyGeometry(), bodyMat);
  body.castShadow = true;
  addOutline(body, 1.06, FISH_OUTLINE);
  group.add(body);

  const finLen = FISH_FIN_LENGTH_MULT[level];
  const finMat = new THREE.MeshStandardMaterial({
    color: FISH_FIN_COLOR[level],
    roughness: 0.55,
    metalness: level >= 2 ? 0.35 : 0.1,
    emissive: FISH_FIN_EMISSIVE[level],
    emissiveIntensity: level === 3 ? 0.5 : 0,
  });

  // Small, modestly-forked tail (subtle, not a dominant feature). Length and
  // color escalate with level.
  const tailA = buildSpikeLobe(finMat, 0.05, 0.15 * finLen, 75, 0.3);
  tailA.position.set(-0.42 - 0.02 * (finLen - 1), 0.03, 0);
  group.add(tailA);
  const tailB = buildSpikeLobe(finMat, 0.05, 0.15 * finLen, 105, 0.3);
  tailB.position.set(-0.42 - 0.02 * (finLen - 1), -0.03, 0);
  group.add(tailB);

  // Jagged dorsal ridge: a row of spikes rising and falling along the back.
  const ridgeSpec = [
    { x: 0.16, h: 0.09 }, { x: 0.07, h: 0.14 }, { x: -0.02, h: 0.17 },
    { x: -0.11, h: 0.12 }, { x: -0.20, h: 0.07 },
  ];
  for (const s of ridgeSpec) {
    const spike = buildSpikeLobe(finMat, 0.06, s.h * finLen, 0, 0.35);
    spike.position.set(s.x, 0.19, 0);
    group.add(spike);
  }

  // Level 3 only: a pair of long trailing streamer fins, echoing full-grown
  // koi's more graceful, elongated fin extensions.
  if (level >= 3) {
    for (const zSign of [1, -1]) {
      const streamer = buildSpikeLobe(finMat, 0.035, 0.32, 0, 0.2);
      streamer.rotation.z += (Math.PI / 180) * (zSign * 20);
      streamer.position.set(-0.30, -0.05, zSign * 0.08);
      group.add(streamer);
    }
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
// Each segment is centered on the local Y-axis and tilted in place by rotation.z (never itself
// moved off-axis) — flattened into a blade cross-section via scale.z, which a Z-rotation can't
// undo since a Z-rotation leaves the Z-extent alone, and leaning to a sine curve instead of a
// one-directional increasing one for a natural S-curve sway instead of a fixed C-curve.
function buildKelpBlade(colorHex, segments, baseHeight, phase) {
  const bladeGroup = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.6, side: THREE.DoubleSide });
  let y = 0;
  const leanAt = (t) => Math.sin(t * Math.PI * 1.3 + phase) * 0.45;
  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const segHeight = baseHeight / segments;
    const topR = 0.07 * (1 - t) + 0.014;
    const botR = 0.07 * (1 - (i - 1) / segments) + 0.014;
    const lean = leanAt(t);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(topR, Math.max(botR, topR + 0.005), segHeight, 6), mat);
    seg.scale.z = 0.2;
    seg.position.y = y + segHeight / 2;
    seg.rotation.z = lean;
    seg.castShadow = true;
    bladeGroup.add(seg);
    y += segHeight * Math.cos(lean);
  }
  const bladderMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 });
  for (const t of [0.45, 0.75, 1.0]) {
    const bladder = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), bladderMat);
    bladder.position.set(Math.sin(leanAt(t)) * 0.1, baseHeight * t, 0);
    bladeGroup.add(bladder);
  }
  return bladeGroup;
}

const KELP_LEVEL_BLADES = {
  2: [{ color: 0x6fbb88, x: -0.44, h: 0.5 }],
  3: [{ color: 0x6fbb88, x: -0.44, h: 0.5 }, { color: 0x2f7248, x: 0.44, h: 0.68 }],
};

// Three rows front-to-back instead of one line of blades, so the bed reads as a patch with
// depth rather than a row of trees. The front/back rows are shorter and z-offset; x positions
// are staggered between rows so blades don't line up directly behind one another.
function buildKelpProp(group, level) {
  const specs = [
    // back row
    { color: 0x2f7248, x: -0.18, z: -0.24, h: 0.5, phase: 0.6 },
    { color: 0x3f8a5c, x: 0.14, z: -0.22, h: 0.56, phase: 2.1 },
    // middle row (the original three, unchanged positions)
    { color: 0x3f8a5c, x: -0.28, z: 0, h: 0.62, phase: 0 },
    { color: 0x4c9a6a, x: 0, z: 0, h: 0.75, phase: 1.4 },
    { color: 0x5aab78, x: 0.28, z: 0, h: 0.58, phase: 2.8 },
    // front row
    { color: 0x5aab78, x: -0.08, z: 0.24, h: 0.52, phase: 3.6 },
    { color: 0x6fbb88, x: 0.24, z: 0.22, h: 0.46, phase: 5.0 },
    ...(KELP_LEVEL_BLADES[level] || []).map((b, i) => ({ ...b, z: i % 2 === 0 ? -0.2 : 0.2, phase: 5.8 + i * 1.3 })),
  ];
  for (const s of specs) {
    const blade = buildKelpBlade(s.color, 8, s.h, s.phase);
    blade.position.set(s.x, 0, s.z);
    blade.rotation.y = s.x * 0.6;
    group.add(blade);
  }
  // Holdfast: a small dark root-like blob anchoring the blades to the raft.
  const holdfast = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshStandardMaterial({ color: 0x2b4a34, roughness: 0.8 }));
  holdfast.scale.set(1, 0.5, 1);
  group.add(holdfast);
}

// ---------- DRIFTWOOD ----------
function buildLog(colorHex, length, radius, x, z, rotY, tilt, yOffset = 0) {
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.9 });
  const log = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.7, radius, length, 8), mat);
  log.rotation.z = Math.PI / 2;
  log.rotation.y = rotY;
  log.rotation.x = tilt;
  log.position.set(x, radius + 0.03 + yOffset, z);
  log.castShadow = true;
  return log;
}

function buildDriftwoodProp(group, level) {
  group.add(buildLog(0x5a3f22, 0.85, 0.075, -0.05, 0.05, 0.15, 0));
  group.add(buildLog(0x8a7f6e, 0.65, 0.06, 0.12, -0.08, -0.6, 0.05));
  group.add(buildLog(0x6b4c2a, 0.42, 0.045, -0.2, -0.15, 1.1, -0.08));

  const twigMat = new THREE.MeshStandardMaterial({ color: 0x7a6a52, roughness: 0.9 });
  const twigSpecs = [{ x: 0.22, z: 0.1, r: 0.3 }, { x: -0.15, z: 0.18, r: -0.4 }];
  if (level >= 2) twigSpecs.push({ x: 0.28, z: -0.2, r: 0.9 });
  for (const t of twigSpecs) {
    const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.28, 6), twigMat);
    twig.rotation.z = Math.PI / 2.4;
    twig.rotation.y = t.r;
    twig.position.set(t.x, 0.14, t.z);
    twig.castShadow = true;
    group.add(twig);
  }

  if (level >= 2) {
    group.add(buildLog(0x4a5c3a, 0.35, 0.04, 0.05, 0.25, -1.3, 0.1)); // small mossy 4th log
  }
  if (level >= 3) {
    group.add(buildLog(0x8a7f6e, 0.95, 0.09, -0.05, 0.02, 0.4, 0, 0.12)); // larger 5th log, stacked on top
    // Barnacle cluster resting on top of the 5th log's own cylindrical
    // surface: that log is centered at (-0.05, 0.24, 0.02) with radius 0.09
    // and its length runs along (cos(0.4), 0, -sin(0.4)) after its rotY;
    // these two points sit on top of the log (center Y + radius), offset
    // along that length direction so they read as two barnacles side by side.
    const barnacleMat = new THREE.MeshStandardMaterial({ color: 0xb8b2a4, roughness: 0.8 });
    for (const b of [{ x: 0.088, y: 0.33, z: -0.038 }, { x: -0.188, y: 0.33, z: 0.078 }]) {
      const barnacle = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), barnacleMat);
      barnacle.position.set(b.x, b.y, b.z);
      group.add(barnacle);
    }
  }
}

// ---------- CROPS (dense wheat/sorghum cluster) ----------
// A bearded wheat ear (a slim head with thin awn bristles) instead of a stack of beads, which
// read more like a corn cob than wheat.
function buildWheatEar(headMat, awnMat, h) {
  const earGroup = new THREE.Group();
  const ear = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), headMat);
  ear.scale.set(0.045, 0.15, 0.045);
  ear.position.y = 0.08;
  earGroup.add(ear);
  const awnCount = 9;
  for (let i = 0; i < awnCount; i++) {
    const t = i / (awnCount - 1);
    const y = t * 0.15;
    const side = i % 2 === 0 ? 1 : -1;
    const awn = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.004, 0.16, 3), awnMat);
    awn.position.set(0, y, 0);
    awn.rotation.z = side * (0.55 + t * 0.15);
    awn.translateY(0.08);
    earGroup.add(awn);
  }
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 5), headMat);
  tip.position.y = 0.185;
  earGroup.add(tip);
  earGroup.position.y = h;
  return earGroup;
}

const CROPS_HEAD_COLOR = { 1: 0xe9c85a, 2: 0xd9a83a, 3: 0xc98f2a };
// Wider spread and more stalks than the old radius formula, so the field covers most of the
// raft instead of a clump in the middle. The ear/stalk-top add an outward lean offset on top of
// this (up to ~0.11 local units), so the base radius leaves headroom under the hex's edge rather
// than reaching it on its own.
const CROPS_STALK_COUNT = { 1: 18, 2: 23, 3: 28 };

function buildCropsProp(group, level) {
  const stalkTopMat = new THREE.MeshStandardMaterial({ color: 0xac9138, roughness: 0.65 });
  const stalkBaseMat = new THREE.MeshStandardMaterial({ color: 0x7c9a3e, roughness: 0.7 });
  const headMat = new THREE.MeshStandardMaterial({ color: CROPS_HEAD_COLOR[level], roughness: 0.5 });
  const awnMat = new THREE.MeshStandardMaterial({ color: CROPS_HEAD_COLOR[level], roughness: 0.6 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x8f8a3a, roughness: 0.6, side: THREE.DoubleSide });

  const count = CROPS_STALK_COUNT[level];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.4;
    const radius = 0.12 + (i % 4) * 0.10;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.6;
    const lean = (((i * 7) % 5) - 2) * 0.09;
    const h = 0.46 + (i % 3) * 0.09;

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.015, h * 0.4, 5), stalkBaseMat);
    base.position.set(x, h * 0.2, z);
    base.rotation.z = lean;
    base.castShadow = true;
    group.add(base);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, h * 0.62, 5), stalkTopMat);
    top.position.set(x + Math.sin(lean) * h * 0.42, h * 0.72, z);
    top.rotation.z = lean;
    top.castShadow = true;
    group.add(top);

    const ear = buildWheatEar(headMat, awnMat, h);
    ear.position.set(x + Math.sin(lean) * h, 0, z);
    ear.rotation.z = lean;
    group.add(ear);
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

function buildWindmill(group, level) {
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x9c8058, roughness: 0.75 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xdcdcd4, roughness: 0.4, metalness: 0.25, side: THREE.DoubleSide });

  // 4-legged tapering lattice tower with X-braced levels, like a real farm windmill.
  const towerHeight = 0.85;
  const topRadius = 0.045;
  const baseRadius = 0.30;
  const legAngle = (i) => i * (Math.PI / 2) + Math.PI / 4;
  const ringPoint = (ring, i) => {
    const t = ring / 4;
    const r = baseRadius + (topRadius - baseRadius) * t;
    const a = legAngle(i);
    return new THREE.Vector3(r * Math.cos(a), towerHeight * t, r * Math.sin(a));
  };

  for (let i = 0; i < 4; i++) {
    group.add(cylinderBetween(ringPoint(0, i), ringPoint(4, i), 0.022, towerMat));
  }
  for (let ring = 0; ring <= 4; ring++) {
    for (let i = 0; i < 4; i++) {
      group.add(cylinderBetween(ringPoint(ring, i), ringPoint(ring, (i + 1) % 4), 0.012, towerMat));
    }
    if (ring < 4) {
      for (let i = 0; i < 4; i++) {
        group.add(cylinderBetween(ringPoint(ring, i), ringPoint(ring + 1, (i + 1) % 4), 0.01, towerMat));
        group.add(cylinderBetween(ringPoint(ring, (i + 1) % 4), ringPoint(ring + 1, i), 0.01, towerMat));
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

const SMOKE_PUFF_COUNT = { 1: 0, 2: 2, 3: 4 };

function buildSmokehouse(group, level) {
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

  const puffCount = SMOKE_PUFF_COUNT[level];
  const smokeMat = new THREE.MeshStandardMaterial({ color: 0xcfd6da, roughness: 0.9, transparent: true, opacity: 0.55 });
  for (let i = 0; i < puffCount; i++) {
    const t = i / Math.max(puffCount - 1, 1);
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.035 + t * 0.03, 8, 8), smokeMat);
    puff.position.set(0.1 + t * 0.05, 0.78 + t * 0.16, 0.05 - t * 0.03);
    group.add(puff);
  }
  if (level === 3) {
    const ember = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xff8a3d, emissive: 0xff5a1d, emissiveIntensity: 1.2, roughness: 0.4 })
    );
    ember.position.set(0.1, 0.74, 0.05);
    group.add(ember);
  }
}

const DRYING_RACK_HANGS = {
  1: [-0.14, 0.02, 0.16],
  2: [-0.18, -0.06, 0.06, 0.18, -0.02],
  3: [-0.18, -0.06, 0.06, 0.18, -0.02],
};

function buildDryingRack(group, level) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x6b4c2a, roughness: 0.85 });
  // Level 3's postHeight/bar2 Y must stay in this relation: bar2Y - 0.12 (the
  // tier-2 hang drop, see addHangsOnBar below) must clear bar's own Y (0.46)
  // with a visible gap, and postHeight must clear bar2Y so the posts still
  // visibly support both bars.
  const postHeight = level === 3 ? 0.75 : 0.5;
  for (const x of [-0.22, 0.22]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, postHeight, 6), mat);
    post.position.set(x, postHeight / 2, 0);
    post.castShadow = true;
    group.add(post);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), mat);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 0.46;
  bar.castShadow = true;
  group.add(bar);

  const hangMat = new THREE.MeshStandardMaterial({ color: 0xb08a55, roughness: 0.7 });
  function addHangsOnBar(barY, xs) {
    for (const x of xs) {
      const hang = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), hangMat);
      hang.scale.set(0.7, 1.3, 0.7);
      hang.position.set(x, barY - 0.12, 0);
      group.add(hang);
    }
  }
  addHangsOnBar(0.46, DRYING_RACK_HANGS[level]);

  if (level === 3) {
    const bar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), mat);
    bar2.rotation.z = Math.PI / 2;
    bar2.position.y = 0.7;
    bar2.castShadow = true;
    group.add(bar2);
    addHangsOnBar(0.7, [-0.14, 0.02, 0.16]);
  }
}

const NET_DIVISIONS = { 1: { x: 4, z: 3 }, 2: { x: 8, z: 6 }, 3: { x: 8, z: 6 } };

function buildNetWeavers(group, level) {
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
  const divisions = NET_DIVISIONS[level];
  for (let i = 0; i <= divisions.x; i++) {
    const t = i / divisions.x;
    const a = new THREE.Vector3(-0.24 + t * 0.48, 0.45, -0.15);
    const b = new THREE.Vector3(-0.24 + t * 0.48, 0.45, 0.15);
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    group.add(new THREE.Line(geo, netMat));
  }
  for (let i = 0; i <= divisions.z; i++) {
    const t = i / divisions.z;
    const a = new THREE.Vector3(-0.24, 0.45, -0.15 + t * 0.3);
    const b = new THREE.Vector3(0.24, 0.45, -0.15 + t * 0.3);
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    group.add(new THREE.Line(geo, netMat));
  }

  if (level === 3) {
    const bundleMat = new THREE.MeshStandardMaterial({ color: 0xc9b98a, roughness: 0.8 });
    const bundle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 8, 16), bundleMat);
    bundle.rotation.x = Math.PI / 2;
    bundle.position.set(0, 0.04, 0.22);
    bundle.castShadow = true;
    group.add(bundle);
  }
}

const COMPOST_STEAM_COUNT = { 1: 0, 2: 3, 3: 5 };

function buildCompostingShed(group, level) {
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

  if (level === 3) {
    // Sized and placed to stay within this LARGE_BOOSTER tile's raft (scale
    // 1.8*1.5*1.3=3.51x) without overlapping bin1/lid1 above: offset mostly
    // in +Z (bin1/lid1 only reach z<=0.18/0.2) rather than +X, since the
    // hex's flat edge caps safe X reach much more tightly than Z here.
    const bin2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.1), mat);
    bin2.position.set(0.03, 0.1, 0.285);
    bin2.castShadow = true;
    group.add(bin2);
    const lid2 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.14), lidMat);
    lid2.position.set(bin2.position.x - 0.03, 0.21, 0.285);
    lid2.rotation.z = 0.2;
    lid2.castShadow = true;
    group.add(lid2);
  }

  const steamCount = COMPOST_STEAM_COUNT[level];
  const steamMat = new THREE.MeshStandardMaterial({ color: 0x8fae86, roughness: 0.9, transparent: true, opacity: 0.45 });
  for (let i = 0; i < steamCount; i++) {
    const t = i / Math.max(steamCount - 1, 1);
    const steam = new THREE.Mesh(new THREE.SphereGeometry(0.03 + t * 0.02, 6, 6), steamMat);
    steam.position.set(-0.1 + t * 0.4, 0.36 + t * 0.14, -0.05 + t * 0.1);
    group.add(steam);
  }
}

const LIGHTHOUSE_LIGHT_SIZE = { 1: 0.06, 2: 0.07, 3: 0.08 };
const LIGHTHOUSE_LIGHT_INTENSITY = { 1: 1.2, 2: 1.8, 3: 2.4 };
const LIGHTHOUSE_LIGHT_COLOR = { 1: 0xfff2c0, 2: 0xffe9a0, 3: 0xffd23d };

function buildLighthouse(group, level) {
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
    new THREE.SphereGeometry(LIGHTHOUSE_LIGHT_SIZE[level], 10, 10),
    new THREE.MeshStandardMaterial({
      color: LIGHTHOUSE_LIGHT_COLOR[level],
      emissive: LIGHTHOUSE_LIGHT_COLOR[level],
      emissiveIntensity: LIGHTHOUSE_LIGHT_INTENSITY[level],
      roughness: 0.3,
    })
  );
  light.position.y = 0.77;
  group.add(light);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.12, 10), stripeMat);
  roof.position.y = 0.9;
  roof.castShadow = true;
  group.add(roof);

  if (level >= 2) {
    const haloMat = new THREE.MeshBasicMaterial({
      color: LIGHTHOUSE_LIGHT_COLOR[level],
      transparent: true,
      opacity: level === 3 ? 0.35 : 0.25,
    });
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(LIGHTHOUSE_LIGHT_SIZE[level] * (level === 3 ? 2.2 : 1.8), 12, 12),
      haloMat
    );
    halo.position.y = 0.77;
    group.add(halo);
  }
}

function buildBoosterProp(group, tileId, level) {
  switch (tileId) {
    case 'booster_windmill': buildWindmill(group, level); break;
    case 'booster_smokehouse': buildSmokehouse(group, level); break;
    case 'booster_drying_rack': buildDryingRack(group, level); break;
    case 'booster_net_weavers': buildNetWeavers(group, level); break;
    case 'booster_composting_shed': buildCompostingShed(group, level); break;
    case 'booster_lighthouse': buildLighthouse(group, level); break;
  }
}

// Props never move on their own, so their local matrices are composed once here rather than every
// frame (the scene is tens of thousands of nodes at full unlock). The group itself stays animatable;
// effects.js pops its per-cell children on a level-up and recomposes their matrices itself.
function freezeStatic(group) {
  group.traverse((node) => {
    node.updateMatrix();
    if (node !== group) node.matrixAutoUpdate = false;
  });
}

// One tile's props at one level: an instance of the archetype's prop on every cell the tile covers
// (a cluster is three rafts, each carrying the same building). Built on demand, only for tiles that
// are unlocked and only for the level they are at, so the scene holds a fraction of what building
// every level of every tile up front would.
function buildLevelProps(tile, level, offsets) {
  const levelGroup = new THREE.Group();
  const darken = [];
  for (const { dx, dz } of offsets) {
    const propGroup = new THREE.Group();
    propGroup.position.set(dx, WALL_HEIGHT, dz);
    if (tile.zone === 'zone2') {
      buildZone2Prop(propGroup, tile, level);
    } else if (tile.zone === 'zone3') {
      buildTimberlineProp(propGroup, tile);
    } else if (tile.zone === 'zone4') {
      buildAbyssalProp(propGroup, tile, level);
    } else {
      switch (tile.family) {
        case 'fish': buildFishProp(propGroup, level); break;
        case 'kelp': buildKelpProp(propGroup, level); break;
        case 'driftwood': buildDriftwoodProp(propGroup, level); break;
        case 'crops': buildCropsProp(propGroup, level); break;
        case 'booster': buildBoosterProp(propGroup, tile.id, level); break;
      }
    }
    const anchorKey = tile.family === 'booster' ? tile.id : tile.family;
    const zoneAnchorKey = `${tile.zone}:${anchorKey}`;
    const anchorHeight = BADGE_ANCHOR_HEIGHT[zoneAnchorKey] ?? BADGE_ANCHOR_HEIGHT[anchorKey];
    addLevelBadge(propGroup, level, anchorHeight);
    const extraScale = LARGE_BOOSTER_IDS.has(tile.id) ? BOOSTER_PROP_SCALE : 1;
    propGroup.scale.setScalar(PROP_SCALE * extraScale * LEVEL_SCALE[level]);
    levelGroup.add(propGroup);
    darken.push(...(propGroup.userData.darken || []));
  }
  levelGroup.userData.darken = darken;
  freezeStatic(levelGroup);
  return levelGroup;
}

// Every raft cell is the same hex; the geometry is built once and shared by all of them.
const RAFT_GEOMETRY = (() => {
  const geometry = new THREE.ExtrudeGeometry(hexShape(HEX_RADIUS), {
    depth: WALL_HEIGHT,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
})();

const TRIM_PARTS = {};
function trimParts(level) {
  if (!TRIM_PARTS[level]) {
    TRIM_PARTS[level] = {
      geometry: new THREE.TorusGeometry(HEX_RADIUS * 0.92, TRIM_THICKNESS[level], 8, 24),
      material: new THREE.MeshStandardMaterial({
        color: TRIM_COLOR[level],
        roughness: 0.4,
        metalness: 0.3,
        emissive: level === 3 ? 0x664400 : 0x000000,
        emissiveIntensity: level === 3 ? 0.4 : 0,
      }),
    };
  }
  return TRIM_PARTS[level];
}

// Blank bridges wear their zone's colour a little paler than the clusters, so a walkway reads as
// ground between buildings rather than as one more building.
const BLANK_LIGHTEN = 0.22;
function raftColor(tile) {
  const color = new THREE.Color(ZONE_RAFT_COLOR.get(tile.zone));
  return tile.kind === 'blank' ? color.lerp(new THREE.Color(0xffffff), BLANK_LIGHTEN) : color;
}

// One group per tile, positioned at the tile's centre, holding a raft hex per cell (plus each
// cell's props and trim). effects.js lifts and scales that group as a unit when the tile appears.
function buildRaftMesh(tile, offsets) {
  const raftMesh = new THREE.Group();
  const raftMaterial = new THREE.MeshStandardMaterial({ color: raftColor(tile), roughness: 0.85, metalness: 0.05 });
  const raftCells = offsets.map(({ dx, dz }) => {
    const cell = new THREE.Mesh(RAFT_GEOMETRY, raftMaterial);
    cell.position.set(dx, 0, dz);
    cell.castShadow = true;
    cell.receiveShadow = true;
    cell.userData.tileId = tile.id;
    raftMesh.add(cell);
    return cell;
  });

  let trimMeshes = null;
  if (tile.kind === 'booster') {
    trimMeshes = {};
    for (const level of [1, 2, 3]) {
      const trims = new THREE.Group();
      const { geometry, material } = trimParts(level);
      for (const { dx, dz } of offsets) {
        const trim = new THREE.Mesh(geometry, material);
        trim.rotation.x = Math.PI / 2;
        trim.position.set(dx, WALL_HEIGHT + 0.01, dz);
        trim.userData.tileId = tile.id;
        trims.add(trim);
      }
      trims.visible = level === 1;
      raftMesh.add(trims);
      trimMeshes[level] = trims;
    }
  }

  // propGroups[level] exists once that level has been asked for. A blank has no prop, so its groups
  // are empty ones (render.js and effects.js still treat every tile the same way).
  const propGroups = {};
  const ensureProps = (level) => {
    if (!propGroups[level]) {
      const group = tile.kind === 'blank' ? new THREE.Group() : buildLevelProps(tile, level, offsets);
      group.userData.darken ||= [];
      group.visible = false;
      raftMesh.add(group);
      propGroups[level] = group;
    }
    return propGroups[level];
  };
  return { raftMesh, raftCells, propGroups, ensureProps, trimMeshes };
}

// Invisible filled hexes, one per cell, sized to cover the whole cell -- these are what get
// raycast-tested, so clicking anywhere inside a locked tile registers, not just near its visible
// outline (a LineLoop alone would only be hit-testable in a thin ring near the edge, per
// THREE.Raycaster's line threshold). DoubleSide because ShapeGeometry's face winding after rotateX
// isn't hand-verified, and a raycast against a FrontSide-only mesh silently misses back faces.
const MARKER_HIT_GEOMETRY = (() => {
  const geometry = new THREE.ShapeGeometry(hexShape(HEX_RADIUS));
  geometry.rotateX(-Math.PI / 2);
  return geometry;
})();
const MARKER_HIT_MATERIAL = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
const MARKER_OUTLINE_GEOMETRY = new THREE.BufferGeometry().setFromPoints(hexOutlinePoints(HEX_RADIUS));
const MARKER_BUOY_GEOMETRY = new THREE.SphereGeometry(0.06, 8, 8);
const MARKER_BUOY_MATERIAL = new THREE.MeshBasicMaterial({ color: MARKER_COLOR, transparent: true, opacity: 0.6 });

function buildMarkerMesh(tile, offsets) {
  const markerMesh = new THREE.Group();
  const outlineMaterial = new THREE.LineBasicMaterial({ color: MARKER_COLOR, transparent: true, opacity: 0.35 });
  const markerCells = offsets.map(({ dx, dz }) => {
    const hit = new THREE.Mesh(MARKER_HIT_GEOMETRY, MARKER_HIT_MATERIAL);
    hit.position.set(dx, 0.02, dz);
    hit.userData.tileId = tile.id;
    hit.add(new THREE.LineLoop(MARKER_OUTLINE_GEOMETRY, outlineMaterial));
    markerMesh.add(hit);
    return hit;
  });
  const buoy = new THREE.Mesh(MARKER_BUOY_GEOMETRY, MARKER_BUOY_MATERIAL);
  buoy.position.y = 0.02;
  markerMesh.add(buoy);

  markerMesh.userData.outlineMaterial = outlineMaterial;
  markerMesh.userData.baseColor = MARKER_COLOR;
  return { markerMesh, markerCells };
}

// Open sea kept beyond the outermost tile on every side, so the water never runs out before the
// fog does.
const WATER_MARGIN = 120;

// The plane is sized once at scene build time from the whole map, so it stays correct however far
// the map reaches.
function worldTileBounds() {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const tile of TILES) {
    for (const cell of tile.cells) {
      const { x, z } = hexLocalPosition(cell.row, cell.col);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }
  return { minX, maxX, minZ, maxZ };
}

function buildWater(anisotropy, width, depth, centerX, centerZ) {
  const waterGeometry = new THREE.PlaneGeometry(width, depth, 1, 1);
  waterGeometry.rotateX(-Math.PI / 2);
  const waterUniforms = { uTime: { value: 0 }, uNormal: { value: createWaterNormalTexture(anisotropy) } };
  const waterMaterial = new THREE.MeshStandardMaterial({ color: DEFAULT_PALETTE.water, roughness: 0.14, metalness: 0 });
  // The ripples are two scrolling normal maps instead of moving vertices. The plane is flat and
  // horizontal, so the perturbed normal is built in world space and rotated into view space.
  waterMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterUniforms.uTime;
    shader.uniforms.uNormal = waterUniforms.uNormal;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform float uTime;\nuniform sampler2D uNormal;')
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        vec2 wp = vWPos.xz;
        vec3 n1 = texture2D(uNormal, wp * 0.045 + vec2(uTime * 0.018, uTime * 0.011)).xyz * 2.0 - 1.0;
        vec3 n2 = texture2D(uNormal, wp * 0.11 + vec2(-uTime * 0.03, uTime * 0.02)).xyz * 2.0 - 1.0;
        vec3 wn = normalize(vec3((n1.x + n2.x) * 0.95, 1.0, (n1.y + n2.y) * 0.95));
        normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
        diffuseColor.rgb *= 0.86 + 0.28 * (n1.x * 0.5 + 0.5);`
      );
  };
  const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
  waterMesh.position.set(centerX, -0.05, centerZ);
  waterMesh.receiveShadow = true;
  return { waterMesh, waterUniforms };
}

// One instance per cell; render.js places and scales each one every frame, so a raft that isn't
// unlocked yet gets a zero-scale (invisible) ring.
function buildFoam(anisotropy, cellCount) {
  const foamGeometry = new THREE.PlaneGeometry(4.1, 4.1);
  foamGeometry.rotateX(-Math.PI / 2);
  const foamMaterial = new THREE.MeshBasicMaterial({
    map: createFoamTexture(anisotropy),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const foamMesh = new THREE.InstancedMesh(foamGeometry, foamMaterial, cellCount);
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < cellCount; i++) foamMesh.setMatrixAt(i, hidden);
  foamMesh.renderOrder = 1;
  foamMesh.frustumCulled = false;
  return foamMesh;
}

// The camera looks at a ground point from a fixed direction. `half` is the frustum's half-height in
// world units (zoom); the camera also backs off in proportion, so the near/far planes and the fog
// (see FOG_NEAR/FOG_FAR) keep covering the same share of the view at every zoom.
export const CAMERA_OFFSET = new THREE.Vector3(14, 16, 14);
export const BASE_VIEW_HALF = 12;
export const MIN_VIEW_HALF = 7;
export const MAX_VIEW_HALF = 26;
// How far past the outermost tile the camera target may be panned.
export const PAN_MARGIN = 10;
export const FOG_NEAR = 36;
export const FOG_FAR = 60;

export function frameCamera(camera, width, height, half) {
  const aspect = width / height;
  const scale = half / BASE_VIEW_HALF;
  camera.left = -half * aspect;
  camera.right = half * aspect;
  camera.top = half;
  camera.bottom = -half;
  camera.near = 0.1;
  camera.far = 100 * scale;
  camera.updateProjectionMatrix();
}

const SUN_OFFSET = new THREE.Vector3(10, 16, 6);
const SUN_SHADOW_HALF = 16;

// Keeps the sun (and so the shadows) over whatever the camera is looking at, at any zoom.
export function aimSun(sun, target, half) {
  const scale = half / BASE_VIEW_HALF;
  sun.target.position.copy(target);
  sun.position.copy(target).addScaledVector(SUN_OFFSET, scale);
  const shadowCamera = sun.shadow.camera;
  const size = SUN_SHADOW_HALF * scale;
  if (shadowCamera.right !== size) {
    shadowCamera.left = -size;
    shadowCamera.right = size;
    shadowCamera.top = size;
    shadowCamera.bottom = -size;
    shadowCamera.far = 40 * scale;
    shadowCamera.updateProjectionMatrix();
  }
}

export function buildScene(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(DEFAULT_PALETTE.background);
  scene.fog = new THREE.Fog(DEFAULT_PALETTE.background, FOG_NEAR, FOG_FAR);

  const camera = new THREE.OrthographicCamera();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene.add(new THREE.AmbientLight(0xbcd8e8, 0.55));

  const sun = new THREE.DirectionalLight(0xfff4d6, 1.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  scene.add(sun);
  scene.add(sun.target);
  aimSun(sun, new THREE.Vector3(), BASE_VIEW_HALF);

  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const bounds = worldTileBounds();
  const { waterMesh, waterUniforms } = buildWater(
    anisotropy,
    bounds.maxX - bounds.minX + WATER_MARGIN * 2,
    bounds.maxZ - bounds.minZ + WATER_MARGIN * 2,
    (bounds.maxX + bounds.minX) / 2,
    (bounds.maxZ + bounds.minZ) / 2
  );
  scene.add(waterMesh);
  const cellCount = TILES.reduce((sum, t) => sum + t.cells.length, 0);
  const foamMesh = buildFoam(anisotropy, cellCount);
  scene.add(foamMesh);

  const tileObjects = new Map();
  let foamStart = 0;
  for (const tile of TILES) {
    const { center, world, offsets } = tileCells(tile);

    const { raftMesh, raftCells, propGroups, ensureProps, trimMeshes } = buildRaftMesh(tile, offsets);
    raftMesh.position.set(center.x, 0, center.z);
    raftMesh.visible = false;
    scene.add(raftMesh);

    const { markerMesh, markerCells } = buildMarkerMesh(tile, offsets);
    markerMesh.position.set(center.x, 0, center.z);
    markerMesh.visible = false;
    scene.add(markerMesh);

    tileObjects.set(tile.id, { raftMesh, markerMesh, raftCells, markerCells, propGroups, ensureProps, trimMeshes, cellWorld: world, foamStart });
    foamStart += world.length;
  }

  // The cloud field only needs to exist where the camera can look. It can be panned anywhere over
  // the map (and PAN_MARGIN past it), so sample ground points across that whole range at a spacing
  // well inside the view.
  const viewTargets = [];
  const TARGET_STEP = 12;
  for (let x = bounds.minX - PAN_MARGIN; x <= bounds.maxX + PAN_MARGIN + TARGET_STEP; x += TARGET_STEP) {
    for (let z = bounds.minZ - PAN_MARGIN; z <= bounds.maxZ + PAN_MARGIN + TARGET_STEP; z += TARGET_STEP) viewTargets.push(new THREE.Vector3(x, 0, z));
  }

  const zoneTileCenters = new Map(
    ZONES.map((zone) => [
      zone.id,
      TILES.filter((t) => t.zone === zone.id).flatMap((t) => tileObjects.get(t.id).cellWorld.map((c) => ({ id: t.id, x: c.x, z: c.z }))),
    ])
  );

  const cloudField = buildCloudField({
    zoneIds: ZONES.map((zone) => zone.id),
    zoneTiles: zoneTileCenters,
    landRadius: HEX_RADIUS,
    viewHalfHeight: MAX_VIEW_HALF,
    viewTargets,
    cameraOffset: CAMERA_OFFSET,
  });

  return {
    renderer,
    scene,
    camera,
    sun,
    waterMesh,
    waterUniforms,
    foamMesh,
    tileObjects,
    worldBounds: bounds,
    cloudField,
  };
}
