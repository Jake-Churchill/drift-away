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
  along(c - 0.24, y, 0.19, theme.logColors[tint % 3], 0.7);
  along(c + 0.24, y, 0.19, theme.logColors[(tint + 1) % 3], 0.65);
  along(c, y + 0.33, 0.18, theme.logColors[(tint + 2) % 3], 0.68);
  if (level >= 2) {
    along(c - 0.13, y + 0.64, 0.14, theme.moss, 0.5);
    along(c + 0.13, y + 0.64, 0.14, theme.logColors[tint % 3], 0.48);
  }
  if (level >= 3) {
    along(c, y + 0.92, 0.16, theme.logColors[1], 0.54);
    const barnacles = material(theme.barnacle);
    for (const s of [-0.25, 0.1, 0.32]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), barnacles);
      b.position.set(...at(d, c, y + 1.1, s));
      group.add(b);
    }
  }
  // Loose pieces round the stack.
  limb(group, theme.twig, at(d, c + 0.1, 0.05, -0.85), at(d, c + 0.4, 0.22, -1.05), 0.035, 0.02);
  limb(group, theme.logColors[(tint + 1) % 3], at(d, c - 0.5, 0.1, 0.9), at(d, c, 0.1, 1.15), 0.1, 0.07);
  theme.accent?.(group, d, level, c, y);
}

function buildDriftwoodCluster(group, level, dirs, theme = DRIFTWOOD_THEME) {
  dirs.forEach((d, i) => {
    // Boom log from the middle out to the stack.
    limb(group, theme.logColors[i % 3], at(d, 0.3, 0.22), at(d, 1.4, 0.22, 0.04 * (i - 1)), 0.22, 0.18);
    woodpile(group, d, level, i, theme);
    // The tripod's foot sits between two booms.
    const foot = turned(d, Math.PI / 3);
    limb(group, theme.logColors[1], [foot.x * 0.65, 0.05, foot.z * 0.65], [0, 1.95 + 0.04 * i, 0], 0.11, 0.06);
    if (level >= 2) {
      const next = turned(dirs[(i + 1) % dirs.length], Math.PI / 3);
      limb(group, theme.logColors[2], [foot.x * 0.36, 0.72, foot.z * 0.36], [next.x * 0.36, 0.72, next.z * 0.36], 0.05, 0.05);
    }
  });
  const lash = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 12), material(theme.rope));
  lash.rotation.x = Math.PI / 2;
  lash.position.set(0, 1.65, 0);
  group.add(lash);
  if (level >= 3) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 14), material(theme.rope));
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
// A weir: a woven basket trap on each hex, roped together, with a mooring post and buoy in the
// middle. `theme` recolors the trap and the fish for zone 2 (icy char) and zone 4 (glowing angler).
const FISH_THEME = { wood: 0x6b4c2a, rope: 0xb89a5e, body: 0xe8b23a, tail: 0x8a5a1e, glow: null };

function fishlet(group, pos, angle, scale, theme) {
  const g = new THREE.Group();
  const bodyMat = theme.glow ? glowMaterial(theme.body, 1.1) : material(theme.body);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.09 * scale, 8, 6), bodyMat);
  body.scale.set(1.7, 0.75, 0.95);
  body.castShadow = true;
  if (theme.glow) trackGlow(group, body, theme.dim);
  g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.06 * scale, 0.12 * scale, 4), material(theme.tail));
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -0.14 * scale;
  g.add(tail);
  g.position.set(...pos);
  g.rotation.y = angle;
  group.add(g);
}

