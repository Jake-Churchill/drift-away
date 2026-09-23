import * as THREE from 'three';

// ===================================================================
// Ported from the approved preview-levels-3.html art prototype. Only mechanical changes were
// made to fit this module: parameter names to match buildZone3Prop's signature, THREE imported
// as a module, the prototype's own scene/layout/camera/label code dropped, and every producer's
// `lit` build-time branch replaced with `track()` calls — a zone-3 producer can flip between dim
// and lit at any time as the player unlocks boosters near it (see isLit in js/state.js), so its
// materials need to be toggleable at runtime, not baked in once at construction.
// ===================================================================

const OUTLINE = 0x02181a;
const BONE = 0xdcd6c4;
const BONE_DARK = 0x9a9384;
const CYAN = 0x35e6c8, VIOLET = 0x9b5de5, AMBER = 0xffb84d;

function addOutline(mesh, scale, color) {
  const outline = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: color || OUTLINE, side: THREE.BackSide }));
  outline.scale.setScalar(scale || 1.12);
  mesh.add(outline);
}
function cylinderBetween(p1, p2, radius, mat) {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const length = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 6), mat);
  mesh.position.copy(p1).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  mesh.castShadow = true;
  return mesh;
}
function glowMat(color, intensity = 1.4) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.35 });
}
function darkMat(color, rough = 0.8) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough });
}

// Registers a material (already built in its normal/lit appearance) so render.js's per-frame
// darkness pass can toggle it for an unlit zone-3 producer, without rebuilding any geometry.
// `dim` is just the color (and, for glow materials, 0 emissiveIntensity reads as "not glowing").
function track(propGroup, material, dim) {
  (propGroup.userData.darken || (propGroup.userData.darken = [])).push({
    material,
    litColor: material.color.getHex(),
    litEmissiveIntensity: material.emissiveIntensity || 0,
    dimColor: dim.color,
    dimEmissiveIntensity: dim.emissiveIntensity ?? 0,
  });
  return material;
}

