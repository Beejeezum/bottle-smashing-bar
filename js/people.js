// The regulars are living neon signs: glowing glass-tube figures driven by a
// tiny procedural skeleton. Each pose is a function of time, no keyframes.
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
const NAMES = ['hip', 'chest', 'neck', 'head', 'shL', 'shR', 'elL', 'elR', 'haL', 'haR', 'hpL', 'hpR', 'knL', 'knR', 'ftL', 'ftR', 'toL', 'toR'];
const SEGS = [['hip', 'chest'], ['chest', 'neck'], ['shL', 'shR'], ['shL', 'elL'], ['elL', 'haL'], ['shR', 'elR'], ['elR', 'haR'],
  ['hpL', 'hpR'], ['hpL', 'knL'], ['knL', 'ftL'], ['hpR', 'knR'], ['knR', 'ftR'], ['ftL', 'toL'], ['ftR', 'toR']];
const TUBE = new THREE.CylinderGeometry(0.016, 0.016, 1, 6, 1, true);
const BALL = new THREE.SphereGeometry(0.025, 8, 6);
const L = (a, b, k) => a + (b - a) * k;

const POSES = {
  seated(j, t, f) {
    const sw = Math.sin(t * 1.1) * 0.02, bob = Math.sin(t * 5.4) * 0.008;
    const cyc = (t * 0.11) % 1, sip = cyc < 0.14 ? Math.sin(cyc / 0.14 * Math.PI) : 0;
    j.hip.set(sw * 0.3, 0.82, 0); j.chest.set(sw, 1.27, 0.1); j.head.set(sw * 1.5, 1.57 + bob + sip * 0.02, 0.15 - sip * 0.06);
    j.shL.set(-0.19 + sw, 1.3, 0.1); j.shR.set(0.19 + sw, 1.3, 0.1);
    j.elL.set(-0.3, 1.1, 0.32); j.haL.set(-0.12, 1.13, 0.52);
    j.elR.set(L(0.3, 0.34, sip), L(1.1, 1.26, sip), L(0.32, 0.27, sip));
    j.haR.set(L(0.15, 0.08, sip), L(1.16, 1.47, sip), L(0.52, 0.3, sip));
    j.hpL.set(-0.1, 0.82, 0); j.hpR.set(0.1, 0.82, 0);
    j.knL.set(-0.15, 0.78, 0.37); j.knR.set(0.15, 0.78, 0.37);
    j.ftL.set(-0.15, 0.3, 0.33); j.ftR.set(0.15, 0.3, 0.33);
  },
  bartender(j, t, f) {
    const s = f.serve, bob = Math.sin(t * 2) * 0.01, sh = Math.sin(t * 24) * 0.07 * s;
    j.hip.set(0, 0.95, 0); j.chest.set(0, 1.42 + bob, 0.03); j.head.set(0, 1.72 + bob, 0.05);
    j.shL.set(-0.21, 1.46 + bob, 0.03); j.shR.set(0.21, 1.46 + bob, 0.03);
    j.elR.set(L(0.38, 0.36, s), L(1.22, 1.38, s), L(0.25, 0.15, s));
    j.haR.set(L(0.25 + 0.18 * Math.cos(t * 3), 0.12, s), L(1.14, 1.56 + sh, s), L(0.56 + 0.08 * Math.sin(t * 3), 0.3, s));
    j.elL.set(L(-0.36, -0.36, s), L(1.22, 1.36, s), L(0.2, 0.15, s));
    j.haL.set(L(-0.26, -0.02, s), L(1.14, 1.46 + sh, s), L(0.5, 0.3, s));
    j.hpL.set(-0.1, 0.95, 0); j.hpR.set(0.1, 0.95, 0);
    j.knL.set(-0.11, 0.5, 0.02); j.knR.set(0.11, 0.5, 0.02);
    j.ftL.set(-0.12, 0.02, 0); j.ftR.set(0.12, 0.02, 0);
  },
  chat(j, t, f) {
    const sw = Math.sin(t * 0.9) * 0.03, g = Math.sin(t * 2.6), nod = Math.sin(t * 3.3) * 0.012;
    j.hip.set(sw, 0.95, 0); j.chest.set(sw * 1.4, 1.42, 0.02); j.head.set(sw * 1.8, 1.72 + nod, 0.05);
    j.shL.set(-0.2 + sw, 1.46, 0.02); j.shR.set(0.2 + sw, 1.46, 0.02);
    j.elR.set(0.3, 1.2, 0.12); j.haR.set(0.2, 1.24, 0.36);
    j.elL.set(-0.36, 1.24 + g * 0.04, 0.15); j.haL.set(-0.3 + g * 0.1, 1.4 + g * 0.12, 0.38);
    j.hpL.set(-0.1 + sw, 0.95, 0); j.hpR.set(0.1 + sw, 0.95, 0);
    j.knL.set(-0.12, 0.5, 0.03); j.knR.set(0.13, 0.5, 0.0);
    j.ftL.set(-0.14, 0.02, 0); j.ftR.set(0.15, 0.02, -0.03);
  },
  dance(j, t, f) {
    const b = t * 5.4, sx = Math.sin(b) * 0.09, up = Math.abs(Math.sin(b)) * 0.05;
    j.hip.set(sx, 0.93 + up, 0); j.chest.set(-sx * 0.6, 1.4 + up, 0); j.head.set(-sx * 1.2, 1.7 + up, 0.03);
    j.shL.set(-0.2 - sx * 0.6, 1.44 + up, 0); j.shR.set(0.2 - sx * 0.6, 1.44 + up, 0);
    j.elL.set(-0.4, 1.55 + Math.sin(b * 2) * 0.05, 0.08); j.haL.set(-0.34 + Math.sin(b) * 0.1, 1.82 + Math.sin(b * 2) * 0.1, 0.12);
    j.elR.set(0.4, 1.5 + Math.cos(b * 2) * 0.05, 0.08); j.haR.set(0.36 + Math.sin(b) * 0.1, 1.78 + Math.cos(b * 2) * 0.1, 0.12);
    j.hpL.set(-0.1 + sx, 0.93 + up, 0); j.hpR.set(0.1 + sx, 0.93 + up, 0);
    const lL = Math.max(0, Math.sin(b)) * 0.12, lR = Math.max(0, -Math.sin(b)) * 0.12;
    j.knL.set(-0.14, 0.5 + lL, 0.06 + lL); j.knR.set(0.14, 0.5 + lR, 0.06 + lR);
    j.ftL.set(-0.15, 0.02 + lL, 0); j.ftR.set(0.15, 0.02 + lR, 0);
  },
};

