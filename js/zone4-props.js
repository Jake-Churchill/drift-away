import * as THREE from 'three';

// ===================================================================
// Ported from the approved zone4-prototype.html art prototype. Zone 4 has no per-tile dim/lit
// mechanic like zone 3's bioluminescence, so unlike zone3-props.js there's no track()/userData
// darken registration here -- materials are just built once in their final appearance.
// `level` is accepted (matching buildZone2Prop/buildZone3Prop's signature) but unused: the
// shared per-level scale-up and badge in scene.js's addProp already carry the level-up feedback,
// the same way zone 1's original archetypes did before any zone needed its own per-level detail.
// ===================================================================

const WOOD_DARK = 0x2e2013;
const WOOD_LOG = 0x7a4f2a;
const WOOD_CUT = 0xe0b878;
const PLANK = 0xc9a468;
const METAL = 0x7d8288;
const KELP_GREEN = 0x2f7a45;
const ROPE = 0xb89968;
const CLAY = 0xb85f3a;
const STONE_DARK = 0x5a4d42;
const WHEAT = 0xdb9a2e;
const BREAD = 0xb8783a;
const AMBER = 0xffb84d;

function darkMat(color, rough = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough });
}
function glowMat(color, intensity = 1.3) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
}
function addOutline(mesh, scale = 1.1, color = 0x1c1a12) {
  const outline = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }));
  outline.scale.setScalar(scale);
  mesh.add(outline);
}
function cylBetween(p1, p2, radius, mat, segs = 6) {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const length = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segs), mat);
  mesh.position.copy(p1).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  mesh.castShadow = true;
  return mesh;
}

// ---------- 1. SAWMILL (planks family: driftwood -> planks) ----------
function buildSawmill(g) {
  const postMat = darkMat(WOOD_DARK);
  [[-0.35, 0.55, 0], [0.35, 0.55, 0]].forEach(([x, y, z]) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.1), postMat);
    post.position.set(x, y, z);
    post.castShadow = true;
    g.add(post);
  });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.1), postMat);
  beam.position.set(0, 1.05, 0);
  g.add(beam);

  const bladeGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.04, 20);
  const blade = new THREE.Mesh(bladeGeo, darkMat(METAL, 0.4));
  blade.rotation.z = Math.PI / 2;
  blade.rotation.x = 0.15;
  blade.position.set(0, 0.62, 0.05);
  blade.castShadow = true;
  addOutline(blade, 1.08);
  g.add(blade);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.05, 4), darkMat(0x777777, 0.4));
    tooth.position.set(Math.cos(a) * 0.34, 0.62 + Math.sin(a) * 0.34 * Math.cos(0.15), 0.05 + Math.sin(a) * 0.34 * Math.sin(0.15) * -1);
    tooth.rotation.z = a + Math.PI / 2;
    g.add(tooth);
  }
  const logMat = darkMat(WOOD_LOG);
  const log = cylBetween(new THREE.Vector3(-0.55, 0.42, 0.05), new THREE.Vector3(0.15, 0.42, 0.05), 0.14, logMat, 10);
  log.rotation.z += Math.PI / 2;
  g.add(log);
  const cutEnd = new THREE.Mesh(new THREE.CircleGeometry(0.14, 10), darkMat(WOOD_CUT, 0.6));
  cutEnd.position.set(0.15, 0.42, 0.05);
  cutEnd.rotation.y = Math.PI / 2;
  g.add(cutEnd);

  for (let i = 0; i < 3; i++) {
    const l = cylBetween(new THREE.Vector3(-0.6, 0.1 + i * 0.16, -0.32), new THREE.Vector3(-0.6, 0.1 + i * 0.16, 0.08), 0.12, logMat, 8);
    l.rotation.x += Math.PI / 2;
    g.add(l);
    const end = new THREE.Mesh(new THREE.CircleGeometry(0.12, 8), darkMat(WOOD_CUT, 0.6));
    end.position.set(-0.6, 0.1 + i * 0.16, 0.08);
    g.add(end);
  }

  const plankMat = darkMat(PLANK, 0.7);
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.045, 0.2), plankMat);
    p.position.set(0.55, 0.05 + i * 0.05, 0.28);
    p.rotation.y = (i % 2) * 0.05;
    p.castShadow = true;
    g.add(p);
  }

  const dust = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.12, 12), darkMat(0xc9b48a, 0.9));
  dust.position.set(0, 0.06, 0.25);
  g.add(dust);
}