// ---------- 1. ANGLERFISH (fish producer) ----------
// A chunky, deep-bodied cartoon angler (built against a user-supplied reference) — huge paired
// eyes, a wide hinged jaw with interlocking teeth, a sail-like spiny dorsal fin, broad rounded
// fins, and the esca arching up from between the eyes.
function buildAnglerfishGeometry() {
  const points = [
    new THREE.Vector2(0, -0.30), new THREE.Vector2(0.13, -0.25), new THREE.Vector2(0.21, -0.10),
    new THREE.Vector2(0.25, 0.06), new THREE.Vector2(0.27, 0.20), new THREE.Vector2(0.23, 0.32),
    new THREE.Vector2(0.13, 0.42), new THREE.Vector2(0.04, 0.48), new THREE.Vector2(0, 0.52),
  ];
  const geo = new THREE.LatheGeometry(points, 16);
  geo.rotateZ(Math.PI / 2);
  geo.scale(1, 1.3, 0.62); // deep/tall, laterally compressed — a chunky body, not an elongated one
  return geo;
}
function buildFishProp(propGroup, level) {
  const bodyMat = track(propGroup, darkMat(0x3d5480), { color: 0x232d48 });
  const body = new THREE.Mesh(buildAnglerfishGeometry(), bodyMat);
  body.castShadow = true;
  addOutline(body, 1.06, OUTLINE);
  propGroup.add(body);

  // two big paired eyes on top of the snout — always visible, never dimmed
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xeef2f6, roughness: 0.25 });
  const pupil = new THREE.MeshStandardMaterial({ color: 0x0c1018, roughness: 0.2 });
  for (const side of [1, -1]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), eyeWhite);
    white.position.set(0.26 + side * 0.03, 0.30, side * 0.10);
    propGroup.add(white);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), pupil);
    p.position.set(0.31 + side * 0.03, 0.30, side * 0.13);
    propGroup.add(p);
  }

  // a wide hinged lower jaw dropping well below the body line, teeth curving from both it and
  // the fixed upper jaw line — an actual open gape instead of a few loose cones.
  const jawMat = darkMat(0xc97a3a, 0.5);
  const lowerJaw = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.16, 0.05, 12, 1, false, 0, Math.PI), jawMat);
  lowerJaw.rotation.set(0, Math.PI / 2, Math.PI / 2 + 0.55);
  lowerJaw.position.set(0.15, -0.05, 0);
  propGroup.add(lowerJaw);
  const mouthMat = darkMat(0x7a2418, 0.6);
  const mouthInterior = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), mouthMat);
  mouthInterior.rotation.y = Math.PI / 2;
  mouthInterior.position.set(0.15, 0.02, 0);
  propGroup.add(mouthInterior);
  const teethMat = darkMat(0xf2f5f8, 0.35);
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const x = 0.28 - t * 0.28;
    for (const [row, sign] of [[0.13, 1], [-0.10, -1]]) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05 + (i % 2) * 0.015, 4), teethMat);
      tooth.position.set(x, row, 0.16 - t * 0.03);
      tooth.rotation.x = sign > 0 ? Math.PI : 0;
      propGroup.add(tooth);
    }
  }

  // esca: arcs up from between the eyes, ending in a bigger rounded glow bulb
  const stalkMat = darkMat(0x6a8ac0);
  const stalkBase = new THREE.Vector3(0.20, 0.42, 0);
  const stalkTip = new THREE.Vector3(0.34, 0.58 + 0.05 * level, 0);
  propGroup.add(cylinderBetween(stalkBase, stalkTip, 0.014, stalkMat));
  const escaMat = track(propGroup, glowMat(AMBER, 1.6), { color: 0x3a3024 });
  const esca = new THREE.Mesh(new THREE.SphereGeometry(0.045 + level * 0.009, 10, 10), escaMat);
  esca.scale.y = 1.3;
  esca.position.copy(stalkTip);
  propGroup.add(esca);

  // small glowing spots along the flank
  const spotMat = track(propGroup, glowMat(CYAN, 1.0), { color: 0x1c3430 });
  for (const s of [[0.05, 0.10, 0.16], [-0.10, 0.05, -0.14], [-0.18, -0.05, 0.1]]) {
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), spotMat);
    spot.position.set(...s);
    propGroup.add(spot);
  }

  // a sail-like dorsal of backward-swept spines, instead of small even cones
  const finMat = darkMat(0x2e3d66);
  const spineSpecs = [{ x: 0.18, h: 0.16, sweep: 10 }, { x: 0.09, h: 0.24, sweep: 18 }, { x: -0.01, h: 0.28, sweep: 24 }, { x: -0.11, h: 0.20, sweep: 30 }, { x: -0.19, h: 0.13, sweep: 34 }];
  for (const s of spineSpecs) {
    const spine = new THREE.Mesh(new THREE.ConeGeometry(0.025, s.h, 4), finMat);
    spine.scale.z = 0.3;
    spine.rotation.x = (Math.PI / 180) * s.sweep;
    spine.position.set(s.x, 0.30, 0);
    propGroup.add(spine);
  }
  // broad, rounded tail and pectoral fins (a flattened dome reads as a fan, not a spike)
  const tailFin = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8, 0, Math.PI), finMat);
  tailFin.rotation.set(0, -Math.PI / 2, 0);
  tailFin.scale.set(0.55, 1, 0.35);
  tailFin.position.set(-0.30, 0.02, 0);
  propGroup.add(tailFin);
  for (const side of [1, -1]) {
    const pec = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6, 0, Math.PI), finMat);
    pec.rotation.set(0, side > 0 ? 0 : Math.PI, 0);
    pec.scale.set(1, 0.6, 0.3);
    pec.position.set(0.02, -0.08, side * 0.16);
    propGroup.add(pec);
  }

  propGroup.rotation.y = 0.6;
  propGroup.position.y += 0.2;
}

