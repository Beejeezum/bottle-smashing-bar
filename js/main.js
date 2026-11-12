import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { loadFonts } from './textures.js';
import { buildWorld } from './world.js';
import { Range } from './targets.js';
import { FX, DrunkShader } from './fx.js';
import { AudioSys } from './audio.js';
import { DRINKS, makeVessel } from './drinks.js';

const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pick = a => a[Math.floor(Math.random() * a.length)];

await loadFonts();

// ---------- renderer ----------
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.FogExp2(0x08060a, 0.014);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 140);
camera.rotation.order = 'YXZ';
scene.add(camera);

// A tiny hand-built environment: black room, a few neon panels. Gives glass
// and polished wood coloured reflections without flooding the bar with light.
(() => {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x020203);
  const add = (c, i, x, y, z, w, h) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  add(0xff2d95, 7, -6, 2, -3, 3, 1.2); add(0x00e5ff, 7, 6, 2.5, 2, 3, 1); add(0xffb060, 9, 0, 5, 0, 2.5, 2.5);
  add(0xffffff, 3, 2, 1, 6, 4, 0.6); add(0x9dff00, 4, -3, 0.5, 5, 1.5, 0.5); add(0xffb060, 4, 3, 1, -6, 2, 1);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(s, 0.03).texture; pm.dispose();
})();

const audio = new AudioSys();
const W = buildWorld(scene);
const fx = new FX(scene, camera);
const range = new Range(scene, W, fx, audio, camera);

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.7, 1.0);
composer.addPass(bloom);
const drunkPass = new ShaderPass(DrunkShader);
composer.addPass(drunkPass);
composer.addPass(new OutputPass());
composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});

// ---------- state ----------
const P = { pos: new THREE.Vector3(0, 0, 14.6), vel: new THREE.Vector3(), yaw: 0, pitch: 0.06, bob: 0 };
const D = { level: 0, pending: 0 };
const G = { score: 0, smashed: 0, streak: 0, best: 0, tab: 0, thrown: 0 };
const tray = [];            // drinks in hand, [0] is the one you're holding
const shots = [];           // bottles in flight
const keys = {};
let started = false, paused = false, locked = false, menuOpen = false;
let actionDown = false, needRelease = false, mode = 'idle', charge = 0, gulpT = 0, hicT = 8, time = 0;
let curShot = null, seenRange = false, lastLabel = '', handRise = 0, yelled = 0;
const d01 = () => clamp(D.level / 9, 0, 1);

const hand = new THREE.Group(); camera.add(hand);
const handLight = new THREE.PointLight(0xffe0c0, 0.5, 3, 2); handLight.position.set(0.1, 0, -0.1); camera.add(handLight);
const ARC_N = 34;
const arcGeo = new THREE.BufferGeometry(); arcGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARC_N * 3), 3));
const arc = new THREE.Points(arcGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 4, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false }));
arc.frustumCulled = false; arc.visible = false; scene.add(arc);

// ---------- HUD ----------
const el = { score: $('#score-num'), streak: $('#streak'), mult: $('#mult'), smashed: $('#smashed'), tab: $('#tab'), prompt: $('#prompt'), sub: $('#sub'), buzzLabel: $('#buzz-label'), buzzFill: $('#buzz-fill'), tray: $('#tray'), toast: $('#toast'), charge: $('#charge'), menu: $('#menu'), list: $('#menu-list'), hud: $('#hud'), cross: $('#cross') };
let subT = 0, toastT = 0, promptText = '';
function say(who, text, dur = 3.2) { el.sub.innerHTML = `<i>${who}</i> ${text}`; el.sub.classList.add('on'); subT = dur; }
function toast(text, dur = 2.2) { el.toast.textContent = text; el.toast.classList.remove('on'); void el.toast.offsetWidth; el.toast.classList.add('on'); toastT = dur; }
function setPrompt(t) { if (t !== promptText) { promptText = t; el.prompt.innerHTML = t; el.prompt.classList.toggle('on', !!t); } }
function drawTray() {
  el.tray.innerHTML = tray.map((h, i) => `<div class="slot${i ? '' : ' cur'}"><span>${h.drink.name.replace(/ ×5$/, '')}</span><em style="--f:${h.fill}"></em></div>`).join('') || '<div class="slot empty"><span>empty-handed</span></div>';
}
function hudNumbers() {
  el.score.textContent = G.score.toLocaleString();
  el.streak.textContent = G.streak > 1 ? `${G.streak} IN A ROW` : '';
  el.smashed.textContent = G.smashed; el.tab.textContent = '$' + G.tab;
}
const LEVELS = [[0, 'STONE SOBER'], [0.6, 'WARMED UP'], [2, 'BUZZED'], [3.5, 'TIPSY'], [5, 'SLOPPY'], [6.5, 'HAMMERED'], [8, 'ABSOLUTELY COOKED']];

