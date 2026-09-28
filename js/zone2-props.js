import * as THREE from 'three';

// ===================================================================
// Ported verbatim from the approved preview-levels-2.html art prototype
// (commit 091dec7). Only mechanical changes were made to fit this module:
// parameter names to match buildZone2Prop's signature, THREE imported as
// a module, and the prototype's own scene/layout/camera/label code
// dropped (only the builder functions and the helpers they call remain).
// ===================================================================

// Arctic palette. Base tones are the approved zone-2 raft ice-blue and
// frost-white; each archetype then shifts one or two signature hues off
// that base so the ten read apart at a glance (same idea as zone 1's
// per-archetype FISH_FIN_COLOR / CROPS_HEAD_COLOR constants).
const FROST_WHITE = 0xdce8ec;    // frost accents
const SNOW = 0xf2f7f9;           // heavier snow / drifts
const PALE_ICE = 0xbfe0ec;       // translucent ice
const GLACIER_TEAL = 0x4e93a8;   // deep, saturated ice
const FROZEN_TIMBER = 0x7d8f9b;  // frost-bleached, weathered wood
const FROZEN_TIMBER_DARK = 0x5c6d78;
const ARCTIC_OUTLINE = 0x15303d; // cold counterpart to zone 1's 0x16210f

function iceMat(color, opacity) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.14,
    metalness: 0.22,
    flatShading: true,
    transparent: opacity !== undefined && opacity < 1,
    opacity: opacity === undefined ? 1 : opacity,
  });
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

function cylinderBetween(p1, p2, radius, mat) {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const length = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 6), mat);
  mesh.position.copy(p1).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  mesh.castShadow = true;
  return mesh;
}