function trapBasket(group, d, dist, level, theme) {
  const c = at(d, dist, 0);
  const height = 0.5;
  const topR = 0.28;
  const botR = 0.14;
  const staves = 7;
  for (let i = 0; i < staves; i++) {
    const a = (i / staves) * Math.PI * 2;
    limb(
      group,
      theme.wood,
      [c[0] + Math.cos(a) * botR, 0, c[2] + Math.sin(a) * botR],
      [c[0] + Math.cos(a) * topR, height, c[2] + Math.sin(a) * topR],
      0.02,
      0.016
    );
  }
  const rimTop = new THREE.Mesh(new THREE.TorusGeometry(topR, 0.025, 6, 16), material(theme.wood));
  rimTop.rotation.x = Math.PI / 2;
  rimTop.position.set(c[0], height, c[2]);
  group.add(rimTop);
  const rimBot = new THREE.Mesh(new THREE.TorusGeometry(botR, 0.02, 6, 12), material(theme.wood));
  rimBot.rotation.x = Math.PI / 2;
  rimBot.position.set(c[0], 0.05, c[2]);
  group.add(rimBot);
  fishlet(group, [c[0] + 0.2, 0.32, c[2] + 0.1], 0, 1, theme);
  if (level >= 2) fishlet(group, [c[0] - 0.16, 0.2, c[2] - 0.15], 0.9, 0.85, theme);
  if (level >= 3) {
    fishlet(group, [c[0] + 0.05, 0.48, c[2] - 0.2], 1.7, 1.1, theme);
    theme.accent?.(group, c, height);
  }
}

function buildFishCluster(group, level, dirs, theme = FISH_THEME) {
  dirs.forEach((d) => trapBasket(group, d, 1.5, level, theme));
  for (let i = 0; i < dirs.length; i++) {
    const a = at(dirs[i], 1.5, 0.5);
    const b = at(dirs[(i + 1) % dirs.length], 1.5, 0.5);
    limb(group, theme.rope, a, b, 0.02, 0.02);
  }
  limb(group, theme.wood, [0, 0, 0], [0, 0.9, 0], 0.05, 0.04);
  const buoy = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), theme.glow ? glowMaterial(theme.glow, 1.3) : material(0xd23b3b));
  buoy.position.set(0, 0.95, 0);
  group.add(buoy);
  if (theme.glow) trackGlow(group, buoy, theme.dim);
}

const FROST_FISH_THEME = {
  wood: 0x7d8f9b,
  rope: 0xc9d6da,
  body: 0xbfe0ec,
  tail: 0x4e93a8,
  glow: null,
  accent(group, c, height) {
    icicle(group, 0xdce8ec, [c[0] + 0.2, height, c[2]], 0.14, 0.018);
    icicle(group, 0xdce8ec, [c[0] - 0.15, height, c[2] + 0.1], 0.11, 0.015);
  },
};

const ANGLER_FISH_THEME = {
  wood: 0x5a5648,
  rope: 0x6f6a5c,
  body: 0x2e3a4a,
  tail: 0x1c2430,
  glow: 0xffb347,
  dim: 0x1c2430,
  accent(group, c, height) {
    const lure = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), glowMaterial(0x7fe7ff, 1.6));
    lure.position.set(c[0], height + 0.18, c[2]);
    group.add(lure);
    trackGlow(group, lure, 0x1c3430);
  },
};

function buildFrostFishCluster(group, level, dirs) {
  buildFishCluster(group, level, dirs, FROST_FISH_THEME);
}

function buildAnglerFishCluster(group, level, dirs) {
  buildFishCluster(group, level, dirs, ANGLER_FISH_THEME);
}

// ---------- KELP ----------
// A drying rack (an A-frame with blades draped over the crossbar) on each hex, roped together, with
// a rope-winch spool in the middle.
const KELP_THEME = { wood: 0xa9754a, rope: 0xb89a5e, blades: [0x2f7248, 0x4c9a6a, 0x6fbb88], glow: null };