// menu
el.list.innerHTML = DRINKS.map(d => `<li data-id="${d.id}"><kbd>${d.key}</kbd><div><b>${d.name}</b><small>${d.desc}</small></div><span class="pips">${d.strength < 0 ? '<u>sobering</u>' : '●'.repeat(Math.ceil(d.strength * (d.bundle || 1) / (d.bundle ? 2.5 : 1)))}</span><span class="price">${d.price ? '$' + d.price : 'free'}</span></li>`).join('');
el.list.addEventListener('click', e => { const li = e.target.closest('li'); if (li) order(li.dataset.id); });
function openMenu(v) { menuOpen = v; el.menu.classList.toggle('on', v); if (v) audio.tick(660); }

function order(id) {
  const d = DRINKS.find(x => x.id === id); if (!d) return;
  const n = d.bundle || 1;
  if (tray.length + n > 6) { say('BARTENDER', pick(['Finish what you\'re holding first, champ.', 'You have two hands. I counted.', 'That\'s a lot of glass for one person.'])); audio.tick(220); return; }
  W.bartender.serveT = 1.1; audio.pour(); G.tab += d.price;
  const li = el.list.querySelector(`[data-id="${id}"]`); li.classList.remove('hit'); void li.offsetWidth; li.classList.add('hit');
  const k = d01();
  say('BARTENDER', d.strength < 0 ? pick(['Smart. Boring, but smart.', 'Hydration. Bold strategy.'])
    : k < 0.25 ? pick(['Coming right up.', 'Good choice.', 'One of those nights, huh?', 'Range is through there when you\'re done.'])
      : k < 0.6 ? pick(['Pace yourself, slugger.', 'You\'re a natural. Allegedly.', 'The range is still that way. Roughly.'])
        : pick(['I\'m legally required to keep serving you. It\'s a weird bar.', 'You\'re pointing at the menu with your whole body.', 'Sure. Why not. What could go wrong.']));
  setTimeout(() => {
    for (let i = 0; i < n; i++) tray.push({ drink: d, fill: 1, mesh: null });
    if (tray.length === n) equip();
    drawTray(); hudNumbers(); audio.tick(990);
  }, 850);
}

function equip() {
  while (hand.children.length) hand.remove(hand.children[0]);
  const h = tray[0]; if (!h) return;
  h.mesh ??= makeVessel(h.drink, h.fill);
  h.mesh.position.set(0, 0, 0); h.mesh.rotation.set(0, 0, 0); h.mesh.scale.setScalar(1);
  hand.add(h.mesh); handRise = 0;
}

