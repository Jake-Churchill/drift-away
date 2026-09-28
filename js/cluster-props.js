import * as THREE from 'three';

// One prop per cluster: a single build that spans all three hexes, centred on the cluster, in place
// of the old one-small-prop-per-hex. Units are world units (a hex is 1.6 across from its centre),
// y = 0 is the raft deck, and (0, 0) is the cluster's centre with its three cells at radius 1.6.
// scene.js applies only the per-level scale and the level badge.
//
// A builder is (group, level, dirs): dirs are the unit vectors from the cluster's centre to each of
// its cells, so a prop can reach out over every hex without assuming the triangle's orientation.

const UP = new THREE.Vector3(0, 1, 0);
const CELL_RADIUS = 1.6;

const materials = new Map();
function material(color) {
  if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  return materials.get(color);
}

// A tapered cylinder laid between two points: r0 at `from`, r1 at `to`.
function limb(group, color, from, to, r0, r1 = r0 * 0.7) {
  const a = new THREE.Vector3(...from);
  const dir = new THREE.Vector3(...to).sub(a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, dir.length(), 8), material(color));
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

// A point `dist` out along direction d, `side` to its left, `y` up.
function at(d, dist, y, side = 0) {
  return [d.x * dist - d.z * side, y, d.z * dist + d.x * side];
}

function turned(d, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: d.x * c - d.z * s, z: d.x * s + d.z * c };
}

// Never cached, unlike `material()`: render.js mutates a lit/dim Abyssal producer's glow materials
// in place every frame (see `trackGlow` below), and a cached instance would leak that mutation onto
// every other cluster sharing the same color.
function glowMaterial(color, intensity = 1.2) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.4, emissive: color, emissiveIntensity: intensity });
}

// Registers a glow mesh's material so render.js's per-frame Abyssal Trench bioluminescence pass
// (js/render.js, keyed off isLit) can toggle it between its built "lit" look and `dimColor` at 0
// emissive intensity, without rebuilding any geometry. Mirrors the old js/abyssal-props.js `track()`
// that this cluster art replaced -- every glow accent below must go through this, or a producer's
// glow would stay on regardless of whether a booster actually lit it.
function trackGlow(group, mesh, dimColor) {
  const mat = mesh.material;
  (group.userData.darken ||= []).push({
    material: mat,
    litColor: mat.color.getHex(),
    litEmissiveIntensity: mat.emissiveIntensity || 0,
    dimColor,
    dimEmissiveIntensity: 0,
  });
}

// A downward-hanging icicle: a thin cone, point down.
function icicle(group, color, pos, length, radius = 0.02) {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, length, 6), material(color));
  mesh.position.set(...pos);
  mesh.rotation.x = Math.PI;
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

// ---------- DRIFTWOOD ----------
// A collector rig: a lashed tripod of spars in the middle, a boom log running out over each hex, and
// at the end of each boom a neat stack of collected logs. Higher levels add cross-ties, taller stacks
// and barnacle-crusted crowns. Reused for zone 2 ("Ice-Locked Driftwood": same harvest, frozen over)
// and zone 4 ("Bone Reef": the wood is pale and dead, with the trench's own glow) via `theme`.
const DRIFTWOOD_THEME = {
  logColors: [0x5a3f22, 0x8a7f6e, 0x6b4c2a],
  moss: 0x4a5c3a,
  twig: 0x7a6a52,
  barnacle: 0xb8b2a4,
  rope: 0xb89a5e,
};

