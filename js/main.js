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
import { DRINKS, VESSELS, makeVessel } from './drinks.js';
import { NeonFigure } from './people.js';
import { Story, CAST, DOUG } from './story.js';

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
const U = drunkPass.uniforms;

// ---------- state ----------
const P = { pos: new THREE.Vector3(0, 0, 14.6), vel: new THREE.Vector3(), yaw: 0, pitch: 0.06, bob: 0, lvx: 0, lvy: 0 };
const D = { level: 0, pending: 0 };
const G = { score: 0, smashed: 0, streak: 0, best: 0, tab: 0, thrown: 0, hits: 0, doug: 0, wasted: 0 };
const tray = [];            // drinks in hand, [0] is the one you're holding
const shots = [];           // bottles in flight
const keys = {};
let started = false, paused = false, locked = false, menuOpen = false;
let actionDown = false, needRelease = false, mode = 'idle', charge = 0, gulpT = 0, hicT = 8, time = 0;
let curShot = null, seenRange = false, lastLabel = '', handRise = 0, yelled = 0, sipTilt = 0, stepI = 0;
let blinkT = 6, blinkP = 1, blinkDur = 0.3, lurchT = 5, dougTalk = 0, slow = 0, blackT = 0, blackouts = 0;
let nightFade = false, woozy = 1, hic = 0, slowFor = 0, saveT = 5;
let happyT = 0, happyNext = 140, altDown = false, lob = false;
let bladder = 0, peeT = 0, pees = 0, sawMirror = false, sens = 1;
const nearJuke = () => Math.hypot(P.pos.x + 6.9, P.pos.z + 1.5) < 1.5;
const nearToilet = () => Math.hypot(P.pos.x - W.restroom.toilet.x, P.pos.z - W.restroom.toilet.z) < 1.1;
const store = { get(k) { try { return +localStorage.getItem(k) || 0; } catch (e) { return 0; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
if (matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches) $('#best').textContent = 'touch controls are new: left thumb walks, right thumb looks';
const best0 = store.get('bsb-best'); if (best0) $('#best').textContent = `your best night: ${best0.toLocaleString()}`;
const d01 = () => clamp(D.level / 9, 0, 1);

// ---------- HUD ----------
const el = { score: $('#score-num'), streak: $('#streak'), mult: $('#mult'), smashed: $('#smashed'), tab: $('#tab'), prompt: $('#prompt'), sub: $('#sub'), buzzLabel: $('#buzz-label'), buzzFill: $('#buzz-fill'), tray: $('#tray'), toast: $('#toast'), charge: $('#charge'), menu: $('#menu'), list: $('#menu-list'), hud: $('#hud'), cross: $('#cross'), clock: $('#clock'), jarFill: $('#jar-fill'), jarNum: $('#jar-num'), quests: $('#quests'), lids: $('#lids'), eye: $('#eye'), bladder: $('#bladder'), bladderFill: $('#bladder i') };
let subT = 0, promptText = '', dlg = null;
const sayQ = [];
function say(who, text, dur = 3.2) {
  if (dlg) return;
  const c = CAST[who] ?? CAST[''];
  el.sub.innerHTML = `<i style="color:${c.color}">${c.name}</i> ${text}`; el.sub.classList.add('on'); subT = dur;
}
function toast(text) { el.toast.textContent = text; el.toast.classList.remove('on'); void el.toast.offsetWidth; el.toast.classList.add('on'); }
function setPrompt(t) { if (t !== promptText) { promptText = t; el.prompt.innerHTML = t; el.prompt.classList.toggle('on', !!t); } }
function drawTray() {
  el.tray.innerHTML = tray.slice(0, 6).map((h, i) => `<div class="slot${i ? '' : ' cur'}"><span>${h.drink.name.replace(/ ×5$/, '')}</span><em style="--f:${h.fill}"></em></div>`).join('') + (tray.length > 6 ? `<div class="slot">+${tray.length - 6} more</div>` : '') || '<div class="slot empty"><span>empty-handed</span></div>';
}
function hudNumbers() {
  el.score.textContent = G.score.toLocaleString();
  el.streak.textContent = G.streak > 1 ? `${G.streak} IN A ROW` : '';
  el.smashed.textContent = G.smashed; el.tab.textContent = '$' + G.tab;
}
const LEVELS = [[0, 'STONE SOBER'], [0.6, 'WARMED UP'], [2, 'BUZZED'], [3.5, 'TIPSY'], [5, 'SLOPPY'], [6.5, 'HAMMERED'], [8, 'ABSOLUTELY COOKED']];

// dialogue: a short stack of lines you step through with E
function startDlg(lines, after) {
  if (!lines?.length) { after?.(); return; }
  if (menuOpen) openMenu(false);
  dlg = { lines, i: 0, after, x: P.pos.x, z: P.pos.z }; showDlg();
}
function showDlg() {
  const [who, text] = dlg.lines[dlg.i], c = CAST[who];
  el.sub.innerHTML = `<i style="color:${c.color}">${c.name}</i> ${text} <kbd class="next">E</kbd>`; el.sub.classList.add('on'); subT = 1e9;
  audio.tick(480 + (who.charCodeAt(0) % 7) * 40);
}
function advDlg(cancel) {
  if (!cancel && ++dlg.i < dlg.lines.length) return showDlg();
  const a = dlg.after; dlg = null; subT = 0.01; if (!cancel) a?.();
}

// ---------- story ----------
const story = new Story({
  say, toast, queue: lines => sayQ.push(...lines),
  lastCall() {
    audio.bell(); toast('LAST CALL'); range.startFinale(); headline("LAST CALL: LANDLORD'S 'COLLECTION' ARRIVES AT RANGE");
    pem.group.visible = true; W.colliders.push({ x0: 10.9, x1: 11.5, z0: 8.2, z1: 8.8 });
    sayQ.push(['sal', "LAST CALL! Jar's full, Pemberton! But, uh... the range is still open."], ['pem', 'I had my collection brought in for the lobby. Nobody TOUCH anything.'], ['doug', "They're on the red pedestals. Just saying."]);
  },
  permit() {
    IN.on = false; IN.watch = false; el.eye.className = ''; partyT = 6; G.score += 8000; hudNumbers(); headline('PERMIT GRANTED. INSPECTOR SEEN DOING A SHOT');
    setTimeout(() => { toast('PERMIT GRANTED'); audio.cheer(1); audio.bell(); }, 700); setTimeout(receipt, 9000);
    walkTo(insp, [[9.5, -5], [6.8, -3.6]], Math.PI);
    sayQ.push(['insp', 'This is the best-run establishment I have ever fined. Permit granted.'], ['sal', "He's on his third lager. I think we're good."], ['', 'That is the story so far. The bar is yours. Break whatever you like.']);
  },
  saved() {
    G.score += 5000; hudNumbers(); partyT = 6; headline("BAR SAVED. LANDLORD 'MOVING INTO PARKING LOTS'");
    setTimeout(() => { toast('THE BAR IS SAVED'); audio.cheer(1); audio.bell(); }, 900);
    setTimeout(receipt, 9000);
    setTimeout(() => { // Pemberton stays, and takes a stool
      pem.pose = 'seated'; pem.group.position.set(-3.6, 0, -4.1); pem.group.rotation.y = Math.PI;
      W.colliders.push({ x0: -3.9, x1: -3.3, z0: -4.75, z1: -3.85 });
    }, 15000);
    sayQ.push(['pem', "Enough! ENOUGH. Keep your wretched bar. I'm going into parking lots."], ['sal', "Bar's staying open, everybody! Next round's on the jar!"], ['', 'After hours now. Everything you break pays double.']);
  },
});
let partyT = 0, shareText = '';
function receipt() {
  const acc = G.thrown ? Math.round(G.hits / G.thrown * 100) : 0, R = $('#receipt');
  const row = (a, b) => '<dt>' + a + '</dt><dd>' + b + '</dd>';
  const badges = [];
  if (G.doug === 0) badges.push('RULE THREE RESPECTED'); else if (G.doug >= 3) badges.push('MENACE TO DOUG');
  if (acc >= 60 && G.thrown >= 10) badges.push('DEADEYE'); if (blackouts >= 2) badges.push('FREQUENT NAPPER');
  if (G.best >= 8) badges.push('ON A HEATER'); if (pees === 0) badges.push('CAMEL'); if (G.wasted >= 3) badges.push('ALCOHOL ABUSER');
  if (toasted.size >= 7) badges.push('EVERYBODY KNOWS YOUR NAME'); if (story.perks.size >= 6) badges.push('REGULAR');
  shareText = 'My night at The Bottle Smashing Bar: ' + G.score.toLocaleString() + ' points, ' + G.smashed + ' things broken, ' + acc + '% accuracy, $' + G.tab + ' bar tab' + (badges.length ? '. ' + badges.join(', ') + '.' : '.') + ' https://beejeezum.github.io/bottle-smashing-bar/';
  R.innerHTML = '<h3>THE BOTTLE SMASHING BAR</h3><p>— tonight\'s damage —</p><dl>'
    + row('Bar tab', '$' + G.tab) + row('Things broken', G.smashed) + row('Bottles thrown', G.thrown) + row('Accuracy', acc + '%')
    + row('Best streak', G.best) + row('Blackouts', blackouts) + row('Restroom trips', pees) + row('Doug incidents', G.doug)
    + '</dl>' + badges.map(b => '<span class="badge">' + b + '</span>').join('') + '<b>SCORE ' + G.score.toLocaleString() + '</b><p class="paid">PAID IN FULL · by the jar</p><small>press P to copy your night · E to crumple</small>';
  R.classList.add('on');
}

// markers above anyone with something to say
const markTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.font = '60px "Bebas Neue"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ffb300'; g.shadowBlur = 10; g.fillStyle = '#ffe9a0'; g.fillText('!', 32, 36);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const pem = new NeonFigure({ color: 0xc8ffd8, pose: 'chat', hat: 'top', phase: 3, boost: 1.4 });
pem.group.position.set(11.2, 0, 8.5); pem.group.rotation.y = Math.PI * 0.85; pem.group.visible = false; scene.add(pem.group); W.figures.push(pem); W.npc.pem = pem;
const lou = new NeonFigure({ color: 0x4ad6c8, pose: 'chat', hat: 'cap', phase: 2.2, boost: 1.7 });
lou.group.position.set(2.9, 0, 11.4); lou.group.rotation.y = -0.5; scene.add(lou.group); W.figures.push(lou); W.npc.lou = lou;
W.colliders.push({ x0: 2.6, x1: 3.2, z0: 11.1, z1: 11.7 });

// weather and air: rain on the street, haze in the bar, dust in the range lights
const RN = 260, rainPos = new Float32Array(RN * 6), rainD = [];
for (let i = 0; i < RN; i++) rainD.push({ x: -10 + Math.random() * 20, y: Math.random() * 8, z: 10.5 + Math.random() * 9, v: 9 + Math.random() * 5 });
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x9fb8d8, transparent: true, opacity: 0.3 })); rain.frustumCulled = false; scene.add(rain);
const flash = new THREE.PointLight(0xcfe0ff, 0, 60, 1.2); flash.position.set(0, 12, 20); scene.add(flash);
let thunderT = 9;
const hazeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const haze = [];
for (let i = 0; i < 12; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: hazeTex, color: [0xffb070, 0xff5aa0, 0x70d0ff][i % 3], transparent: true, opacity: 0.04, depthWrite: false }));
  s.position.set(-7 + Math.random() * 14, 1.9 + Math.random() * 1.2, -6 + Math.random() * 14); s.scale.setScalar(3.5 + Math.random() * 2.5); s.userData.p = s.position.clone(); scene.add(s); haze.push(s);
}
const motes = (() => {
  const n = 320, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = 14 + Math.random() * 18; p[i * 3 + 1] = 0.5 + Math.random() * 8; p[i * 3 + 2] = -9 + Math.random() * 18; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xc8b89a, size: 0.016, transparent: true, opacity: 0.22, depthWrite: false })); scene.add(m); return m;
})();
function updateAir(dt) {
  haze.forEach((s, i) => { s.position.x = s.userData.p.x + Math.sin(time * 0.07 + i) * 1.2; s.position.z = s.userData.p.z + Math.cos(time * 0.05 + i * 2) * 1.2; });
  motes.position.y = Math.sin(time * 0.13) * 0.4; motes.position.z = Math.sin(time * 0.07) * 0.5;
  rain.visible = P.pos.z > 5; flash.intensity = Math.max(0, flash.intensity - dt * 900);
  if (!rain.visible) return;
  for (let i = 0; i < RN; i++) { const d = rainD[i]; d.y -= d.v * dt; if (d.y < 0) { d.y = 7 + Math.random() * 2; d.x = P.pos.x - 10 + Math.random() * 20; } const o = i * 6; rainPos[o] = d.x; rainPos[o + 1] = d.y; rainPos[o + 2] = d.z; rainPos[o + 3] = d.x + 0.03; rainPos[o + 4] = d.y + 0.4; rainPos[o + 5] = d.z; }
  rainGeo.attributes.position.needsUpdate = true;
  thunderT -= dt; if (thunderT <= 0) { thunderT = 18 + Math.random() * 25; flash.intensity = 500; audio.thunder(); }
}
const marks = {};
for (const id in W.npc) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: markTex, depthWrite: false })); s.material.color.setScalar(2);
  s.scale.setScalar(0.3); W.npc[id].group.add(s); marks[id] = s;
}