// A downward-hanging icicle whose local origin is its attachment point.
function buildIcicle(mat, radius, length) {
  const geo = new THREE.ConeGeometry(radius, length, 5);
  geo.rotateX(Math.PI);
  geo.translate(0, -length / 2, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

// An upward-pointing angular ice shard (4-sided cone = faceted crystal).
function buildShard(mat, radius, height, flatten) {
  const geo = new THREE.ConeGeometry(radius, height, 4);
  if (flatten) geo.scale(1, 1, flatten);
  geo.translate(0, height / 2, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

// zone-1 producer roles (fish/kelp/driftwood/crops) now all have bespoke cluster designs in
// cluster-props.js, so the zone-2 single-hex versions were deleted here -- only boosters
// still reach buildZone2Prop below.

// ===================================================================
// 5. FROZEN DRYING RACK  (zone-1 role: drying-rack booster)
// Zone 1: two posts, one bar, three hanging fillets. Zone 2: a braced
// A-frame with two loaded bars, board-stiff frozen fish (they hang
// straight, not limp), icicles between them, and snow packed on the top
// rail. Twice the rack, doing the same job in worse weather.
// ===================================================================
const DRY_HANGS_TOP = { 1: [-0.22, -0.07, 0.08, 0.23], 2: [-0.26, -0.13, 0.00, 0.13, 0.26], 3: [-0.26, -0.13, 0.00, 0.13, 0.26] };
const DRY_HANGS_LOW = { 1: [-0.15, 0.00, 0.15], 2: [-0.20, -0.07, 0.07, 0.20], 3: [-0.20, -0.07, 0.07, 0.20] };

function buildDryingRack(group, level) {
  const woodMat = new THREE.MeshStandardMaterial({ color: FROZEN_TIMBER, roughness: 0.8 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: FROZEN_TIMBER_DARK, roughness: 0.85 });
  const frostMat = iceMat(FROST_WHITE, 0.95);
  const snowMat = new THREE.MeshStandardMaterial({ color: SNOW, roughness: 0.88 });

  const postH = 0.88;
  for (const x of [-0.27, 0.27]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, postH, 6), woodMat);
    post.position.set(x, postH / 2, 0);
    post.castShadow = true;
    group.add(post);
    // Angled braces, giving the rack a planted A-frame stance.
    for (const z of [0.22, -0.22]) {
      group.add(cylinderBetween(
        new THREE.Vector3(x, postH - 0.08, 0),
        new THREE.Vector3(x * 1.32, 0.01, z),
        0.017, darkWoodMat
      ));
    }
    // Frost cap on each post top.
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), frostMat);
    cap.scale.set(1, 0.55, 1);
    cap.position.set(x, postH + 0.01, 0);
    group.add(cap);
  }

  function addBar(y, hangXs, hangLen) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.62, 6), woodMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.y = y;
    bar.castShadow = true;
    group.add(bar);

    // Snow packed along the top of the rail.
    const snow = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.58, 6), snowMat);
    snow.rotation.z = Math.PI / 2;
    snow.scale.y = 1;
    snow.position.set(0, y + 0.022, 0);
    snow.castShadow = true;
    group.add(snow);

    const fishMat = new THREE.MeshStandardMaterial({ color: 0xa9cfdd, roughness: 0.4, metalness: 0.1 });
    for (const x of hangXs) {
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.07, 4), darkWoodMat);
      line.position.set(x, y - 0.035, 0);
      group.add(line);

      const fish = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), fishMat);
      fish.scale.set(0.55, hangLen, 0.5);
      fish.position.set(x, y - 0.075 - 0.05 * hangLen, 0);
      fish.castShadow = true;
      addOutline(fish, 1.1, ARCTIC_OUTLINE);
      group.add(fish);

      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 4), fishMat);
      tail.scale.z = 0.4;
      tail.rotation.z = Math.PI;
      tail.position.set(x, y - 0.075 - 0.1 * hangLen - 0.03, 0);
      group.add(tail);
    }
    // Icicles hanging between the fish.
    for (let i = 0; i < hangXs.length - 1; i++) {
      const mid = (hangXs[i] + hangXs[i + 1]) / 2;
      const ice = buildIcicle(frostMat, 0.018, 0.09 + (i % 2) * 0.05);
      ice.position.set(mid, y - 0.02, 0);
      group.add(ice);
    }
  }

  addBar(0.79, DRY_HANGS_TOP[level], 1.5);
  addBar(0.50, DRY_HANGS_LOW[level], 1.4);

  if (level >= 3) {
    // A third, shorter cross-rail slung between the braces.
    addBar(0.25, [-0.12, 0.12], 1.2);
  }
}

// ===================================================================
// 6. GLACIER SMOKEHOUSE  (zone-1 role: smokehouse booster)
// Zone 1: a plank hut with a pitched roof and a smoking chimney. Zone 2:
// the hut is built from stacked ice blocks under a tiered snow roof with
// icicle eaves — and the one warm thing in the whole zone-2 set is the
// amber firelight spilling out of its doorway. That warm/cold contrast is
// this archetype's signature and keeps it distinct from the composting
// shed (which is a lidded bin, not a building).
// ===================================================================
const SMOKE_PUFFS = { 1: 2, 2: 4, 3: 6 };

