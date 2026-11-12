// The Smash Range: everything behind the counter that can be broken, rung,
// popped or knocked flying. Each target is built from primitives at load.
import * as THREE from 'three';
import * as TX from './textures.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const SPH = new THREE.SphereGeometry(1, 18, 12), CYL = new THREE.CylinderGeometry(1, 1, 1, 18), CONE = new THREE.ConeGeometry(1, 1, 18), BOX = new THREE.BoxGeometry(1, 1, 1);
const mats = {};
const S = (c, r = 0.6, m = 0, extra) => mats[c + '_' + r + '_' + m] ??= new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, envMapIntensity: 0.8, ...extra });
function P(g, geo, mat, x, y, z, sx = 1, sy = sx, sz = sx) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; g.add(m); return m;
}
const BLACK = S(0x111111, 0.3);
const lathe = pts => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 20);
const MILK = lathe([[0, 0], [.055, 0], [.06, .02], [.06, .16], [.03, .24], [.028, .3], [.034, .31], [.034, .32]]);
const VASE = lathe([[0, 0], [.07, 0], [.12, .12], [.13, .22], [.07, .36], [.05, .42], [.08, .48]]);
const TROPHY = lathe([[0, 0], [.1, 0], [.1, .03], [.03, .06], [.03, .18], [.13, .3], [.15, .46], [.13, .46], [.11, .32], [0, .2]]);
const LBASE = new THREE.CylinderGeometry(.045, .08, .1, 16), LCAP = lathe([[.05, 0], [.066, .1], [.05, .28], [.025, .34], [0, .34]]);
const GOLD = new THREE.MeshStandardMaterial({ color: 0xd9a520, roughness: 0.22, metalness: 1, envMapIntensity: 2.2, side: THREE.DoubleSide });
let tex = null;