// a bowl of pretzels on the bar: eat some and the next few drinks land softer
{
  const g = new THREE.Group(); g.position.set(-1.7, 1.092, -5.08); scene.add(g);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5a2d16, roughness: 0.5, side: THREE.DoubleSide }));
  bowl.position.y = 0.12; g.add(bowl);
  const pm = new THREE.MeshStandardMaterial({ color: 0xb8742a, roughness: 0.6 }), pg = new THREE.TorusGeometry(0.022, 0.006, 5, 10);
  for (let i = 0; i < 14; i++) { const p = new THREE.Mesh(pg, pm); p.position.set(Math.sin(i * 2.4) * 0.07, 0.06 + (i % 4) * 0.012, Math.cos(i * 2.4) * 0.07); p.rotation.set(i, i * 2, i * 3); g.add(p); }
}
let linedT = 0, snackT = 0, tips = 0, frenzyT = 0, frenzyScore = 0, frenzyCool = 0;
const nearSnacks = () => Math.hypot(P.pos.x + 1.7, P.pos.z + 4.4) < 1.5;
const TOASTS = { tex: 'To ducks.', dol: "To Gerald's misfortune.", hank: 'To the bottle, and its journey.', riv: 'TO NOISE.', lime: 'Woo! Cheers!', gus: 'To winning.', pearl: 'To Gus losing.', pem: '...To parking.', insp: 'I am on duty. ...Cheers.' };
const toasted = new Set();
function cheers() {
  const h = tray[0];
  if (!talkTo || !h || h.fill <= 0 || dlg) return;
  audio.clink(); fx.kick = 0.3; W.npc[talkTo].toast = 1; say(talkTo, TOASTS[talkTo] ?? 'Cheers.', 2.5);
  if (!toasted.has(talkTo)) { toasted.add(talkTo); story.addJar(25, true); if (toasted.size === 7) { toast('EVERYBODY KNOWS YOUR NAME'); story.addJar(100, true); } }
}

// the jar on the bar actually fills with coins
const jarCoins = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.095, 1, 20).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0xd9a520, metalness: 1, roughness: 0.3, envMapIntensity: 2 }));
{
  const g = new THREE.Group(); g.position.set(2.2, 1.092, -5.3); scene.add(g);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.105, 0.3, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xdfefff, transparent: true, opacity: 0.28, roughness: 0.05, envMapIntensity: 2, side: THREE.DoubleSide, depthWrite: false }));
  glass.position.y = 0.15; jarCoins.scale.y = 0.01; g.add(jarCoins, glass);
}

// a TV in the corner of the bar that reports on you, live
const news = ['TONIGHT: GLASS. 100% CHANCE', "LANDLORD VOWS CONDOS 'BY BREAKFAST'", 'LOCAL DUCKS ON EDGE'];
function headline(t) { if (news[0] !== t) { news.unshift(t); news.length = Math.min(news.length, 5); } }
const tvC = document.createElement('canvas'); tvC.width = 512; tvC.height = 144; const tvG = tvC.getContext('2d');
const tvTex = new THREE.CanvasTexture(tvC); tvTex.colorSpace = THREE.SRGBColorSpace;
{
  const m = new THREE.MeshBasicMaterial({ map: tvTex }); m.color.setScalar(1.25);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.48), m); p.position.set(6.35, 2.75, -7.96); scene.add(p);
  W.B(1.84, 0.62, 0.1, W.flat(0x111111, { r: 0.4 }), 6.35, 2.75, -8.02);
}
let tvT = 0, tvX = 0;
function updateNews(dt) {
  tvT -= dt; tvX += dt * 120; if (tvT > 0) return; tvT = 0.07;
  const g = tvG, line = news.join('   ●   ') + '   ●   ';
  g.fillStyle = '#0a1830'; g.fillRect(0, 0, 512, 144);
  g.fillStyle = '#c0181f'; g.fillRect(0, 0, 512, 54); g.fillStyle = '#fff'; g.font = '44px "Bebas Neue"'; g.textBaseline = 'middle';
  g.fillText('SMASH NEWS LIVE', 14, 30); g.fillText(story.clock(), 370, 30);
  g.font = '54px "Bebas Neue"'; g.fillStyle = '#ffe98a';
  const w = g.measureText(line).width, x = -(tvX % w);
  g.fillText(line, x, 102); g.fillText(line, x + w, 102);
  tvTex.needsUpdate = true;
}