function buildSmokehouse(group, level) {
  const blockMat = iceMat(0xa8c7d6, 1);
  const deepBlockMat = iceMat(0x8fb3c6, 1);
  const snowMat = new THREE.MeshStandardMaterial({ color: SNOW, roughness: 0.88 });
  const frostMat = iceMat(FROST_WHITE, 0.95);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.48), deepBlockMat);
  plinth.position.y = 0.03;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  // Three courses of ice blocks, each slightly smaller and rotated — reads
  // as hand-cut blocks rather than one extruded box.
  const courses = [
    { w: 0.45, h: 0.13, d: 0.43, y: 0.125, rot: 0.03, mat: blockMat },
    { w: 0.43, h: 0.13, d: 0.41, y: 0.255, rot: -0.04, mat: deepBlockMat },
    { w: 0.41, h: 0.12, d: 0.39, y: 0.38, rot: 0.02, mat: blockMat },
  ];
  for (const c of courses) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), c.mat);
    box.position.y = c.y;
    box.rotation.y = c.rot;
    box.castShadow = true;
    box.receiveShadow = true;
    group.add(box);
  }

  // Doorway, with firelight inside.
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.03), new THREE.MeshStandardMaterial({ color: 0x27333c, roughness: 0.8 }));
  doorFrame.position.set(0, 0.15, 0.215);
  group.add(doorFrame);
  const fireGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.19, 0.02),
    new THREE.MeshStandardMaterial({ color: 0xffb45a, emissive: 0xff8a34, emissiveIntensity: 1.1, roughness: 0.4 })
  );
  fireGlow.position.set(0, 0.14, 0.228);
  group.add(fireGlow);

  // Tiered snow roof.
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.40, 0.26, 4), snowMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 0.57;
  roof.castShadow = true;
  group.add(roof);
  const roof2 = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.17, 4), snowMat);
  roof2.rotation.y = Math.PI / 4;
  roof2.position.y = 0.75;
  roof2.castShadow = true;
  group.add(roof2);

  // Icicle eaves all round the lower roof rim.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const ice = buildIcicle(frostMat, 0.022, 0.08 + ((i * 3) % 4) * 0.045);
    ice.position.set(Math.cos(a) * 0.30, 0.45, Math.sin(a) * 0.30);
    group.add(ice);
  }

  // Chimney with a snow cap.
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.34, 8), deepBlockMat);
  chimney.position.set(0.14, 0.80, 0.07);
  chimney.castShadow = true;
  group.add(chimney);
  const chimneyCap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.04, 8), snowMat);
  chimneyCap.position.set(0.14, 0.98, 0.07);
  group.add(chimneyCap);

  const puffs = SMOKE_PUFFS[level];
  const smokeMat = new THREE.MeshStandardMaterial({ color: 0xe0edf1, roughness: 0.9, transparent: true, opacity: 0.5 });
  for (let i = 0; i < puffs; i++) {
    const t = i / Math.max(puffs - 1, 1);
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.04 + t * 0.035, 8, 8), smokeMat);
    puff.position.set(0.14 + t * 0.06, 1.05 + t * 0.20, 0.07 - t * 0.04);
    group.add(puff);
  }
  if (level === 3) {
    const ember = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xff8a3d, emissive: 0xff5a1d, emissiveIntensity: 1.3, roughness: 0.4 })
    );
    ember.position.set(0.14, 1.01, 0.07);
    group.add(ember);
  }
}

// ===================================================================
// 7. FROSTWIND MILL  (zone-1 role: windmill booster)
// Zone 1: an X-braced lattice tower with a 14-blade fan. Zone 2: the same
// engineering, taller, guy-wired down to a snow drift, hung with icicles
// at every brace ring, and the fan wheel is now rimmed top and bottom so
// it reads as a cut snowflake disc rather than a bare fan.
// ===================================================================
const MILL_BLADES = { 1: 16, 2: 18, 3: 20 };