// Builders return { g, r, cy } with the origin at the base, facing local +Z.
const BUILD = {
  bottle(o) {
    const g = new THREE.Group();
    P(g, MILK, new THREE.MeshStandardMaterial({ color: o.color ?? 0xe8f0f2, transparent: true, opacity: 0.86, roughness: 0.06, envMapIntensity: 3, side: THREE.DoubleSide }), 0, 0, 0);
    return { g, r: 0.14, cy: 0.16 };
  },
  vase(o) {
    const g = new THREE.Group();
    P(g, VASE, S(o.color ?? 0x2f6fb5, 0.22, 0, { side: THREE.DoubleSide }), 0, 0, 0);
    return { g, r: 0.22, cy: 0.24 };
  },
  gnome() {
    const g = new THREE.Group();
    P(g, CYL, S(0x2a5bd7), 0, .1, 0, .1, .2, .1); P(g, CYL, BLACK, 0, .1, 0, .104, .03, .104);
    P(g, SPH, S(0xf2c29b), 0, .27, 0, .085);
    const beard = P(g, CONE, S(0xf5f5f0, 0.9), 0, .19, .055, .075, .16, .06); beard.rotation.x = Math.PI;
    P(g, CONE, S(0xd61f2c), 0, .46, 0, .1, .28, .1);
    P(g, SPH, S(0xe89a80), 0, .27, .085, .022);
    P(g, SPH, BLACK, -.03, .295, .075, .011); P(g, SPH, BLACK, .03, .295, .075, .011);
    return { g, r: 0.2, cy: 0.3 };
  },
  duck(o) {
    const g = new THREE.Group(), y = o.gold ? GOLD : S(0xffd400, 0.3), or = S(0xff7a00, 0.4);
    P(g, SPH, y, 0, .11, 0, .12, .11, .16); P(g, SPH, y, 0, .25, .08, .078);
    const bk = P(g, CONE, or, 0, .24, .17, .032, .08, .02); bk.rotation.x = Math.PI / 2;
    const tl = P(g, CONE, y, 0, .17, -.15, .05, .1, .05); tl.rotation.x = -0.9;
    P(g, SPH, BLACK, -.04, .28, .13, .013); P(g, SPH, BLACK, .04, .28, .13, .013);
    return { g, r: 0.2, cy: 0.16 };
  },
  piggy() {
    const g = new THREE.Group(), p = S(0xff8fb0, 0.25), d = S(0xe86a92, 0.3);
    P(g, SPH, p, 0, .2, 0, .17, .15, .22);
    const sn = P(g, CYL, d, 0, .2, .22, .05, .05, .05); sn.rotation.x = Math.PI / 2;
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([a, b]) => P(g, CYL, d, a * .09, .04, b * .12, .035, .08, .035));
    P(g, CONE, d, -.08, .34, .12, .035, .07, .035); P(g, CONE, d, .08, .34, .12, .035, .07, .035);
    P(g, SPH, BLACK, -.06, .26, .19, .014); P(g, SPH, BLACK, .06, .26, .19, .014);
    P(g, BOX, BLACK, 0, .35, 0, .012, .01, .09);
    return { g, r: 0.24, cy: 0.2 };
  },
  tv() {
    const g = new THREE.Group();
    P(g, BOX, S(0x4a3524, 0.5), 0, .26, 0, .64, .52, .5);
    P(g, BOX, S(0x15120f, 0.4), -.06, .27, .252, .48, .38, .02);
    const screen = new THREE.MeshBasicMaterial({ map: tex.tv }); screen.color.setScalar(1.7);
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(.42, .32), screen); sm.position.set(-.06, .27, .264); g.add(sm);
    const k1 = P(g, CYL, S(0xbfc5cc, 0.2, 1), .24, .36, .26, .03, .03, .03); k1.rotation.x = Math.PI / 2;
    const k2 = P(g, CYL, S(0xbfc5cc, 0.2, 1), .24, .24, .26, .03, .03, .03); k2.rotation.x = Math.PI / 2;
    const a1 = P(g, CYL, S(0xbfc5cc, 0.2, 1), -.12, .74, 0, .006, .5, .006); a1.rotation.z = 0.45;
    const a2 = P(g, CYL, S(0xbfc5cc, 0.2, 1), .12, .74, 0, .006, .5, .006); a2.rotation.z = -0.45;
    return { g, r: 0.4, cy: 0.27, screen };
  },
  melon() {
    const g = new THREE.Group();
    P(g, SPH, tex.melonMat, 0, .2, 0, .2, .2, .27);
    return { g, r: 0.26, cy: 0.2 };
  },
  balloon(o) {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.12, envMapIntensity: 2, transparent: true, opacity: 0.93 });
    P(g, SPH, m, 0, 0, 0, .21, .26, .21); P(g, CONE, m, 0, -.27, 0, .03, .05, .03);
    P(g, CYL, S(0xdddddd), 0, -.9, 0, .003, 1.2, .003).castShadow = false;
    return { g, r: 0.26, cy: 0 };
  },
  pan(o) {
    const g = new THREE.Group(), piv = new THREE.Group(); g.add(piv);
    const iron = S(0x24262a, 0.35, 0.9);
    P(piv, CYL, S(0x8a8f96, 0.3, 1), 0, -o.L / 2, 0, .008, o.L, .008);
    P(piv, BOX, iron, 0, -o.L - .14, 0, .04, .28, .02);
    const d = P(piv, CYL, iron, 0, -o.L - .5, 0, .25, .035, .25); d.rotation.x = Math.PI / 2;
    return { g, r: 0.28, cy: 0, piv, center: d, L: o.L + 0.5 };
  },
  pinata(o) {
    const g = new THREE.Group(), piv = new THREE.Group(); g.add(piv);
    P(piv, CYL, S(0xdddddd), 0, -o.L / 2, 0, .005, o.L, .005);
    const body = new THREE.Group(); body.position.y = -o.L - .2; piv.add(body);
    const m = tex.pinataMat;
    P(body, BOX, m, 0, 0, 0, .26, .3, .56); P(body, BOX, m, 0, .2, .32, .18, .22, .2); P(body, BOX, m, 0, .12, .46, .12, .12, .14);
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([a, b]) => P(body, BOX, m, a * .08, -.27, b * .2, .08, .26, .08));
    P(body, CONE, m, -.06, .38, .3, .03, .14, .03); P(body, CONE, m, .06, .38, .3, .03, .14, .03);
    return { g, r: 0.4, cy: 0, piv, center: body, L: o.L + 0.2 };
  },
  disco() {
    const g = new THREE.Group();
    const b = P(g, new THREE.IcosahedronGeometry(0.5, 2), new THREE.MeshStandardMaterial({ color: 0xe8ecf5, metalness: 1, roughness: 0.06, flatShading: true, envMapIntensity: 4 }), 0, 0, 0);
    P(g, CYL, BLACK, 0, 1.85, 0, .012, 2.7, .012);
    return { g, r: 0.52, cy: 0, spinner: b };
  },
  teddy() {
    const g = new THREE.Group(), b = S(0x9a6a3a, 1), l = S(0xd9b58a, 1);
    P(g, SPH, b, 0, .16, 0, .13, .15, .11); P(g, SPH, b, 0, .37, 0, .1);
    P(g, SPH, b, -.08, .46, 0, .04); P(g, SPH, b, .08, .46, 0, .04);
    P(g, SPH, l, 0, .35, .08, .045); P(g, SPH, BLACK, 0, .365, .12, .014);
    P(g, SPH, BLACK, -.035, .4, .085, .012); P(g, SPH, BLACK, .035, .4, .085, .012);
    P(g, SPH, b, -.15, .2, .03, .05, .09, .05); P(g, SPH, b, .15, .2, .03, .05, .09, .05);
    P(g, SPH, b, -.08, .05, .1, .06); P(g, SPH, b, .08, .05, .1, .06);
    P(g, SPH, S(0xd61f2c, 0.5), 0, .27, .09, .03, .02, .02);
    return { g, r: 0.26, cy: 0.25 };
  },
  bullseye(o) {
    const g = new THREE.Group(), h = o.h ?? 1.6;
    P(g, BOX, S(0x2a2f33, 0.5, 0.5), 0, h / 2, -.08, .08, h, .08); P(g, BOX, S(0x2a2f33, 0.5, 0.5), 0, .03, -.08, .7, .06, .7);
    const holder = new THREE.Group(); holder.position.y = h; holder.rotation.x = Math.PI / 2; g.add(holder);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(.7, .7, .06, 40), [S(0x111111), tex.bullMat, S(0x333333)]);
    disc.castShadow = true; holder.add(disc);
    return { g, r: 0.72, cy: h, disc };
  },
  can(o) {
    const g = new THREE.Group();
    P(g, CYL, S(0xc8ccd0, 0.3, 1), 0, .085, 0, .055, .17, .055); P(g, CYL, S(o.color, 0.5), 0, .085, 0, .0565, .1, .0565);
    return { g, r: 0.11, cy: 0.085 };
  },
  lava(o) {
    const g = new THREE.Group(), m = S(0x8a8f96, 0.3, 1);
    P(g, LBASE, m, 0, .05, 0); P(g, LCAP, new THREE.MeshBasicMaterial({ color: new THREE.Color(o.color).multiplyScalar(1.5) }), 0, .1, 0);
    P(g, CONE, m, 0, .47, 0, .028, .07, .028);
    return { g, r: 0.16, cy: 0.26 };
  },
  fishbowl(o) {
    const g = new THREE.Group();
    P(g, SPH, new THREE.MeshStandardMaterial({ color: 0x3aa4e0, transparent: true, opacity: 0.55, roughness: 0.1 }), 0, .15, 0, .15, .125, .15).castShadow = false;
    const fish = new THREE.Group(); fish.position.y = .15; g.add(fish);
    P(fish, SPH, S(0xff7a00, 0.4), .08, 0, 0, .016, .024, .038); P(fish, CONE, S(0xff7a00, 0.4), .08, 0, -.05, .02, .035, .006).rotation.x = Math.PI / 2;
    P(g, SPH, new THREE.MeshStandardMaterial({ color: 0xdfefff, transparent: true, opacity: 0.3, roughness: 0.04, envMapIntensity: 3, depthWrite: false }), 0, .17, 0, .175).castShadow = false;
    return { g, r: 0.2, cy: 0.17, fish };
  },
  cake() {
    const g = new THREE.Group(), w = S(0xfff6ea, 0.8), p = S(0xff9ac0, 0.8);
    P(g, CYL, w, 0, .06, 0, .2, .12, .2); P(g, CYL, p, 0, .17, 0, .15, .1, .15); P(g, CYL, w, 0, .265, 0, .1, .09, .1);
    P(g, SPH, S(0xd61f2c, 0.3), 0, .33, 0, .03);
    for (let i = 0; i < 8; i++) P(g, SPH, p, Math.cos(i * .785) * .19, .125, Math.sin(i * .785) * .19, .025);
    return { g, r: 0.26, cy: 0.17 };
  },
  flamingo() {
    const g = new THREE.Group(), p = S(0xff6fae, 0.4);
    P(g, CYL, S(0x222222, 0.5), 0, .225, 0, .008, .45, .008); P(g, SPH, p, 0, .5, 0, .09, .08, .14);
    P(g, CYL, p, 0, .66, .1, .02, .26, .02).rotation.x = 0.3; P(g, SPH, p, 0, .8, .15, .042);
    P(g, CONE, BLACK, 0, .77, .2, .016, .08, .016).rotation.x = 2.2;
    return { g, r: 0.22, cy: 0.5 };
  },
  plate() {
    const g = new THREE.Group();
    P(g, CYL, S(0xff6a1a, 0.5), 0, 0, 0, .2, .03, .2); P(g, CYL, S(0x222222, 0.5), 0, .01, 0, .12, .03, .12);
    return { g, r: 0.3, cy: 0 };
  },
  popup() {
    const g = new THREE.Group(), card = S(0xb89a70, 0.9);
    P(g, BOX, card, 0, .4, 0, .5, .72, .03); P(g, BOX, card, 0, -.3, 0, .05, .8, .03);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(.44, .62), tex.portraitMat); pic.position.set(0, .4, .017); g.add(pic);
    return { g, r: 0.36, cy: 0.4 };
  },
  trophy() {
    const g = new THREE.Group();
    P(g, TROPHY, GOLD, 0, 0, 0);
    [-1, 1].forEach(s => { const h = P(g, new THREE.TorusGeometry(.06, .012, 6, 16), GOLD, s * .17, .36, 0); });
    return { g, r: 0.26, cy: 0.26 };
  },
  portrait() {
    const g = new THREE.Group();
    P(g, BOX, GOLD, 0, .45, 0, .62, .82, .06);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(.5, .7), tex.portraitMat); pic.position.set(0, .45, .034); g.add(pic);
    P(g, BOX, S(0x3a2413, 0.7), 0, .2, -.12, .04, .5, .04).rotation.x = 0.4;
    return { g, r: 0.42, cy: 0.45 };
  },
  cat() {
    const g = new THREE.Group(), w = S(0xfbfbf6, 0.14, 0, { envMapIntensity: 1.5 }), red = S(0xd61f2c, 0.4);
    P(g, SPH, w, 0, .17, 0, .14, .17, .13); P(g, SPH, w, 0, .42, 0, .12);
    P(g, CONE, w, -.07, .55, 0, .04, .08, .04); P(g, CONE, w, .07, .55, 0, .04, .08, .04);
    P(g, CYL, red, 0, .31, 0, .1, .03, .1); P(g, SPH, GOLD, 0, .2, .12, .05, .05, .02);
    P(g, SPH, BLACK, -.045, .44, .105, .014); P(g, SPH, BLACK, .045, .44, .105, .014); P(g, SPH, red, 0, .4, .118, .012);
    const arm = new THREE.Group(); arm.position.set(.14, .3, .05); g.add(arm);
    P(arm, SPH, w, 0, .09, 0, .04, .1, .04);
    return { g, r: 0.3, cy: 0.3, arm };
  },
  condo(o) {
    const g = new THREE.Group();
    const gm = new THREE.MeshStandardMaterial({ color: o.color, transparent: true, opacity: 0.75, roughness: 0.05, metalness: 0.3, envMapIntensity: 3 });
    P(g, BOX, S(0x2a2f33, 0.5), 0, .02, 0, .5, .04, .5);
    P(g, BOX, gm, 0, .34, 0, .28, .6, .28); P(g, BOX, gm, 0, .72, 0, .2, .16, .2);
    for (let i = 0; i < 5; i++) { const m = P(g, BOX, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe0a0).multiplyScalar(1.6) }), 0, .12 + i * .11, 0, .285, .02, .285); m.castShadow = false; }
    return { g, r: 0.36, cy: 0.4 };
  },
  forsale() {
    const g = new THREE.Group();
    P(g, BOX, S(0xf2f2f2, 0.6), 0, .28, 0, .04, .56, .04); P(g, BOX, S(0xf2f2f2, 0.6), 0, .68, 0, .66, .44, .03);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(.64, .42), tex.forsaleMat); pic.position.set(0, .68, .017); g.add(pic);
    return { g, r: 0.38, cy: 0.62 };
  },
  toilet() {
    const g = new THREE.Group(), w = S(0xf2f4f5, 0.12, 0, { envMapIntensity: 1.5 });
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.2, .12, .38, 20), w); bowl.position.set(0, .19, .08); bowl.castShadow = true; g.add(bowl);
    const seat = P(g, new THREE.TorusGeometry(.17, .035, 8, 24), w, 0, .4, .08); seat.rotation.x = Math.PI / 2;
    P(g, BOX, w, 0, .6, -.2, .44, .4, .17); P(g, BOX, w, 0, .82, -.2, .47, .04, .2);
    P(g, CYL, S(0xbfc5cc, 0.2, 1), .15, .74, -.1, .012, .02, .05);
    return { g, r: 0.42, cy: 0.42 };
  },
};