// regulars can get up and walk somewhere
const movers = [];
function walkTo(f, path, faceY) { f.pose = 'walk'; movers.push({ f, path, faceY }); }
function updateMovers(dt) {
  for (let i = movers.length - 1; i >= 0; i--) {
    const m = movers[i], g = m.f.group, t = m.path[0], dx = t[0] - g.position.x, dz = t[1] - g.position.z, d = Math.hypot(dx, dz);
    if (d < 0.1) { m.path.shift(); if (!m.path.length) { m.f.pose = 'chat'; g.rotation.y = m.faceY; movers.splice(i, 1); } continue; }
    g.position.x += dx / d * 1.3 * dt; g.position.z += dz / d * 1.3 * dt; g.rotation.y = Math.atan2(dx, dz);
  }
}
let gpMoved = false, restockT = 0;
const gpWatching = () => gpMoved && story.q.gp.state !== 'new';

// night two: a health inspector reads the rules poster, and turns round without warning
const insp = new NeonFigure({ color: 0xff5a4a, pose: 'chat', hat: 'cap', phase: 5, boost: 1.6 });
insp.group.position.set(10.9, 0, -9.3); insp.group.rotation.y = Math.PI; insp.group.visible = false; scene.add(insp.group); W.figures.push(insp);
const IN = { on: false, t: 8, watch: false, warn: false };
function updateInspector(dt) {
  if (!IN.on) return;
  IN.t -= dt;
  if (!IN.watch && !IN.warn && IN.t < 1.3) { IN.warn = true; audio.tick(300); }
  if (IN.t <= 0) {
    IN.watch = !IN.watch; IN.warn = false; IN.t = IN.watch ? 3 + Math.random() * 2.5 : 6 + Math.random() * 6;
    if (IN.watch && inRange()) { dougTalk = time + 3; say('insp', pick(['Hm.', 'I heard glass.', 'What was that.', 'Nobody move.']), 2); }
  }
  insp.group.rotation.y += ((IN.watch ? 0.75 : Math.PI) - insp.group.rotation.y) * Math.min(1, dt * 7);
  el.eye.className = IN.watch ? 'on red' : IN.warn ? 'on amber' : 'on';
  el.eye.textContent = IN.watch ? 'INSPECTOR IS WATCHING · DO NOT THROW' : IN.warn ? 'he is turning round...' : 'inspector is reading the rules';
}
function violation() {
  story.fine(150); toast('VIOLATION'); audio.tick(180); headline('INSPECTOR WITNESSES BOTTLE. BOTTLE WITNESSES INSPECTOR');
  sayQ.push(['insp', pick(['VIOLATION. Projectile. Indoors. That is a fine.', 'I SAW that. Section four. One hundred and fifty dollars.', 'Airborne glassware. Writing it down. Underlining it.'])]);
}
function nightTwo() {
  story.startNight2(); IN.on = true; IN.t = 10; IN.watch = false; insp.group.visible = true; W.colliders.push({ x0: 10.6, x1: 11.2, z0: -9.6, z1: -9.0 });
  D.level = 0; D.pending = 0; bladder = 0; P.pos.set(0, 0, 14.2); P.yaw = 0; P.pitch = 0.08; $('#receipt').classList.remove('on');
  toast('NIGHT TWO'); headline('HEALTH INSPECTOR VISITS RANGE; RANGE VISITS HEALTH INSPECTOR');
  sayQ.push(['', 'The next evening. The sign is still buzzing.'], ['sal', "Bad news. Pemberton's cousin is a health inspector. He's in the range, reading the rules."], ['sal', "Jar needs $2,500 for the 'permit'. Throw all you like. Just not while he's LOOKING."]);
}

// pick up where you left off
try {
  const sv = JSON.parse(localStorage.getItem('bsb-save') || 'null');
  if (sv && sv.s && sv.s.met.length) {
    story.restore(sv.s); G.score = sv.score || 0; G.tab = sv.tab || 0; G.smashed = sv.smashed || 0;
    $('#start').textContent = 'WALK BACK IN'; $('#fresh').hidden = false;
    if (story.phase === 'saved' || story.night === 2) { pem.group.visible = true; pem.pose = 'seated'; pem.group.position.set(-3.6, 0, -4.1); pem.group.rotation.y = Math.PI; W.colliders.push({ x0: -3.9, x1: -3.3, z0: -4.75, z1: -3.85 }); }
    if (story.night === 2) { insp.group.visible = true; if (story.phase === 'night') { IN.on = true; W.colliders.push({ x0: 10.6, x1: 11.2, z0: -9.6, z1: -9.0 }); } else { insp.group.position.set(6.8, 0, -3.6); } }
    if (sv.gp) { gpMoved = true; W.npc.gus.group.position.set(11.5, 0, 4.2); W.npc.gus.group.rotation.y = Math.PI / 2; W.npc.pearl.group.position.set(11.5, 0, 5.4); W.npc.pearl.group.rotation.y = Math.PI / 2; }
  }
} catch (e) { }
$('#fresh').addEventListener('click', () => { try { localStorage.removeItem('bsb-save'); } catch (e) { } location.reload(); });

// Doug sweeps the range. Aim away from Doug.
const doug = new NeonFigure({ color: 0xff7a2a, pose: 'chat', hat: 'cap', phase: 1 });
doug.group.position.set(15.3, 0, -9.7); doug.group.rotation.y = -Math.PI / 2; scene.add(doug.group); W.figures.push(doug);
{
  const broom = new THREE.Group(), m = doug.mat;
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 6), m); stick.position.y = -0.35; broom.add(stick);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.05), m); head.position.y = -1.0; broom.add(head);
  doug.hold(broom);
}
const DG = { mode: 'idle', t: 30, dir: 1 };
function dougSay(kind, chance = 1) {
  if (time < dougTalk || dlg || Math.random() > chance || P.pos.x < 8.5) return;
  dougTalk = time + 9; say('doug', pick(DOUG[kind]));
}
function updateDoug(dt) {
  const g = doug.group;
  if (DG.mode === 'idle') {
    DG.t -= dt;
    if (DG.t <= 0 && P.pos.x > 9) { DG.mode = 'sweep'; doug.pose = 'walk'; g.rotation.y = DG.dir > 0 ? 0 : Math.PI; dougSay('sweep'); }
  } else {
    g.position.z += DG.dir * 1.5 * dt;
    if (Math.abs(g.position.z) > 9.7) { g.position.z = 9.7 * DG.dir; DG.mode = 'idle'; doug.pose = 'chat'; g.rotation.y = -Math.PI / 2; DG.dir *= -1; DG.t = 40 + Math.random() * 40; }
  }
}