function buildWindmill(group, level) {
  const towerMat = new THREE.MeshStandardMaterial({ color: FROZEN_TIMBER, roughness: 0.75 });
  const braceMat = new THREE.MeshStandardMaterial({ color: FROZEN_TIMBER_DARK, roughness: 0.8 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: FROST_WHITE, roughness: 0.3, metalness: 0.3, side: THREE.DoubleSide });
  const rimMat = iceMat(PALE_ICE, 0.95);
  const frostMat = iceMat(FROST_WHITE, 0.95);

  // Snow drift banked around the footings.
  const drift = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), new THREE.MeshStandardMaterial({ color: SNOW, roughness: 0.88 }));
  drift.scale.set(1, 0.2, 0.95);
  drift.position.y = 0.01;
  drift.receiveShadow = true;
  group.add(drift);

  const towerHeight = 1.02;
  const topRadius = 0.05;
  const baseRadius = 0.30;
  const rings = 5;
  const legAngle = (i) => i * (Math.PI / 2) + Math.PI / 4;
  const ringPoint = (ring, i) => {
    const t = ring / rings;
    const r = baseRadius + (topRadius - baseRadius) * t;
    const a = legAngle(i);
    return new THREE.Vector3(r * Math.cos(a), towerHeight * t, r * Math.sin(a));
  };

  for (let i = 0; i < 4; i++) {
    group.add(cylinderBetween(ringPoint(0, i), ringPoint(rings, i), 0.024, towerMat));
  }
  for (let ring = 0; ring <= rings; ring++) {
    for (let i = 0; i < 4; i++) {
      group.add(cylinderBetween(ringPoint(ring, i), ringPoint(ring, (i + 1) % 4), 0.013, towerMat));
    }
    if (ring < rings) {
      for (let i = 0; i < 4; i++) {
        group.add(cylinderBetween(ringPoint(ring, i), ringPoint(ring + 1, (i + 1) % 4), 0.011, braceMat));
        group.add(cylinderBetween(ringPoint(ring, (i + 1) % 4), ringPoint(ring + 1, i), 0.011, braceMat));
      }
    }
    // Icicles hanging off each brace ring.
    if (ring >= 1 && ring <= rings - 1) {
      for (let i = 0; i < 4; i++) {
        const p = ringPoint(ring, i);
        const ice = buildIcicle(frostMat, 0.018, 0.07 + (i % 2) * 0.05);
        ice.position.copy(p);
        group.add(ice);
      }
    }
  }

  // Guy wires from mid-mast down to the deck.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    group.add(cylinderBetween(
      new THREE.Vector3(0, towerHeight * 0.62, 0),
      new THREE.Vector3(Math.cos(a) * 0.40, 0.01, Math.sin(a) * 0.40),
      0.006, braceMat
    ));
  }

  const hub = new THREE.Group();
  hub.position.set(0, towerHeight + 0.05, 0);
  const hubCore = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 8), towerMat);
  hubCore.rotation.x = Math.PI / 2;
  hub.add(hubCore);
  const hubCap = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), frostMat);
  hubCap.position.z = 0.04;
  hub.add(hubCap);

  const bladeCount = MILL_BLADES[level];
  for (let i = 0; i < bladeCount; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.045, 0.01), bladeMat);
    blade.position.x = 0.145;
    blade.castShadow = true;
    const pivot = new THREE.Group();
    pivot.rotation.z = (i / bladeCount) * Math.PI * 2;
    pivot.add(blade);
    hub.add(pivot);
  }
  // Outer and inner rims turn the fan into a snowflake disc.
  const outerRim = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.013, 6, 24), rimMat);
  hub.add(outerRim);
  const innerRim = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.011, 6, 18), rimMat);
  hub.add(innerRim);

  // Tail vane.
  const vaneRod = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.34, 6), towerMat);
  vaneRod.rotation.x = Math.PI / 2;
  vaneRod.position.set(0, 0, -0.17);
  hub.add(vaneRod);
  const vaneFin = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.14, 0.012), bladeMat);
  vaneFin.position.set(0, 0, -0.35);
  hub.add(vaneFin);
  const vaneIce = buildIcicle(frostMat, 0.016, 0.07);
  vaneIce.position.set(0.06, -0.07, -0.35);
  hub.add(vaneIce);

  group.add(hub);

  if (level >= 3) {
    // Frost-crystal finial above the hub.
    const finial = buildShard(iceMat(0xc9ecf6, 0.9), 0.045, 0.16, 0.8);
    finial.position.set(0, towerHeight + 0.30, 0);
    group.add(finial);
  }
}

// ===================================================================
// 8. ICE NET WEAVERS  (zone-1 role: net-weavers booster)
// Zone 1: four posts and one flat net. Zone 2: a denser frost-rimed net
// with ice beads frozen at its knots and icicles along its front edge,
// PLUS a second net hauled up at an angle off the left posts — the
// L-shaped silhouette is what keeps this legible next to the drying rack
// at a glance. Note this is NOT a LARGE_BOOSTER in scene.js, so its
// extents are budgeted against the 1.8x prop scale, not 2.7x.
// ===================================================================
const ICE_NET_DIV = { 1: { x: 6, z: 5 }, 2: { x: 9, z: 7 }, 3: { x: 9, z: 7 } };

