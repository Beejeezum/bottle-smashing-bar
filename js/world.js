// The building: a street front, the bar room, and the warehouse shell.
// Coordinates: you walk in heading -Z; the warehouse is off to +X.
import * as THREE from 'three';
import * as TX from './textures.js';
import { NeonFigure } from './people.js';
import { DRINKS, makeVessel, vesselGeo } from './drinks.js';

export function buildWorld(scene) {
  const W = { colliders: [], statics: [], ticks: [], flicker: [], figures: [] };
  const col = (x0, x1, z0, z1) => W.colliders.push({ x0, x1, z0, z1 });

  const M = (canvas, rx, ry, o = {}) => new THREE.MeshStandardMaterial({
    map: TX.T(canvas, rx, ry), bumpMap: TX.T(canvas, rx, ry, false), bumpScale: o.bump ?? 2,
    roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, color: o.color ?? 0xffffff, envMapIntensity: o.env ?? 0.35,
  });
  const flat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.7, metalness: o.m ?? 0, envMapIntensity: o.env ?? 0.6, side: o.side ?? THREE.FrontSide });
  const glow = (c, k = 2.5) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });

  function B(w, h, d, mat, x, y, z, o = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.receiveShadow = true; scene.add(m);
    if (o.col) col(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
    if (o.stat) W.statics.push(new THREE.Box3().setFromObject(m));
    return m;
  }
  function plane(w, h, mat, x, y, z, ry = 0, rx = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0, 'YXZ'); m.receiveShadow = true; scene.add(m); return m;
  }
  function cyl(rt, rb, h, mat, x, y, z, seg = 18) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m;
  }
  function sign(text, opts, w, x, y, z, ry, { boost = 1.7, flicker = 0 } = {}) {
    const c = TX.neon(text, opts);
    const mat = new THREE.MeshBasicMaterial({ map: TX.T(c), transparent: true, depthWrite: false, side: THREE.DoubleSide });
    mat.color.setScalar(boost);
    const m = plane(w, w * c.height / c.width, mat, x, y, z, ry);
    m.receiveShadow = false;
    if (flicker) W.flicker.push({ mat, boost, rate: flicker, t: 1 });
    return m;
  }
  W.B = B; W.cyl = cyl; W.flat = flat; W.glow = glow; W.M = M;

  // ---------- shared painted surfaces ----------
  const cFloor = TX.wood({ planks: 10, base: [74, 46, 27], seed: 1 });
  const cDark = TX.wood({ planks: 4, base: [50, 29, 16], seed: 5 });
  const cTop = TX.wood({ planks: 3, base: [128, 70, 30], seed: 9, gap: 1 });
  const cBrick = TX.brick({});
  const cConc = TX.concrete({});
  const cAsph = TX.concrete({ base: 34, seed: 14 });
  const cMetal = TX.corrugated({});
  W.canvases = { cDark, cTop, cConc, cMetal };
  const brickM = (rx, ry) => M(cBrick, rx, ry, { rough: 0.9, bump: 3 });
  const darkWood = (rx, ry) => M(cDark, rx, ry, { rough: 0.6, env: 0.5 });
  const black = flat(0x0b0a0a, { r: 0.9 });
  const chrome = flat(0xbfc5cc, { r: 0.18, m: 1, env: 1.5 });
  const brass = flat(0xc9a24a, { r: 0.3, m: 1, env: 1.4 });

  // ---------- bar room: x[-8,8] z[-8,10] ----------
  plane(16.6, 18.6, M(cFloor, 5, 6, { rough: 0.5, env: 0.7, bump: 1 }), 0, 0, 1, 0, -Math.PI / 2);
  plane(16.6, 18.6, black, 0, 3.6, 1, 0, Math.PI / 2);
  B(16.6, 3.6, 0.3, brickM(5, 1.4), 0, 1.8, -8.15, { col: 1 });
  B(0.3, 3.6, 18.6, brickM(6, 1.4), -8.15, 1.8, 1, { col: 1 });
  B(7.3, 5.2, 0.3, brickM(2.4, 2), -4.65, 2.6, 10.15, { col: 1 });
  B(7.3, 5.2, 0.3, brickM(2.4, 2), 4.65, 2.6, 10.15, { col: 1 });
  B(2, 2.7, 0.3, brickM(0.7, 1), 0, 3.85, 10.15);
  // shared wall with the warehouse, opening z[-4,6]
  B(0.3, 10, 7.3, brickM(2.4, 4), 8.15, 5, -7.65, { col: 1 });
  B(0.3, 10, 5.3, brickM(1.8, 4), 8.15, 5, 8.65, { col: 1 });
  B(0.3, 6.8, 10, brickM(3.3, 2.7), 8.15, 6.6, 1);
  // door frame
  B(0.14, 2.5, 0.4, black, -1.0, 1.25, 10.15); B(0.14, 2.5, 0.4, black, 1.0, 1.25, 10.15); B(2.14, 0.14, 0.4, black, 0, 2.5, 10.15);
  // ceiling beams and fans
  for (let z = -6; z <= 8; z += 3.5) B(16, 0.22, 0.25, darkWood(4, 0.2), 0, 3.48, z);
  [[-2, 2], [4.2, 7]].forEach(([x, z], i) => {
    const hub = new THREE.Group(); hub.position.set(x, 3.2, z); scene.add(hub);
    for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.02, 0.18), darkWood(1, 1)); b.position.x = 0.75; const a = new THREE.Group(); a.rotation.y = k * Math.PI / 2; a.add(b); hub.add(a); }
    cyl(0.03, 0.03, 0.3, black, x, 3.38, z);
    W.ticks.push((t, dt) => { hub.rotation.y += dt * (1.6 + i * 0.5); });
  });

  // ---------- the bar ----------
  B(12.8, 1.02, 0.7, darkWood(5, 1), -1.6, 0.51, -5.2);
  B(0.7, 1.02, 2.5, darkWood(1, 1), 4.45, 0.51, -6.8);
  const topM = M(cTop, 5, 1, { rough: 0.18, env: 1.4, bump: 0.3 });
  B(13.1, 0.07, 0.95, topM, -1.55, 1.055, -5.2);
  B(0.95, 0.07, 2.7, M(cTop, 1, 1, { rough: 0.18, env: 1.4, bump: 0.3 }), 4.45, 1.055, -6.75);
  col(-8, 4.95, -8, -4.72);
  const rail = cyl(0.025, 0.025, 12.6, brass, -1.6, 0.2, -4.74); rail.rotation.z = Math.PI / 2;
  // back bar: mirror, shelves, LED strips, a wall of bottles
  plane(11.4, 1.9, flat(0x8fa0b4, { r: 0.28, m: 1, env: 0.45 }), -1.75, 1.95, -7.99);
  const palette = [0x8a4a14, 0x1f7a3a, 0xcfe6f2, 0xa3202a, 0x1e3f9a, 0xd9a520, 0x7a3fb0, 0xe0e0d0];
  const dummy = new THREE.Object3D(), ccol = new THREE.Color();
  const bottleMat = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.82, roughness: 0.08, envMapIntensity: 2.5 });
  ['longneck', 'jug'].forEach((v, vi) => {
    const im = new THREE.InstancedMesh(vesselGeo(v), bottleMat, 60); let n = 0;
    [1.18, 1.73, 2.28].forEach((y, row) => {
      for (let i = 0; i < 40; i++) {
        if ((i * 7 + row * 3) % 2 !== vi) continue;
        dummy.position.set(-7.1 + i * 0.275 + Math.sin(i * 9.1 + row) * 0.03, y, -7.78);
        const s = (vi ? 1.0 : 1.25) * (0.9 + ((i * 13 + row * 5) % 7) * 0.035);
        dummy.scale.setScalar(s); dummy.updateMatrix();
        im.setMatrixAt(n, dummy.matrix); im.setColorAt(n, ccol.setHex(palette[(i * 5 + row * 3 + vi) % palette.length])); n++;
      }
    });
    im.count = n; scene.add(im);
  });
  [[1.15, 0xff9a2a], [1.7, 0xff2d95], [2.25, 0x00d5ff]].forEach(([y, c]) => {
    B(11.2, 0.05, 0.32, darkWood(4, 0.2), -1.75, y, -7.8);
    B(11.2, 0.025, 0.03, glow(c, 1.5), -1.75, y + 0.04, -7.94);
  });
  // taps
  [-0.9, -0.65, -0.4].forEach((x, i) => {
    cyl(0.025, 0.03, 0.3, chrome, x, 1.24, -5.45);
    B(0.045, 0.16, 0.045, flat([0xd61f2c, 0xffd400, 0x1e7fd6][i], { r: 0.3 }), x, 1.46, -5.43);
  });
  // stools and the regulars
  const vinyl = flat(0x8a1420, { r: 0.35 });
  const stoolX = [-6.6, -5.1, -3.6, -2.1, -0.6, 0.9, 2.4, 3.9];
  stoolX.forEach(x => { cyl(0.2, 0.2, 0.07, vinyl, x, 0.79, -4.1); cyl(0.03, 0.03, 0.76, chrome, x, 0.38, -4.1, 8); cyl(0.2, 0.22, 0.03, chrome, x, 0.015, -4.1); });
  const regulars = [[0, 0xff2d95, 'cowboy', 'lager'], [1, 0x00e5ff, 'bun', 'martini'], [3, 0xffe600, null, 'stout'], [6, 0xb26bff, 'mohawk', 'whiskey']];
  regulars.forEach(([si, color, hat, drink], i) => {
    const f = new NeonFigure({ color, hat, pose: 'seated', phase: i * 2.7 });
    f.group.position.set(stoolX[si], 0, -4.1); f.group.rotation.y = Math.PI; scene.add(f.group);
    f.hold(makeVessel(DRINKS.find(d => d.id === drink), 0.6));
    W.figures.push(f); col(stoolX[si] - 0.3, stoolX[si] + 0.3, -4.75, -3.85);
    const spare = makeVessel(DRINKS[i % 3], 0.3); spare.position.set(stoolX[si] - 0.35, 1.09, -5.05); scene.add(spare);
  });
  const tender = W.bartender = new NeonFigure({ color: 0xfff0c4, pose: 'bartender', hat: 'bow', boost: 1.7 });
  tender.group.position.set(0.5, 0, -6.35); scene.add(tender.group); W.figures.push(tender);
  // pendant lamps
  const shade = flat(0x123a2a, { r: 0.4, m: 0.3, side: THREE.DoubleSide });
  [-6, -3, 0, 3].forEach(x => {
    cyl(0.008, 0.008, 0.9, black, x, 3.1, -5.0, 6);
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.24, 20, 1, true), shade); s.position.set(x, 2.62, -5.0); scene.add(s);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), glow(0xffb866, 1.9)); b.position.set(x, 2.55, -5.0); scene.add(b);
  });
  [[-4.5, 0xffb060], [1.5, 0xffb060]].forEach(([x, c]) => { const l = new THREE.PointLight(c, 16, 11, 2); l.position.set(x, 2.45, -4.7); scene.add(l); });

  // ---------- bar room furniture ----------
  // jukebox + dancer
  B(0.7, 1.25, 1.0, darkWood(1, 1), -7.55, 0.625, -1.5, { col: 1 });
  const arch = cyl(0.5, 0.5, 0.7, darkWood(1, 1), -7.55, 1.25, -1.5); arch.rotation.z = Math.PI / 2;
  const jm = new THREE.MeshBasicMaterial({ map: TX.T(TX.jukebox()) }); jm.color.setScalar(1.8);
  plane(0.9, 1.35, jm, -7.19, 0.95, -1.5, Math.PI / 2);
  const jl = new THREE.PointLight(0xff4fa0, 7, 8, 2); jl.position.set(-6.6, 1.4, -1.5); scene.add(jl);
  W.ticks.push(t => { jm.color.setHSL((t * 0.08) % 1, 0.5, 0.75).multiplyScalar(2.4); jl.color.setHSL((t * 0.08) % 1, 0.9, 0.6); });
  const dancer = new NeonFigure({ color: 0x9dff00, pose: 'dance', hat: 'halo' });
  dancer.group.position.set(-5.9, 0, -0.9); dancer.group.rotation.y = Math.PI / 2 + 0.5; scene.add(dancer.group); W.figures.push(dancer);
  col(-6.25, -5.55, -1.25, -0.55);
  // pool table
  const felt = flat(0x0f6a3c, { r: 1 });
  B(2.7, 0.3, 1.5, darkWood(1, 1), -4.5, 0.72, 4.6); B(2.4, 0.02, 1.2, felt, -4.5, 0.875, 4.6);
  [[-1.2, -0.6], [1.2, -0.6], [-1.2, 0.6], [1.2, 0.6]].forEach(([dx, dz]) => B(0.14, 0.6, 0.14, darkWood(1, 1), -4.5 + dx, 0.3, 4.6 + dz));
  [0xffd400, 0xd61f2c, 0x1e3f9a, 0x111111, 0xff7a00, 0x6a1b9a, 0xf4f1e6].forEach((c, i) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), flat(c, { r: 0.15, env: 1.2 }));
    b.position.set(-4.5 + Math.sin(i * 2.4) * 0.9, 0.93, 4.6 + Math.cos(i * 3.7) * 0.45); scene.add(b);
  });
  B(1.7, 0.14, 0.5, flat(0x0f3a26, { r: 0.4 }), -4.5, 2.1, 4.6); B(1.55, 0.02, 0.38, glow(0xfff0c8, 2.6), -4.5, 2.02, 4.6);
  cyl(0.008, 0.008, 1.4, black, -4.5, 2.85, 4.6, 6);
  const pl = new THREE.PointLight(0xfff0c8, 9, 7, 2); pl.position.set(-4.5, 1.9, 4.6); scene.add(pl);
  col(-5.9, -3.1, 3.8, 5.4);
  // high-top with two talkers
  cyl(0.45, 0.45, 0.05, M(cTop, 1, 1, { rough: 0.2, env: 1.2 }), 3.6, 1.06, 3.4); cyl(0.04, 0.04, 1.04, chrome, 3.6, 0.52, 3.4, 8); cyl(0.3, 0.32, 0.03, chrome, 3.6, 0.015, 3.4);
  [[2.85, 0xff8a00, Math.PI / 2, 'cap', 'ipa'], [4.35, 0xff5ad0, -Math.PI / 2, 'bun', 'wine']].forEach(([x, c, ry, hat, dr], i) => {
    const f = new NeonFigure({ color: c, pose: 'chat', phase: i * 1.9, hat }); f.group.position.set(x, 0, 3.4 + i * 0.1); f.group.rotation.y = ry; scene.add(f.group);
    f.hold(makeVessel(DRINKS.find(d => d.id === dr), 0.5)); W.figures.push(f);
  });
  col(2.55, 4.65, 3.0, 3.9);
  // wall dressing
  plane(2.5, 1.76, new THREE.MeshStandardMaterial({ map: TX.T(TX.chalkboard(DRINKS)), roughness: 0.9, emissive: 0xffffff, emissiveMap: TX.T(TX.chalkboard(DRINKS)), emissiveIntensity: 0.25 }), -7.98, 1.9, -3.9, Math.PI / 2);
  sign('smash stuff', { font: 'Pacifico', color: '#ff2d95', px: 170 }, 3.3, -7.97, 2.55, 2.2, Math.PI / 2, { flicker: 0.03 });
  sign('COLD BEER', { color: '#00e5ff' }, 3.2, -4.6, 2.6, 9.97, Math.PI, { flicker: 0.02 });
  sign('<<< SMASH RANGE', { color: '#ffb300', px: 130 }, 3.5, 7.97, 2.6, 8.0, -Math.PI / 2);
  sign('LAST CALL\nNEVER', { color: '#9dff00', px: 110 }, 1.7, 7.97, 2.4, -6.1, -Math.PI / 2, { flicker: 0.08 });
  const pinkL = new THREE.PointLight(0xff2d95, 9, 10, 2); pinkL.position.set(-6.8, 2.4, 2.2); scene.add(pinkL);
  const cyanL = new THREE.PointLight(0x00d5ff, 8, 10, 2); cyanL.position.set(-4.6, 2.4, 8.8); scene.add(cyanL);
  const ambL = new THREE.PointLight(0xffa24a, 8, 12, 2); ambL.position.set(5.5, 2.6, 6.5); scene.add(ambL);

  // ---------- warehouse shell: x[8,38] z[-11,11] ----------
  plane(30.3, 22.6, M(cConc, 6, 4.5, { rough: 0.75, bump: 1.5 }), 23.15, 0, 0, 0, -Math.PI / 2);
  plane(30.3, 22.6, black, 23.15, 10, 0, 0, Math.PI / 2);
  const metalM = (rx) => M(cMetal, rx, 1, { rough: 0.55, metal: 0.5, env: 0.5, bump: 4 });
  B(30.3, 10, 0.3, metalM(9), 23.15, 5, -11.15, { col: 1 });
  B(30.3, 10, 0.3, metalM(9), 23.15, 5, 11.15, { col: 1 });
  B(0.3, 10, 22.6, metalM(7), 38.15, 5, 0);
  [14, 20, 26, 32].forEach(x => { B(0.18, 0.4, 22.4, black, x, 9.5, 0); });
  B(24, 0.18, 0.18, black, 23, 9.2, -5); B(24, 0.18, 0.18, black, 23, 9.2, 5);
  [[17, -5], [17, 5], [24, 0], [30, -5], [30, 5]].forEach(([x, z]) => {
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.5, 20, 1, true), flat(0x2a2f33, { r: 0.4, m: 0.6, side: THREE.DoubleSide })); s.position.set(x, 8.6, z); scene.add(s);
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), glow(0xfff2d6, 3)); d.position.set(x, 8.45, z); scene.add(d);
    cyl(0.012, 0.012, 0.9, black, x, 9.3, z, 6);
  });
  const sp = (x, z, I, shadow) => {
    const l = new THREE.SpotLight(0xfff0dc, I, 40, 1.0, 0.7, 2); l.position.set(x, 9.6, z); l.target.position.set(x + 1, 0, z); scene.add(l, l.target);
    if (shadow) { l.castShadow = true; l.shadow.mapSize.set(2048, 2048); l.shadow.camera.near = 2; l.shadow.camera.far = 16; l.shadow.bias = -0.0015; l.shadow.radius = 4; }
    return l;
  };
  sp(19, 0, 1000, true); sp(29, 0, 1000, false);
  const wl = new THREE.PointLight(0xff3da0, 60, 22, 2); wl.position.set(33, 5, 0); scene.add(wl);
  const wl2 = new THREE.PointLight(0xffc27a, 22, 14, 2); wl2.position.set(11, 3.2, 0); scene.add(wl2);
  // the throwing counter, with a carnival marquee of chasing bulbs
  B(0.9, 1.02, 22, darkWood(1, 6), 13.35, 0.51, 0, { col: 1, stat: 1 });
  B(1.1, 0.07, 22, M(cTop, 1, 8, { rough: 0.25, env: 1.2, bump: 0.3 }), 13.35, 1.055, 0);
  for (let z = -10.5; z <= 10.5; z += 1.5) B(0.02, 0.9, 0.7, flat((Math.round(z / 1.5) & 1) ? 0xd61f2c : 0xf4f1e6, { r: 0.6 }), 12.89, 0.5, z);
  B(0.3, 0.5, 22.2, flat(0x8a1420, { r: 0.5 }), 13.35, 3.6, 0);
  B(0.25, 3.4, 0.25, flat(0x8a1420, { r: 0.5 }), 13.35, 1.7, -10.85); B(0.25, 3.4, 0.25, flat(0x8a1420, { r: 0.5 }), 13.35, 1.7, 10.85);
  const NB = 44, bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshBasicMaterial(), NB);
  for (let i = 0; i < NB; i++) { dummy.position.set(13.17, 3.6, -10.75 + i * 0.5); dummy.scale.setScalar(1); dummy.updateMatrix(); bulbs.setMatrixAt(i, dummy.matrix); bulbs.setColorAt(i, ccol.setRGB(1, 1, 1)); }
  scene.add(bulbs);
  let lastPh = -1;
  W.ticks.push(t => {
    const ph = Math.floor(t * 7); if (ph === lastPh) return; lastPh = ph;
    for (let i = 0; i < NB; i++) { (i + ph) % 3 === 0 ? ccol.setRGB(3.4, 2.4, 1.0) : ccol.setRGB(0.25, 0.14, 0.05); bulbs.setColorAt(i, ccol); }
    bulbs.instanceColor.needsUpdate = true;
  });
  sign('SMASH RANGE', { color: '#ffb300', px: 150 }, 6.5, 13.15, 4.7, 0, -Math.PI / 2);
  plane(1.5, 2.1, new THREE.MeshStandardMaterial({ map: TX.T(TX.rules()), roughness: 0.9 }), 10.6, 1.9, -10.98, 0);
  // back wall
  const mc = TX.mural();
  plane(15, 15 * mc.height / mc.width, new THREE.MeshStandardMaterial({ map: TX.T(mc), transparent: true, roughness: 0.8, emissive: 0xffffff, emissiveMap: TX.T(mc), emissiveIntensity: 0.35 }), 37.98, 5.6, 0, -Math.PI / 2);
  sign('LET IT FLY', { color: '#00e5ff', px: 150 }, 8, 37.96, 8.9, 0, -Math.PI / 2, { flicker: 0.02 });
  sign('break\nthings', { font: 'Pacifico', color: '#ff2d95', px: 150 }, 3.4, 30, 5.2, -10.96, 0, { flicker: 0.04 });
  sign('NO\nREFUNDS', { color: '#9dff00', px: 120 }, 3, 28, 5.6, 10.96, Math.PI);

  // ---------- the street ----------
  plane(70, 14, M(cAsph, 10, 2, { rough: 0.28, metal: 0.2, env: 1.3, bump: 1 }), 12, 0, 17.3, 0, -Math.PI / 2);
  col(-6.3, -6, 10.3, 16.3); col(6, 6.3, 10.3, 16.3); col(-6.3, 6.3, 16, 16.3);
  B(22, 9, 0.4, flat(0x0c0c11, { r: 0.9 }), -19.4, 4.5, 10.3);
  sign('BOTTLE\nSMASHING BAR', { color: '#ff2d95', px: 150 }, 6.4, 0, 3.95, 10.33, 0, { boost: 1.9, flicker: 0.025 });
  sign('OPEN', { color: '#00e5ff', px: 120 }, 1.3, 2.1, 1.75, 10.33, 0, { flicker: 0.1 });
  sign('free throws*', { font: 'Pacifico', color: '#ffb300', px: 120 }, 2.2, -3.6, 1.6, 10.33, 0);
  const extL = new THREE.PointLight(0xff2d95, 30, 14, 2); extL.position.set(0, 3.8, 12); scene.add(extL);
  const doorL = new THREE.PointLight(0xffb060, 10, 8, 2); doorL.position.set(0, 2.2, 8.8); scene.add(doorL);
  cyl(0.06, 0.08, 4.6, black, -4.6, 2.3, 15.2, 8);
  const lampB = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), glow(0xffd9a0, 3)); lampB.position.set(-4.6, 4.7, 15.2); scene.add(lampB);
  const sk = new THREE.MeshBasicMaterial({ map: TX.T(TX.skyline(), 2, 1) }); sk.color.setScalar(0.9);
  plane(120, 30, sk, 0, 14, 34, Math.PI);

  scene.add(new THREE.HemisphereLight(0x8090c0, 0x402820, 0.75));

  W.update = (t, dt) => {
    for (const f of W.ticks) f(t, dt);
    for (const f of W.figures) f.update(t, dt);
    for (const f of W.flicker) {
      f.t -= dt; if (f.t > 0) continue;
      if (Math.random() < f.rate * 6) { f.mat.color.setScalar(f.boost * (Math.random() < 0.6 ? 0.2 : 1)); f.t = 0.03 + Math.random() * 0.09; }
      else { f.mat.color.setScalar(f.boost); f.t = 0.2 + Math.random() * 1.5; }
    }
  };
  return W;
}