// ---------- your hand ----------
const hand = new THREE.Group(); camera.add(hand);
const grip = new THREE.Group(); hand.add(grip);
const gripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9fd8ff).multiplyScalar(0.85) });
const UP = new THREE.Vector3(0, 1, 0);
function tube(a, b, r = 0.0065) {
  const d = b.clone().sub(a), l = d.length(), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 6), gripMat);
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); return m;
}
function buildGrip(v) {
  grip.clear();
  const [r, y] = VESSELS[v].grip, R = r + 0.008;
  for (let i = 0; i < 4; i++) { // fingers wrap the far side
    const m = new THREE.Mesh(new THREE.TorusGeometry(R, 0.0065, 6, 14, Math.PI * 1.1), gripMat);
    m.rotation.x = -Math.PI / 2; m.position.y = y + (i - 1.5) * 0.0175; grip.add(m);
  }
  const th = new THREE.Mesh(new THREE.TorusGeometry(R, 0.0075, 6, 10, Math.PI * 0.5), gripMat); // thumb, near side
  th.rotation.x = Math.PI / 2; th.position.y = y + 0.012; grip.add(th);
  grip.add(tube(new THREE.Vector3(R, y - 0.03, 0), new THREE.Vector3(R, y + 0.03, 0)));
  grip.add(tube(new THREE.Vector3(R + 0.005, y - 0.01, 0.01), new THREE.Vector3(0.2, -0.5, 0.34), 0.011));
}
const handLight = new THREE.PointLight(0xffe0c0, 0.25, 3, 2); handLight.position.set(0.1, 0, -0.1); camera.add(handLight);
const ARC_N = 34;
const arcGeo = new THREE.BufferGeometry(); arcGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARC_N * 3), 3));
const arc = new THREE.Points(arcGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 4, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false }));
arc.frustumCulled = false; arc.visible = false; scene.add(arc);
const landing = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.2, 24), new THREE.MeshBasicMaterial({ color: 0x9dff00, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
landing.rotation.x = -Math.PI / 2; landing.visible = false; scene.add(landing);

function equip() {
  const h = tray[0];
  for (const c of [...hand.children]) if (c !== grip) hand.remove(c);
  grip.visible = !!h; if (!h) return;
  h.mesh ??= makeVessel(h.drink, h.fill);
  h.mesh.position.set(0, 0, 0); h.mesh.rotation.set(0, 0, 0); h.mesh.scale.setScalar(1);
  hand.add(h.mesh); buildGrip(h.drink.vessel); handRise = 0;
}

// ---------- ordering: Sal pours it on the bar, you pick it up ----------
el.list.innerHTML = DRINKS.map(d => `<li data-id="${d.id}"><kbd>${d.key}</kbd><div><b>${d.name}</b><small>${d.desc}</small></div><span class="pips">${d.strength < 0 ? '<u>sobering</u>' : '●'.repeat(Math.ceil(d.strength * (d.bundle || 1) / (d.bundle ? 2.5 : 1)))}</span><span class="price">${d.price ? '$' + d.price : 'free'}</span></li>`).join('');
el.list.addEventListener('click', e => { const li = e.target.closest('li'); if (li) order(li.dataset.id); });
function openMenu(v) { menuOpen = v; el.menu.classList.toggle('on', v); if (v) audio.tick(660); }
const serveQ = [], waiting = []; let serving = null, served = 0;
const cap = () => story.has('pockets') ? 9 : 6;
const carrying = () => tray.length + serveQ.length + waiting.length + (serving ? 1 : 0);

function order(id, free) {
  const d = DRINKS.find(x => x.id === id); if (!d) return;
  const n = d.bundle || 1;
  if (bladder >= 1 && !free) { say('sal', pick(["Go. Restroom. I'm not mopping that again.", "You're doing the dance. West wall, past the pool table. Go."])); audio.tick(220); return; }
  if (carrying() + n > cap()) { say('sal', pick(["Finish what you're holding first, champ.", 'You have two hands. I counted.', "That's a lot of glass for one person."])); audio.tick(220); return; }
  if (!free && happyT <= 0 && !story.has('card')) G.tab += d.price;
  const li = el.list.querySelector(`[data-id="${id}"]`); li.classList.remove('hit'); void li.offsetWidth; li.classList.add('hit');
  for (let i = 0; i < n; i++) serveQ.push({ d, fast: n > 1 });
  const k = d01();
  if (!free) say('sal', d.strength < 0 ? pick(['Smart. Boring, but smart.', 'Hydration. Bold strategy.'])
    : k < 0.25 ? pick(['Coming right up.', 'Good choice.', 'One of those nights, huh?', "Range is through there when you're done."])
      : k < 0.6 ? pick(['Pace yourself, slugger.', "You're a natural. Allegedly.", 'The range is still that way. Roughly.'])
        : pick(["I'm legally required to keep serving you. It's a weird bar.", "You're pointing at the menu with your whole body.", 'Sure. Why not. What could go wrong.']));
  hudNumbers();
}
function updateServe(dt) {
  const b = W.bartender;
  if (!serving && serveQ.length) {
    const q = serveQ.shift(), m = makeVessel(q.d, 0);
    m.position.set(clamp((nearBar() ? P.pos.x : b.group.position.x) + 0.2 + ((served++ % 5) - 2) * 0.13, -7.4, 4), 1.092, -5.5); scene.add(m);
    serving = { d: q.d, m, t: 0, dur: q.fast ? 0.3 : 0.75 }; b.serveT = serving.dur + 0.1; if (!q.fast || served % 2) audio.pour();
  }
  if (serving) {
    const s = serving; s.t += dt;
    s.m.userData.setFill(Math.min(1, s.t / s.dur));
    if (s.t > s.dur) s.m.position.z = -5.5 + Math.min(1, (s.t - s.dur) / 0.25) * 0.52;
    if (s.t > s.dur + 0.25) { waiting.push(s); serving = null; audio.tick(990); }
  }
  for (let i = waiting.length - 1; i >= 0; i--) {
    const s = waiting[i];
    if (Math.hypot(P.pos.x - s.m.position.x, P.pos.z - s.m.position.z) < 2.3 && tray.length < cap()) {
      scene.remove(s.m); tray.push({ drink: s.d, fill: 1, mesh: s.m }); waiting.splice(i, 1);
      if (tray.length === 1) equip(); drawTray(); audio.tick(1320);
    }
  }
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
const sensEl = $('#sens'), volEl = $('#vol'), wooEl = $('#woozy');
woozy = localStorage.getItem('bsb-woozy') === null ? 1 : store.get('bsb-woozy'); wooEl.value = woozy;
wooEl.addEventListener('input', () => { woozy = +wooEl.value; store.set('bsb-woozy', woozy); });
sens = store.get('bsb-sens') || 1; sensEl.value = sens; volEl.value = store.get('bsb-vol') || 0.85;
sensEl.addEventListener('input', () => { sens = +sensEl.value; store.set('bsb-sens', sens); });
volEl.addEventListener('input', () => { store.set('bsb-vol', volEl.value); if (audio.ready) audio.master.gain.value = +volEl.value; });
$('#pause').addEventListener('click', e => { if (e.target.closest('#settings')) return; paused = false; if (audio.ready) audio.master.gain.value = +volEl.value; $('#pause').classList.remove('on'); audio.init(); lock(); });
addEventListener('mousemove', e => {
  if (!started || paused) return;
  if (locked || (e.buttons & 2)) {
    // sober: 1:1. drunk: part of every movement arrives late, so the view swims
    const d = d01(), late = d * 0.6, s = 0.0022 * sens;
    P.yaw -= e.movementX * s * (1 - late); P.pitch = clamp(P.pitch - e.movementY * s * (1 - late), -1.4, 1.4);
    const rate = 9 - 6 * d; P.lvx -= e.movementX * s * late * rate; P.lvy -= e.movementY * s * late * rate;
  }
});
canvas.addEventListener('mousedown', e => { if (!started) return; if (e.button === 0) { if (!locked && !noLock) lock(); if (dlg) advDlg(); else actionDown = true; } });
addEventListener('mouseup', e => { if (e.button === 0) actionDown = false; if (e.button === 2) altDown = false; });
canvas.addEventListener('mousedown', e => { if (started && e.button === 2 && locked) altDown = true; });
addEventListener('contextmenu', e => e.preventDefault());

// touch controls: left thumb walks, right thumb looks, buttons do the rest
const TM = { x: 0, y: 0 };
addEventListener('pointerdown', e => { if (e.pointerType === 'touch') { document.body.classList.add('touch'); noLock = true; } }, true);
function zone(el, onMove, onEnd) {
  let id = null, sx = 0, sy = 0, lx = 0, ly = 0;
  el.addEventListener('pointerdown', e => { id = e.pointerId; sx = lx = e.clientX; sy = ly = e.clientY; try { el.setPointerCapture(id); } catch (err) { } e.preventDefault(); });
  el.addEventListener('pointermove', e => { if (e.pointerId !== id) return; onMove(e.clientX - sx, e.clientY - sy, e.clientX - lx, e.clientY - ly); lx = e.clientX; ly = e.clientY; });
  const end = e => { if (e.pointerId === id) { id = null; onEnd && onEnd(); } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
zone($('#t-move'), (dx, dy) => { TM.x = clamp(dx / 55, -1, 1); TM.y = clamp(-dy / 55, -1, 1); }, () => { TM.x = TM.y = 0; });
zone($('#t-look'), (dx, dy, mx, my) => { if (!started || paused) return; P.yaw -= mx * 0.006 * sens; P.pitch = clamp(P.pitch - my * 0.006 * sens, -1.4, 1.4); });
const hold = (el, set) => { el.addEventListener('pointerdown', e => { set(true); e.preventDefault(); }); ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => el.addEventListener(n, () => set(false))); };
hold($('#t-act'), v => { if (v && dlg) advDlg(); else actionDown = v; });
hold($('#t-lob'), v => { altDown = v; });
$('#t-e').addEventListener('pointerdown', e => { interact(); e.preventDefault(); });

let talkTo = null;
function interact() {
  if ($('#receipt').classList.contains('on')) return $('#receipt').classList.remove('on');
  if (dlg) return advDlg();
  if (peeT > 0) return;
  if (story.phase === 'saved' && story.night === 1 && P.pos.z > 10.6) { blackT = 3.4; nightFade = true; setTimeout(nightTwo, 1500); return; }
  if (W.restroom.inside(P.pos) && nearToilet()) {
    if (bladder < 0.25) return say('', "Nothing to report. You just stand there, companionably.", 3);
    peeT = 2.2 + bladder * 2; audio.stream(peeT); return;
  }
  if (talkTo) {
    const who = talkTo;
    return startDlg(story.talk(who), () => {
      if ((who === 'gus' || who === 'pearl') && !gpMoved) { // they come and watch
        gpMoved = true;
        walkTo(W.npc.gus, [[2.9, 2.4], [7, 2.4], [10, 3.4], [11.5, 4.2]], Math.PI / 2);
        walkTo(W.npc.pearl, [[4.4, 2.6], [7.5, 3], [10, 4.4], [11.5, 5.4]], Math.PI / 2);
        sayQ.push(['pearl', "Come on, Gus. I want to watch my money get made."]);
      }
    });
  }
  if (nearJuke()) {
    const s = audio.nextSong(); toast(s.name.toUpperCase()); audio.tick(700);
    sayQ.push(['lime', s.tempo > 1.2 ? 'YES. The ducks hate this one. Watch them run.' : s.tempo < 0.8 ? 'Ohh, a slow one. Even the ducks are swaying.' : 'Classic. Never skip the house shuffle.']);
    return;
  }
  if (menuOpen) return openMenu(false);
  if (!nearBar()) return;
  if (!story.met.has('sal')) return startDlg(story.salIntro(), () => { order('lager', true); openMenu(true); });
  startDlg(story.salClaim(), () => openMenu(true));
}
addEventListener('keydown', e => {
  if (e.repeat) return;
  keys[e.code] = true;
  if (!started || paused) return;
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyF' || e.code === 'Space') { if (dlg) advDlg(); else actionDown = true; e.preventDefault(); }
  if (e.code === 'KeyG') altDown = true;
  if (e.code === 'KeyH') $('#help').classList.toggle('on');
  if (e.code === 'KeyP' && shareText && $('#receipt').classList.contains('on')) { navigator.clipboard?.writeText(shareText).then(() => toast('COPIED'), () => { }); }
  if (e.code === 'KeyN' && story.phase === 'saved') receipt();
  if (e.code === 'KeyC') cheers();
  if (e.code === 'KeyV' && inRange() && tray[0] && tray[0].fill > 0 && mode === 'idle' && !dlg) { // waste a full one
    charge = 0.6; lob = false; G.wasted++; throwIt(); dougTalk = 0; dougSay('waste');
  }
  if (e.code === 'KeyB' && inRange() && frenzyT <= 0 && story.phase !== 'lastcall') {
    if (time < frenzyCool) say('doug', 'Give me a second to restack.');
    else { frenzyT = story.has('vip') ? 90 : 60; frenzyScore = 0; range.restock(); audio.bell(); toast("DOUG'S SIXTY"); dougTalk = time + 6; say('doug', 'Sixty seconds. The crate of empties is on me. GO.', 3); }
  }
  if (e.code === 'KeyX' && nearSnacks()) {
    if (time < snackT) say('sal', 'Easy. Those have to last till Thursday.');
    else { snackT = time + 20; linedT = 75; audio.crunch(); say('', pick(['Salty. Stale. Perfect.', 'Stomach: lined. The next few will land softer.', 'These pretzels predate the building.']), 3); }
  }
  if (e.code === 'KeyT' && nearBar() && !dlg) {
    G.tab += 5; tips++; hudNumbers(); audio.tick(1200); happyNext -= 40;
    say('sal', pick(["Appreciated. I'll remember that around happy hour.", 'A tipper! Doug, look, a tipper!', 'You just moved happy hour up. Funny how that works.']));
  }
  if (e.code === 'KeyQ' && tray.length > 1 && mode === 'idle') { tray.push(tray.shift()); equip(); drawTray(); audio.tick(760); }
  if (e.code === 'KeyR' && inRange()) {
    if (time < restockT && !story.has('encore')) say('doug', "Bell's cooling down. I'm one man.");
    else { const n = range.restock(); restockT = time + 30; audio.bell(); dougTalk = 0; say('doug', n ? 'Fresh stock! ' + n + ' new things to ruin!' : "Nothing's broken. Ring it when you've earned it."); }
  }
  if (menuOpen && /^Digit\d$/.test(e.code)) { const d = DRINKS.find(x => x.key === e.code.slice(5)); if (d) order(d.id); }
});
addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'KeyG') altDown = false; if (e.code === 'KeyF' || e.code === 'Space') actionDown = false; });
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
  camera.getWorldDirection(out); out.y += lob ? 0.6 : 0.09;
  if (err) { out.x += (Math.random() - 0.5) * err; out.y += (Math.random() - 0.5) * err; out.z += (Math.random() - 0.5) * err; }
  return out.normalize();
}
const throwSpeed = c => lob ? 6.5 + 8.5 * c : 9 + 16 * c;