const TYPES = {
  bottle: { kind: 'glass', pts: 50, label: 'BOTTLE' },
  vase: { kind: 'ceramic', pts: 80, label: 'VASE', debris: [0x2f6fb5, 0xf2f4f5] },
  gnome: { kind: 'ceramic', pts: 100, label: 'GNOME', debris: [0xd61f2c, 0x2a5bd7, 0xf2c29b, 0xf5f5f0] },
  duck: { kind: 'knock', pts: 75, label: 'DUCK', snd: 'squeak' },
  piggy: { kind: 'ceramic', pts: 150, label: 'PIGGY BANK', debris: [0xff8fb0, 0xe86a92], coins: true },
  tv: { kind: 'tv', pts: 200, label: 'TELEVISION', husk: true, respawn: 20 },
  melon: { kind: 'splat', pts: 120, label: 'MELON' },
  balloon: { kind: 'pop', pts: 60, label: 'POP', respawn: 8 },
  pan: { kind: 'ring', pts: 40, label: 'CLANG' },
  pinata: { kind: 'pinata', pts: 300, label: 'PIÑATA', hp: 2, swing: true, respawn: 25 },
  disco: { kind: 'disco', pts: 500, label: 'DISCO BALL', respawn: 30 },
  teddy: { kind: 'knock', pts: 90, label: 'TEDDY', snd: 'thud' },
  bullseye: { kind: 'spin', pts: 100, label: 'BULLSEYE' },
  can: { kind: 'knock', pts: 60, label: 'CAN', snd: 'clank' },
  lava: { kind: 'glass', pts: 110, label: 'LAVA LAMP' },
  fishbowl: { kind: 'glass', pts: 130, label: 'FISHBOWL · FISH IS FINE' },
  cake: { kind: 'splat', pts: 140, label: 'CAKE', debris: [0xfff6ea, 0xff9ac0, 0xfff6ea, 0xd61f2c] },
  flamingo: { kind: 'knock', pts: 90, label: 'FLAMINGO', snd: 'thud' },
  plate: { kind: 'ceramic', pts: 350, label: 'CLAY PIGEON', debris: [0xff6a1a, 0x222222] },
  popup: { kind: 'ceramic', pts: 250, label: 'POP-UP PEMBERTON', debris: [0xb89a70, 0x8a6a40, 0xe6c2a0], respawn: 4 },
  trophy: { kind: 'ceramic', pts: 1000, label: "PEMBERTON'S TROPHY", debris: [0xd9a520, 0xffe08a], coins: true },
  portrait: { kind: 'ceramic', pts: 1000, label: 'THE PORTRAIT', debris: [0xd9a520, 0x5a3a20, 0xe8d8c0] },
  cat: { kind: 'ceramic', pts: 1000, label: 'MR. WHISKERS', hp: 2, debris: [0xffffff, 0xd61f2c, 0xd9a520] },
  condo: { kind: 'glass', pts: 1000, label: 'THE CONDO MODEL', hp: 2 },
  forsale: { kind: 'ceramic', pts: 1000, label: 'FOR SALE SIGN', debris: [0xffffff, 0xd61f2c] },
  toilet: { kind: 'ceramic', pts: 400, label: 'THE THRONE', hp: 2, debris: [0xf2f4f5, 0xdfe4e8], big: true, respawn: 25 },
};