// ---------- 2. ROPEWORKS (kelp_rope family: kelp + driftwood -> kelp rope) ----------
function buildRopeworks(g) {
  const postMat = darkMat(WOOD_DARK);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.3, 8), postMat);
  post.position.set(0, 0.65, 0);
  post.castShadow = true;
  g.add(post);

  const wheelMat = darkMat(0x55402a, 0.7);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 20), wheelMat);
  rim.position.set(0, 1.0, 0.12);
  rim.castShadow = true;
  addOutline(rim, 1.1);
  g.add(rim);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.035, 0.035), wheelMat);
    spoke.position.set(0, 1.0, 0.12);
    spoke.rotation.z = a;
    g.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 8), darkMat(METAL, 0.5));
  hub.rotation.x = Math.PI / 2;
  hub.position.set(0, 1.0, 0.12);
  g.add(hub);

  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.16, 10), darkMat(WOOD_DARK, 0.8));
  basin.position.set(-0.6, 0.08, 0.3);
  g.add(basin);
  const kelpMat = darkMat(KELP_GREEN, 0.7);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const frond = cylBetween(
      new THREE.Vector3(-0.6 + Math.cos(a) * 0.12, 0.18, 0.3 + Math.sin(a) * 0.12),
      new THREE.Vector3(-0.6 + Math.cos(a) * 0.2, 0.5 + (i % 2) * 0.15, 0.3 + Math.sin(a) * 0.2),
      0.035, kelpMat, 6
    );
    g.add(frond);
  }

  const ropeMat = darkMat(ROPE, 0.75);
  for (let i = 0; i < 3; i++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.24 - i * 0.05, 0.05, 8, 16), ropeMat);
    coil.rotation.x = Math.PI / 2;
    coil.position.set(0.62, 0.06 + i * 0.09, 0.32);
    coil.castShadow = true;
    g.add(coil);
  }
  const strand = cylBetween(new THREE.Vector3(0.35, 0.95, 0.2), new THREE.Vector3(0.6, 0.3, 0.32), 0.025, ropeMat, 5);
  g.add(strand);
}

// ---------- 3. BAKEHOUSE (bread family: crops + driftwood -> bread) ----------
function buildBakehouse(g) {
  const domeGeo = new THREE.SphereGeometry(0.42, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.7);
  const dome = new THREE.Mesh(domeGeo, darkMat(CLAY, 0.85));
  dome.position.set(-0.15, 0.32, 0);
  dome.castShadow = true;
  addOutline(dome, 1.06);
  g.add(dome);
  const ovenMouth = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12), glowMat(AMBER, 1.1));
  ovenMouth.position.set(0.05, 0.22, 0.32);
  ovenMouth.rotation.y = -0.3;
  g.add(ovenMouth);
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.55, 8), darkMat(STONE_DARK, 0.85));
  chimney.position.set(-0.35, 0.85, -0.05);
  chimney.castShadow = true;
  g.add(chimney);
  const smokeMat = new THREE.MeshStandardMaterial({ color: 0xe8e6df, transparent: true, opacity: 0.55, roughness: 1 });
  [0.05, 0.16, 0.28].forEach((h, i) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.08 + i * 0.03, 8, 6), smokeMat);
    puff.position.set(-0.35 + i * 0.05, 1.15 + h * 1.3, -0.05);
    g.add(puff);
  });

  const table = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.35), darkMat(WOOD_DARK, 0.8));
  table.position.set(0.55, 0.28, 0.2);
  g.add(table);
  for (let i = 0; i < 4; i++) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.04), darkMat(WOOD_DARK));
    leg.position.set(0.55 + (i % 2 ? 0.2 : -0.2), 0.14, 0.2 + (i < 2 ? 0.14 : -0.14));
    g.add(leg);
  }
  const wheatMat = darkMat(WHEAT, 0.6);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const stalk = cylBetween(
      new THREE.Vector3(0.5 + Math.cos(a) * 0.06, 0.31, 0.15 + Math.sin(a) * 0.06),
      new THREE.Vector3(0.5 + Math.cos(a) * 0.09, 0.55, 0.15 + Math.sin(a) * 0.09),
      0.02, wheatMat, 5
    );
    g.add(stalk);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 6), wheatMat);
    head.position.set(0.5 + Math.cos(a) * 0.09, 0.63, 0.15 + Math.sin(a) * 0.09);
    g.add(head);
  }
  for (let i = 0; i < 2; i++) {
    const fuel = cylBetween(new THREE.Vector3(0.62, 0.34 + i * 0.09, 0.25), new THREE.Vector3(0.72, 0.34 + i * 0.09, 0.32), 0.05, darkMat(WOOD_LOG), 6);
    g.add(fuel);
  }

  const rack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.2), darkMat(WOOD_DARK, 0.8));
  rack.position.set(-0.55, 0.16, 0.45);
  g.add(rack);
  const breadMat = darkMat(BREAD, 0.7);
  for (let i = 0; i < 3; i++) {
    const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), breadMat);
    loaf.scale.set(1.3, 0.7, 0.9);
    loaf.position.set(-0.65 + i * 0.13, 0.23, 0.45);
    loaf.castShadow = true;
    g.add(loaf);
  }
}