function throwIt() {
  const h = tray.shift(); const d = d01();
  const m = h.mesh; hand.remove(m); grip.visible = false;
  const perfect = charge >= 0.8 && charge <= 0.95; // let go in the sweet spot and the bottle flies true
  throwOrigin(_o); aimDir(_dir, d * d * 0.14 * (story.has('steady') ? 0.65 : 1) * (perfect ? 0.2 : 1));
  m.position.copy(_o); m.scale.setScalar(1.5); scene.add(m);
  const sp = throwSpeed(charge) * (1 + (Math.random() - 0.5) * 0.25 * d);
  shots.push({ mesh: m, pos: _o.clone(), vel: _dir.clone().multiplyScalar(sp), spin: new THREE.Vector3(-(8 + Math.random() * 8), Math.random() * 2, Math.random() * 3), hit: false, kills: 0, perfect, lob, wet: h.fill > 0 ? h.drink.liquid : 0, life: 6, color: h.drink.glass ?? 0xdfefff });
  if (perfect) { _c.copy(_o).addScaledVector(_dir, 2.5); fx.popup(_c, 'PERFECT', 'release', 'call'); audio.tick(1500); }
  G.thrown++; audio.whoosh(); mode = 'idle'; charge = 0; fx.kick = 0.35;
  if (IN.on && IN.watch) violation();
  setTimeout(() => { equip(); drawTray(); }, 280); drawTray();
}

function smashShot(s, point, target) {
  scene.remove(s.mesh); s.dead = true;
  fx.glassBurst(point, s.vel, s.color, 22, 0.045);
  if (s.wet) { _c.set(0, 0, 0); for (let i = 0; i < 3; i++) fx.burst(fx.glowP, point, s.vel, s.wet, 14, 0.03, 4, 1.1); audio.splat({ ...range.where(point), vol: 0.5 }); }
  audio.smash({ ...range.where(point), size: 0.8, pitch: 1.15 });
  U.uHit.value = 1;
  if (target && story.has('shrapnel')) { curShot = s; for (const t of range.near(point, 0.75, target)) t.hit({ vel: s.vel, point: t.c }); curShot = null; }
  if (!s.hit) {
    if (G.streak >= 3) toast('STREAK LOST'); G.streak = 0; hudNumbers();
    if (gpWatching() && story.q.gp.state === 'active' && !dlg && Math.random() < 0.6) { dougTalk = time + 4; say('gus', pick(['Ha!', 'Told you.', 'Twenty bucks, Pearl.', 'The floor felt that one.'])); }
    else dougSay('miss', 0.45);
  }
}