function woodpile(group, d, level, tint, theme) {
  const c = 1.75;
  const y = 0.19;
  const along = (dist, yy, r, color, half) => limb(group, color, at(d, dist, yy, -half), at(d, dist, yy, half), r, r * 0.8);
  along(c - 0.24, y, 0.26, theme.logColors[tint % 3], 0.85);
  along(c + 0.24, y, 0.25, theme.logColors[(tint + 1) % 3], 0.8);
  along(c, y + 0.33, 0.24, theme.logColors[(tint + 2) % 3], 0.84);
  if (level >= 2) {
    along(c - 0.13, y + 0.64, 0.19, theme.moss, 0.62);
    along(c + 0.13, y + 0.64, 0.19, theme.logColors[tint % 3], 0.6);
  }
  if (level >= 3) {
    along(c, y + 0.92, 0.21, theme.logColors[1], 0.68);
    const barnacles = material(theme.barnacle);
    for (const s of [-0.25, 0.1, 0.32]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), barnacles);
      b.position.set(...at(d, c, y + 1.1, s));
      group.add(b);
    }
  }
  // Loose pieces round the stack.
  limb(group, theme.twig, at(d, c + 0.1, 0.05, -0.85), at(d, c + 0.4, 0.22, -1.05), 0.05, 0.03);
  limb(group, theme.logColors[(tint + 1) % 3], at(d, c - 0.5, 0.1, 0.9), at(d, c, 0.1, 1.15), 0.14, 0.1);
  theme.accent?.(group, d, level, c, y);
}

function buildDriftwoodCluster(group, level, dirs, theme = DRIFTWOOD_THEME) {
  dirs.forEach((d, i) => {
    // Boom log from the middle out to the stack.
    limb(group, theme.logColors[i % 3], at(d, 0.3, 0.22), at(d, 1.4, 0.22, 0.04 * (i - 1)), 0.3, 0.25);
    woodpile(group, d, level, i, theme);
    // The tripod's foot sits between two booms.
    const foot = turned(d, Math.PI / 3);
    limb(group, theme.logColors[1], [foot.x * 0.65, 0.05, foot.z * 0.65], [0, 1.95 + 0.04 * i, 0], 0.15, 0.09);
    if (level >= 2) {
      const next = turned(dirs[(i + 1) % dirs.length], Math.PI / 3);
      limb(group, theme.logColors[2], [foot.x * 0.36, 0.72, foot.z * 0.36], [next.x * 0.36, 0.72, next.z * 0.36], 0.07, 0.07);
    }
  });
  const lash = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.04, 6, 12), material(theme.rope));
  lash.rotation.x = Math.PI / 2;
  lash.position.set(0, 1.65, 0);
  group.add(lash);
  if (level >= 3) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.045, 6, 14), material(theme.rope));
    coil.rotation.x = Math.PI / 2;
    coil.position.set(0, 0.62, 0);
    group.add(coil);
  }
}

const FROST_DRIFTWOOD_THEME = {
  logColors: [0x9fb0b8, 0x7d8f9b, 0xb8c8cc],
  moss: 0xbfe0ec,
  twig: 0x8fa2aa,
  barnacle: 0xdce8ec,
  rope: 0xc9d6da,
  accent(group, d, level, c, y) {
    icicle(group, 0xdce8ec, at(d, c - 0.2, y - 0.02, 0.5), 0.16 + 0.05 * level, 0.02);
    icicle(group, 0xdce8ec, at(d, c + 0.2, y - 0.02, -0.45), 0.13 + 0.04 * level, 0.017);
  },
};

const BONE_REEF_THEME = {
  logColors: [0x8f8878, 0xbcb4a0, 0x6f6a5c],
  moss: 0x3a4a48,
  twig: 0x7a7264,
  barnacle: 0x4a4438,
  rope: 0x6f6a5c,
  accent(group, d, level, c, y) {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.035 + 0.01 * level, 8, 8), glowMaterial(0xffb347, 1.4));
    orb.position.set(...at(d, c + 0.15, y + 0.4, 0.15));
    group.add(orb);
    trackGlow(group, orb, 0x3a3024);
  },
};

function buildFrostDriftwoodCluster(group, level, dirs) {
  buildDriftwoodCluster(group, level, dirs, FROST_DRIFTWOOD_THEME);
}

function buildBoneReefDriftwoodCluster(group, level, dirs) {
  buildDriftwoodCluster(group, level, dirs, BONE_REEF_THEME);
}