function buildNetWeavers(group, level) {
  const woodMat = new THREE.MeshStandardMaterial({ color: FROZEN_TIMBER, roughness: 0.8 });
  const frostMat = iceMat(FROST_WHITE, 0.95);

  const postH = 0.62;
  const PX = 0.30;
  const PZ = 0.20;
  for (const [x, z] of [[-PX, -PZ], [PX, -PZ], [-PX, PZ], [PX, PZ]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.038, postH, 6), woodMat);
    post.position.set(x, postH / 2, z);
    post.castShadow = true;
    group.add(post);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.035, 6), frostMat);
    collar.position.set(x, 0.14, z);
    group.add(collar);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), frostMat);
    cap.scale.set(1, 0.6, 1);
    cap.position.set(x, postH + 0.01, z);
    group.add(cap);
  }

  const netMat = new THREE.LineBasicMaterial({ color: 0xeaf6fa, transparent: true, opacity: 0.85 });
  const netY = 0.56;
  const div = ICE_NET_DIV[level];
  for (let i = 0; i <= div.x; i++) {
    const t = i / div.x;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-PX + t * PX * 2, netY, -PZ),
      new THREE.Vector3(-PX + t * PX * 2, netY, PZ),
    ]);
    group.add(new THREE.Line(geo, netMat));
  }
  for (let i = 0; i <= div.z; i++) {
    const t = i / div.z;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-PX, netY, -PZ + t * PZ * 2),
      new THREE.Vector3(PX, netY, -PZ + t * PZ * 2),
    ]);
    group.add(new THREE.Line(geo, netMat));
  }

  // Second net, hauled up on a slope off the left-hand posts.
  const SLOPE_TOP_X = -PX;
  const SLOPE_BOT_X = -0.56;
  const slopeLines = level >= 2 ? 7 : 5;
  for (let i = 0; i <= slopeLines; i++) {
    const t = i / slopeLines;
    const x = SLOPE_TOP_X + (SLOPE_BOT_X - SLOPE_TOP_X) * t;
    const y = netY + (0.06 - netY) * t;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, y, -PZ),
      new THREE.Vector3(x, y, PZ),
    ]);
    group.add(new THREE.Line(geo, netMat));
  }
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(SLOPE_TOP_X, netY, -PZ + t * PZ * 2),
      new THREE.Vector3(SLOPE_BOT_X, 0.06, -PZ + t * PZ * 2),
    ]);
    group.add(new THREE.Line(geo, netMat));
  }

  // Ice beads frozen at the knots.
  const beadMat = iceMat(0xd8eef6, 0.95);
  for (const b of [[-0.18, -0.10], [0.00, 0.04], [0.18, -0.06], [0.10, 0.14], [-0.10, 0.12], [0.24, 0.08]]) {
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 6), beadMat);
    bead.position.set(b[0], netY, b[1]);
    group.add(bead);
  }

  // Icicles along the net's front edge.
  for (let i = 0; i < 6; i++) {
    const ice = buildIcicle(frostMat, 0.016, 0.06 + (i % 3) * 0.04);
    ice.position.set(-PX + (i / 5) * PX * 2, netY, PZ);
    group.add(ice);
  }

  // Coil of frozen rope and a weaver's shuttle on the deck.
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.032, 8, 16), new THREE.MeshStandardMaterial({ color: 0xbcd3db, roughness: 0.7 }));
  coil.rotation.x = Math.PI / 2;
  coil.position.set(0.28, 0.04, 0.30);
  coil.castShadow = true;
  group.add(coil);

  const shuttle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.028, 0.05), woodMat);
  shuttle.position.set(-0.05, 0.03, 0.30);
  shuttle.rotation.y = 0.4;
  shuttle.castShadow = true;
  group.add(shuttle);

  if (level >= 3) {
    const coil2 = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.026, 8, 14), new THREE.MeshStandardMaterial({ color: 0xa4c2cc, roughness: 0.7 }));
    coil2.rotation.x = Math.PI / 2;
    coil2.position.set(0.30, 0.10, 0.12);
    coil2.castShadow = true;
    group.add(coil2);
  }
}