function updateShots(dt) {
  const SUB = 3, h = dt / SUB, dg = doug.group.position;
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    for (let k = 0; k < SUB && !s.dead; k++) {
      _a.copy(s.pos);
      s.vel.y -= 9.8 * h; s.pos.addScaledVector(s.vel, h);
      const p = s.pos;
      if (Math.hypot(p.x - dg.x, p.z - dg.z) < 0.4 && p.y < 1.9) { // rule three
        s.hit = true; G.doug++; headline('DOUG STRUCK. AGAIN. RULE THREE IGNORED'); smashShot(s, p); G.streak = 0; G.score = Math.max(0, G.score - 250); hudNumbers();
        fx.popup(p, '-250', 'RULE THREE', 'bad'); dougTalk = 0; dougSay('ow'); audio.thud(range.where(p)); break;
      }
      if (IN.on && Math.hypot(p.x - insp.group.position.x, p.z - insp.group.position.z) < 0.4 && p.y < 1.9) { // do not bottle the inspector
        s.hit = true; smashShot(s, p); story.fine(300); toast('ASSAULT WITH A LAGER'); fx.popup(p, '-$300', 'THE INSPECTOR', 'bad'); headline('INSPECTOR BOTTLED. FINE TRIPLED'); sayQ.push(['insp', 'That is going in the report. In CAPITALS.']); break;
      }
      if (pem.group.visible && pem.pose === 'chat' && Math.hypot(p.x - pem.group.position.x, p.z - pem.group.position.z) < 0.4 && p.y < 2.1) {
        s.hit = true; smashShot(s, p); G.score += 50; hudNumbers(); fx.popup(p, '+50', 'WORTH IT', 'call'); sayQ.push(['pem', pick(['My SUIT! This is Italian neon!', 'I will be invoicing you for that.'])]); break;
      }
      const hit = range.sweep(_a, p, story.has('heavy') ? 0.17 : 0.1);
      if (hit) {
        _b.lerpVectors(_a, p, hit.k); curShot = s;
        const r = hit.target.hit({ vel: s.vel, point: _b }); curShot = null;
        if (r === 'block') { smashShot(s, _b, hit.target); break; }
      }
      let wall = p.y < 0.06 || p.y > 9.9 || p.x > 37.9 || p.z < -10.9 || p.z > 10.9;
      if (!wall && p.x < 8.3) {
        const inBar = p.x < 8 && p.z > -7.9 && p.z < 9.9 && p.x > -7.9 && p.y < 3.5;
        const door = p.z > -4 && p.z < 6 && p.y < 3.2;
        wall = !(inBar || door) || (inBar && p.z < -4.7 && p.y < 1.2);
        if (inBar && time - yelled > 6) { yelled = time; say('sal', pick(['HEY! The range is THAT way!', 'Not in the bar! We just mopped! (We did not.)', "DOUG. Doug, they're doing it again."])); }
      }
      if (!wall) for (const b of W.statics) if (b.distanceToPoint(p) < 0.08) { wall = true; break; }
      if (wall) { p.y = Math.max(p.y, 0.05); smashShot(s, p); }
    }
    if (!s.dead) {
      s.mesh.position.copy(s.pos); if (s.life < 5.8) fx.trail(s.pos, s.color);
      s.mesh.rotation.x += s.spin.x * dt; s.mesh.rotation.y += s.spin.y * dt; s.mesh.rotation.z += s.spin.z * dt;
      s.life -= dt; if (s.life <= 0) { scene.remove(s.mesh); s.dead = true; }
    }
    if (s.dead) shots.splice(i, 1);
  }
}

range.onScore = (pts, label, pos, t, killed) => {
  const s = curShot;
  if (s && !s.hit && gpWatching() && !dlg && story.q.gp.state === 'active') say('pearl', pick(["That's " + (G.streak + 1) + '!', 'Keep going, hon!', 'Hear that, Gus? That is the sound of my money.']), 2.2);
  if (s && !s.hit) { s.hit = true; G.hits++; G.streak++; G.best = Math.max(G.best, G.streak); if ([3, 5, 8, 12].includes(G.streak)) { toast(`${G.streak} IN A ROW!`); audio.cheer(0.6); } }
  if (s && killed && ++s.kills > 1) { const b = s.kills === 2 ? 'DOUBLE!' : s.kills === 3 ? 'TRIPLE!' : 'CARNAGE!'; _c.copy(pos).y += 0.5; fx.popup(_c, b, 'one bottle', 'call'); pts += 60 * s.kills; }
  if (s && s.perfect) pts *= 1.25;
  if (s && s.wet) { pts *= 0.6; label += ' · WASTEFUL'; }
  el.cross.classList.remove('hit'); void el.cross.offsetWidth; el.cross.classList.add('hit');
  const mult = (happyT > 0 ? 2 : 1) * (1 + D.level * 0.3) * (1 + (story.has('olive') ? 0.2 : 0.1) * Math.min(G.streak, 10)) * (story.phase === 'saved' ? 2 : 1);
  const n = Math.max(5, Math.round(pts * mult / 5) * 5);
  G.score += n; if (killed) G.smashed++;
  fx.popup(pos, '+' + n, label, n >= 600 ? 'big' : '');
  U.uHit.value = 1.5;
  if (killed) { const H = { tv: "GERALD'S TELEVISION DESTROYED. GERALD UNAVAILABLE FOR COMMENT", chandelier: 'CHANDELIER DOWN. REPEAT: CHANDELIER DOWN', disco: 'DISCO BALL DEAD AT 17', duck: "DUCK DOWN. WITNESSES DESCRIBE 'A SQUEAK'", toilet: 'THE THRONE HAS FALLEN', fishbowl: 'FISH REPORTED FINE', gnome: 'GNOME COMMUNITY IN MOURNING', plate: 'CLAY PIGEON INTERCEPTED MID-AIR', piggy: 'PIGGY BANK MAKES LARGE WITHDRAWAL' }[t.type]; if (H) headline(H); }
  if (frenzyT > 0) frenzyScore += n;
  if (n >= 600) { audio.cheer(0.8); dougSay('big', 0.7); slow = 0.35; }
  if (G.score > store.get('bsb-best')) store.set('bsb-best', G.score);
  story.addJar(n / 25);
  story.event({ type: t.type, killed, level: D.level, streak: s ? G.streak : 0, x: t.home.x, chain: label === 'CHAIN', finale: !!t.o.finale, gold: !!t.o.gold, lob: !!(s && s.lob), label, tempo: audio.tempo });
  hudNumbers();
};

// ---------- per-frame ----------
function updatePlayer(dt) {
  const d = d01(), steady = story.has('steady') ? 0.7 : 1;
  const turn = (keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0), look = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);
  P.yaw += turn * 1.9 * dt + P.lvx * dt; P.pitch = clamp(P.pitch + look * 1.3 * dt + P.lvy * dt, -1.4, 1.4);
  const decay = Math.exp(-(9 - 6 * d) * dt); P.lvx *= decay; P.lvy *= decay;
  let ix = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + TM.x, iz = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0) + TM.y;
  if (dlg || peeT > 0) ix = iz = 0;
  if (menuOpen && (ix || iz)) openMenu(false);
  const moving = ix || iz;
  if (moving) { const l = Math.max(1, Math.hypot(ix, iz)); ix /= l; iz /= l; ix += Math.sin(time * 0.73) * d * 0.55 + Math.sin(time * 1.9) * d * 0.25; }
  const sp = keys.ShiftLeft ? 6.2 : 4.3;
  const fxx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  const wx = (rx * ix + fxx * iz) * sp, wz = (rz * ix + fz * iz) * sp;
  const k = 1 - Math.exp(-dt * 12 / (1 + d * 4));
  P.vel.x += (wx - P.vel.x) * k; P.vel.z += (wz - P.vel.z) * k;
  if (D.level > 5) { // the floor moves on its own now and then
    lurchT -= dt;
    if (lurchT <= 0) { lurchT = 3 + Math.random() * 7 - d * 2; const s = (Math.random() < 0.5 ? -1 : 1) * (1.5 + d * 2.5); P.vel.x += rx * s; P.vel.z += rz * s; fx.kick = 0.5; }
  }
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
  const si = Math.floor(P.bob / Math.PI);
  if (si !== stepI) { stepI = si; if (speed > 1.2) audio.step(P.pos.x < 8.2 && P.pos.z < 10.2, 0.7 + Math.random() * 0.5); }
  const A = Math.pow(d, 1.4) * 0.11 * steady * (0.35 + 0.65 * woozy);
  const sy = (Math.sin(time * 0.83) * 0.6 + Math.sin(time * 1.9 + 1.3) * 0.4) * A;
  const spt = (Math.sin(time * 1.07 + 2) * 0.6 + Math.sin(time * 2.3) * 0.4) * A * 0.7;
  camera.position.set(P.pos.x, 1.66 + Math.sin(P.bob * 2) * 0.035 * Math.min(1, speed / 4) + Math.sin(time * 0.9) * 0.03 * d, P.pos.z);
  if (bladder >= 1) camera.position.y += Math.abs(Math.sin(time * 7)) * 0.035; // the dance
  hic *= Math.exp(-dt * 6);
  camera.rotation.set(P.pitch + hic + spt + sipTilt + (bladder >= 1 ? Math.sin(time * 9) * 0.012 : 0) + fx.kick * 0.006 * Math.sin(time * 70), P.yaw + sy, Math.sin(time * 0.61) * A * 0.9 - (ix * 0.012 * Math.min(1, speed / 4)));
  const fov = 72 + Math.sin(time * 0.5) * 4 * d + (keys.ShiftLeft && moving ? 3 : 0);
  if (Math.abs(fov - camera.fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 6); camera.updateProjectionMatrix(); }
  camera.updateMatrixWorld();
}