const _v = new THREE.Vector3(), UPV = new THREE.Vector3(0, 0, 0);

class Target {
  constructor(R, type, x, y, z, o = {}) {
    this.R = R; this.type = type; this.T = TYPES[type]; this.o = o;
    const b = this.b = BUILD[type](o);
    this.g = b.g; this.s = o.s ?? 1; this.r = b.r * this.s; this.cy = b.cy * this.s;
    this.home = new THREE.Vector3(x, y, z); this.ry = o.ry ?? -Math.PI / 2;
    this.c = new THREE.Vector3(); this.v = new THREE.Vector3(); this.w = new THREE.Vector3();
    this.deps = []; this.landY = o.landY ?? 0; this.ang = 0; this.angV = 0; this.spinV = 0; this.ph = Math.random() * 6;
    R.scene.add(this.g);
    this.reset(); this.pop = 1;
    if (o.finale || o.skeet) { this.state = 'gone'; this.g.visible = false; }
  }
  reset() {
    this.state = 'alive'; this.hp = this.T.hp ?? 1; this.g.visible = true; this.pop = 0;
    this.g.position.copy(this.home); this.g.rotation.set(0, this.ry, 0); this.ang = 0; this.angV = 0;
    if (this.b.piv) this.b.piv.rotation.x = 0;
    if (this.b.screen) this.b.screen.color.setScalar(1.7);
    this.fragile = false;
    this.center();
  }
  center() {
    if (this.b.center) this.b.center.getWorldPosition(this.c);
    else this.c.copy(this.g.position).y += this.cy;
  }
  hit(p) {
    const T = this.T, R = this.R;
    if (this.state !== 'alive') return this.state === 'husk' ? 'block' : 'none';
    switch (T.kind) {
      case 'ring':
        this.angV += Math.max(2, Math.min(7, p.vel.length() * 0.3));
        R.audio.gong({ f: this.o.f ?? 200, ...R.where(this.c) }); R.score(this, T.pts, T.label);
        R.fx.sparks(p.point, 0xffe0a0, 8, 3);
        return 'block';
      case 'spin': {
        const d = Math.hypot(p.point.y - this.c.y, p.point.z - this.c.z) / this.r;
        const m = d < 0.3 ? 3 : d < 0.62 ? 2 : 1;
        this.spinV += 16 + Math.random() * 10;
        R.audio.ding({ f: 880 * m, ...R.where(this.c) }); R.score(this, T.pts * m, m === 3 ? 'BULLSEYE!' : m === 2 ? 'INNER RING' : 'OUTER RING');
        return 'block';
      }
      case 'knock':
        this.state = 'fall'; this.life = 5;
        this.v.copy(p.vel).multiplyScalar(0.3); this.v.y += 3.2; this.v.x += 1;
        this.w.set(rnd(-9, 9), rnd(-9, 9), rnd(-9, 9));
        R.audio[T.snd](R.where(this.c)); R.score(this, (this.o.pts ?? T.pts) * (this.o.conv !== undefined ? Math.max(0.7, R.tempo || 1) : 1), this.o.label ?? T.label, true);
        if (this.type === 'teddy') R.fx.chunkBurst(this.c, p.vel, 0xf5f5f0, 8, 0.03);
        return 'block';
    }
    this.hp--;
    if (this.hp > 0) {
      if (T.swing) this.angV += 4;
      R.fx.chunkBurst(p.point, p.vel, T.debris ?? [0xff2d95, 0xffe600], 8, 0.04);
      R.audio.ceramic({ ...R.where(this.c), pitch: 0.7 }); R.score(this, Math.round(T.pts * 0.2), 'CRACKED');
      return 'block';
    }
    this.destroy(p.vel, 1);
    return T.kind === 'pop' ? 'pass' : 'block';
  }
  destroy(vel, mult = 1, label) {
    const T = this.T, R = this.R, fx = R.fx, c = this.c, w = R.where(c);
    this.state = T.husk ? 'husk' : 'dead'; this.g.visible = !!T.husk;
    this.timer = (T.respawn ?? 13) + Math.random() * 5;
    if (this.o.finale || this.o.skeet) { this.state = 'gone'; this.g.visible = false; }
    switch (T.kind) {
      case 'glass': fx.glassBurst(c, vel, this.o.color ?? 0xe8f0f2, 26, 0.055); R.audio.smash(w); if (this.type === 'lava' || this.type === 'fishbowl') fx.sparks(c, this.o.color, 30, 5); break;
      case 'ceramic':
        fx.chunkBurst(c, vel, T.debris, T.big ? 46 : 22, T.big ? 0.1 : 0.055); R.audio.ceramic({ ...w, pitch: T.big ? 0.6 : 1 });
        if (T.coins) { fx.sparks(c, [0xffd400, 0xffb300], 26, 5); R.audio.coins(w); }
        if (T.big) fx.sparks(c, 0x7fd0ff, 40, 6);
        break;
      case 'splat': fx.chunkBurst(c, vel, T.debris ?? [0xe8243a, 0xff5a6a, 0xe8243a, 0x1f6b2a, 0x111111], 40, 0.06); R.audio.splat(w); break;
      case 'pop': fx.confetti(c, 22, [this.o.color, 0xffffff]); R.audio.pop(w); break;
      case 'tv': this.b.screen.color.setScalar(0.02); fx.glassBurst(c, vel, 0x90a0a8, 16, 0.045); fx.sparks(c, [0xfff0a0, 0x80d0ff], 40, 7); R.audio.zap(w); R.audio.smash({ ...w, pitch: 0.8 }); break;
      case 'disco': fx.glassBurst(c, vel, [0xffffff, 0xcfe0ff, 0xffd0f0], 110, 0.07); fx.sparks(c, [0xffffff, 0xff2d95, 0x00e5ff], 70, 9); R.audio.smash({ ...w, size: 2 }); R.audio.ding({ f: 1760, ...w }); break;
      case 'pinata': fx.confetti(c, 110); fx.chunkBurst(c, vel, [0xff2d95, 0xffe600, 0x00c2ff, 0x7cff3a, 0xff7a00], 36, 0.045); R.audio.pop(w); R.audio.coins(w); break;
    }
    if (mult) R.score(this, T.pts * mult, label ?? T.label, true);
    for (const d of this.deps) if (d.state === 'alive') d.fall();
  }
  fall() {
    if (this.T.kind === 'knock') { _v.set(rnd(-1, 1), 0, rnd(-1.5, 1.5)); this.hit({ vel: _v, point: this.c }); return; }
    this.state = 'fall'; this.fragile = true; this.life = 6;
    this.v.set(rnd(-0.5, 0.5), 0.8, rnd(-0.8, 0.8)); this.w.set(rnd(-5, 5), 0, rnd(-5, 5));
  }
  update(dt, t) {
    const g = this.g, o = this.o;
    if (this.state === 'gone') return;
    if (this.state === 'dead' || this.state === 'husk') { this.timer -= dt; if (this.timer <= 0) this.reset(); return; }
    if (this.pop < 1) { this.pop = Math.min(1, this.pop + dt * 2.6); const k = this.pop, e = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2); g.scale.setScalar(this.s * e); }
    if (this.state === 'fall') {
      this.v.y -= 9.8 * dt; g.position.addScaledVector(this.v, dt);
      g.rotation.x += this.w.x * dt; g.rotation.y += this.w.y * dt; g.rotation.z += this.w.z * dt;
      this.life -= dt;
      const floor = this.fragile ? this.landY : 0;
      if (g.position.y < floor && this.v.y < 0) {
        g.position.y = floor;
        if (this.fragile) { this.center(); this.destroy(this.v, 0.5, 'CHAIN'); return; }
        if (this.v.y < -1.5) this.R.audio[this.T.snd === 'squeak' ? 'squeak' : 'thud']({ ...this.R.where(g.position), vol: 0.4 });
        this.v.y *= -0.4; this.v.x *= 0.6; this.v.z *= 0.6; this.w.multiplyScalar(0.5);
      }
      if (this.life <= 0) { this.state = 'dead'; g.visible = false; this.timer = 5 + Math.random() * 4; }
      this.center(); return;
    }
    // alive behaviours
    if (o.skeet) {
      this.v.y -= 6 * dt; g.position.addScaledVector(this.v, dt); g.rotation.y += 14 * dt; g.rotation.z = 0.25; this.center();
      if (g.position.y < 0.1 || Math.abs(g.position.z) > 10.8) { this.state = 'gone'; g.visible = false; }
      return;
    }
    if (this.b.fish) this.b.fish.rotation.y += dt * 1.6;
    if (o.popup !== undefined) { // cardboard landlords bob up from behind the duck board
      const cyc = (t * 0.2 + o.popup * 0.37) % 1, up = cyc < 0.4 ? Math.min(1, Math.sin(cyc / 0.4 * Math.PI) * 2.2) : 0;
      g.position.y = this.home.y + up * 1.05; this.center(); return;
    }
    if (o.conv !== undefined) { g.position.z = -8 + ((o.conv * 2 + this.R.convT * 1.15) % 16); g.position.y = this.home.y + Math.abs(Math.sin(t * 3 + o.conv)) * 0.03; this.center(); }
    else if (this.type === 'balloon') { g.position.y = this.home.y + Math.sin(t * 0.8 + this.ph) * 0.14; g.position.z = this.home.z + Math.sin(t * 0.5 + this.ph * 2) * 0.1; this.center(); }
    else if (this.b.piv) {
      this.angV += (-(9.8 / this.b.L) * Math.sin(this.ang) - 0.35 * this.angV) * dt; this.ang += this.angV * dt;
      this.b.piv.rotation.x = -this.ang; this.center();
    }
    else if (this.b.spinner) this.b.spinner.rotation.y += dt * 0.5;
    else if (this.b.arm) this.b.arm.rotation.x = -0.5 + Math.sin(t * 5) * 0.5;
    else if (this.b.disc) { this.b.disc.rotation.y += this.spinV * dt; this.spinV *= Math.exp(-dt * 0.9); }
  }
}