// ---------- FISH ----------
// One net rig: a two-legged mast in the middle (its crossbar the old float/buoy), a net-line
// reaching out to a ring over each hex, and fish caught along the lines and rings -- rather than
// three separate traps. Fish keep the old body/fin colors: zone 1's olive koi with gold fins at
// higher levels, zone 2's pale arctic char, zone 4's dark anglerfish with a glowing esca.
const FISH_THEME = { body: 0x5c7a4e, spot: 0x33481f, fin: { 1: 0x46603a, 2: 0xb8752f, 3: 0xffd23d }, mast: 0x6b4c2a, rope: 0xb89a5e, buoy: 0xd23b3b, esca: null };

function fishlet(theme, level, scale) {
  const g = new THREE.Group();
  const bodyMat = material(theme.body);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.1 * scale, 8, 6), bodyMat);
  body.scale.set(1.7, 0.75, 0.95);
  body.castShadow = true;
  g.add(body);
  const finMat = material(theme.fin[level] ?? theme.fin[1]);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07 * scale, 0.15 * scale, 4), finMat);
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -0.17 * scale;
  g.add(tail);
  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.032 * scale, 0.08 * scale, 4), finMat);
  dorsal.position.set(0.02 * scale, 0.1 * scale, 0);
  g.add(dorsal);
  if (theme.spot) {
    const spotMat = material(theme.spot);
    for (const s of [[0.03, 0.05, 0.07], [-0.02, 0.06, -0.06]]) {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.018 * scale, 6, 6), spotMat);
      spot.position.set(s[0] * scale, s[1] * scale, s[2] * scale);
      g.add(spot);
    }
  }
  if (theme.esca) {
    const esca = new THREE.Mesh(new THREE.SphereGeometry(0.028 * scale, 6, 6), glowMaterial(theme.esca, 1.6));
    esca.position.set(0.12 * scale, 0.14 * scale, 0);
    g.add(esca);
    trackGlow(g, esca, theme.dim);
  }
  return g;
}

function buildFishCluster(group, level, dirs, theme = FISH_THEME) {
  // The mast: two legs to a crossbar, the old buoy now riding at its peak.
  for (const side of [-1, 1]) {
    limb(group, theme.mast, [side * 0.16, 0, 0], [0, 0.85, 0], 0.06, 0.045);
  }
  limb(group, theme.mast, [-0.12, 0.55, 0], [0.12, 0.55, 0], 0.032, 0.032);
  const buoy = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), theme.buoyGlow ? glowMaterial(theme.buoy, 1.3) : material(theme.buoy));
  buoy.position.set(0, 0.92, 0);
  group.add(buoy);
  if (theme.buoyGlow) trackGlow(group, buoy, theme.dim);

  const fishPerArm = level;
  dirs.forEach((d) => {
    const end = at(d, 1.5, 0.3);
    limb(group, theme.rope, [0, 0.7, 0], end, 0.022, 0.015);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 14), material(theme.mast));
    ring.position.set(end[0], end[1], end[2]);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    for (let k = 0; k < fishPerArm; k++) {
      const t = 0.35 + k * 0.28;
      const px = 0 + (end[0] - 0) * t;
      const py = 0.7 + (end[1] - 0.7) * t + 0.05;
      const pz = 0 + (end[2] - 0) * t;
      const fish = fishlet(theme, level, 1 + 0.12 * k);
      fish.position.set(px, py, pz);
      fish.rotation.y = Math.atan2(d.x, d.z) + (k % 2 ? 0.4 : -0.4);
      group.add(fish);
    }
  });
  theme.accent?.(group, level);
}

const FROST_FISH_THEME = {
  body: 0x8fb5cc,
  spot: 0xf4fbff,
  fin: { 1: 0xbfe4ef, 2: 0x8ad9f2, 3: 0xdcf8ff },
  mast: 0x7d8f9b,
  rope: 0xc9d6da,
  buoy: 0xe4f0f4,
  buoyGlow: false,
  accent(group, level) {
    icicle(group, 0xdce8ec, [0.16, 0.3, 0], 0.16, 0.02);
    icicle(group, 0xdce8ec, [-0.14, 0.28, 0], 0.13, 0.017);
  },
};