// ---------- Booster 1: Tool Shed (planks only) ----------
function buildToolShed(g) {
  const wallMat = darkMat(0x5a4a34, 0.85);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.55), wallMat);
  wall.position.set(0, 0.3, 0);
  wall.castShadow = true;
  addOutline(wall, 1.05);
  g.add(wall);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 0.7), darkMat(WOOD_DARK));
  roof.position.set(0.05, 0.64, 0);
  roof.rotation.z = -0.18;
  g.add(roof);
  const toolMat = darkMat(METAL, 0.5);
  g.add(cylBetween(new THREE.Vector3(-0.3, 0.25, 0.29), new THREE.Vector3(-0.3, 0.55, 0.29), 0.015, darkMat(WOOD_DARK)));
  const axeHead = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 4), toolMat);
  axeHead.rotation.z = Math.PI / 2;
  axeHead.position.set(-0.3, 0.55, 0.29);
  g.add(axeHead);
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.28), darkMat(PLANK, 0.8));
  crate.position.set(0.55, 0.12, 0.4);
  crate.castShadow = true;
  g.add(crate);
}

// ---------- Booster 2: Drying Frames (kelp_rope only) ----------
function buildDryingFrames(g) {
  const frameMat = darkMat(WOOD_DARK, 0.8);
  for (const side of [-1, 1]) {
    const post1 = cylBetween(new THREE.Vector3(side * 0.5, 0, 0.25), new THREE.Vector3(side * 0.5 - side * 0.12, 0.7, 0.25), 0.03, frameMat);
    const post2 = cylBetween(new THREE.Vector3(side * 0.5, 0, -0.25), new THREE.Vector3(side * 0.5 - side * 0.12, 0.7, -0.25), 0.03, frameMat);
    g.add(post1, post2);
  }
  addOutline(g.children[0], 1.15);
  const kelpMat = darkMat(KELP_GREEN, 0.65);
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), frameMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 0.3 + i * 0.2, 0.25 - (i * 0.5));
    g.add(bar);
    for (let j = 0; j < 3; j++) {
      const frond = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.35), kelpMat);
      frond.material.side = THREE.DoubleSide;
      frond.position.set(-0.32 + j * 0.32, 0.3 + i * 0.2 - 0.2, 0.25 - (i * 0.5));
      frond.rotation.y = 0.3;
      g.add(frond);
    }
  }
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.18, 10), darkMat(WOOD_LOG, 0.85));
  basket.position.set(0, 0.09, 0.5);
  basket.castShadow = true;
  g.add(basket);
}

// ---------- Booster 3: Grain Silo (bread only) ----------
function buildGrainSilo(g) {
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.85, 14), darkMat(0xc7b78a, 0.8));
  body.position.set(0, 0.42, 0);
  body.castShadow = true;
  addOutline(body, 1.06);
  g.add(body);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.35, 14), darkMat(WHEAT, 0.6));
  cap.position.set(0, 1.02, 0);
  cap.castShadow = true;
  g.add(cap);
  const band1 = new THREE.Mesh(new THREE.TorusGeometry(0.325, 0.02, 6, 18), darkMat(METAL, 0.5));
  band1.rotation.x = Math.PI / 2;
  band1.position.set(0, 0.2, 0);
  g.add(band1);
  const band2 = band1.clone();
  band2.position.set(0, 0.6, 0);
  g.add(band2);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.03), darkMat(WOOD_DARK));
  door.position.set(0, 0.15, 0.335);
  g.add(door);
  const spillMat = darkMat(WHEAT, 0.6);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const wheat = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 5), spillMat);
    wheat.position.set(Math.cos(a) * 0.15, 0.04, 0.4 + Math.sin(a) * 0.08);
    g.add(wheat);
  }
}