function dryingRack(group, d, dist, level, theme) {
  const c = at(d, dist, 0);
  const height = 0.55;
  for (const zSign of [-1, 1]) {
    const top = [c[0], height, c[2] + zSign * 0.12];
    limb(group, theme.wood, [c[0] - 0.32, 0, c[2] + zSign * 0.12], top, 0.035, 0.025);
    limb(group, theme.wood, [c[0] + 0.32, 0, c[2] + zSign * 0.12], top, 0.035, 0.025);
  }
  limb(group, theme.wood, [c[0], height, c[2] - 0.12], [c[0], height, c[2] + 0.12], 0.025, 0.025);
  const bladeCount = level >= 3 ? 5 : level >= 2 ? 4 : 3;
  const bladeMat = theme.glow ? (i) => glowMaterial(theme.blades[i % theme.blades.length], 1.0) : (i) => material(theme.blades[i % theme.blades.length]);
  for (let i = 0; i < bladeCount; i++) {
    const t = (i + 0.5) / bladeCount - 0.5;
    const x = c[0] + t * 0.5;
    const lean = i % 2 ? 0.05 : -0.05;
    const mat = bladeMat(i);
    const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.035, 0.4, 6), mat);
    blade.position.set(x + lean * 0.5, height - 0.2, c[2]);
    blade.rotation.z = lean;
    blade.castShadow = true;
    group.add(blade);
    const bladder = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), mat);
    bladder.position.set(x + lean, height - 0.4, c[2]);
    group.add(bladder);
    if (theme.glow) trackGlow(group, blade, theme.dim);
  }
  theme.accent?.(group, c, height);
}

function buildKelpCluster(group, level, dirs, theme = KELP_THEME) {
  dirs.forEach((d) => dryingRack(group, d, 1.5, level, theme));
  for (let i = 0; i < dirs.length; i++) {
    const a = at(dirs[i], 1.5, 0.55);
    const b = at(dirs[(i + 1) % dirs.length], 1.5, 0.55);
    limb(group, theme.wood, a, b, 0.02, 0.02);
  }
  limb(group, theme.wood, [0, 0, 0], [0, 0.4, 0], 0.05, 0.04);
  const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 10), material(theme.wood));
  spool.rotation.z = Math.PI / 2;
  spool.position.set(0, 0.4, 0);
  group.add(spool);
  const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 14), material(theme.rope));
  wrap.rotation.z = Math.PI / 2;
  wrap.position.set(0, 0.4, 0);
  group.add(wrap);
}

const FROST_KELP_THEME = {
  wood: 0x7d8f9b,
  rope: 0xc9d6da,
  blades: [0x4e93a8, 0x6fb0c2, 0xbfe0ec],
  glow: null,
  accent(group, c, height) {
    icicle(group, 0xdce8ec, [c[0] + 0.1, height - 0.05, c[2]], 0.12, 0.016);
    icicle(group, 0xdce8ec, [c[0] - 0.15, height - 0.05, c[2]], 0.09, 0.014);
  },
};

const GLOW_KELP_THEME = {
  wood: 0x5a5648,
  rope: 0x6f6a5c,
  blades: [0x3a6f8f, 0x2fa3c9, 0x7fe7ff],
  glow: true,
  dim: 0x1c3430,
};

function buildFrostKelpCluster(group, level, dirs) {
  buildKelpCluster(group, level, dirs, FROST_KELP_THEME);
}

function buildGlowKelpCluster(group, level, dirs) {
  buildKelpCluster(group, level, dirs, GLOW_KELP_THEME);
}

// ---------- CROPS ----------
// A wheat stook (a bound tepee of stalks) on each hex, fenced together, with a gate post in the
// middle. Reused for zone 2's frost stooks (ice-shard "grain") and zone 4's luminous algae farm.
const CROPS_THEME = { fence: 0x8a5a1e, stalks: [0xd9b23c, 0xc79a2e, 0xe8c766], glow: null, accessory: 'band' };