const ANGLER_FISH_THEME = {
  body: 0x3d5480,
  spot: null,
  fin: { 1: 0x232d48, 2: 0x232d48, 3: 0x232d48 },
  mast: 0x5a5648,
  rope: 0x6f6a5c,
  buoy: 0xffb84d,
  buoyGlow: true,
  esca: 0xffb84d,
  dim: 0x1c2430,
};

function buildFrostFishCluster(group, level, dirs) {
  buildFishCluster(group, level, dirs, FROST_FISH_THEME);
}

function buildAnglerFishCluster(group, level, dirs) {
  buildFishCluster(group, level, dirs, ANGLER_FISH_THEME);
}

// ---------- KELP ----------
// One holdfast mass in the middle with kelp blades trailing out along a line to each hex, using
// the old blade colors -- one plant reaching across the cluster, not three separate beds. Zone 4's
// role is re-imagined as tube worms in the old art (see abyssal-props.js), not kelp, so this same
// rig grows worm tubes instead when `theme.worm` is set.
const KELP_THEME = { blades: [0x2f7248, 0x3f8a5c, 0x4c9a6a, 0x5aab78, 0x6fbb88], holdfast: 0x2b4a34, rope: 0xb89a5e, worm: false, glow: null };

function kelpGrowth(group, base, count, theme, level) {
  for (let i = 0; i < count; i++) {
    const color = theme.blades[i % theme.blades.length];
    const mat = theme.glow ? glowMaterial(color, 1.0) : material(color);
    const h = (theme.worm ? 0.22 : 0.42) + (i % 3) * 0.1 + level * 0.05;
    const lean = Math.sin(i * 1.7) * 0.35;
    const spread = 0.1 * (i % 4) - 0.15;
    const x = base[0] + spread;
    const z = base[2] + (i % 2 ? 0.08 : -0.08);
    const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.014, theme.worm ? 0.05 : 0.065, h, 6), mat);
    if (!theme.worm) blade.scale.z = 0.22;
    blade.position.set(x, h / 2, z);
    blade.rotation.z = lean;
    blade.castShadow = true;
    group.add(blade);
    if (theme.glow) trackGlow(group, blade, theme.dim);
    if (!theme.worm) {
      const bladder = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), mat);
      bladder.position.set(x + Math.sin(lean) * h * 0.5, h, z);
      group.add(bladder);
    }
  }
}

function buildKelpCluster(group, level, dirs, theme = KELP_THEME) {
  for (const s of [[0, 0, 0], [0.08, 0, 0.05], [-0.07, 0, -0.05]]) {
    const hf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), material(theme.holdfast));
    hf.scale.set(1, 0.45, 1);
    hf.position.set(...s);
    group.add(hf);
  }
  kelpGrowth(group, [0, 0, 0], 4 + level, theme, level);
  dirs.forEach((d) => {
    const end = at(d, 1.5, 0);
    limb(group, theme.rope, [0, 0.04, 0], end, 0.032, 0.02);
    kelpGrowth(group, end, 3 + level, theme, level);
  });
  theme.accent?.(group, level);
}

const FROST_KELP_THEME = {
  blades: [0x2f6f6b, 0x3c8a80, 0x4e9f93, 0x35796f, 0x59aa9b],
  holdfast: 0x1f4a44,
  rope: 0xc9d6da,
  worm: false,
  glow: null,
  accent(group) {
    icicle(group, 0xdce8ec, [0.12, 0.04, 0.1], 0.13, 0.017);
    icicle(group, 0xdce8ec, [-0.1, 0.04, -0.08], 0.1, 0.015);
  },
};

const GLOW_KELP_THEME = { blades: [0x6b2f3a, 0x7a3a42, 0x8a4550], holdfast: 0x4a2530, rope: 0x6f6a5c, worm: true, glow: true, dim: 0x241419 };