// ===================================================================
// 9. FROZEN COMPOSTING SHED  (zone-1 role: composting-shed booster)
// Zone 1: a low bin with a tilted lid and green steam. Zone 2: an
// insulated bin under a snow-loaded lid, with the pile's own heat glowing
// orange out of the gap and steaming hard into the cold — plus a stack of
// cut peat bricks beside it. Deliberately kept low and wide (no roof, no
// chimney) so it never gets confused with the smokehouse.
// ===================================================================
const COMPOST_STEAM = { 1: 3, 2: 5, 3: 7 };

function buildCompostingShed(group, level) {
  const binMat = new THREE.MeshStandardMaterial({ color: 0x4f6270, roughness: 0.85 });
  const trimMat = new THREE.MeshStandardMaterial({ color: FROZEN_TIMBER, roughness: 0.8 });
  const snowMat = new THREE.MeshStandardMaterial({ color: SNOW, roughness: 0.88 });
  const frostMat = iceMat(FROST_WHITE, 0.95);

  const bin = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.30, 0.38), binMat);
  bin.position.y = 0.16;
  bin.castShadow = true;
  bin.receiveShadow = true;
  group.add(bin);

  // Rime creeping up from the deck round the bin's foot.
  const rime = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.05, 0.42), frostMat);
  rime.position.y = 0.025;
  rime.castShadow = true;
  group.add(rime);

  // Board banding so the bin doesn't read as a plain box.
  for (const y of [0.09, 0.25]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.455, 0.03, 0.395), trimMat);
    band.position.y = y;
    group.add(band);
  }

  // Tilted lid, snow-loaded, leaving a gap on the +X side.
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.035, 0.42), trimMat);
  lid.position.set(-0.05, 0.345, 0);
  lid.rotation.z = 0.22;
  lid.castShadow = true;
  group.add(lid);
  const lidSnow = new THREE.Mesh(new THREE.SphereGeometry(0.20, 10, 8), snowMat);
  lidSnow.scale.set(1.1, 0.34, 0.95);
  lidSnow.position.set(-0.11, 0.38, 0);
  lidSnow.rotation.z = 0.22;
  lidSnow.castShadow = true;
  group.add(lidSnow);

  // The pile's own heat, glowing out of the gap — the reason this thing
  // still works in the Frozen Reach.
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, 0.05, 0.34),
    new THREE.MeshStandardMaterial({ color: 0xc9762f, emissive: 0xff8a3d, emissiveIntensity: 0.9, roughness: 0.5 })
  );
  glow.position.set(0.11, 0.315, 0);
  group.add(glow);

  const steamCount = COMPOST_STEAM[level];
  const steamMat = new THREE.MeshStandardMaterial({ color: 0xdff0f4, roughness: 0.9, transparent: true, opacity: 0.45 });
  for (let i = 0; i < steamCount; i++) {
    const t = i / Math.max(steamCount - 1, 1);
    const steam = new THREE.Mesh(new THREE.SphereGeometry(0.035 + t * 0.028, 8, 6), steamMat);
    steam.position.set(0.14 + t * 0.10, 0.40 + t * 0.26, -0.04 + t * 0.10);
    group.add(steam);
  }

  // Stack of cut peat bricks, frost-dusted.
  const brickMat = new THREE.MeshStandardMaterial({ color: 0x4a3e30, roughness: 0.92 });
  const bricks = level >= 2 ? [0, 1, 2, 3] : [0, 1, 2];
  bricks.forEach((i) => {
    const brick = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.055, 0.13), brickMat);
    brick.position.set(0.02 + (i % 2) * 0.02, 0.03 + i * 0.058, 0.30);
    brick.rotation.y = (i % 2 ? 1 : -1) * 0.1;
    brick.castShadow = true;
    group.add(brick);
    const dust = new THREE.Mesh(new THREE.BoxGeometry(0.175, 0.012, 0.135), snowMat);
    dust.position.set(brick.position.x, brick.position.y + 0.032, 0.30);
    dust.rotation.y = brick.rotation.y;
    group.add(dust);
  });

  if (level >= 3) {
    // Second, smaller bin, offset in +Z where the hex has more room than
    // it does in X (same constraint zone 1's level-3 shed works around).
    const bin2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.12), binMat);
    bin2.position.set(-0.13, 0.11, 0.30);
    bin2.castShadow = true;
    group.add(bin2);
    const lid2 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.16), trimMat);
    lid2.position.set(-0.16, 0.23, 0.30);
    lid2.rotation.z = 0.2;
    lid2.castShadow = true;
    group.add(lid2);
  }
}