const hp = new THREE.Vector3(), hr = new THREE.Vector3();
function finishDrink(h) {
  h.fill = 0; h.mesh?.userData.setFill(0); needRelease = true; mode = 'idle'; drawTray();
  const d = d01(), st = h.drink.strength, was = bladder;
  bladder = Math.min(1.2, bladder + (h.drink.id === 'water' ? 0.24 : 0.16) * (story.has('hollow') ? 0.5 : 1));
  if (bladder >= 0.75 && was < 0.75) sayQ.push(['', 'You should find the restroom soon. West wall, past the pool table.']);
  if (bladder >= 1 && was < 1) sayQ.push(['', 'It is now an emergency.']);
  setTimeout(() => audio.ahh(), 150);
  if (st >= 2) { U.uBurn.value = Math.min(1.6, st / 2.6); fx.kick = 1; if (st >= 2.6 || h.drink.id === 'tequila') setTimeout(() => audio.cough(), 350); }
  else if (Math.random() < 0.3 + d * 0.4) setTimeout(() => audio.burp(), 700);
  if (h.drink.id === 'special') say('', 'It tastes like a battery fell in love with a lime.', 3.5);
  if (!inRange() && G.thrown === 0) say('', 'Empty. The Smash Range is through the big opening on the right.', 4);
}
function updateAction(dt) {
  const h = tray[0], d = d01();
  if (!actionDown) needRelease = false;
  if (!h) mode = 'idle';
  else if (h.fill > 0) {
    if (actionDown && !menuOpen && !needRelease && !dlg) {
      mode = 'drink';
      const df = Math.min(h.fill, dt / h.drink.time);
      h.fill -= df; D.pending += h.drink.strength * df * (linedT > 0 && h.drink.strength > 0 ? 0.7 : 1); h.mesh?.userData.setFill(h.fill);
      gulpT -= dt; if (gulpT <= 0) { audio.gulp(); gulpT = 0.32; }
      if (h.fill <= 0.0001) finishDrink(h);
      else el.tray.querySelector('.cur em')?.style.setProperty('--f', h.fill);
    } else mode = 'idle';
  } else if (inRange()) {
    if ((actionDown || altDown) && !needRelease && !dlg) { if (mode !== 'charge') lob = altDown && !actionDown; mode = 'charge'; charge = Math.min(1, charge + dt / (story.has('quick') ? 0.6 : 0.85)); }
    else if (mode === 'charge') throwIt();
  } else mode = 'idle';

  // head tips back as the glass empties; the world dims behind it
  const drinking = mode === 'drink';
  sipTilt += ((drinking ? 0.1 + (1 - (h?.fill ?? 1)) * 0.22 : 0) - sipTilt) * Math.min(1, dt * 7);
  U.uSip.value += ((drinking ? 1 : 0) - U.uSip.value) * Math.min(1, dt * 6);
  U.uBurn.value = Math.max(0, U.uBurn.value - dt * 0.9); linedT -= dt;

  // view-model pose
  handRise = Math.min(1, handRise + dt * 4);
  const speed = Math.hypot(P.vel.x, P.vel.z);
  if (drinking) { hp.set(0.05, -0.12 - sipTilt * 0.1, -0.27); hr.set(0.6 + (1 - (h?.fill ?? 0)) * 0.9, 0, 0.1); }
  else if (mode === 'charge') { hp.set(0.34, -0.1 + charge * 0.16, -0.36 + charge * 0.16); hr.set(-0.3 - charge * 1.1, 0, -0.2); }
  else { hp.set(0.27, -0.27 + Math.sin(P.bob * 2) * 0.012 * Math.min(1, speed / 4), -0.5); hr.set(0, 0, 0); }
  hp.x += Math.sin(time * 1.3) * 0.02 * d; hp.y += Math.cos(time * 1.7) * 0.015 * d - (1 - handRise) * 0.4;
  if (mode === 'charge') hp.x += (Math.random() - 0.5) * 0.004 * charge;
  const k = 1 - Math.exp(-dt * 13);
  hand.position.lerp(hp, k);
  hand.rotation.x += (hr.x - hand.rotation.x) * k; hand.rotation.z += (hr.z - hand.rotation.z) * k;

  // aim arc: generous when sober, fades out as you get drunk
  const show = mode === 'charge' ? clamp(1 - d * (story.has('liver') ? 1.05 : 1.7), 0, 1) : 0;
  arc.visible = landing.visible = show > 0.02;
  if (arc.visible) {
    throwOrigin(_o); aimDir(_dir, 0).multiplyScalar(throwSpeed(charge));
    const pa = arcGeo.attributes.position; let x = _o.x + _dir.x * 0.06, z = _o.z + _dir.z * 0.06, vy = _dir.y - 9.8 * 0.06, y = _o.y + _dir.y * 0.06;
    for (let i = 0; i < ARC_N; i++) { pa.setXYZ(i, x, Math.max(y, 0.02), z); x += _dir.x * 0.045; z += _dir.z * 0.045; vy -= 9.8 * 0.045; y += vy * 0.045; }
    for (let i = 0; i < 90 && y > 0.06 && x < 37.5; i++) { x += _dir.x * 0.045; z += _dir.z * 0.045; vy -= 9.8 * 0.045; y += vy * 0.045; } // where it comes down
    landing.position.set(x, Math.max(y, 0.06), z); landing.material.opacity = 0.6 * show;
    pa.needsUpdate = true; arc.material.opacity = 0.75 * show;
  }
  el.charge.style.strokeDashoffset = 100.5 * (1 - (mode === 'charge' ? charge : 0));
  el.cross.classList.toggle('hot', mode === 'charge');
  el.cross.classList.toggle('sweet', mode === 'charge' && charge >= 0.8 && charge <= 0.95);
}

function updateDrunk(dt) {
  const take = D.pending * Math.min(1, dt * 0.22);
  D.pending -= take; D.level = clamp(D.level + take - dt * 0.011, 0, 10);
  const d = d01();
  let label = LEVELS[0][1]; for (const [v, l] of LEVELS) if (D.level >= v) label = l;
  if (label !== lastLabel) { if (lastLabel && LEVELS.findIndex(x => x[1] === label) > LEVELS.findIndex(x => x[1] === lastLabel)) toast(label); lastLabel = label; el.buzzLabel.textContent = label; }
  el.buzzFill.style.width = (D.level * 10) + '%';
  el.mult.textContent = '×' + ((1 + D.level * 0.3) * (story.phase === 'saved' ? 2 : 1)).toFixed(1);
  el.hud.style.setProperty('--d', d.toFixed(3));
  if (D.level > 3) { hicT -= dt; if (hicT <= 0) { hicT = 5 + Math.random() * 12 - d * 3; audio.hiccup(); hic = 0.05; fx.kick = 0.4; } }
  // too far: lights out, and you wake up back at the bar
  if (D.level >= 9.6 && blackT <= 0 && !nightFade) { blackT = 3.4; blackouts++; headline('PATRON NAPS ON COUNTER, MID-THROW'); say('', 'The room folds up like a card table.', 2.5); }
  if (blackT > 0) {
    const was = blackT; blackT -= dt;
    el.lids.style.setProperty('--lid', (blackT > 2.8 ? (3.4 - blackT) / 0.6 : blackT < 0.9 ? Math.max(0, blackT) / 0.9 : 1).toFixed(3));
    if (blackT <= 0) nightFade = false;
    if (was > 1.6 && blackT <= 1.6 && !nightFade) {
      P.pos.set(0.9, 0, -4.2); P.yaw = 0; P.pitch = 0; P.vel.set(0, 0, 0); D.level = 5.2; D.pending = 0; mode = 'idle'; charge = 0;
      sayQ.push(['sal', pick(["Morning, sunshine. It's been four minutes. Doug carried you back.", 'You fell asleep on the counter. Mid-throw. Impressive, honestly.', 'Welcome back. You missed nothing. You also hit nothing.'])]);
    }
    blinkP = 1;
  } else
  if (blinkP < 1) { blinkP = Math.min(1, blinkP + dt / blinkDur); el.lids.style.setProperty('--lid', Math.sin(blinkP * Math.PI).toFixed(3)); }
  else if (D.level > 5.5) { blinkT -= dt; if (blinkT <= 0) { blinkT = 4 + Math.random() * 6 - d * 3; blinkDur = 0.25 + d * 0.6; blinkP = 0; } }
  U.uDrunk.value = d * woozy; U.uTime.value = time;
  U.uHit.value = Math.max(0, U.uHit.value - dt * 5);
  bloom.strength = 0.6 + d * 0.5;
}