function buildFrostKelpCluster(group, level, dirs) {
  buildKelpCluster(group, level, dirs, FROST_KELP_THEME);
}

function buildGlowKelpCluster(group, level, dirs) {
  buildKelpCluster(group, level, dirs, GLOW_KELP_THEME);
}

// ---------- CROPS ----------
// One bound haystack in the middle with wheat sheaves leaning out toward each hex, using the old
// wheat-field colors -- one field reaching across the cluster, not three stooks. Zone 4's role is
// the original "Vent Garden": a hydrothermal vent with glowing-capped stalks, not wheat, so it
// gets its own build below instead of this one.
const CROPS_THEME = { stalkTop: 0xac9138, stalkBase: 0x7c9a3e, head: { 1: 0xe9c85a, 2: 0xd9a83a, 3: 0xc98f2a }, vent: false };

function wheatSheaf(group, theme, level, dir) {
  const headMat = material(theme.head[level] ?? theme.head[1]);
  const stalkTopMat = material(theme.stalkTop);
  const stalkBaseMat = material(theme.stalkBase);
  const count = 5 + level * 2;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count - 0.5;
    const reach = 0.2 + (i % 3) * 0.1;
    const x = dir.x * reach - dir.z * t * 0.5;
    const z = dir.z * reach + dir.x * t * 0.5;
    const h = 0.42 + (i % 3) * 0.08;
    const lean = dir.x * 0.45 + (i % 2 ? 0.1 : -0.1);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.017, h * 0.4, 5), stalkBaseMat);
    base.position.set(x, h * 0.2, z);
    base.rotation.z = lean;
    base.castShadow = true;
    group.add(base);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.011, h * 0.62, 5), stalkTopMat);
    top.position.set(x + Math.sin(lean) * h * 0.42, h * 0.72, z);
    top.rotation.z = lean;
    group.add(top);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 6), headMat);
    ear.scale.set(0.045, 0.15, 0.045);
    ear.position.set(x + Math.sin(lean) * h, h + 0.03, z);
    ear.rotation.z = lean;
    group.add(ear);
  }
}

function buildCropsCluster(group, level, dirs, theme = CROPS_THEME) {
  if (theme.vent) return buildVentGarden(group, level, dirs);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    limb(group, theme.stalkBase, [Math.cos(a) * 0.11, 0, Math.sin(a) * 0.11], [0, 0.58, 0], 0.022, 0.008);
  }
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 6, 12), material(theme.stalkTop));
  band.rotation.x = Math.PI / 2;
  band.position.set(0, 0.34, 0);
  group.add(band);
  dirs.forEach((d) => wheatSheaf(group, theme, level, d));
  theme.accent?.(group, level);
}

const FROST_CROPS_THEME = {
  stalkTop: 0x8fa8ac,
  stalkBase: 0x6f8a8e,
  head: { 1: 0xd9ecf2, 2: 0xa9d8ea, 3: 0x7cc6e8 },
  vent: false,
  accent(group) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      icicle(group, 0xdce8ec, [Math.cos(a) * 0.24, 0.4, Math.sin(a) * 0.24], 0.16, 0.02);
    }
  },
};