export class NeonFigure {
  constructor({ color = 0xff2d95, pose = 'seated', hat = null, phase = 0, boost = 2.0 } = {}) {
    this.pose = pose; this.phase = phase; this.serve = 0;
    this.group = new THREE.Group();
    const mat = this.mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(boost) });
    this.j = {}; NAMES.forEach(n => this.j[n] = new THREE.Vector3());
    this.segs = SEGS.map(([a, b]) => { const m = new THREE.Mesh(TUBE, mat); this.group.add(m); return { m, a: this.j[a], b: this.j[b] }; });
    this.balls = ['elL', 'elR', 'haL', 'haR', 'knL', 'knR', 'chest', 'hip'].map(n => { const m = new THREE.Mesh(BALL, mat); this.group.add(m); return { m, p: this.j[n] }; });

    const head = this.head = new THREE.Group();
    head.add(new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.015, 6, 28), mat));
    const eye = new THREE.CircleGeometry(0.014, 8);
    const eL = new THREE.Mesh(eye, mat), eR = new THREE.Mesh(eye, mat);
    eL.position.set(-0.036, 0.022, 0.004); eR.position.set(0.036, 0.022, 0.004);
    const smile = new THREE.Mesh(new THREE.RingGeometry(0.042, 0.054, 12, 1, Math.PI * 1.15, Math.PI * 0.7), mat);
    smile.position.z = 0.004;
    head.add(eL, eR, smile);
    const tor = (r, x, y, z, rx = Math.PI / 2) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 24), mat); m.position.set(x, y, z); m.rotation.x = rx; head.add(m); };
    if (hat === 'cowboy') { tor(0.19, 0, 0.1, 0); tor(0.09, 0, 0.17, 0); }
    if (hat === 'bun') tor(0.045, 0, 0.14, -0.04, 0);
    if (hat === 'halo') tor(0.09, 0, 0.19, 0);
    if (hat === 'mohawk') for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(TUBE, mat); m.scale.y = 0.09; m.position.set(0, 0.14, -0.08 + i * 0.04); m.rotation.x = -0.5 + i * 0.25; head.add(m);
    }
    if (hat === 'bow') {
      const c = new THREE.ConeGeometry(0.035, 0.07, 3);
      [-1, 1].forEach(s => { const m = new THREE.Mesh(c, mat); m.position.set(s * 0.035, -0.16, 0.02); m.rotation.z = s * Math.PI / 2; head.add(m); });
    }
    this.group.add(head);
    this.prop = null;
    this.update(0, 0);
  }

  hold(obj) { this.prop = obj; this.group.add(obj); }

  update(t, dt) {
    const j = this.j;
    POSES[this.pose](j, t + this.phase, this);
    j.neck.copy(j.head); j.neck.y -= 0.12;
    j.toL.copy(j.ftL); j.toL.z += 0.13; j.toR.copy(j.ftR); j.toR.z += 0.13;
    for (const s of this.segs) {
      _d.subVectors(s.b, s.a);
      const len = _d.length() || 0.001;
      s.m.position.copy(s.a).addScaledVector(_d, 0.5);
      s.m.quaternion.setFromUnitVectors(UP, _d.divideScalar(len));
      s.m.scale.y = len;
    }
    for (const b of this.balls) b.m.position.copy(b.p);
    this.head.position.copy(j.head);
    this.head.rotation.z = (j.head.x - j.chest.x) * -1.5;
    if (this.prop) this.prop.position.set(j.haR.x, j.haR.y - 0.05, j.haR.z + 0.03);
  }
}