export class Range {
  constructor(scene, W, fx, audio, camera) {
    this.scene = scene; this.fx = fx; this.audio = audio; this.camera = camera; this.targets = []; this.onScore = null;
    // shared target art
    const [tvc, tvg] = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 48; return [c, c.getContext('2d')]; })();
    this.tvg = tvg; this.tvTex = new THREE.CanvasTexture(tvc); this.tvTex.colorSpace = THREE.SRGBColorSpace; this.tvTex.magFilter = THREE.NearestFilter; this.tvT = 0;
    tex = {
      tv: this.tvTex,
      melonMat: new THREE.MeshStandardMaterial({ map: TX.T(TX.melon(), 2, 1), roughness: 0.35 }),
      pinataMat: new THREE.MeshStandardMaterial({ map: TX.T(TX.stripes()), roughness: 0.9 }),
      bullMat: new THREE.MeshStandardMaterial({ map: TX.T(TX.bullseye()), roughness: 0.6 }),
      portraitMat: new THREE.MeshStandardMaterial({ map: TX.T(TX.portrait()), roughness: 0.7 }),
      forsaleMat: new THREE.MeshStandardMaterial({ map: TX.T(TX.forsale()), roughness: 0.7 }),
    };
    const { B, cyl, flat, M, canvases: C } = W;
    const wood = () => M(C.cDark, 1, 1, { rough: 0.7 }), crate = () => M(C.cTop, 1, 1, { rough: 0.85, color: 0xb89a70 });
    const sh = m => { m.castShadow = true; return m; };
    const add = (type, x, y, z, o) => { const t = new Target(this, type, x, y, z, o); this.targets.push(t); return t; };

    // --- row A (x=17): three tables ---
    [-6, 0, 6].forEach(z => sh(B(0.9, 0.9, 3.2, wood(), 17, 0.45, z, { stat: 1 })));
    const pyramid = (zc, color) => {
      const o = { color, landY: 0.9, s: 1.05 }, dz = 0.3, dy = 0.34;
      const a = [-1, 0, 1].map(i => add('bottle', 17, 0.9, zc + i * dz, o));
      const b = [-0.5, 0.5].map(i => add('bottle', 17, 0.9 + dy, zc + i * dz, o));
      const c = add('bottle', 17, 0.9 + 2 * dy, zc, o);
      a[0].deps.push(b[0]); a[1].deps.push(b[0], b[1]); a[2].deps.push(b[1]); b[0].deps.push(c); b[1].deps.push(c);
    };
    pyramid(-6, 0xe8f0f2); pyramid(6, 0x2f9a55);
    add('vase', 17, 0.9, -7.2, { color: 0x2f6fb5 }); add('vase', 17, 0.9, -4.8, { color: 0xd98a1c });
    add('vase', 17, 0.9, 4.8, { color: 0x8a3fb0 }); add('vase', 17, 0.9, 7.2, { color: 0x2f6fb5 });
    add('gnome', 17, 0.9, -1.2, { s: 1.5 }); add('piggy', 17, 0.9, -0.6, { s: 1.2 }); add('gnome', 17, 0.9, 0, { s: 1.5 });
    add('piggy', 17, 0.9, 0.6, { s: 1.2 }); add('gnome', 17, 0.9, 1.2, { s: 1.5 });

    // --- duck conveyor (x=20.6) ---
    const wm = new THREE.MeshStandardMaterial({ map: TX.T(TX.waves(), 3, 1), roughness: 0.7 });
    sh(B(0.1, 1.56, 16.8, wm, 20.2, 0.78, 0, { stat: 1 })); B(0.7, 1.46, 16.8, flat(0x15171a, { r: 0.6 }), 20.65, 0.73, 0, { stat: 1 });
    for (let i = 0; i < 8; i++) add('duck', 20.6, 1.48, 0, { conv: i, ry: 0, s: 1.25 });

    // --- hanging rails ---
    const pipe = flat(0x60666e, { r: 0.35, m: 1 });
    [[19, 4.3], [22.6, 4.9]].forEach(([x, y]) => { const p = cyl(0.03, 0.03, 16, pipe, x, y, 0, 8); p.rotation.x = Math.PI / 2; [-7.5, 7.5].forEach(z => cyl(0.012, 0.012, 9.2 - y, pipe, x, (9.2 + y) / 2, z, 6)); });
    add('pan', 19, 4.3, -3.4, { L: 1.0, f: 196 }); add('pan', 19, 4.3, 2.8, { L: 1.3, f: 147 }); add('pan', 22.6, 4.9, -0.6, { L: 0.9, f: 262 });
    add('pinata', 22.6, 4.9, 5.4, { L: 1.0, ry: 0 });

    // --- row B (x=24): on a riser so it clears the duck board ---
    const RB = 1.1;
    sh(B(1.9, RB, 20.8, M(C.cConc, 1, 6, { rough: 0.8, color: 0x80858c }), 24, RB / 2, 0, { stat: 1 }));
    const cr = (x, y, z, s = 0.8) => sh(B(s, s, s, crate(), x, y + RB, z, { stat: 1 }));
    add('cake', 24, RB, -9.5, { s: 1.4 });
    cr(24, 0.4, -7.6); add('tv', 24, RB + 0.8, -7.6, {});
    cr(24, 0.4, -5.4); cr(24, 1.2, -5.4); add('tv', 24, RB + 1.6, -5.4, {});
    [-2.6, -0.9, 0.8].forEach((z, i) => { const h = 0.5 + i * 0.2; sh(cyl(0.36, 0.33, h, wood(), 24, RB + h / 2, z)); W.statics.push(new THREE.Box3(new THREE.Vector3(23.65, 0, z - 0.35), new THREE.Vector3(24.35, RB + h, z + 0.35))); add('melon', 24, RB + h, z, { s: 1.15 }); });
    add('toilet', 24, RB, 3.4, { s: 1.15 });
    add('flamingo', 24, RB, 4.6, { s: 1.25 }); add('flamingo', 24, RB, 5.2, { s: 1.0 });
    cr(24, 0.4, 6.2); cr(24, 0.4, 7.0); add('teddy', 24, RB + 0.8, 6.0, { s: 1.4 }); add('gnome', 24, RB + 0.8, 6.9, { s: 1.5 }); add('vase', 24, RB + 0.8, 7.4, { color: 0xd61f2c });
    cr(24, 0.4, 9.2); add('tv', 24, RB + 0.8, 9.2, {});

    // --- between the row A tables: a can stack, a fishbowl and lava lamps ---
    sh(cyl(0.4, 0.36, 0.9, wood(), 17, 0.45, -3)); W.statics.push(new THREE.Box3(new THREE.Vector3(16.6, 0, -3.4), new THREE.Vector3(17.4, 0.9, -2.6)));
    {
      const o = i => ({ landY: 0.9, color: [0xd61f2c, 0x1e7fd6, 0xffd400][i % 3] }), dz = 0.14, dy = 0.175;
      const a = [-1, 0, 1].map(i => add('can', 17, 0.9, -3 + i * dz, o(i + 1)));
      const b = [-0.5, 0.5].map((i, k) => add('can', 17, 0.9 + dy, -3 + i * dz, o(k)));
      const c = add('can', 17, 0.9 + 2 * dy, -3, o(2));
      a[0].deps.push(b[0]); a[1].deps.push(b[0], b[1]); a[2].deps.push(b[1]); b[0].deps.push(c); b[1].deps.push(c);
    }
    sh(B(0.7, 0.9, 1.7, wood(), 17, 0.45, 3, { stat: 1 }));
    add('fishbowl', 17, 0.9, 3, { color: 0x9fd8ff, s: 1.2 }); add('lava', 17, 0.9, 2.4, { color: 0xff2d95, s: 1.2 }); add('lava', 17, 0.9, 3.6, { color: 0x39ff88, s: 1.2 });
    add('duck', 20.6, 1.48, 0, { conv: 0.5, ry: 0, s: 1.25, gold: true, pts: 300, label: 'GOLDEN DUCK' });

    [-6, -2, 2, 6].forEach((z, i) => add('popup', 21.35, 0.72, z, { popup: i, s: 1.15 }));

    // --- skeet: clay pigeons get flung across the range while you're at the counter ---
    [-1, 1].forEach(sd => sh(B(0.7, 0.6, 0.5, flat(0x2a2f33, { r: 0.5, m: 0.5 }), 18.8, 0.3, 10.5 * sd)));
    this.plates = [0, 1, 2].map(() => add('plate', 18.8, -5, 0, { skeet: true, ry: 0 })); this.skeetT = 10; this.active = false;

    // --- balloons and the disco ball ---
    const bc = [0xff2d95, 0xffe600, 0x00c2ff, 0x7cff3a, 0xff7a00, 0xb26bff, 0xff2d2d, 0x00e5c0, 0xffffff];
    bc.forEach((color, i) => add('balloon', 26.5 + (i % 3) * 1.1, 2.6 + ((i * 7) % 5) * 0.75, -8.5 + i * 2.1, { color }));
    add('disco', 28, 6.4, 0, {});

    // --- back row (x=31): shelf wall of plush and pottery ---
    [1.2, 2.05, 2.9].forEach(y => sh(B(0.55, 0.06, 6.4, wood(), 31, y, -5, { stat: 1 })));
    [-8.2, -5, -1.8].forEach(z => B(0.5, 3.0, 0.08, wood(), 31, 1.5, z, { stat: 1 }));
    [-7.4, -5.8, -4.2, -2.6].forEach((z, i) => add(i % 2 ? 'gnome' : 'teddy', 31, 1.23, z, { s: 1.5 }));
    [-7, -5.6, -3.4, -2.4].forEach((z, i) => add(i % 2 ? 'vase' : 'piggy', 31, 2.08, z, { s: 1.25, color: [0x2f6fb5, 0xffb300][i >> 1] }));
    [-7.4, -5, -2.6].forEach(z => add('teddy', 31, 2.93, z, { s: 1.5 }));
    add('bullseye', 32, 0, 3.2, { h: 1.7 }); add('bullseye', 33.5, 0, 7.2, { h: 2.9 }); add('bullseye', 35.5, 0, 0, { h: 4.2 });

    // --- Pemberton's collection: wheeled out at last call ---
    this.W = W; this.finale = []; this.peds = [];
    const red = flat(0x7a0f1c, { r: 0.6 }), gold = flat(0xd9a520, { r: 0.25, m: 1, env: 1.6 });
    ['trophy', 'portrait', 'cat', 'condo', 'forsale'].forEach((type, i) => {
      const z = -3.2 + i * 1.6;
      const p = sh(B(0.6, 1.7, 0.6, red, 22.4, 0.85, z)), cap = B(0.7, 0.06, 0.7, gold, 22.4, 1.73, z);
      p.visible = cap.visible = false; this.peds.push(p, cap);
      this.finale.push(add(type, 22.4, 1.76, z, { finale: true, s: 1.3, color: 0x7fc8ff }));
    });
  }

  startFinale() {
    this.peds.forEach((p, i) => { p.visible = true; if (i % 2 === 0) this.W.statics.push(new THREE.Box3().setFromObject(p)); });
    this.finale.forEach(t => t.reset());
  }
  pull() {
    const side = Math.random() < 0.5 ? -1 : 1, n = Math.random() < 0.35 ? 2 : 1; let k = 0;
    for (const p of this.plates) {
      if (p.state !== 'gone' || k >= n) continue;
      p.reset(); p.pop = 1; p.g.scale.setScalar(p.s);
      p.g.position.set(18.8 + k * 1.6, 0.9, -10.2 * side); p.v.set(1 + Math.random() * 3, 9 + Math.random() * 1.5, side * (6.5 + Math.random() * 2)); p.center(); k++;
    }
    if (k) { this.audio.pull(); this.fx.popup(this.plates[0].c, 'PULL!', k > 1 ? 'DOUBLE' : '', 'call'); }
  }
  near(point, r, except) {
    return this.targets.filter(t => t !== except && t.state === 'alive' && t.c.distanceTo(point) < r + t.r);
  }

  where(pos) {
    _v.copy(pos).applyMatrix4(this.camera.matrixWorldInverse);
    const d = _v.length();
    return { pan: Math.max(-1, Math.min(1, _v.x / (Math.abs(_v.z) + 2))), vol: Math.max(0.35, Math.min(1, 1.3 - d / 45)) };
  }
  score(t, pts, label, killed = false) {
    const dist = Math.max(0, t.c.x - 14);
    this.onScore?.(pts * (1 + dist / 22), label, t.c, t, killed);
  }
  // nearest target crossed by the segment p0→p1 (radius pr)
  sweep(p0, p1, pr) {
    let best = null, bt = 2;
    const dx = p1.x - p0.x, dy = p1.y - p0.y, dz = p1.z - p0.z, dd = dx * dx + dy * dy + dz * dz || 1e-6;
    for (const t of this.targets) {
      if (t.state === 'dead' || t.state === 'fall' || t.state === 'gone') continue;
      const c = t.c, R = t.r + pr;
      let k = ((c.x - p0.x) * dx + (c.y - p0.y) * dy + (c.z - p0.z) * dz) / dd; k = Math.max(0, Math.min(1, k));
      const qx = p0.x + dx * k - c.x, qy = p0.y + dy * k - c.y, qz = p0.z + dz * k - c.z;
      if (qx * qx + qy * qy + qz * qz < R * R && k < bt) { bt = k; best = t; }
    }
    return best ? { target: best, k: bt } : null;
  }
  update(dt, t) {
    this.convT = (this.convT || 0) + dt * (this.tempo || 1);
    for (const x of this.targets) x.update(dt, t);
    if (this.active) { this.skeetT -= dt; if (this.skeetT <= 0) { this.skeetT = 12 + Math.random() * 9; this.pull(); } }
    this.tvT -= dt;
    if (this.tvT <= 0) {
      this.tvT = 0.07; const g = this.tvg;
      for (let y = 0; y < 48; y += 2) for (let x = 0; x < 64; x += 2) { const v = Math.random() * 255 | 0; g.fillStyle = `rgb(${v},${v},${v + 20})`; g.fillRect(x, y, 2, 2); }
      const cols = ['#fff', '#ff0', '#0ff', '#0f0', '#f0f', '#f00', '#00f']; const off = Math.floor(t * 0.4) % 2;
      if (off) cols.forEach((c, i) => { g.fillStyle = c; g.globalAlpha = 0.75; g.fillRect(i * 9.2, 0, 9.2, 48); g.globalAlpha = 1; });
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, (t * 30) % 48, 64, 3);
      this.tvTex.needsUpdate = true;
    }
  }
}