// ---------- input ----------
let noLock = false;
function lock() { try { const p = canvas.requestPointerLock?.(); p?.catch?.(() => { noLock = true; }); } catch (e) { noLock = true; } }
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (!locked && started && !paused && !noLock) { paused = true; $('#pause').classList.add('on'); }
});
document.addEventListener('pointerlockerror', () => { noLock = true; });
$('#start').addEventListener('click', () => {
  audio.init(); started = true; $('#title').classList.remove('on'); el.hud.classList.add('on'); lock(); drawTray(); hudNumbers();
  setTimeout(() => say('', 'Somewhere inside, glass is breaking. It sounds wonderful.', 4), 600);
});
$('#pause').addEventListener('click', () => { paused = false; $('#pause').classList.remove('on'); audio.init(); lock(); });
addEventListener('mousemove', e => {
  if (!started || paused) return;
  if (locked || (e.buttons & 2)) { P.yaw -= e.movementX * 0.0022; P.pitch = clamp(P.pitch - e.movementY * 0.0022, -1.4, 1.4); }
});
canvas.addEventListener('mousedown', e => { if (!started) return; if (e.button === 0) { if (!locked && !noLock) lock(); actionDown = true; } });
addEventListener('mouseup', e => { if (e.button === 0) actionDown = false; });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('keydown', e => {
  if (e.repeat) return;
  keys[e.code] = true;
  if (!started || paused) return;
  if (e.code === 'KeyE') { if (menuOpen) openMenu(false); else if (nearBar()) openMenu(true); }
  if (e.code === 'KeyF' || e.code === 'Space') { actionDown = true; e.preventDefault(); }
  if (menuOpen && /^Digit\d$/.test(e.code)) { const d = DRINKS.find(x => x.key === e.code.slice(5)); if (d) order(d.id); }
});
addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'KeyF' || e.code === 'Space') actionDown = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; actionDown = false; });

const nearBar = () => P.pos.z < -3.1 && P.pos.x < 6.2;
const inRange = () => P.pos.x > 9;

// ---------- throwing ----------
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _o = new THREE.Vector3(), _dir = new THREE.Vector3();
function throwOrigin(out) {
  camera.getWorldDirection(_a); _b.set(1, 0, 0).applyQuaternion(camera.quaternion);
  return out.copy(camera.position).addScaledVector(_a, 0.45).addScaledVector(_b, 0.22).add(_c.set(0, -0.12, 0));
}
function aimDir(out, err) {
  camera.getWorldDirection(out); out.y += 0.09;
  if (err) { out.x += (Math.random() - 0.5) * err; out.y += (Math.random() - 0.5) * err; out.z += (Math.random() - 0.5) * err; }
  return out.normalize();
}
const throwSpeed = c => 9 + 16 * c;

function throwIt() {
  const h = tray.shift(); const d = d01();
  const m = h.mesh; hand.remove(m);
  throwOrigin(_o); aimDir(_dir, d * d * 0.14);
  m.position.copy(_o); m.scale.setScalar(1.5); scene.add(m);
  const sp = throwSpeed(charge) * (1 + (Math.random() - 0.5) * 0.25 * d);
  shots.push({ mesh: m, pos: _o.clone(), vel: _dir.clone().multiplyScalar(sp), spin: new THREE.Vector3(-(8 + Math.random() * 8), Math.random() * 2, Math.random() * 3), hit: false, life: 6, color: h.drink.glass ?? 0xdfefff });
  G.thrown++; audio.whoosh(); mode = 'idle'; charge = 0;
  setTimeout(() => { equip(); drawTray(); }, 280); drawTray();
}

function smashShot(s, point, scored) {
  scene.remove(s.mesh); s.dead = true;
  fx.glassBurst(point, s.vel, s.color, 22, 0.045);
  audio.smash({ ...range.where(point), size: 0.8, pitch: 1.15 });
  drunkPass.uniforms.uHit.value = 1;
  if (!s.hit) { if (G.streak >= 3) toast('STREAK LOST'); G.streak = 0; hudNumbers(); }
}