// The old abyssal "Vent Garden": glowing cyan/violet-capped stalks radiating from a bubbling
// hydrothermal vent, spread along each arm instead of clumped at three separate spots.
function buildVentGarden(group, level, dirs) {
  const stalkMat = material(0xb7c6c8);
  const capColors = [0x35e6c8, 0x9b5de5];
  const perArm = 5 + level * 2;
  dirs.forEach((d) => {
    for (let i = 0; i < perArm; i++) {
      const t = (i + 1) / (perArm + 1);
      const side = (i % 2 ? 1 : -1) * 0.08;
      const pos = at(d, 1.5 * t, 0, side);
      const h = 0.28 + (i % 3) * 0.07 + level * 0.03;
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.012, h, 5), stalkMat);
      stalk.position.set(pos[0], h / 2, pos[2]);
      stalk.castShadow = true;
      group.add(stalk);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), glowMaterial(capColors[i % 2], 1.0));
      cap.scale.set(1, 0.6, 1);
      cap.position.set(pos[0], h + 0.01, pos[2]);
      group.add(cap);
      trackGlow(group, cap, i % 2 ? 0x241c30 : 0x1c3430);
    }
  });
  const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.16, 10), material(0x2a2e40));
  vent.position.y = 0.08;
  group.add(vent);
  for (let i = 0; i < 4 + level; i++) {
    const t = i / (3 + level);
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.03 + t * 0.03, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x35e6c8, transparent: true, opacity: 0.5, emissive: 0x35e6c8, emissiveIntensity: 0.6 })
    );
    puff.position.set(0.01 * i, 0.16 + t * 0.4, 0);
    group.add(puff);
    trackGlow(group, puff, 0x1c3430);
  }
}

function buildFrostCropsCluster(group, level, dirs) {
  buildCropsCluster(group, level, dirs, FROST_CROPS_THEME);
}

function buildGlowCropsCluster(group, level, dirs) {
  buildCropsCluster(group, level, dirs, { vent: true });
}

// ---------- TIMBERLINE GENERATORS ----------
// Planks (Sawmill): a sawhorse and saw in the middle, a plank pile stacked on each hex.
const PLANK_WOOD = 0xa9754a;
const SAW_METAL = 0x8a8a8a;

function plankPile(group, d, dist, level) {
  const c = at(d, dist, 0.06);
  const count = 3 + level;
  for (let i = 0; i < count; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.055, 0.28), material(PLANK_WOOD));
    plank.position.set(c[0], 0.035 + i * 0.06, c[2]);
    plank.rotation.y = (i % 2) * 0.15;
    plank.castShadow = true;
    group.add(plank);
  }
}

function buildPlanksCluster(group, level, dirs) {
  dirs.forEach((d) => plankPile(group, d, 1.5, level));
  for (const side of [-1, 1]) {
    limb(group, PLANK_WOOD, [side * 0.2, 0, -0.15], [0, 0.35, 0], 0.04, 0.028);
    limb(group, PLANK_WOOD, [side * 0.2, 0, 0.15], [0, 0.35, 0], 0.04, 0.028);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.075, 0.13), material(PLANK_WOOD));
  beam.position.set(0, 0.4, 0);
  group.add(beam);
  const saw = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.19, 0.012), material(SAW_METAL));
  saw.position.set(0, 0.55, 0.05);
  saw.rotation.z = 0.15;
  group.add(saw);
  if (level >= 3) {
    const dust = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.13, 10), material(0xd8c08a));
    dust.position.set(0.1, 0.05, 0.2);
    group.add(dust);
  }
}

// Kelp rope (Ropeworks): a rope-walk (two posts and a spindle) in the middle, coiled rope on each hex.
const ROPEWORKS_WOOD = 0x7a5a35;

function ropeCoilPile(group, d, dist, level) {
  const c = at(d, dist, 0.02);
  for (let i = 0; i < 2 + level; i++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.15 - i * 0.018, 0.04, 6, 14), material(0xb89a5e));
    coil.rotation.x = Math.PI / 2;
    coil.position.set(c[0], 0.04 + i * 0.06, c[2]);
    group.add(coil);
  }
}

function buildKelpRopeCluster(group, level, dirs) {
  dirs.forEach((d) => ropeCoilPile(group, d, 1.5, level));
  limb(group, ROPEWORKS_WOOD, [-0.35, 0, 0], [-0.35, 0.5, 0], 0.045, 0.038);
  limb(group, ROPEWORKS_WOOD, [0.35, 0, 0], [0.35, 0.5, 0], 0.045, 0.038);
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.78, 8), material(0x4a4a4a));
  spindle.rotation.z = Math.PI / 2;
  spindle.position.set(0, 0.5, 0);
  group.add(spindle);
  const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.016, 6, 10), material(0xb89a5e));
  wrap.rotation.z = Math.PI / 2;
  wrap.position.set(-0.1, 0.5, 0);
  group.add(wrap);
  if (level >= 3) {
    const wrap2 = wrap.clone();
    wrap2.position.set(0.12, 0.5, 0);
    group.add(wrap2);
  }
}

