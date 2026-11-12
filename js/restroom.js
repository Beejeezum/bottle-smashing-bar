// The restroom, off the west wall. The mirror is a trick: it is a window into
// a second, flipped copy of the room with a neon figure that copies you.
import * as THREE from 'three';
import { T, mulberry } from './textures.js';
import { NeonFigure } from './people.js';

function tiles() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), R = mulberry(77);
  g.fillStyle = '#3a4444'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const teal = R() < 0.18, l = 78 + R() * 10;
    g.fillStyle = teal ? 'hsl(172,35%,' + (30 + R() * 8) + '%)' : 'hsl(150,8%,' + l + '%)';
    g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x * 64 + 4, y * 64 + 4, 56, 5);
  }
  for (let i = 0; i < 700; i++) { g.fillStyle = 'rgba(40,30,10,' + R() * 0.12 + ')'; g.fillRect(R() * 256, R() * 256, 1 + R() * 3, 1 + R() * 3); }
  return c;
}

function graffiti() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  const w = (text, x, y, px, col, rot = 0) => { g.save(); g.translate(x, y); g.rotate(rot); g.font = px + 'px "Permanent Marker"'; g.fillStyle = col; g.fillText(text, 0, 0); g.restore(); };
  w('DOUG WAS HERE', 40, 90, 64, '#1a1a1a', -0.05);
  w('no I wasn\'t — Doug', 120, 150, 38, '#b0201c', 0.03);
  w('GERALD OWES ME $40', 520, 110, 46, '#1e3f9a', 0.06);
  w('for a good time, throw things', 60, 270, 50, '#0f6a3c', -0.02);
  w('Pemberton is a narc', 560, 250, 42, '#1a1a1a', -0.08);
  w('SAL + THE JAR 4EVER', 330, 380, 54, '#b0201c', 0.04);
  w('you look great. go get em.', 80, 470, 40, '#6a1b9a', -0.03);
  w('TEX ♥ DUCKS', 720, 440, 44, '#ff7a00', 0.1);
  return c;
}