function updateShots(dt) {
  const SUB = 3, h = dt / SUB;
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    for (let k = 0; k < SUB && !s.dead; k++) {
      _a.copy(s.pos);
      s.vel.y -= 9.8 * h; s.pos.addScaledVector(s.vel, h);
      const p = s.pos;
      const hit = range.sweep(_a, p, 0.1);
      if (hit) {
        _b.lerpVectors(_a, p, hit.k); curShot = s;
        const r = hit.target.hit({ vel: s.vel, point: _b }); curShot = null;
        if (r === 'block') { smashShot(s, _b); break; }
      }
      let wall = p.y < 0.06 || p.y > 9.9 || p.x > 37.9 || p.z < -10.9 || p.z > 10.9;
      if (!wall && p.x < 8.3) {
        const inBar = p.x < 8 && p.z > -7.9 && p.z < 9.9 && p.x > -7.9 && p.y < 3.5;
        const door = p.z > -4 && p.z < 6 && p.y < 3.2;
        wall = !(inBar || door) || (inBar && p.z < -4.7 && p.y < 1.2);
        if (inBar && time - yelled > 6) { yelled = time; say('BARTENDER', pick(['HEY! The range is THAT way!', 'Not in the bar! We just mopped! (We did not.)', 'DOUG. Doug, they\'re doing it again.'])); }
      }
      if (!wall) for (const b of W.statics) if (b.distanceToPoint(p) < 0.08) { wall = true; break; }
      if (wall) { p.y = Math.max(p.y, 0.05); smashShot(s, p); }
    }
    if (!s.dead) {
      s.mesh.position.copy(s.pos);
      s.mesh.rotation.x += s.spin.x * dt; s.mesh.rotation.y += s.spin.y * dt; s.mesh.rotation.z += s.spin.z * dt;
      s.life -= dt; if (s.life <= 0) { scene.remove(s.mesh); s.dead = true; }
    }
    if (s.dead) shots.splice(i, 1);
  }
}

range.onScore = (pts, label, pos) => {
  const s = curShot;
  if (s && !s.hit) { s.hit = true; G.streak++; G.best = Math.max(G.best, G.streak); if ([3, 5, 8, 12].includes(G.streak)) toast(`${G.streak} IN A ROW!`); }
  const mult = (1 + D.level * 0.3) * (1 + 0.1 * Math.min(G.streak, 10));
  const n = Math.max(5, Math.round(pts * mult / 5) * 5);
  G.score += n; G.smashed++;
  fx.popup(pos, '+' + n, label, n >= 600 ? 'big' : '');
  drunkPass.uniforms.uHit.value = 1.5;
  hudNumbers();
};

// ---------- per-frame ----------
function updatePlayer(dt) {
  const d = d01();
  const turn = (keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0), look = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);
  P.yaw += turn * 1.9 * dt; P.pitch = clamp(P.pitch + look * 1.3 * dt, -1.4, 1.4);
  let ix = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), iz = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  if (menuOpen) { if (ix || iz) openMenu(false); }
  const moving = ix || iz;
  if (moving) { const l = Math.hypot(ix, iz); ix /= l; iz /= l; ix += Math.sin(time * 0.73) * d * 0.55 + Math.sin(time * 1.9) * d * 0.25; }
  const sp = keys.ShiftLeft ? 6.2 : 4.3;
  const fxx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  const wx = (rx * ix + fxx * iz) * sp, wz = (rz * ix + fz * iz) * sp;
  const k = 1 - Math.exp(-dt * 12 / (1 + d * 4));
  P.vel.x += (wx - P.vel.x) * k; P.vel.z += (wz - P.vel.z) * k;
  P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt;
  const R = 0.36;
  for (let pass = 0; pass < 2; pass++) for (const c of W.colliders) {
    const cx = clamp(P.pos.x, c.x0, c.x1), cz = clamp(P.pos.z, c.z0, c.z1);
    let dx = P.pos.x - cx, dz = P.pos.z - cz; const dd = dx * dx + dz * dz;
    if (dd >= R * R) continue;
    if (dd < 1e-8) { // inside the box: push out along the shallowest side
      const l = P.pos.x - c.x0, r = c.x1 - P.pos.x, n = P.pos.z - c.z0, f = c.z1 - P.pos.z, m = Math.min(l, r, n, f);
      if (m === l) P.pos.x = c.x0 - R; else if (m === r) P.pos.x = c.x1 + R; else if (m === n) P.pos.z = c.z0 - R; else P.pos.z = c.z1 + R;
    } else { const dist = Math.sqrt(dd); P.pos.x = cx + dx / dist * R; P.pos.z = cz + dz / dist * R; }
  }
  const speed = Math.hypot(P.vel.x, P.vel.z);
  P.bob += speed * dt * 1.9;
  const A = Math.pow(d, 1.4) * 0.11;
  const sy = (Math.sin(time * 0.83) * 0.6 + Math.sin(time * 1.9 + 1.3) * 0.4) * A;
  const spt = (Math.sin(time * 1.07 + 2) * 0.6 + Math.sin(time * 2.3) * 0.4) * A * 0.7;
  camera.position.set(P.pos.x, 1.66 + Math.sin(P.bob * 2) * 0.035 * Math.min(1, speed / 4) + Math.sin(time * 0.9) * 0.03 * d, P.pos.z);
  camera.rotation.set(P.pitch + spt + fx.kick * 0.006 * Math.sin(time * 70), P.yaw + sy, Math.sin(time * 0.61) * A * 0.9 - (ix * 0.012 * Math.min(1, speed / 4)));
  const fov = 72 + Math.sin(time * 0.5) * 4 * d + (keys.ShiftLeft && moving ? 3 : 0);
  if (Math.abs(fov - camera.fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 6); camera.updateProjectionMatrix(); }
  camera.updateMatrixWorld();
}