// ---------- 2. TUBE WORM COLONY (kelp producer) ----------
function buildTubeWorm(propGroup, colorHex, segments, baseHeight, phase) {
  const bladeGroup = new THREE.Group();
  const mat = track(propGroup, darkMat(colorHex, 0.6), { color: 0x3a2430, emissiveIntensity: 0.8 });
  let y = 0;
  const leanAt = (t) => Math.sin(t * Math.PI * 1.3 + phase) * 0.4;
  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const segHeight = baseHeight / segments;
    const topR = 0.05 * (1 - t) + 0.016;
    const lean = leanAt(t);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(topR, topR + 0.006, segHeight, 7), mat);
    seg.position.y = y + segHeight / 2;
    seg.rotation.z = lean;
    seg.castShadow = true;
    bladeGroup.add(seg);
    y += segHeight * Math.cos(lean);
  }
  // feathery glowing plume at the tip
  const plumeMat = track(propGroup, glowMat(CYAN, 1.1), { color: 0x1c3430 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.09, 3), plumeMat);
    p.position.set(Math.cos(a) * 0.02, y + 0.04, Math.sin(a) * 0.02);
    p.rotation.z = Math.cos(a) * 0.5;
    p.rotation.x = Math.sin(a) * 0.5;
    bladeGroup.add(p);
  }
  return bladeGroup;
}
function buildKelpProp(propGroup, level) {
  const specs = [
    { c: 0x6b2f3a, x: -0.18, z: -0.24, h: 0.5, phase: 0.6 },
    { c: 0x7a3a42, x: 0.14, z: -0.22, h: 0.56, phase: 2.1 },
    { c: 0x6b2f3a, x: -0.28, z: 0, h: 0.62, phase: 0 },
    { c: 0x8a4550, x: 0, z: 0, h: 0.78, phase: 1.4 },
    { c: 0x7a3a42, x: 0.28, z: 0, h: 0.58, phase: 2.8 },
    { c: 0x6b2f3a, x: -0.08, z: 0.24, h: 0.52, phase: 3.6 },
    { c: 0x8a4550, x: 0.24, z: 0.22, h: 0.46, phase: 5.0 },
  ];
  for (const s of specs) {
    const worm = buildTubeWorm(propGroup, s.c, 8, s.h, s.phase);
    worm.position.set(s.x, 0, s.z);
    propGroup.add(worm);
  }
}

// ---------- 3. BONE REEF (driftwood producer) ----------
function buildBone(propGroup, length, radius, x, z, rotY, tilt, yOffset) {
  const mat = track(propGroup, darkMat(BONE), { color: 0x2a281f });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, length, 8), mat);
  shaft.rotation.z = Math.PI / 2;
  shaft.rotation.y = rotY;
  shaft.rotation.x = tilt;
  shaft.position.set(x, radius + 0.03 + yOffset, z);
  shaft.castShadow = true;
  const group = new THREE.Group();
  group.add(shaft);
  const jointMat = track(propGroup, darkMat(BONE_DARK), { color: 0x211f18 });
  for (const s of [-1, 1]) {
    const joint = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.5, 8, 6), jointMat);
    joint.position.copy(shaft.position).add(new THREE.Vector3(Math.cos(rotY) * (length / 2) * s, 0, -Math.sin(rotY) * (length / 2) * s));
    group.add(joint);
  }
  return group;
}
function buildDriftwoodProp(propGroup, level) {
  propGroup.add(buildBone(propGroup, 0.85, 0.06, -0.05, 0.05, 0.15, 0, 0));
  propGroup.add(buildBone(propGroup, 0.65, 0.05, 0.12, -0.08, -0.6, 0.05, 0));
  propGroup.add(buildBone(propGroup, 0.42, 0.04, -0.2, -0.15, 1.1, -0.08, 0));
  propGroup.add(buildBone(propGroup, 0.5, 0.045, 0.22, 0.16, 0.85, 0.06, 0.03));
  propGroup.add(buildBone(propGroup, 0.95, 0.07, -0.05, 0.02, 0.4, 0, 0.12));
  const glowMatV = track(propGroup, glowMat(AMBER, 1.2), { color: 0x3a3024 });
  for (const p of [[0.09, 0.32, -0.04], [-0.19, 0.32, 0.08]]) {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), glowMatV);
    orb.position.set(...p);
    propGroup.add(orb);
  }
}