// Bread (Bakehouse): a clay oven in the middle, grain sacks stacked on each hex.
const CLAY = 0x9a5a3a;
const SACK = 0xd9b23c;

function grainSack(group, d, dist, level) {
  const c = at(d, dist, 0.17);
  const count = 1 + Math.floor(level / 2);
  for (let i = 0; i < count; i++) {
    const sack = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), material(SACK));
    sack.scale.set(1, 1.3, 1);
    sack.position.set(c[0] + i * 0.17, 0.2, c[2]);
    sack.castShadow = true;
    group.add(sack);
  }
}

function buildBreadCluster(group, level, dirs) {
  dirs.forEach((d) => grainSack(group, d, 1.5, level));
  const oven = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10, 0, Math.PI * 2, 0, Math.PI / 1.7), material(CLAY));
  oven.position.set(0, 0.02, 0);
  oven.castShadow = true;
  group.add(oven);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.1, 10), material(0x2a1a12));
  mouth.position.set(0, 0.14, 0.35);
  group.add(mouth);
  limb(group, 0x5a4a3a, [0.24, 0.3, 0], [0.29, 0.85, 0], 0.04, 0.032);
  if (level >= 2) {
    const smoke = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, transparent: true, opacity: 0.5 })
    );
    smoke.position.set(0.31, 1.0, 0);
    group.add(smoke);
  }
}

// Keyed like scene.js's zone-qualified badge anchors: `${zone}:${family}` for a producer or
// generator, `${zone}:${tile id}` for a booster. badgeHeight is where the level badge floats.
// `scale` is a per-archetype multiplier dialed in with preview-prop-scale.html -- either one
// number for every level, or `{1, 2, 3}` for a level of its own. Missing entries default to 1x
// (see `clusterScale` below); scene.js applies it on top of the level's own natural growth.
const CLUSTER_PROPS = {
  'zone1:driftwood': { build: buildDriftwoodCluster, badgeHeight: 2.05, scale: { 1: 1.5, 2: 1.18, 3: 1 } },
  'zone1:fish': { build: buildFishCluster, badgeHeight: 1.1, scale: { 1: 2.5, 2: 2.5, 3: 2.33 } },
  'zone1:kelp': { build: buildKelpCluster, badgeHeight: 0.85, scale: { 1: 2.5, 2: 2.1, 3: 2.26 } },
  'zone1:crops': { build: buildCropsCluster, badgeHeight: 0.68, scale: 2.5 },
  'zone2:driftwood': { build: buildFrostDriftwoodCluster, badgeHeight: 2.05, scale: { 1: 1.43, 2: 1, 3: 1 } },
  'zone2:fish': { build: buildFrostFishCluster, badgeHeight: 1.1, scale: 2.5 },
  'zone2:kelp': { build: buildFrostKelpCluster, badgeHeight: 0.85, scale: { 1: 2.5, 2: 2.1, 3: 2 } },
  'zone2:crops': { build: buildFrostCropsCluster, badgeHeight: 0.68, scale: 2.5 },
  'zone3:planks': { build: buildPlanksCluster, badgeHeight: 0.75, scale: { 1: 1.7, 2: 1.68, 3: 1.56 } },
  'zone3:kelp_rope': { build: buildKelpRopeCluster, badgeHeight: 0.75, scale: { 1: 2.5, 2: 2.5, 3: 2.26 } },
  'zone3:bread': { build: buildBreadCluster, badgeHeight: 0.95, scale: { 1: 2.47, 2: 2.02, 3: 1.97 } },
  'zone4:driftwood': { build: buildBoneReefDriftwoodCluster, badgeHeight: 2.05, scale: { 1: 1, 2: 1, 3: 1.02 } },
  'zone4:fish': { build: buildAnglerFishCluster, badgeHeight: 1.1, scale: { 1: 2.5, 2: 2.3, 3: 2.11 } },
  'zone4:kelp': { build: buildGlowKelpCluster, badgeHeight: 0.65, scale: { 1: 2.5, 2: 1.87, 3: 1.69 } },
  'zone4:crops': { build: buildGlowCropsCluster, badgeHeight: 0.6, scale: { 1: 2.5, 2: 2.5, 3: 2.06 } },
};