const hp = new THREE.Vector3(), hr = new THREE.Vector3();
function updateAction(dt) {
  const h = tray[0], d = d01();
  if (!actionDown) needRelease = false;
  if (!h) mode = 'idle';
  else if (h.fill > 0) {
    if (actionDown && !menuOpen && !needRelease) {
      mode = 'drink';
      const df = Math.min(h.fill, dt / h.drink.time);
      h.fill -= df; D.pending += h.drink.strength * df; h.mesh?.userData.setFill(h.fill);
      gulpT -= dt; if (gulpT <= 0) { audio.gulp(); gulpT = 0.32; }
      if (h.fill <= 0.0001) {
        h.fill = 0; h.mesh?.userData.setFill(0); needRelease = true; mode = 'idle'; drawTray();
        if (Math.random() < 0.3 + d * 0.4) setTimeout(() => audio.burp(), 500);
        if (!inRange() && G.thrown === 0) say('', 'Empty. The Smash Range is through the big opening on the right.', 4);
      } else el.tray.querySelector('.cur em')?.style.setProperty('--f', h.fill);
    } else mode = 'idle';
  } else if (inRange()) {
    if (actionDown && !needRelease) { mode = 'charge'; charge = Math.min(1, charge + dt / 0.85); }
    else if (mode === 'charge') throwIt();
  } else mode = 'idle';

  // view-model pose
  handRise = Math.min(1, handRise + dt * 4);
  const speed = Math.hypot(P.vel.x, P.vel.z);
  if (mode === 'drink') { hp.set(0.06, -0.13, -0.3); hr.set(0.55 + (1 - (h?.fill ?? 0)) * 0.95, 0, 0.12); }
  else if (mode === 'charge') { hp.set(0.34, -0.1 + charge * 0.16, -0.36 + charge * 0.16); hr.set(-0.3 - charge * 1.1, 0, -0.2); }
  else { hp.set(0.27, -0.27 + Math.sin(P.bob * 2) * 0.012 * Math.min(1, speed / 4), -0.5); hr.set(0, 0, 0); }
  hp.x += Math.sin(time * 1.3) * 0.02 * d; hp.y += Math.cos(time * 1.7) * 0.015 * d - (1 - handRise) * 0.4;
  if (mode === 'charge') { hp.x += (Math.random() - 0.5) * 0.004 * charge; }
  const k = 1 - Math.exp(-dt * 13);
  hand.position.lerp(hp, k);
  hand.rotation.x += (hr.x - hand.rotation.x) * k; hand.rotation.z += (hr.z - hand.rotation.z) * k;

  // aim arc: generous when sober, fades out as you get drunk
  const show = mode === 'charge' ? clamp(1 - d * 1.7, 0, 1) : 0;
  arc.visible = show > 0.02;
  if (arc.visible) {
    throwOrigin(_o); aimDir(_dir, 0).multiplyScalar(throwSpeed(charge));
    const pa = arcGeo.attributes.position; let x = _o.x + _dir.x * 0.06, z = _o.z + _dir.z * 0.06, vy = _dir.y - 9.8 * 0.06, y = _o.y + _dir.y * 0.06;
    for (let i = 0; i < ARC_N; i++) { pa.setXYZ(i, x, Math.max(y, 0.02), z); x += _dir.x * 0.045; z += _dir.z * 0.045; vy -= 9.8 * 0.045; y += vy * 0.045; }
    pa.needsUpdate = true; arc.material.opacity = 0.75 * show;
  }
  el.charge.style.strokeDashoffset = 100.5 * (1 - (mode === 'charge' ? charge : 0));
  el.cross.classList.toggle('hot', mode === 'charge');
}

