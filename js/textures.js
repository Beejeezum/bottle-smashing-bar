// Every surface in the bar is painted at load time onto a canvas. No image files.
import * as THREE from 'three';

export function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const mk = (w, h = w) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
};

export function T(c, rx = 1, ry = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export async function loadFonts() {
  const fs = ['400 64px Monoton', '400 64px Pacifico', '400 64px "Bebas Neue"', '400 64px "Permanent Marker"'];
  try {
    await Promise.race([
      Promise.all(fs.map(f => document.fonts.load(f))),
      new Promise(r => setTimeout(r, 3500)),
    ]);
  } catch (e) { /* fall back to system fonts */ }
}

function speckle(g, s, n, R, max = 2, a = 0.08) {
  for (let i = 0; i < n; i++) {
    const v = R() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${R() * a})`;
    const r = 0.5 + R() * max;
    g.fillRect(R() * s, R() * s, r, r);
  }
}

export function wood({ size = 1024, planks = 8, base = [96, 60, 34], seed = 1, gap = 3 } = {}) {
  const R = mulberry(seed);
  const [c, g] = mk(size);
  const ph = size / planks;
  for (let i = 0; i < planks; i++) {
    const y = i * ph, k = 0.72 + R() * 0.5;
    g.fillStyle = `rgb(${base[0] * k | 0},${base[1] * k | 0},${base[2] * k | 0})`;
    g.fillRect(0, y, size, ph);
    for (let j = 0; j < 70; j++) {
      const yy = y + R() * ph, a = 0.04 + R() * 0.1;
      g.strokeStyle = R() < 0.55 ? `rgba(0,0,0,${a})` : `rgba(255,215,160,${a * 0.6})`;
      g.lineWidth = 0.5 + R() * 1.6;
      g.beginPath();
      const amp = R() * 4, f = 0.004 + R() * 0.01, p = R() * 6;
      for (let x = 0; x <= size; x += 16) {
        const v = yy + Math.sin(x * f + p) * amp;
        x ? g.lineTo(x, v) : g.moveTo(x, v);
      }
      g.stroke();
    }
    if (R() < 0.6) {
      const kx = R() * size, ky = y + ph * (0.3 + R() * 0.4);
      for (let r = 12; r > 1; r -= 2) {
        g.strokeStyle = 'rgba(30,15,5,.14)';
        g.beginPath(); g.ellipse(kx, ky, r * 2, r, 0, 0, 7); g.stroke();
      }
    }
    g.fillStyle = 'rgba(0,0,0,.6)';
    g.fillRect(0, y, size, gap);
    const jx = R() * size;
    g.fillRect(jx, y, gap, ph);
    g.fillRect((jx + size * 0.47) % size, y, gap, ph);
  }
  speckle(g, size, 5000, R, 1.5, 0.06);
  return c;
}

export function brick({ size = 1024, rows = 16, cols = 6, seed = 2, hue = 10, sat = 42, lit = 22 } = {}) {
  const R = mulberry(seed);
  const [c, g] = mk(size);
  g.fillStyle = '#17110f'; g.fillRect(0, 0, size, size);
  const bh = size / rows, bw = size / cols, m = 3;
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? bw / 2 : 0;
    for (let i = -1; i < cols; i++) {
      const x = i * bw + off, y = r * bh;
      g.fillStyle = `hsl(${hue + (R() - 0.5) * 14},${sat + (R() - 0.5) * 18}%,${lit + (R() - 0.5) * 12}%)`;
      g.fillRect(x + m, y + m, bw - 2 * m, bh - 2 * m);
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x + m, y + m, bw - 2 * m, 2);
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + m, y + bh - m - 3, bw - 2 * m, 3);
    }
  }
  speckle(g, size, 9000, R, 2.5, 0.12);
  return c;
}

export function concrete({ size = 1024, seed = 3, base = 88 } = {}) {
  const R = mulberry(seed);
  const [c, g] = mk(size);
  g.fillStyle = `rgb(${base},${base},${base + 3})`; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 70; i++) {
    const x = R() * size, y = R() * size, r = 40 + R() * 180;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const d = R() < 0.6 ? 0 : 255;
    gr.addColorStop(0, `rgba(${d},${d},${d},${0.05 + R() * 0.1})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  speckle(g, size, 16000, R, 2, 0.1);
  g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1.2;
  for (let i = 0; i < 7; i++) {
    let x = R() * size, y = R() * size;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 14; k++) { x += (R() - 0.5) * 80; y += (R() - 0.3) * 60; g.lineTo(x, y); }
    g.stroke();
  }
  return c;
}

