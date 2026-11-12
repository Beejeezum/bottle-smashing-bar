// Shards, chunks, sparks and score pop-ups, plus the "you are drunk" lens.
// Each particle family is one instanced draw call backed by a flat Float32Array.
import * as THREE from 'three';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();
const _c = new THREE.Color(), _v = new THREE.Vector3();
const N = 16; // floats per particle: p3 v3 r3 w3 life s3

class Pool {
  constructor(scene, geo, mat, cap, o = {}) {
    this.cap = cap; this.g = o.g ?? 9.8; this.bounce = o.bounce ?? 0.3; this.drag = o.drag ?? 0; this.flat = !!o.flat;
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.d = new Float32Array(cap * N); this.sleep = new Uint8Array(cap); this.i = 0;
    _m.makeScale(0, 0, 0); _c.setRGB(1, 1, 1);
    for (let i = 0; i < cap; i++) { this.mesh.setMatrixAt(i, _m); this.mesh.setColorAt(i, _c); }
    scene.add(this.mesh);
  }
  spawn(p, vx, vy, vz, color, sx, sy, sz, life) {
    const i = this.i; this.i = (i + 1) % this.cap;
    const d = this.d, o = i * N;
    d[o] = p.x; d[o + 1] = p.y; d[o + 2] = p.z; d[o + 3] = vx; d[o + 4] = vy; d[o + 5] = vz;
    for (let k = 6; k < 9; k++) d[o + k] = Math.random() * 6.28;
    for (let k = 9; k < 12; k++) d[o + k] = (Math.random() - 0.5) * 22;
    d[o + 12] = life; d[o + 13] = sx; d[o + 14] = sy; d[o + 15] = sz;
    this.sleep[i] = 0;
    this.mesh.setColorAt(i, color); this.mesh.instanceColor.needsUpdate = true;
  }
  update(dt) {
    const d = this.d; let dirty = false;
    const dragK = Math.exp(-this.drag * dt);
    for (let i = 0; i < this.cap; i++) {
      const o = i * N; let life = d[o + 12];
      if (life <= 0) continue;
      life -= dt; d[o + 12] = life; dirty = true;
      if (life <= 0) { _m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, _m); continue; }
      if (this.sleep[i]) { if (life > 0.5) continue; }
      else {
        d[o + 4] -= this.g * dt;
        d[o + 3] *= dragK; d[o + 4] *= dragK; d[o + 5] *= dragK;
        d[o] += d[o + 3] * dt; d[o + 1] += d[o + 4] * dt; d[o + 2] += d[o + 5] * dt;
        d[o + 6] += d[o + 9] * dt; d[o + 7] += d[o + 10] * dt; d[o + 8] += d[o + 11] * dt;
        if (d[o + 1] < 0.015) {
          d[o + 1] = 0.015;
          if (d[o + 4] > -1.4) { this.sleep[i] = 1; if (this.flat) { d[o + 6] = 0; d[o + 8] = 0; } }
          else { d[o + 4] *= -this.bounce; d[o + 3] *= 0.6; d[o + 5] *= 0.6; d[o + 9] *= 0.5; d[o + 10] *= 0.5; d[o + 11] *= 0.5; }
        }
      }
      const k = Math.min(1, life / 0.5);
      _p.set(d[o], d[o + 1], d[o + 2]); _e.set(d[o + 6], d[o + 7], d[o + 8]); _q.setFromEuler(_e);
      _s.set(d[o + 13] * k, d[o + 14] * k, d[o + 15] * k);
      this.mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
    }
    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
  }
}

const rnd = (a, b) => a + Math.random() * (b - a);