function updateDrunk(dt) {
  const take = D.pending * Math.min(1, dt * 0.22);
  D.pending -= take; D.level = clamp(D.level + take - dt * 0.011, 0, 10);
  const d = d01();
  let label = LEVELS[0][1]; for (const [v, l] of LEVELS) if (D.level >= v) label = l;
  if (label !== lastLabel) { if (lastLabel && LEVELS.findIndex(x => x[1] === label) > LEVELS.findIndex(x => x[1] === lastLabel)) toast(label); lastLabel = label; el.buzzLabel.textContent = label; }
  el.buzzFill.style.width = (D.level * 10) + '%';
  el.mult.textContent = '×' + (1 + D.level * 0.3).toFixed(1);
  el.hud.style.setProperty('--d', d.toFixed(3));
  if (D.level > 3) { hicT -= dt; if (hicT <= 0) { hicT = 5 + Math.random() * 12 - d * 3; audio.hiccup(); P.pitch += 0.035; fx.kick = 0.4; } }
  drunkPass.uniforms.uDrunk.value = d; drunkPass.uniforms.uTime.value = time;
  drunkPass.uniforms.uHit.value = Math.max(0, drunkPass.uniforms.uHit.value - dt * 5);
  bloom.strength = 0.6 + d * 0.5;
}

function updateHints(dt) {
  const h = tray[0];
  let p = '';
  if (menuOpen) p = '';
  else if (nearBar()) p = '<kbd>E</kbd> order a drink';
  else if (h && h.fill > 0) p = '<kbd>hold click</kbd> drink';
  else if (h && inRange()) p = mode === 'charge' ? 'release to throw' : '<kbd>hold click</kbd> wind up · release to throw';
  else if (h) p = 'take your empty to the <b>Smash Range</b> →';
  else if (P.pos.z > 10.3) p = '<kbd>W A S D</kbd> walk in';
  else p = inRange() ? 'out of ammo — back to the bar' : 'belly up to the bar';
  setPrompt(p);
  if (menuOpen && !nearBar()) openMenu(false);
  if (!seenRange && inRange()) { seenRange = true; toast('THE SMASH RANGE', 3); say('', 'Finish a drink. Hurl the empty. Everything back there is fair game.', 5); }
  if (subT > 0) { subT -= dt; if (subT <= 0) el.sub.classList.remove('on'); }
  // the bartender drifts along the bar to wherever you're standing
  const b = W.bartender; b.serveT = Math.max(0, (b.serveT ?? 0) - dt);
  b.serve += ((b.serveT > 0 ? 1 : 0) - b.serve) * Math.min(1, dt * 8);
  if (P.pos.z < 1) b.group.position.x += (clamp(P.pos.x, -7, 3.4) - b.group.position.x) * Math.min(1, dt * 1.6);
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  time += dt;
  W.update(time, dt);
  if (started && !paused) {
    updatePlayer(dt); updateAction(dt); updateShots(dt); updateDrunk(dt); updateHints(dt);
    audio.setMix(d01(), smooth(7, 11, P.pos.x), smooth(9.6, 11.5, P.pos.z));
  } else if (!started) {
    camera.position.set(Math.sin(time * 0.2) * 0.6, 1.66, 15.2); camera.rotation.set(0.1, Math.sin(time * 0.15) * 0.04, 0);
  }
  range.update(dt, time); fx.update(dt);
  composer.render();
}
requestAnimationFrame(frame);
$('#loading')?.remove(); $('#start').disabled = false;

// handy for poking at the game from the console
window.game = { P, D, G, tray, order, W, range, audio, shots, get mode() { return mode; },
  tp(x, z, yaw = P.yaw, pitch = P.pitch) { P.pos.set(x, 0, z); P.yaw = yaw; P.pitch = pitch; },
  press(v) { actionDown = v; }, };