// ===================================================================
// 10. AURORA LIGHTHOUSE  (zone-1 role: lighthouse booster)
// Zone 1: a striped tower with a warm lamp. Zone 2: an ice tower with a
// helical frost stripe wound round it, a railed gallery, an icicle crown
// under the lantern roof, and — the payoff — aurora ribbons arcing
// overhead in cyan-green. It boosts all four resources, so it gets to be
// the tallest and the only light source in the set that isn't firelight.
// ===================================================================
const AURORA_LIGHT_SIZE = { 1: 0.07, 2: 0.08, 3: 0.09 };
const AURORA_LIGHT_INTENSITY = { 1: 1.5, 2: 2.1, 3: 2.7 };
const AURORA_LIGHT_COLOR = { 1: 0xa9f2dd, 2: 0x8ef0e4, 3: 0x7cf2c8 };
const AURORA_RIBBONS = {
  1: [{ r: 0.34, rot: 0.0, c: 0x7cf2c8, o: 0.30 }, { r: 0.41, rot: 0.9, c: 0x8fd8ff, o: 0.24 }],
  2: [{ r: 0.34, rot: 0.0, c: 0x7cf2c8, o: 0.34 }, { r: 0.41, rot: 0.9, c: 0x8fd8ff, o: 0.28 }, { r: 0.48, rot: -0.8, c: 0x9df0b8, o: 0.22 }],
  3: [{ r: 0.34, rot: 0.0, c: 0x7cf2c8, o: 0.38 }, { r: 0.41, rot: 0.9, c: 0x8fd8ff, o: 0.32 }, { r: 0.48, rot: -0.8, c: 0x9df0b8, o: 0.26 }, { r: 0.55, rot: 1.9, c: 0xc9a6ff, o: 0.22 }],
};

