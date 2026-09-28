import * as THREE from 'three';

// ===================================================================
// Ported from the approved preview-levels-3.html art prototype. Only mechanical changes were
// made to fit this module: parameter names to match buildAbyssalProp's signature, THREE imported
// as a module, the prototype's own scene/layout/camera/label code dropped, and every producer's
// `lit` build-time branch replaced with `track()` calls — a zone-4 producer can flip between dim
// and lit at any time as the player unlocks boosters near it (see isLit in js/state.js), so its
// materials need to be toggleable at runtime, not baked in once at construction.
// ===================================================================

const BONE = 0xdcd6c4;
const BONE_DARK = 0x9a9384;
const CYAN = 0x35e6c8, VIOLET = 0x9b5de5, AMBER = 0xffb84d;

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
// darkness pass can toggle it for an unlit zone-4 producer, without rebuilding any geometry.
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

// zone-4 producer roles (fish/kelp/driftwood/crops) now all have bespoke cluster designs in
// cluster-props.js, so the zone-4 single-hex versions were deleted here -- only boosters
// still reach buildAbyssalProp below.

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

export function buildAbyssalProp(propGroup, tile, level) {
  switch (tile.family) {
    case 'booster': buildBoosterProp(propGroup, tile.id, level); break;
  }
}