// ---------- 4. VENT GARDEN (crops producer) ----------
function buildCropsProp(propGroup, level) {
  const stalkMat = track(propGroup, darkMat(0xb7c6c8, 0.7), { color: 0x2a2e2f });
  const capColors = [CYAN, VIOLET];
  const capMats = capColors.map((c) => track(propGroup, glowMat(c, 1.0), { color: 0x1c2430 }));
  const count = 26;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.4;
    const radius = 0.12 + (i % 4) * 0.1;
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius * 0.6;
    const lean = (((i * 7) % 5) - 2) * 0.09;
    const h = 0.4 + (i % 3) * 0.08;
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.012, h, 5), stalkMat);
    stalk.position.set(x, h / 2, z);
    stalk.rotation.z = lean;
    stalk.castShadow = true;
    propGroup.add(stalk);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), capMats[i % 2]);
    cap.scale.set(1, 0.6, 1);
    cap.position.set(x + Math.sin(lean) * h, h + 0.01, z);
    cap.rotation.z = lean;
    propGroup.add(cap);
  }
  // central vent with rising bubble puffs
  const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.1, 8), darkMat(0x2a2e40));
  vent.position.y = 0.05;
  propGroup.add(vent);
  const puffMat = track(propGroup, new THREE.MeshStandardMaterial({ color: CYAN, transparent: true, opacity: 0.5, emissive: CYAN, emissiveIntensity: 0.6 }), { color: 0x1c3430, emissiveIntensity: 0 });
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.02 + t * 0.02, 6, 6), puffMat);
    puff.position.set(0.02 * i, 0.12 + t * 0.28, 0);
    propGroup.add(puff);
  }
}

// ---------- 5. ANGLERFISH LURE (booster, ex-lighthouse — the mechanic's flagship) ----------
function buildLighthouse(group, level) {
  const stalkMat = darkMat(0x2e3d66, 0.6);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.75, 8), stalkMat);
  stalk.position.y = 0.375;
  group.add(stalk);
  for (const t of [0.35, 0.6]) {
    const small = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), glowMat(CYAN, 1.0));
    small.position.y = 0.75 * t;
    group.add(small);
  }
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.09 + level * 0.015, 12, 12), glowMat(AMBER, 1.8));
  orb.position.y = 0.82;
  group.add(orb);
  const light = new THREE.PointLight(AMBER, 1.2, 3, 2);
  light.position.y = 0.82;
  group.add(light);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.06, 8), darkMat(0x2a2e40));
  base.position.y = 0.03;
  group.add(base);
}

// ---------- 6. BONE RACK (drying-rack booster) ----------
function buildDryingRack(group, level) {
  const mat = darkMat(BONE_DARK, 0.85);
  const postH = 0.5;
  for (const x of [-0.18, 0.18]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, postH, 6), mat);
    post.position.set(x, postH / 2, 0);
    group.add(post);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.4, 6), mat);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = postH;
  group.add(bar);
  const hangs = level >= 2 ? [-0.16, -0.04, 0.08, 0.16] : [-0.12, 0.02, 0.14];
  for (const x of hangs) {
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 4), mat);
    string.position.set(x, postH - 0.07, 0);
    group.add(string);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), glowMat(CYAN, 1.0));
    orb.position.set(x, postH - 0.14, 0);
    group.add(orb);
  }
}

// ---------- 7. VENT CHIMNEY (smokehouse booster) ----------
function buildSmokehouse(group, level) {
  const mat = darkMat(0x3e4460, 0.7);
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.18, 0.55, 8), mat);
  spire.position.y = 0.275;
  group.add(spire);
  const puffCount = 2 + level;
  const puffMat = new THREE.MeshStandardMaterial({ color: VIOLET, emissive: VIOLET, emissiveIntensity: 0.7, transparent: true, opacity: 0.55 });
  for (let i = 0; i < puffCount; i++) {
    const t = i / Math.max(puffCount - 1, 1);
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.03 + t * 0.03, 8, 8), puffMat);
    puff.position.set(0.02 * i, 0.6 + t * 0.22, 0.01 * i);
    group.add(puff);
  }
}