function stook(group, d, dist, level, theme) {
  const c = at(d, dist, 0);
  const height = 0.55;
  const stalkCount = 8;
  const stalkMat = theme.glow ? (i) => glowMaterial(theme.stalks[i % 3], 1.1) : (i) => material(theme.stalks[i % 3]);
  for (let i = 0; i < stalkCount; i++) {
    const a = (i / stalkCount) * Math.PI * 2;
    const r = 0.12;
    limb(group, theme.stalks[i % 3], [c[0] + Math.cos(a) * r, 0, c[2] + Math.sin(a) * r], [c[0], height, c[2]], 0.02, 0.006);
    if (theme.glow) {
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.012, 5, 5), stalkMat(i));
      bead.position.set(c[0] + Math.cos(a) * r * 0.6, height * 0.55, c[2] + Math.sin(a) * r * 0.6);
      group.add(bead);
      trackGlow(group, bead, theme.dim);
    }
  }
  if (theme.accessory === 'band') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 12), material(theme.fence));
    band.rotation.x = Math.PI / 2;
    band.position.set(c[0], height * 0.65, c[2]);
    group.add(band);
  } else if (theme.accessory === 'ice') {
    icicle(group, 0xdce8ec, [c[0], height * 0.7, c[2]], 0.14, 0.02);
  }
  if (level >= 2) limb(group, theme.stalks[1], [c[0] + 0.25, 0, c[2] + 0.1], [c[0] + 0.1, 0.35, c[2] + 0.05], 0.03, 0.008);
  if (level >= 3) {
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 5), theme.glow ? glowMaterial(theme.stalks[2], 1.3) : material(0x3a3a3a));
    cap.position.set(c[0], height + 0.1, c[2]);
    group.add(cap);
    if (theme.glow) trackGlow(group, cap, theme.dim);
  }
}

function buildCropsCluster(group, level, dirs, theme = CROPS_THEME) {
  dirs.forEach((d) => stook(group, d, 1.5, level, theme));
  for (let i = 0; i < dirs.length; i++) {
    const a = at(dirs[i], 1.5, 0.05);
    const b = at(dirs[(i + 1) % dirs.length], 1.5, 0.05);
    limb(group, theme.fence, a, b, 0.015, 0.015);
  }
  limb(group, theme.fence, [0, 0, 0], [0, 0.5, 0], 0.03, 0.025);
  const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.03), material(theme.fence));
  crossbar.position.set(0, 0.4, 0);
  group.add(crossbar);
}

const FROST_CROPS_THEME = { fence: 0x7d8f9b, stalks: [0xbfe0ec, 0x9fcadb, 0xdce8ec], glow: null, accessory: 'ice' };
const GLOW_CROPS_THEME = { fence: 0x5a5648, stalks: [0x2fa3c9, 0x7fe7ff, 0x9f6fd9], glow: true, dim: 0x241c30, accessory: 'ice' };

function buildFrostCropsCluster(group, level, dirs) {
  buildCropsCluster(group, level, dirs, FROST_CROPS_THEME);
}

function buildGlowCropsCluster(group, level, dirs) {
  buildCropsCluster(group, level, dirs, GLOW_CROPS_THEME);
}

// ---------- TIMBERLINE GENERATORS ----------
// Planks (Sawmill): a sawhorse and saw in the middle, a plank pile stacked on each hex.
const PLANK_WOOD = 0xa9754a;
const SAW_METAL = 0x8a8a8a;

function plankPile(group, d, dist, level) {
  const c = at(d, dist, 0.06);
  const count = 3 + level;
  for (let i = 0; i < count; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.045, 0.22), material(PLANK_WOOD));
    plank.position.set(c[0], 0.03 + i * 0.05, c[2]);
    plank.rotation.y = (i % 2) * 0.15;
    plank.castShadow = true;
    group.add(plank);
  }
}

function buildPlanksCluster(group, level, dirs) {
  dirs.forEach((d) => plankPile(group, d, 1.5, level));
  for (const side of [-1, 1]) {
    limb(group, PLANK_WOOD, [side * 0.2, 0, -0.15], [0, 0.35, 0], 0.03, 0.02);
    limb(group, PLANK_WOOD, [side * 0.2, 0, 0.15], [0, 0.35, 0], 0.03, 0.02);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.1), material(PLANK_WOOD));
  beam.position.set(0, 0.4, 0);
  group.add(beam);
  const saw = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.01), material(SAW_METAL));
  saw.position.set(0, 0.55, 0.05);
  saw.rotation.z = 0.15;
  group.add(saw);
  if (level >= 3) {
    const dust = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.1, 10), material(0xd8c08a));
    dust.position.set(0.1, 0.05, 0.2);
    group.add(dust);
  }
}