function buildLighthouse(group, level) {
  const towerMat = new THREE.MeshStandardMaterial({ color: 0xe2eff4, roughness: 0.45, metalness: 0.08 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: GLACIER_TEAL, roughness: 0.4, metalness: 0.15 });
  const frostMat = iceMat(FROST_WHITE, 0.95);

  // Ice-rock plinth.
  const plinthGeo = new THREE.DodecahedronGeometry(0.30, 0);
  plinthGeo.scale(1.25, 0.38, 1.25);
  const plinth = new THREE.Mesh(plinthGeo, iceMat(0x8fb0c0, 1));
  plinth.position.y = 0.07;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  const towerH = 0.88;
  const towerBaseY = 0.10;
  const rBot = 0.185;
  const rTop = 0.10;
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, towerH, 12), towerMat);
  tower.position.y = towerBaseY + towerH / 2;
  tower.castShadow = true;
  group.add(tower);

  // Helical frost stripe: two full turns of small blocks wrapped round
  // the taper — a spiral reads far better at this size than flat bands.
  const stripeSegs = 26;
  for (let i = 0; i < stripeSegs; i++) {
    const t = i / (stripeSegs - 1);
    const y = towerBaseY + 0.04 + t * (towerH - 0.08);
    const r = rBot + (rTop - rBot) * t;
    const a = t * Math.PI * 4;
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.05, 0.022), stripeMat);
    block.position.set(Math.cos(a) * (r + 0.004), y, Math.sin(a) * (r + 0.004));
    block.rotation.y = -a;
    block.rotation.x = 0.1;
    group.add(block);
  }

  // Gallery ring with balusters.
  const gallery = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.018, 6, 16), frostMat);
  gallery.rotation.x = Math.PI / 2;
  gallery.position.y = 0.99;
  gallery.castShadow = true;
  group.add(gallery);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const baluster = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.08, 4), frostMat);
    baluster.position.set(Math.cos(a) * 0.14, 0.96, Math.sin(a) * 0.14);
    group.add(baluster);
  }

  // Lantern cage.
  const lantern = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.10, 0.17, 8),
    new THREE.MeshStandardMaterial({ color: 0x2b3a44, roughness: 0.4 })
  );
  lantern.position.y = 1.09;
  group.add(lantern);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.18, 0.014), frostMat);
    mullion.position.set(Math.cos(a) * 0.098, 1.09, Math.sin(a) * 0.098);
    group.add(mullion);
  }

  const lightColor = AURORA_LIGHT_COLOR[level];
  const light = new THREE.Mesh(
    new THREE.SphereGeometry(AURORA_LIGHT_SIZE[level], 12, 12),
    new THREE.MeshStandardMaterial({
      color: lightColor,
      emissive: lightColor,
      emissiveIntensity: AURORA_LIGHT_INTENSITY[level],
      roughness: 0.25,
    })
  );
  light.position.y = 1.09;
  group.add(light);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(AURORA_LIGHT_SIZE[level] * (1.9 + level * 0.25), 12, 12),
    new THREE.MeshBasicMaterial({ color: lightColor, transparent: true, opacity: 0.22 + level * 0.05, depthWrite: false })
  );
  halo.position.y = 1.09;
  group.add(halo);

  // Roof + icicle crown.
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.17, 8), stripeMat);
  roof.position.y = 1.26;
  roof.castShadow = true;
  group.add(roof);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const ice = buildIcicle(frostMat, 0.02, 0.10 + (i % 2) * 0.06);
    ice.position.set(Math.cos(a) * 0.155, 1.18, Math.sin(a) * 0.155);
    group.add(ice);
  }
  const finial = buildShard(frostMat, 0.03, 0.14, 0.9);
  finial.position.y = 1.34;
  group.add(finial);

  // Aurora ribbons arcing over the lantern. A thin torus arc, squashed on
  // Z, gives a flat curtain band without any custom geometry.
  for (const rb of AURORA_RIBBONS[level]) {
    const geo = new THREE.TorusGeometry(rb.r, 0.055, 3, 28, Math.PI * 0.7);
    geo.rotateZ(Math.PI * 0.15); // center the arc over the top
    const ribbon = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: rb.c, transparent: true, opacity: rb.o, side: THREE.DoubleSide, depthWrite: false })
    );
    ribbon.scale.z = 0.12;
    ribbon.position.y = 1.06;
    ribbon.rotation.y = rb.rot;
    group.add(ribbon);
  }
}

function buildBoosterProp(group, tileId, level) {
  switch (tileId) {
    case 'frozen_booster_drying_rack': buildDryingRack(group, level); break;
    case 'frozen_booster_smokehouse': buildSmokehouse(group, level); break;
    case 'frozen_booster_windmill': buildWindmill(group, level); break;
    case 'frozen_booster_net_weavers': buildNetWeavers(group, level); break;
    case 'frozen_booster_composting_shed': buildCompostingShed(group, level); break;
    case 'frozen_booster_lighthouse': buildLighthouse(group, level); break;
  }
}

export function buildZone2Prop(propGroup, tile, level) {
  switch (tile.family) {
    case 'booster': buildBoosterProp(propGroup, tile.id, level); break;
  }
}
