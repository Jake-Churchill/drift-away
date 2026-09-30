import * as THREE from 'three';

// A plank bridge: cross-planks along the straight line of hexes the tile covers, with two rope
// rails and a post at each end. Bridges have no levels (see js/state.js's getLevel) and aren't in
// CLUSTER_PROPS, so there is exactly one look, not one per level -- and no fixed hex count, unlike
// a cluster's always-3 cells: `offsets` can be any length, in order along the line.
const PLANK_COLOR = 0xa9754a;
const POST_COLOR = 0x6b4c2a;
const ROPE_COLOR = 0xb89a5e;

const materials = new Map();
function material(color) {
  if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  return materials.get(color);
}

export function buildBridgeProp(group, offsets) {
  const start = offsets[0];
  const end = offsets[offsets.length - 1];
  const dx = end.dx - start.dx;
  const dz = end.dz - start.dz;
  const length = Math.hypot(dx, dz);
  const dir = { x: dx / length, z: dz / length };
  const side = { x: -dir.z, z: dir.x };

  const deckWidth = 0.9;
  const deckY = 0.05;
  const railHeight = 0.34;

  const plankMat = material(PLANK_COLOR);
  const plankGap = 0.32;
  const plankCount = Math.max(2, Math.round(length / plankGap));
  for (let i = 0; i <= plankCount; i++) {
    const t = i / plankCount;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, deckWidth), plankMat);
    plank.position.set(start.dx + dx * t, deckY, start.dz + dz * t);
    plank.rotation.y = Math.atan2(side.x, side.z);
    plank.castShadow = true;
    group.add(plank);
  }

  const railMat = material(ROPE_COLOR);
  const postMat = material(POST_COLOR);
  for (const s of [-1, 1]) {
    const ox = side.x * deckWidth * 0.5 * s;
    const oz = side.z * deckWidth * 0.5 * s;
    const from = new THREE.Vector3(start.dx + ox, deckY + railHeight, start.dz + oz);
    const to = new THREE.Vector3(end.dx + ox, deckY + railHeight, end.dz + oz);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, length, 6), railMat);
    rail.position.copy(from).lerp(to, 0.5);
    rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    group.add(rail);
    for (const point of [from, to]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, railHeight + deckY, 8), postMat);
      post.position.set(point.x, (railHeight + deckY) / 2, point.z);
      post.castShadow = true;
      group.add(post);
    }
  }
}