// Resolves a CLUSTER_PROPS entry's `scale` (a flat number, a per-level object, or absent) for one
// level. scene.js multiplies its groupScale by this.
export function clusterScale(cluster, level) {
  const s = cluster.scale;
  if (s == null) return 1;
  return typeof s === 'number' ? s : (s[level] ?? 1);
}

export function clusterProp(tile) {
  if (tile.kind === 'blank') return null;
  return CLUSTER_PROPS[`${tile.zone}:${tile.family === 'booster' ? tile.id : tile.family}`] || null;
}

export function buildClusterProp(cluster, group, level, offsets) {
  const dirs = offsets.map(({ dx, dz }) => {
    const len = Math.hypot(dx, dz) || CELL_RADIUS;
    return { x: dx / len, z: dz / len };
  });
  cluster.build(group, level, dirs);
}

// Stand-in cluster look for every archetype without a bespoke design yet (see CLUSTER_PROPS above):
// its existing single-hex prop, shrunk and placed on each cell it actually covers, tied together
// with simple braces so the three still read as one build rather than three repeats. `buildOne(sub)`
// builds into a fresh group already positioned/scaled for one cell; scene.js supplies it as a
// closure so this module never needs to know about tiles, zones or the per-zone builders.
//
// `groupScale` is the multiplier scene.js will apply to the whole returned group afterwards (for
// the old per-hex prop scale and the level's own growth). Cell positions are pre-divided by it so
// they land back on their true hex once that multiply happens -- only the props themselves, placed
// at `scale`, actually shrink.
export function buildGenericCluster(group, offsets, buildOne, { scale = 0.6, groupScale = 1, braceColor = 0x9c8a6a } = {}) {
  const darken = (group.userData.darken ||= []);
  const cells = offsets.map(({ dx, dz }) => ({ dx: dx / groupScale, dz: dz / groupScale }));
  cells.forEach((o) => {
    const sub = new THREE.Group();
    sub.position.set(o.dx, 0, o.dz);
    sub.scale.setScalar(scale);
    buildOne(sub);
    if (sub.userData.darken) darken.push(...sub.userData.darken);
    group.add(sub);
  });
  for (let i = 0; i < cells.length; i++) {
    const a = cells[i];
    const b = cells[(i + 1) % cells.length];
    limb(group, braceColor, [a.dx * 0.55, 0.08 / groupScale, a.dz * 0.55], [b.dx * 0.55, 0.08 / groupScale, b.dz * 0.55], 0.045 / groupScale, 0.045 / groupScale);
  }
}

// A booster is already one impressive structure, not three small ones, so tripling it would look
// wrong. This keeps it exactly as designed -- one full-size instance, unscaled, at the cluster's
// centre -- and adds a plank/rope reaching out to each hex it claims, so the build still visibly
// spans and owns all three cells. `buildOne` is called once, unscaled, into a group at the origin.
export function buildCenteredCluster(group, offsets, buildOne, { groupScale = 1, braceColor = 0x9c8a6a } = {}) {
  const sub = new THREE.Group();
  buildOne(sub);
  if (sub.userData.darken) (group.userData.darken ||= []).push(...sub.userData.darken);
  group.add(sub);
  for (const { dx, dz } of offsets) {
    const cx = dx / groupScale;
    const cz = dz / groupScale;
    limb(group, braceColor, [0, 0.06 / groupScale, 0], [cx * 0.85, 0.06 / groupScale, cz * 0.85], 0.05 / groupScale, 0.032 / groupScale);
  }
}