// ---------- 8. CURRENT TURBINE (windmill booster) ----------
function buildWindmill(group, level) {
  const towerMat = darkMat(0x323a5c, 0.7);
  const towerHeight = 0.75;
  const ringPoint = (ring, i) => {
    const t = ring / 4;
    const r = 0.26 + (0.04 - 0.26) * t;
    const a = i * (Math.PI / 2) + Math.PI / 4;
    return new THREE.Vector3(r * Math.cos(a), towerHeight * t, r * Math.sin(a));
  };
  for (let i = 0; i < 4; i++) group.add(cylinderBetween(ringPoint(0, i), ringPoint(4, i), 0.018, towerMat));
  for (let ring = 0; ring <= 4; ring++) {
    for (let i = 0; i < 4; i++) group.add(cylinderBetween(ringPoint(ring, i), ringPoint(ring, (i + 1) % 4), 0.01, towerMat));
  }
  const hub = new THREE.Group();
  hub.position.y = towerHeight + 0.03;
  const bladeMat = glowMat(CYAN, 0.9);
  const bladeCount = 6 + level * 2;
  for (let i = 0; i < bladeCount; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.008), bladeMat);
    blade.position.x = 0.1;
    const pivot = new THREE.Group();
    pivot.rotation.z = (i / bladeCount) * Math.PI * 2;
    pivot.add(blade);
    hub.add(pivot);
  }
  group.add(hub);
}

// ---------- 9. FILTER WEB (net-weavers booster) ----------
function buildNetWeavers(group, level) {
  const strandMat = darkMat(0x37416c, 0.6);
  const spokes = 7;
  const outerR = 0.34;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const p = new THREE.Vector3(Math.cos(a) * outerR, 0.22 + Math.sin(a * 2) * 0.04, Math.sin(a) * outerR);
    group.add(cylinderBetween(new THREE.Vector3(0, 0.1, 0), p, 0.008, strandMat));
  }
  for (const t of [0.4, 0.7, 1]) {
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      const b = ((i + 1) / spokes) * Math.PI * 2;
      const p1 = new THREE.Vector3(Math.cos(a) * outerR * t, 0.1 + 0.12 * t, Math.sin(a) * outerR * t);
      const p2 = new THREE.Vector3(Math.cos(b) * outerR * t, 0.1 + 0.12 * t, Math.sin(b) * outerR * t);
      group.add(cylinderBetween(p1, p2, 0.006, strandMat));
    }
  }
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 6), strandMat);
  post.position.y = 0.06;
  group.add(post);
  const moteMat = glowMat(CYAN, 1.3);
  const moteCount = 6 + level * 3;
  for (let i = 0; i < moteCount; i++) {
    const t = 0.3 + (i / moteCount) * 0.7;
    const a = (i / moteCount) * Math.PI * 2 * 1.7;
    const mote = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), moteMat);
    mote.position.set(Math.cos(a) * outerR * t, 0.1 + 0.12 * t, Math.sin(a) * outerR * t);
    group.add(mote);
  }
}

// ---------- 10. OSSUARY (composting-shed booster) ----------
function buildCompostingShed(group, level) {
  const wallMat = darkMat(BONE, 0.75);
  const roofMat = darkMat(0x3a2430, 0.7);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.3, 0.38), wallMat);
  cabin.position.y = 0.15;
  group.add(cabin);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.2, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 0.4;
  group.add(roof);
  const growthMat = glowMat(VIOLET, 1.0);
  const growthCount = 2 + level;
  for (let i = 0; i < growthCount; i++) {
    const a = (i / growthCount) * Math.PI * 2;
    const growth = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), growthMat);
    growth.scale.set(1, 0.6, 1);
    growth.position.set(Math.cos(a) * 0.12, 0.44, Math.sin(a) * 0.12);
    group.add(growth);
  }
}

function buildBoosterProp(group, tileId, level) {
  switch (tileId) {
    case 'abyssal_booster_drying_rack': buildDryingRack(group, level); break;
    case 'abyssal_booster_smokehouse': buildSmokehouse(group, level); break;
    case 'abyssal_booster_windmill': buildWindmill(group, level); break;
    case 'abyssal_booster_net_weavers': buildNetWeavers(group, level); break;
    case 'abyssal_booster_composting_shed': buildCompostingShed(group, level); break;
    case 'abyssal_booster_lighthouse': buildLighthouse(group, level); break;
  }
}

export function buildZone3Prop(propGroup, tile, level) {
  switch (tile.family) {
    case 'fish': buildFishProp(propGroup, level); break;
    case 'kelp': buildKelpProp(propGroup, level); break;
    case 'driftwood': buildDriftwoodProp(propGroup, level); break;
    case 'crops': buildCropsProp(propGroup, level); break;
    case 'booster': buildBoosterProp(propGroup, tile.id, level); break;
  }
}