// ---------- Booster 4: Timber Yard (planks + kelp_rope) ----------
function buildTimberYard(g) {
  const plankMat = darkMat(PLANK, 0.75);
  for (let stack = 0; stack < 3; stack++) {
    for (let i = 0; i < 4; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.18), plankMat);
      plank.position.set(-0.35 + stack * 0.35, 0.05 + i * 0.07, 0);
      plank.castShadow = true;
      g.add(plank);
    }
  }
  addOutline(g.children[0], 1.15);
  const craneMat = darkMat(WOOD_DARK, 0.8);
  const post = cylBetween(new THREE.Vector3(0.55, 0, -0.2), new THREE.Vector3(0.55, 0.75, -0.2), 0.05, craneMat);
  g.add(post);
  const arm = cylBetween(new THREE.Vector3(0.55, 0.75, -0.2), new THREE.Vector3(0.1, 0.75, 0.15), 0.035, craneMat);
  g.add(arm);
  const ropeMat = darkMat(ROPE, 0.7);
  const hook = cylBetween(new THREE.Vector3(0.1, 0.75, 0.15), new THREE.Vector3(0.1, 0.35, 0.15), 0.015, ropeMat);
  g.add(hook);
  const ropeCoil = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 6, 12), ropeMat);
  ropeCoil.rotation.x = Math.PI / 2;
  ropeCoil.position.set(-0.4, 0.06, 0.4);
  g.add(ropeCoil);
}

// ---------- Booster 5: Provision Store (kelp_rope + bread) ----------
function buildProvisionStore(g) {
  const wallMat = darkMat(0x6b5638, 0.8);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 0.55), wallMat);
  wall.position.set(0, 0.275, 0);
  wall.castShadow = true;
  addOutline(wall, 1.05);
  g.add(wall);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.09, 0.65), darkMat(STONE_DARK));
  roof.position.set(0, 0.6, 0);
  g.add(roof);
  const doorway = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), darkMat(0x1c140c, 1));
  doorway.position.set(0, 0.2, 0.276);
  g.add(doorway);
  const shelfMat = darkMat(BREAD, 0.6);
  for (let i = 0; i < 2; i++) {
    const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), shelfMat);
    loaf.scale.set(1.3, 0.7, 0.9);
    loaf.position.set(-0.08 + i * 0.16, 0.32, 0.27);
    g.add(loaf);
  }
  const sackMat = darkMat(ROPE, 0.85);
  for (let i = 0; i < 2; i++) {
    const sack = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), sackMat);
    sack.scale.set(1, 1.2, 1);
    sack.position.set(0.5 - i * 0.05, 0.14, 0.35 + i * 0.15);
    sack.castShadow = true;
    g.add(sack);
  }
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.28, 10), darkMat(WOOD_LOG, 0.85));
  barrel.position.set(-0.5, 0.14, 0.4);
  barrel.castShadow = true;
  g.add(barrel);
}

// ---------- Booster 6: Millhouse (flagship, all three) ----------
function buildMillhouse(g) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.9, 10), darkMat(0x8a7a5c, 0.85));
  base.position.set(0, 0.45, 0);
  base.castShadow = true;
  addOutline(base, 1.06);
  g.add(base);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.5, 10), darkMat(0x4a3826, 0.8));
  roof.position.set(0, 1.15, 0);
  roof.castShadow = true;
  g.add(roof);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.07, 8), glowMat(AMBER, 1.2));
    win.position.set(Math.cos(a) * 0.35, 0.55, Math.sin(a) * 0.35);
    win.lookAt(win.position.clone().multiplyScalar(2));
    g.add(win);
  }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), darkMat(WOOD_DARK));
  hub.position.set(0, 0.95, 0.42);
  g.add(hub);
  const vaneMat = darkMat(PLANK, 0.75);
  for (let i = 0; i < 4; i++) {
    const vane = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.55, 0.03), vaneMat);
    vane.position.set(0, 0.95, 0.42);
    vane.rotation.z = (i / 4) * Math.PI * 2 + 0.3;
    vane.translateY(0.28);
    g.add(vane);
  }
  const pole = cylBetween(new THREE.Vector3(0, 1.4, 0), new THREE.Vector3(0, 1.62, 0), 0.02, darkMat(WOOD_DARK));
  g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), darkMat(AMBER, 0.5));
  flag.position.set(0.1, 1.58, 0);
  g.add(flag);
}

const BOOSTER_BUILDERS = {
  timberline_booster_tool_shed: buildToolShed,
  timberline_booster_drying_frames: buildDryingFrames,
  timberline_booster_grain_silo: buildGrainSilo,
  timberline_booster_timber_yard: buildTimberYard,
  timberline_booster_provision_store: buildProvisionStore,
  timberline_booster_millhouse: buildMillhouse,
};

export function buildZone4Prop(propGroup, tile) {
  if (tile.family === 'planks') return buildSawmill(propGroup);
  if (tile.family === 'kelp_rope') return buildRopeworks(propGroup);
  if (tile.family === 'bread') return buildBakehouse(propGroup);
  const builder = BOOSTER_BUILDERS[tile.id];
  if (builder) builder(propGroup);
}