export class FX {
  constructor(scene, camera) {
    this.camera = camera;
    this.glass = new Pool(scene, new THREE.TetrahedronGeometry(1), new THREE.MeshStandardMaterial({
      roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.78, envMapIntensity: 4, depthWrite: false,
    }), 1600, { flat: true, bounce: 0.35 });
    this.chunk = new Pool(scene, new THREE.DodecahedronGeometry(0.6), new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true }), 700, { bounce: 0.3 });
    this.chunk.mesh.castShadow = true;
    this.glowP = new Pool(scene, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), 900, { g: 5, drag: 1.2, bounce: 0.4 });
    this.box = document.getElementById('popups');
    this.pops = [];
    this.kick = 0;
  }
  burst(pool, pos, vel, color, n, size, speed, life, thin = 1) {
    for (let i = 0; i < n; i++) {
      _v.set(rnd(-1, 1), rnd(-0.6, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(0.3, 1) * speed);
      const c = Array.isArray(color) ? color[i % color.length] : color;
      _c.set(c);
      const s = size * rnd(0.4, 1.4);
      pool.spawn(pos, vel.x * 0.22 + _v.x, vel.y * 0.1 + _v.y + 1.2, vel.z * 0.22 + _v.z, _c, s, s * thin * rnd(0.5, 1), s * rnd(0.5, 1.3), life * rnd(0.7, 1.3));
    }
  }
  glassBurst(pos, vel, color = 0xdfefff, n = 24, size = 0.05) { this.burst(this.glass, pos, vel, color, n, size, 4.5, 14, 0.18); this.kick = Math.max(this.kick, 0.5); }
  chunkBurst(pos, vel, color, n = 20, size = 0.06) { this.burst(this.chunk, pos, vel, color, n, size, 4, 9); this.kick = Math.max(this.kick, 0.6); }
  sparks(pos, color = 0xffd060, n = 24, speed = 6) {
    for (let i = 0; i < n; i++) {
      _v.set(rnd(-1, 1), rnd(-0.3, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(0.3, 1) * speed);
      _c.set(Array.isArray(color) ? color[i % color.length] : color).multiplyScalar(3);
      const s = rnd(0.015, 0.04);
      this.glowP.spawn(pos, _v.x, _v.y + 1, _v.z, _c, s, s, s * 3, rnd(0.5, 1.4));
    }
  }
  confetti(pos, n = 30, colors = [0xff2d95, 0xffe600, 0x00e5ff, 0x9dff00, 0xff7a00, 0xffffff]) {
    for (let i = 0; i < n; i++) {
      _v.set(rnd(-1, 1), rnd(-0.2, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(1, 5));
      _c.set(colors[i % colors.length]).multiplyScalar(1.6);
      this.glowP.spawn(pos, _v.x, _v.y + 2, _v.z, _c, 0.05, 0.008, 0.07, rnd(1.5, 3.5));
    }
  }
  popup(pos, text, label = '', cls = '') {
    const el = document.createElement('div');
    el.className = 'pop ' + cls;
    el.innerHTML = `<b>${text}</b>${label ? `<span>${label}</span>` : ''}`;
    this.box.appendChild(el);
    this.pops.push({ el, pos: pos.clone(), t: 0 });
  }
  update(dt) {
    this.glass.update(dt); this.chunk.update(dt); this.glowP.update(dt);
    this.kick = Math.max(0, this.kick - dt * 2.5);
    const w = innerWidth, h = innerHeight;
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i]; p.t += dt;
      if (p.t > 1.5) { p.el.remove(); this.pops.splice(i, 1); continue; }
      _v.copy(p.pos).project(this.camera);
      const vis = _v.z < 1;
      const k = Math.min(1, p.t / 0.15);
      p.el.style.opacity = vis ? Math.min(1, (1.5 - p.t) * 2.5) : 0;
      p.el.style.transform = `translate(-50%,-50%) translate(${(_v.x * 0.5 + 0.5) * w}px,${(-_v.y * 0.5 + 0.5) * h - p.t * 70}px) scale(${0.5 + k * 0.5})`;
    }
  }
}

// Post-process: wobble, double vision, colour fringing, vignette. uDrunk is 0..1.
export const DrunkShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uDrunk: { value: 0 }, uHit: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uDrunk, uHit; varying vec2 vUv;
    void main(){
      float d = uDrunk; vec2 uv = vUv;
      uv.x += sin(uv.y*6.0 + uTime*1.3) * 0.011 * d;
      uv.y += cos(uv.x*5.0 + uTime*1.1) * 0.011 * d;
      uv = (uv-0.5) * (1.0 - 0.05*d) + 0.5;
      vec2 off = vec2(cos(uTime*0.7), sin(uTime*0.93)) * 0.04 * d * d;
      vec3 a = texture2D(tDiffuse, uv).rgb;
      vec3 b = texture2D(tDiffuse, uv + off).rgb;
      vec3 c = texture2D(tDiffuse, uv - off*0.6).rgb;
      vec3 col = mix(a, (a + b + c) / 3.0, smoothstep(0.12, 0.85, d) * 0.8);
      float ca = 0.0045*d + uHit*0.006;
      vec2 dir = normalize(vUv - 0.5 + 1e-4) * ca * (0.4 + length(vUv-0.5)*2.0);
      col.r = mix(col.r, texture2D(tDiffuse, uv + dir).r, 0.7);
      col.b = mix(col.b, texture2D(tDiffuse, uv - dir).b, 0.7);
      float v = smoothstep(0.95, 0.25, length(vUv - 0.5));
      col *= mix(1.0, v, 0.4 + 0.35*d);
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, 1.0 + 0.45*d);
      gl_FragColor = vec4(col, 1.0);
    }`,
};