const _h = new THREE.Vector3();
function updateStory(dt) {
  // who are you looking at?
  talkTo = null; let best = 0.9;
  camera.getWorldDirection(_a);
  for (const id in W.npc) {
    const f = W.npc[id]; marks[id].visible = story.marker(id); marks[id].position.y = (id === 'pem' ? 2.35 : 2.0) + Math.sin(time * 3) * 0.04;
    if (id === 'sal' || !f.group.visible) continue;
    _h.copy(f.group.position); _h.y = 1.4; _h.sub(camera.position);
    const dist = _h.length(); if (dist > 2.7) continue;
    const dot = _h.normalize().dot(_a); if (dot > best) { best = dot; talkTo = id; }
  }
  if (dlg && Math.hypot(P.pos.x - dlg.x, P.pos.z - dlg.z) > 3) advDlg(true);
  if (subT > 0 && subT < 1e8) { subT -= dt; if (subT <= 0) el.sub.classList.remove('on'); }
  if (!dlg && subT <= 0 && sayQ.length) { const [w, t] = sayQ.shift(); say(w, t, 3.8); }
  if (story.dirty) {
    story.dirty = false; el.quests.innerHTML = story.tracker(); el.clock.textContent = story.clock();
    jarCoins.scale.y = 0.01 + 0.27 * story.jar / story.goal;
    el.jarFill.style.width = (story.jar / story.goal * 100) + '%'; el.jarNum.textContent = `$${Math.floor(story.jar).toLocaleString()} / $${story.goal.toLocaleString()}`;
    el.clock.classList.toggle('hot', story.phase !== 'night');
  }
  // happy hour comes round every few minutes
  if (story.phase !== 'lastcall' && seenRange) {
    happyNext -= dt;
    if (happyNext <= 0 && happyT <= 0) { happyT = story.has('long') ? 70 : 40; happyNext = 200 + Math.random() * 80; W.happy = true; audio.bell(); toast('HAPPY HOUR'); sayQ.push(['sal', 'HAPPY HOUR! Drinks are free and everything pays double!']); }
  }
  if (happyT > 0) {
    happyT -= dt; el.clock.textContent = 'HAPPY HOUR ' + Math.ceil(happyT); el.clock.classList.add('hot');
    if (happyT <= 0) { W.happy = false; story.dirty = true; sayQ.push(['sal', "Happy hour's over. Back to regular chaos."]); }
  }
  // Doug's Sixty: a minute of free empties, scored on its own
  if (frenzyT > 0) {
    frenzyT -= dt;
    if (!tray.length) { tray.push({ drink: DRINKS[0], fill: 0, mesh: null }); equip(); drawTray(); }
    el.eye.className = 'on amber'; el.eye.textContent = "DOUG'S SIXTY · " + Math.ceil(frenzyT) + 's · ' + frenzyScore.toLocaleString();
    if (frenzyT <= 0) {
      const best = store.get('bsb-sixty'), rec = frenzyScore > best; if (rec) store.set('bsb-sixty', frenzyScore);
      frenzyCool = time + 15; el.eye.className = ''; toast('TIME!'); audio.bell(); dougTalk = time + 6;
      say('doug', frenzyScore.toLocaleString() + (rec ? '. New house record. I am putting it on the wall.' : '. House record is ' + best.toLocaleString() + '. Sweeping up now.'), 5);
      headline("DOUG'S SIXTY: " + frenzyScore.toLocaleString() + ' POINTS OF DAMAGE'); story.event({ sixty: frenzyScore });
    }
  }
  // restroom: your reflection, and relief
  const rr = W.restroom;
  if (rr.inside(P.pos)) {
    rr.reflect(P.pos, P.yaw);
    if (!sawMirror && P.pos.z < 6 && P.pos.x < -9) { sawMirror = true; sayQ.push(['', pick(['You look incredible. You look like a sign for a bar.', 'So that is what you are made of. Huh. Glass tubes.'])]); }
  } else rr.me.group.visible = false;
  if (peeT > 0) {
    peeT -= dt; el.lids.style.setProperty('--lid', '0.42');
    if (peeT <= 0) { bladder = 0; pees++; el.lids.style.setProperty('--lid', '0'); audio.ahh(); say('', pick(['Better. So much better.', 'A new person walks out of here.', 'You read all the graffiti. Twice.']), 3); }
  }
  el.bladder.classList.toggle('on', bladder >= 0.5); el.bladder.classList.toggle('hot', bladder >= 1);
  el.bladderFill.style.width = Math.min(100, bladder * 100) + '%';
  if (partyT > 0) { partyT -= dt; if (Math.random() < dt * 14) { _c.set(P.pos.x + (Math.random() - 0.5) * 9, 3 + Math.random() * 2, P.pos.z + (Math.random() - 0.5) * 9); fx.confetti(_c, 14); } }
}

function updateHints(dt) {
  const h = tray[0];
  let p = '';
  if (menuOpen || dlg || peeT > 0) p = '';
  else if (W.restroom.inside(P.pos)) p = nearToilet() ? "<kbd>E</kbd> answer nature's call" : '';
  else if (talkTo) p = `<kbd>E</kbd> talk to <b>${CAST[talkTo].name}</b>` + (h && h.fill > 0 ? ' · <kbd>C</kbd> cheers' : '');
  else if (nearJuke() && !talkTo) p = '<kbd>E</kbd> change the song';
  else if (nearBar()) p = waiting.length && tray.length >= cap() ? 'hands full — your drink is waiting on the bar' : '<kbd>E</kbd> order · <kbd>T</kbd> tip Sal' + (nearSnacks() ? ' · <kbd>X</kbd> pretzels' : '');
  else if (h && h.fill > 0) p = '<kbd>hold click</kbd> drink' + (inRange() ? ' · <kbd>V</kbd> throw it full, you animal' : '');
  else if (h && inRange()) p = mode === 'charge' ? (lob ? 'release to lob' : 'release to throw') : '<kbd>hold click</kbd> fastball · <kbd>hold right-click</kbd> lob';
  else if (h) p = 'take your empty to the <b>Smash Range</b> →';
  else if (P.pos.z > 10.6 && story.phase === 'saved' && story.night === 1) p = '<kbd>E</kbd> call it a night';
  else if (P.pos.z > 10.3) p = '<kbd>W A S D</kbd> walk in';
  else p = waiting.length ? 'your drink is waiting on the bar' : inRange() ? (range.broken > 0.45 && time > restockT ? 'out of ammo — <kbd>R</kbd> rings for fresh targets' : "back to the bar for a drink · or <kbd>B</kbd> for Doug's Sixty") : 'belly up to the bar';
  setPrompt(p);
  if (menuOpen && !nearBar()) openMenu(false);
  if (!seenRange && inRange()) { seenRange = true; toast('THE SMASH RANGE'); say('', 'Finish a drink. Hurl the empty. Everything back there is fair game.', 5); }
  // the bartender drifts along the bar to wherever you're standing
  const b = W.bartender; b.serveT = Math.max(0, (b.serveT ?? 0) - dt);
  b.serve += ((b.serveT > 0 ? 1 : 0) - b.serve) * Math.min(1, dt * 8);
  if (P.pos.z < 1) b.group.position.x += (clamp(P.pos.x, -7, 3.4) - b.group.position.x) * Math.min(1, dt * 1.6);
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  slow -= dt;
  // if the machine is struggling, quietly drop the render resolution
  if (started && !paused && document.visibilityState === 'visible') {
    slowFor = dt > 1 / 36 ? slowFor + dt : Math.max(0, slowFor - dt * 2);
    if (slowFor > 4 && renderer.getPixelRatio() > 0.7) { const pr = renderer.getPixelRatio() > 1 ? 1 : 0.7; renderer.setPixelRatio(pr); composer.setPixelRatio(pr); composer.setSize(innerWidth, innerHeight); slowFor = 0; }
    saveT -= dt; if (saveT <= 0) { saveT = 5; try { localStorage.setItem('bsb-save', JSON.stringify({ s: story.dump(), score: G.score, tab: G.tab, smashed: G.smashed, gp: gpMoved })); } catch (e) { } }
  }
  tick(slow > 0 ? dt * 0.22 : dt);
  composer.render();
}
function tick(dt) {
  time += dt;
  W.update(time, dt); updateAir(dt);
  if (started && !paused) {
    updateNews(dt); updateMovers(dt); updateInspector(dt);
    updatePlayer(dt); updateServe(dt); updateAction(dt); updateDoug(dt); updateShots(dt); updateDrunk(dt); updateStory(dt); updateHints(dt);
    audio.setMix(d01(), smooth(7, 11, P.pos.x), smooth(9.6, 11.5, P.pos.z));
  } else if (!started) {
    camera.position.set(Math.sin(time * 0.2) * 0.6, 1.66, 15.2); camera.rotation.set(0.1, Math.sin(time * 0.15) * 0.04, 0);
  }
  range.active = started && !paused && inRange(); range.tempo = audio.tempo;
  range.update(dt, time); fx.update(dt);
}
requestAnimationFrame(frame);
$('#loading')?.remove(); $('#start').disabled = false;

// handy for poking at the game from the console
window.game = { P, D, G, tray, order, W, range, audio, shots, story, interact, DG, get mode() { return mode; }, get dlg() { return dlg; }, get talkTo() { return talkTo; },
  tp(x, z, yaw = P.yaw, pitch = P.pitch) { P.pos.set(x, 0, z); P.yaw = yaw; P.pitch = pitch; },
  press(v) { actionDown = v; }, IN, nightTwo, alt(v) { altDown = v; }, set happyNext(v) { happyNext = v; }, get bladder() { return bladder; }, set bladder(v) { bladder = v; },
  run(sec) { for (let i = 0; i < sec * 60; i++) tick(1 / 60); composer.render(); }, };
