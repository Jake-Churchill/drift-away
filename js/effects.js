import * as THREE from 'three';

// Short-lived scene effects for the two things the player does: unlock a raft, level one up.
// Nothing here runs unless an effect is active. Timing comes from `getClock` (seconds), which
// render.js stops for a beat on impact, so effects freeze with the rest of the scene.

const RISE_SECONDS = 1.0;
const POP_SECONDS = 0.75;
const RING_SECONDS = 0.95;
const SPARK_SECONDS = 1.1;
const SPARK_GRAVITY = 4.2;

// -1 at t=0, a small overshoot, settled by t~1: a damped wobble for squash and stretch.
const wobble = (t) => -Math.exp(-5 * t) * Math.cos(11 * t);

function dotTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(16, 16, 2, 16, 16, 15);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

export function createEffects(scene, tileObjects, getClock) {
  const active = [];
  const sparkTexture = dotTexture();

  function ring(position, intensity, delay = 0) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.0, 64),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(position.x, 0.05, position.z);
    scene.add(mesh);
    const start = getClock() + delay;
    const reach = 2.1 + 1.6 * intensity;
    active.push(() => {
      const t = (getClock() - start) / RING_SECONDS;
      if (t < 0) return true;
      if (t >= 1) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        return false;
      }
      const s = 1 + (reach - 1) * (1 - Math.pow(1 - t, 3));
      mesh.scale.set(s, s, s);
      mesh.material.opacity = (1 - t) * 0.75;
      return true;
    });
  }

  function sparks(position, intensity, height) {
    const count = Math.round(10 + 34 * intensity);
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * (1.4 + 1.6 * intensity);
      positions.set([position.x, height, position.z], i * 3);
      velocities.push([Math.cos(angle) * speed, 2.2 + Math.random() * (2 + 2 * intensity), Math.sin(angle) * speed]);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      map: sparkTexture,
      color: 0xffd23d,
      size: 9,
      sizeAttenuation: false,
      transparent: true,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);
    const start = getClock();
    active.push(() => {
      const t = getClock() - start;
      if (t > SPARK_SECONDS) {
        scene.remove(points);
        geometry.dispose();
        material.dispose();
        return false;
      }
      const attribute = geometry.attributes.position;
      for (let i = 0; i < count; i++) {
        attribute.setXYZ(
          i,
          position.x + velocities[i][0] * t,
          height + velocities[i][1] * t - SPARK_GRAVITY * t * t,
          position.z + velocities[i][2] * t
        );
      }
      attribute.needsUpdate = true;
      material.opacity = Math.min(1, (SPARK_SECONDS - t) * 1.4);
      return true;
    });
  }

  // The new raft rises out of the water flattened and wide, overshoots tall and thin, and settles.
  // Volume is kept constant (x and z scale by 1/sqrt(y)), which is what reads as weight.
  function rise(raft, intensity) {
    const start = getClock();
    const amount = 0.3 + 0.35 * intensity;
    const drop = 0.35 + 0.6 * intensity;
    active.push(() => {
      const t = (getClock() - start) / RISE_SECONDS;
      if (t >= 1) {
        raft.scale.set(1, 1, 1);
        raft.position.y = 0;
        return false;
      }
      const sy = 1 + amount * wobble(t);
      const sxz = 1 / Math.sqrt(sy);
      raft.scale.set(sxz, sy, sxz);
      raft.position.y = -drop * Math.pow(1 - Math.min(1, t / 0.55), 2);
      return true;
    });
  }

  // A level-up bounces the new props in place.
  function pop(group, intensity) {
    const base = group.scale.clone();
    const start = getClock();
    const amount = 0.2 + 0.25 * intensity;
    active.push(() => {
      const t = (getClock() - start) / POP_SECONDS;
      if (t >= 1) {
        group.scale.copy(base);
        return false;
      }
      const sy = 1 + amount * wobble(t);
      const sxz = 1 / Math.sqrt(sy);
      group.scale.set(base.x * sxz, base.y * sy, base.z * sxz);
      return true;
    });
  }

  return {
    unlock(tile, intensity) {
      const objects = tileObjects.get(tile.id);
      ring(objects.raftMesh.position, intensity);
      if (intensity > 0.55) ring(objects.raftMesh.position, intensity, 0.14);
      rise(objects.raftMesh, intensity);
      sparks(objects.raftMesh.position, intensity, 0.6);
    },
    levelUp(tile, level, intensity) {
      const objects = tileObjects.get(tile.id);
      ring(objects.raftMesh.position, intensity);
      pop(objects.propGroups[level], intensity);
      sparks(objects.raftMesh.position, intensity * 0.6, 1.0);
    },
    update() {
      for (let i = active.length - 1; i >= 0; i--) if (!active[i]()) active.splice(i, 1);
    },
  };
}