export function corrugated({ size = 512, seed = 4, ribs = 14, color = [62, 78, 88] } = {}) {
  const R = mulberry(seed);
  const [c, g] = mk(size);
  for (let x = 0; x < size; x++) {
    const v = 0.5 + 0.5 * Math.sin(x / size * ribs * Math.PI * 2);
    const k = 0.45 + 0.6 * v;
    g.fillStyle = `rgb(${color[0] * k | 0},${color[1] * k | 0},${color[2] * k | 0})`;
    g.fillRect(x, 0, 1, size);
  }
  for (let i = 0; i < 40; i++) {
    const x = R() * size, y = R() * size, r = 10 + R() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(120,58,20,${0.15 + R() * 0.3})`); gr.addColorStop(1, 'rgba(120,58,20,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 3);
  }
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, size, 4);
  speckle(g, size, 4000, R, 1.5, 0.1);
  return c;
}

export function neon(text, { font = 'Monoton', px = 150, color = '#ff2d95', lh = 1.15, core = 0.55 } = {}) {
  const lines = text.split('\n');
  const [, g0] = mk(8);
  g0.font = `${px}px "${font}"`;
  const w = Math.ceil(Math.max(...lines.map(l => g0.measureText(l).width)) + px * 1.3);
  const h = Math.ceil(lines.length * px * lh + px * 0.9);
  const [c, g] = mk(w, h);
  g.font = `${px}px "${font}"`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => {
    const y = px * 0.45 + px * lh * (i + 0.5);
    g.shadowColor = color; g.fillStyle = color;
    g.globalAlpha = 0.9; g.shadowBlur = px * 0.38; g.fillText(l, w / 2, y);
    g.shadowBlur = px * 0.15; g.fillText(l, w / 2, y);
    g.shadowBlur = px * 0.04; g.globalAlpha = core; g.fillStyle = '#fff'; g.fillText(l, w / 2, y);
  });
  return c;
}

export function chalkboard(drinks) {
  const [c, g] = mk(1024, 720);
  g.fillStyle = '#3a2413'; g.fillRect(0, 0, 1024, 720);
  g.fillStyle = '#10201a'; g.fillRect(26, 26, 972, 668);
  const R = mulberry(11);
  for (let i = 0; i < 260; i++) {
    g.strokeStyle = `rgba(255,255,255,${R() * 0.03})`; g.lineWidth = 6 + R() * 30;
    g.beginPath(); const y = R() * 720; g.moveTo(R() * 400, y); g.lineTo(500 + R() * 520, y + (R() - 0.5) * 60); g.stroke();
  }
  g.textAlign = 'center'; g.fillStyle = '#ffe98a';
  g.font = '86px "Permanent Marker"'; g.fillText("TONIGHT'S POISON", 512, 120);
  g.textAlign = 'left'; g.font = '40px "Permanent Marker"';
  drinks.forEach((d, i) => {
    const y = 200 + i * 47;
    g.fillStyle = ['#ffffff', '#9df0ff', '#ffb3d1', '#c8ff9a'][i % 4];
    g.fillText(d.name, 80, y);
    g.fillStyle = '#ffe98a'; g.textAlign = 'right';
    g.fillText(d.strength < 0 ? 'free' : '$' + d.price, 944, y);
    g.textAlign = 'left';
  });
  return c;
}

export function rules() {
  const [c, g] = mk(640, 900);
  g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, 640, 900);
  const R = mulberry(8); speckle(g, 900, 5000, R, 3, 0.08);
  g.strokeStyle = '#b0201c'; g.lineWidth = 14; g.strokeRect(24, 24, 592, 852);
  g.fillStyle = '#b0201c'; g.textAlign = 'center';
  g.font = '110px "Bebas Neue"'; g.fillText('RANGE RULES', 320, 150);
  g.fillStyle = '#1a1512'; g.font = '50px "Bebas Neue"';
  ['1. FINISH YOUR DRINK', '2. THROW THE EMPTY', '3. AIM AWAY FROM DOUG', '4. NO REFUNDS', '5. NO CRYING', '6. YES, THE DUCKS TOO'].forEach((l, i) =>
    g.fillText(l, 320, 270 + i * 92));
  g.font = '34px "Permanent Marker"'; g.fillStyle = '#b0201c';
  g.fillText('— mgmt', 470, 840);
  return c;
}

export function bullseye() {
  const [c, g] = mk(512);
  const cols = ['#f4f1e6', '#d61f2c', '#f4f1e6', '#d61f2c', '#f4f1e6', '#ffd400'];
  cols.forEach((col, i) => {
    g.fillStyle = col; g.beginPath(); g.arc(256, 256, 250 - i * 42, 0, 7); g.fill();
  });
  g.strokeStyle = '#111'; g.lineWidth = 6; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.stroke();
  // off-centre mark so the spin is visible
  g.fillStyle = '#111'; g.beginPath(); g.arc(256, 60, 18, 0, 7); g.fill();
  return c;
}

export function melon() {
  const [c, g] = mk(256);
  g.fillStyle = '#1f6b2a'; g.fillRect(0, 0, 256, 256);
  const R = mulberry(5);
  for (let i = 0; i < 10; i++) {
    g.strokeStyle = '#0d3a14'; g.lineWidth = 8 + R() * 8;
    g.beginPath();
    for (let y = 0; y <= 256; y += 8) { const x = i * 25.6 + 12 + Math.sin(y * 0.15 + i) * 5; y ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  return c;
}

export function waves() {
  const [c, g] = mk(1024, 256);
  g.fillStyle = '#0b3a66'; g.fillRect(0, 0, 1024, 256);
  ['#1560a0', '#1d7fc4', '#3aa4e0'].forEach((col, k) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, 256);
    for (let x = 0; x <= 1024; x += 8) g.lineTo(x, 60 + k * 60 + Math.sin(x * 0.049 + k * 2) * 18);
    g.lineTo(1024, 256); g.fill();
  });
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 4;
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    for (let x = 0; x <= 1024; x += 8) { const y = 60 + k * 60 + Math.sin(x * 0.049 + k * 2) * 18; x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  return c;
}

export function mural() {
  const [c, g] = mk(2048, 880);
  g.clearRect(0, 0, 2048, 880);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '560px "Permanent Marker"';
  g.lineJoin = 'round';
  g.strokeStyle = '#0a0a0a'; g.lineWidth = 70; g.strokeText('SMASH!', 1024, 440);
  g.strokeStyle = '#ffffff'; g.lineWidth = 30; g.strokeText('SMASH!', 1024, 440);
  const gr = g.createLinearGradient(0, 150, 0, 730);
  gr.addColorStop(0, '#ffe600'); gr.addColorStop(0.5, '#ff5a1f'); gr.addColorStop(1, '#ff2d95');
  g.fillStyle = gr; g.fillText('SMASH!', 1024, 440);
  const R = mulberry(21);
  for (let i = 0; i < 26; i++) {
    const x = 200 + R() * 1650;
    g.fillStyle = ['#ff2d95', '#ffe600', '#00e5ff'][i % 3];
    g.fillRect(x, 640 + R() * 40, 8 + R() * 8, 60 + R() * 170);
  }
  return c;
}

export function skyline() {
  const [c, g] = mk(1024, 512);
  g.fillStyle = '#05060a'; g.fillRect(0, 0, 1024, 512);
  const R = mulberry(31);
  for (let x = 0; x < 1024;) {
    const w = 40 + R() * 90, h = 120 + R() * 330;
    g.fillStyle = `rgb(${10 + R() * 8 | 0},${11 + R() * 8 | 0},${18 + R() * 10 | 0})`;
    g.fillRect(x, 512 - h, w, h);
    for (let wy = 512 - h + 12; wy < 500; wy += 16)
      for (let wx = x + 6; wx < x + w - 8; wx += 12)
        if (R() < 0.22) { g.fillStyle = R() < 0.8 ? 'rgba(255,205,120,.75)' : 'rgba(140,220,255,.75)'; g.fillRect(wx, wy, 6, 8); }
    x += w + 2;
  }
  return c;
}

export function stripes(cols = ['#ff2d95', '#ffe600', '#00c2ff', '#7cff3a', '#ff7a00']) {
  const [c, g] = mk(256);
  const h = 256 / 10;
  for (let i = 0; i < 10; i++) {
    g.fillStyle = cols[i % cols.length]; g.fillRect(0, i * h, 256, h);
    g.fillStyle = 'rgba(0,0,0,.18)';
    for (let x = 0; x < 256; x += 10) g.fillRect(x, i * h + h * 0.6, 2, h * 0.4);
  }
  return c;
}

export function jukebox() {
  const [c, g] = mk(256, 384);
  g.fillStyle = '#120a06'; g.fillRect(0, 0, 256, 384);
  ['#ff2d95', '#ffb300', '#00e5ff', '#9dff00'].forEach((col, i) => {
    g.strokeStyle = col; g.lineWidth = 12; g.shadowColor = col; g.shadowBlur = 16;
    g.beginPath(); g.arc(128, 150, 112 - i * 22, Math.PI, 0); g.lineTo(128 + 112 - i * 22, 360); g.moveTo(128 - 112 + i * 22, 150); g.lineTo(128 - 112 + i * 22, 360); g.stroke();
  });
  g.shadowBlur = 0; g.fillStyle = '#ffe9b0';
  for (let i = 0; i < 5; i++) g.fillRect(98, 190 + i * 30, 60, 14);
  return c;
}

export function portrait() {
  const [c, g] = mk(256, 358);
  const bg = g.createLinearGradient(0, 0, 0, 358); bg.addColorStop(0, '#2a3a2c'); bg.addColorStop(1, '#101a14');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 358);
  g.fillStyle = '#14161c'; g.beginPath(); g.ellipse(128, 372, 120, 110, 0, 0, 7); g.fill();          // suit
  g.fillStyle = '#f2f2f2'; g.beginPath(); g.moveTo(108, 268); g.lineTo(148, 268); g.lineTo(128, 320); g.fill();
  g.fillStyle = '#8a1420'; g.beginPath(); g.moveTo(120, 272); g.lineTo(136, 272); g.lineTo(128, 312); g.fill();
  g.fillStyle = '#e6c2a0'; g.beginPath(); g.ellipse(128, 190, 58, 74, 0, 0, 7); g.fill();            // head
  g.fillStyle = '#0c0c10'; g.fillRect(52, 112, 152, 14); g.fillRect(78, 22, 100, 96);                // top hat
  g.fillStyle = '#8a1420'; g.fillRect(78, 96, 100, 12);
  g.strokeStyle = '#2a1a10'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(88, 160); g.lineTo(116, 168); g.moveTo(140, 164); g.lineTo(170, 152); g.stroke(); // smug brows
  g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(104, 182, 5, 0, 7); g.arc(154, 180, 5, 0, 7); g.fill();
  g.strokeStyle = '#d9a520'; g.lineWidth = 4; g.beginPath(); g.arc(154, 180, 17, 0, 7); g.moveTo(168, 190); g.lineTo(178, 250); g.stroke(); // monocle
  g.strokeStyle = '#3a2413'; g.lineWidth = 8; g.beginPath(); g.moveTo(92, 226); g.quadraticCurveTo(110, 208, 128, 222); g.quadraticCurveTo(146, 208, 164, 226); g.stroke();
  g.strokeStyle = '#7a3a30'; g.lineWidth = 3; g.beginPath(); g.moveTo(116, 240); g.quadraticCurveTo(134, 246, 146, 236); g.stroke();
  return c;
}

export function forsale() {
  const [c, g] = mk(512, 336);
  g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, 512, 336);
  g.fillStyle = '#c0181f'; g.fillRect(0, 0, 512, 150);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '132px "Bebas Neue"'; g.fillText('FOR SALE', 256, 124);
  g.fillStyle = '#14161c'; g.font = '52px "Bebas Neue"'; g.fillText('LUXURY CONDOS', 256, 212); g.fillText('COMING SOON', 256, 268);
  g.font = '26px "Bebas Neue"'; g.fillStyle = '#c0181f'; g.fillText('PEMBERTON HOLDINGS', 256, 314);
  return c;
}