// Kelp rope (Ropeworks): a rope-walk (two posts and a spindle) in the middle, coiled rope on each hex.
const ROPEWORKS_WOOD = 0x7a5a35;

function ropeCoilPile(group, d, dist, level) {
  const c = at(d, dist, 0.02);
  for (let i = 0; i < 2 + level; i++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.12 - i * 0.015, 0.03, 6, 14), material(0xb89a5e));
    coil.rotation.x = Math.PI / 2;
    coil.position.set(c[0], 0.03 + i * 0.05, c[2]);
    group.add(coil);
  }
}

function buildKelpRopeCluster(group, level, dirs) {
  dirs.forEach((d) => ropeCoilPile(group, d, 1.5, level));
  limb(group, ROPEWORKS_WOOD, [-0.35, 0, 0], [-0.35, 0.5, 0], 0.035, 0.03);
  limb(group, ROPEWORKS_WOOD, [0.35, 0, 0], [0.35, 0.5, 0], 0.035, 0.03);
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), material(0x4a4a4a));
  spindle.rotation.z = Math.PI / 2;
  spindle.position.set(0, 0.5, 0);
  group.add(spindle);
  const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.012, 6, 10), material(0xb89a5e));
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
  const c = at(d, dist, 0.14);
  const count = 1 + Math.floor(level / 2);
  for (let i = 0; i < count; i++) {
    const sack = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), material(SACK));
    sack.scale.set(1, 1.3, 1);
    sack.position.set(c[0] + i * 0.14, 0.16, c[2]);
    sack.castShadow = true;
    group.add(sack);
  }
}

function buildBreadCluster(group, level, dirs) {
  dirs.forEach((d) => grainSack(group, d, 1.5, level));
  const oven = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10, 0, Math.PI * 2, 0, Math.PI / 1.7), material(CLAY));
  oven.position.set(0, 0.02, 0);
  oven.castShadow = true;
  group.add(oven);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.08, 10), material(0x2a1a12));
  mouth.position.set(0, 0.12, 0.29);
  group.add(mouth);
  limb(group, 0x5a4a3a, [0.2, 0.3, 0], [0.24, 0.75, 0], 0.03, 0.025);
  if (level >= 2) {
    const smoke = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, transparent: true, opacity: 0.5 })
    );
    smoke.position.set(0.26, 0.9, 0);
    group.add(smoke);
  }
}

// Keyed like scene.js's zone-qualified badge anchors: `${zone}:${family}` for a producer or
// generator, `${zone}:${tile id}` for a booster. badgeHeight is where the level badge floats.
const CLUSTER_PROPS = {
  'zone1:driftwood': { build: buildDriftwoodCluster, badgeHeight: 2.05 },
  'zone1:fish': { build: buildFishCluster, badgeHeight: 1.15 },
  'zone1:kelp': { build: buildKelpCluster, badgeHeight: 1.0 },
  'zone1:crops': { build: buildCropsCluster, badgeHeight: 0.9 },
  'zone2:driftwood': { build: buildFrostDriftwoodCluster, badgeHeight: 2.05 },
  'zone2:fish': { build: buildFrostFishCluster, badgeHeight: 1.15 },
  'zone2:kelp': { build: buildFrostKelpCluster, badgeHeight: 1.0 },
  'zone2:crops': { build: buildFrostCropsCluster, badgeHeight: 0.9 },
  'zone3:planks': { build: buildPlanksCluster, badgeHeight: 0.75 },
  'zone3:kelp_rope': { build: buildKelpRopeCluster, badgeHeight: 0.75 },
  'zone3:bread': { build: buildBreadCluster, badgeHeight: 0.85 },
  'zone4:driftwood': { build: buildBoneReefDriftwoodCluster, badgeHeight: 2.05 },
  'zone4:fish': { build: buildAnglerFishCluster, badgeHeight: 1.15 },
  'zone4:kelp': { build: buildGlowKelpCluster, badgeHeight: 1.0 },
  'zone4:crops': { build: buildGlowCropsCluster, badgeHeight: 0.9 },
};

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