export function buildRestroom(scene, W) {
  const { B, flat, glow } = W;
  const tc = tiles();
  const tile = (rx, ry, color = 0xffffff) => new THREE.MeshStandardMaterial({ map: T(tc, rx, ry), roughness: 0.3, color, envMapIntensity: 0.7 });
  const X0 = -11.6, X1 = -8.3, Z0 = 4.5, Z1 = 8.5, H = 2.9, cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2, wx = X1 - X0, wz = Z1 - Z0;
  const white = flat(0x9ea3a3, { r: 0.2, env: 0.9 }), dark = flat(0x15181a, { r: 0.8 });

  // the room, and its flipped twin behind the mirror wall
  for (const m of [0, 1]) {
    const z = m ? 2 * Z0 - cz : cz;
    B(wx, 0.1, wz, tile(3, 4, 0x9aa7a7), cx, -0.05, z); B(wx, 0.1, wz, dark, cx, H + 0.05, z);
    B(0.2, H, wz, tile(4, 3), X0 - 0.1, H / 2, z);
    B(wx + 0.4, H, 0.2, tile(3.5, 3), cx, H / 2, m ? 2 * Z0 - Z1 - 0.1 : Z1 + 0.1);
    if (m) B(0.2, H, wz, tile(4, 3), X1 + 0.05, H / 2, z);
    B(1.3, 0.05, 0.1, glow(0xdfffe8, 2.2), cx, H - 0.03, z);
  }
  W.colliders.push({ x0: X0 - 0.3, x1: X0, z0: Z0, z1: Z1 }, { x0: X0, x1: X1, z0: Z1, z1: Z1 + 0.3 }, { x0: X0, x1: X1, z0: Z0 - 0.3, z1: Z0 });
  // mirror wall: four pieces around a hole
  const mx0 = -10.75, mx1 = -9.25, my0 = 1.05, my1 = 2.2, wm = tile(3, 3);
  B(mx0 - X0, H, 0.16, wm, (X0 + mx0) / 2, H / 2, Z0 - 0.08); B(X1 - mx1, H, 0.16, wm, (X1 + mx1) / 2, H / 2, Z0 - 0.08);
  B(mx1 - mx0, my0, 0.16, wm, (mx0 + mx1) / 2, my0 / 2, Z0 - 0.08); B(mx1 - mx0, H - my1, 0.16, wm, (mx0 + mx1) / 2, (H + my1) / 2, Z0 - 0.08);
  const chrome = flat(0xbfc5cc, { r: 0.2, m: 1, env: 1.5 });
  B(mx1 - mx0 + 0.1, 0.05, 0.04, chrome, (mx0 + mx1) / 2, my0, Z0 + 0.01); B(mx1 - mx0 + 0.1, 0.05, 0.04, chrome, (mx0 + mx1) / 2, my1, Z0 + 0.01);
  B(0.05, my1 - my0, 0.04, chrome, mx0, (my0 + my1) / 2, Z0 + 0.01); B(0.05, my1 - my0, 0.04, chrome, mx1, (my0 + my1) / 2, Z0 + 0.01);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(mx1 - mx0, my1 - my0), new THREE.MeshStandardMaterial({ color: 0x9fd0e0, transparent: true, opacity: 0.1, roughness: 0.02, metalness: 0.9, envMapIntensity: 1.2, depthWrite: false }));
  glass.position.set((mx0 + mx1) / 2, (my0 + my1) / 2, Z0 - 0.01); scene.add(glass);

  // fixtures (and their reflections)
  for (const m of [0, 1]) {
    const fz = z => m ? 2 * Z0 - z : z;
    B(0.95, 0.14, 0.45, white, -10, 0.86, fz(Z0 + 0.25)); B(0.06, 0.86, 0.3, white, -10, 0.43, fz(Z0 + 0.2));
    B(0.03, 0.14, 0.03, chrome, -10, 1.0, fz(Z0 + 0.1)); B(0.03, 0.03, 0.14, chrome, -10, 1.06, fz(Z0 + 0.16));
    B(1.5, 2.0, 0.06, flat(0x2f5d5a, { r: 0.5 }), -10.85, 1.1, fz(6.75));
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.13, 0.4, 18), white); bowl.position.set(-10.95, 0.2, fz(7.7)); scene.add(bowl);
    B(0.2, 0.45, 0.46, white, -11.38, 0.62, fz(7.7));
  }
  W.colliders.push({ x0: -10.5, x1: -9.5, z0: Z0, z1: Z0 + 0.5 }, { x0: -11.6, x1: -10.1, z0: 6.7, z1: 6.8 }, { x0: -11.6, x1: -10.75, z0: 7.45, z1: 7.95 });
  const gm = new THREE.MeshBasicMaterial({ map: T(graffiti()), transparent: true, depthWrite: false });
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.5), gm); gp.position.set(cx, 1.55, Z1 - 0.01); gp.rotation.y = Math.PI; scene.add(gp);

  const light = new THREE.PointLight(0xd8ffe6, 7, 8, 2); light.position.set(cx, H - 0.4, cz); scene.add(light);
  let ft = 0;
  W.ticks.push((t, dt) => { ft -= dt; if (ft <= 0) { light.intensity = Math.random() < 0.12 ? 2 : 7; ft = 0.05 + Math.random() * 0.4; } });

  const me = new NeonFigure({ color: 0x9fd8ff, pose: 'chat', boost: 1.3 });
  me.group.visible = false; scene.add(me.group); W.figures.push(me);
  W.restroom = {
    me, toilet: { x: -10.3, z: 7.7 },
    inside: p => p.x < -8.45 && p.z > Z0 && p.z < Z1,
    reflect(p, yaw) { me.group.visible = true; me.group.position.set(p.x, 0, 2 * Z0 - p.z); me.group.rotation.y = -yaw; },
  };
}
