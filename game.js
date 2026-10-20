/* Velocity 15K: pseudo-3D motorbike racer. Vanilla JS + Canvas 2D, no dependencies. */
'use strict';
(() => {
// ---------------------------------------------------------------- constants
const TIME_SCALE = 3;          // game seconds per real second (at 100% game speed)
const RACE_KM = 15, LAP_KM = 2.4;
const SEG = 200;               // world units per road segment
const UPM = 100;               // world units per metre -> 1 segment = 2 m
const ROAD_W = 2000;           // half road width in units
const LANES = 4, RUMBLE = 3, DRAW_DIST = 300;
const CAM_H = 1000, FOV = 100;
const CAM_DEPTH = 1 / Math.tan((FOV / 2) * Math.PI / 180);
const PLAYER_Z = CAM_H * CAM_DEPTH;
const BOOST_ADD = 20, PICKUP_RESPAWN = 6;
const START_Z = 120 * SEG;
const N_RIDERS = 15;
const KM_UNITS = 1000 * UPM;
const LANE_X = [-0.75, -0.25, 0.25, 0.75];
let trackLen = 1, finishZ = 1, laps = 1, circuit = false, loc = null;

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const mod = (a, n) => ((a % n) + n) % n;
const easeIn = (a, b, p) => a + (b - a) * p * p;
const easeInOut = (a, b, p) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);
const rgb = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const fmtTime = s => { s = Math.max(0, s); const m = Math.floor(s / 60); const r = s - m * 60; return `${m}:${r < 10 ? '0' : ''}${r.toFixed(1)}`; };
const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
function pickW(obj, R) { let tot = 0; for (const k in obj) tot += obj[k]; let r = R() * tot; for (const k in obj) { r -= obj[k]; if (r <= 0) return k; } return Object.keys(obj)[0]; }

// ---------------------------------------------------------------- settings
const prefersRM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const defaults = { assist: 'off', autoAccel: false, gameSpeed: 1, difficulty: 'normal', sound: true, hc: false, rm: prefersRM, announce: true, touch: 'auto',
  bike: 'naked', color: '#ff3d6e', race: 'sprint', loc: 'tour', traffic: 'light' };
let settings = Object.assign({}, defaults);
try { Object.assign(settings, JSON.parse(localStorage.getItem('v15k-settings') || '{}')); } catch (e) { }
const saveSettings = () => { try { localStorage.setItem('v15k-settings', JSON.stringify(settings)); } catch (e) { } };

// ---------------------------------------------------------------- canvas
const canvas = $('game'), ctx = canvas.getContext('2d');
let W = 0, H = 0, KX = 0, KY = 0, HY = 0;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let w = innerWidth * dpr, h = innerHeight * dpr;
  const maxW = 1600; if (w > maxW) { h *= maxW / w; w = maxW; }
  W = canvas.width = Math.max(320, Math.round(w)); H = canvas.height = Math.max(240, Math.round(h));
  KX = W / 2; if (H > W) { HY = H * 0.46; KY = H * 0.3; } else { HY = H * 0.5; KY = Math.min(H / 2, W * 0.4); }
}
addEventListener('resize', resize); resize();

function mk(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fill(); }
function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
function ell(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); }
function poly(g, pts, fill) { if (fill) g.fillStyle = fill; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); }
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); return rgb([clamp((n >> 16) * f, 0, 255), clamp((n >> 8 & 255) * f, 0, 255), clamp((n & 255) * f, 0, 255)]); }
function txt(g, t, x, y, font, col, maxW) { g.fillStyle = col; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y, maxW); }
// ---------------------------------------------------------------- scenery sprites (procedural)
const S = {};
function buildSprites() {
  S.tree = mk(200, 260, (g) => {
    g.fillStyle = '#6b4423'; rr(g, 88, 150, 24, 110, 6);
    const blobs = [[100, 70, 62], [60, 110, 48], [140, 110, 48], [100, 130, 55], [70, 60, 36], [130, 60, 36]];
    g.fillStyle = '#1f6b2a'; blobs.forEach(b => circ(g, b[0], b[1] + 6, b[2]));
    g.fillStyle = '#2f8f3a'; blobs.forEach(b => circ(g, b[0] - 4, b[1], b[2] * 0.9));
    g.fillStyle = '#4fb14f'; blobs.forEach(b => circ(g, b[0] - 12, b[1] - 10, b[2] * 0.45));
  });
  S.pine = mk(160, 300, (g) => {
    g.fillStyle = '#5a3a1e'; g.fillRect(72, 230, 16, 70);
    for (let i = 0; i < 4; i++) { const y = 20 + i * 52, hw = 30 + i * 18; poly(g, [80, y, 80 + hw, y + 90, 80 - hw, y + 90], '#0f4d2a'); poly(g, [80, y, 80 - hw * 0.1, y + 90, 80 - hw, y + 90], '#1d6e3b'); }
  });
  S.bush = mk(160, 90, (g) => { g.fillStyle = '#2b7a2f'; circ(g, 45, 55, 35); circ(g, 85, 45, 42); circ(g, 120, 58, 32); g.fillStyle = '#46a04a'; circ(g, 75, 35, 20); circ(g, 40, 45, 15); });
  S.cactus = mk(100, 200, (g) => { g.fillStyle = '#2f7d3a'; rr(g, 38, 20, 24, 180, 12); rr(g, 10, 70, 18, 60, 9); rr(g, 10, 112, 40, 18, 9); rr(g, 72, 50, 18, 60, 9); rr(g, 50, 96, 40, 18, 9); g.fillStyle = '#4aa556'; g.fillRect(44, 24, 4, 170); });
  S.rock = mk(200, 120, (g) => { poly(g, [10, 120, 30, 50, 80, 15, 140, 25, 185, 70, 195, 120], '#8a6f5a'); poly(g, [30, 50, 80, 15, 140, 25, 100, 60], '#a88a72'); });
  S.palm = mk(220, 340, (g) => {
    g.strokeStyle = '#8b6a3e'; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(110, 340); g.quadraticCurveTo(90, 200, 120, 70); g.stroke();
    g.fillStyle = '#1f8a3a';
    for (let a = 0; a < 7; a++) { const ang = -Math.PI + a * Math.PI / 6; g.save(); g.translate(120, 70); g.rotate(ang); g.beginPath(); g.ellipse(55, 0, 60, 13, 0.25, 0, Math.PI * 2); g.fill(); g.restore(); }
    g.fillStyle = '#5a3a1e'; circ(g, 115, 80, 9); circ(g, 128, 82, 9);
  });
  const lamp = (flip, glow) => mk(120, 320, (g) => {
    if (flip) { g.translate(120, 0); g.scale(-1, 1); }
    g.fillStyle = '#4a4f5a'; g.fillRect(14, 30, 10, 290); g.fillRect(14, 30, 80, 8);
    if (glow) { const gr = g.createRadialGradient(93, 44, 2, 93, 44, 26); gr.addColorStop(0, 'rgba(255,240,170,.9)'); gr.addColorStop(1, 'rgba(255,240,170,0)'); g.fillStyle = gr; g.fillRect(60, 14, 70, 60); }
    g.fillStyle = '#fff3b0'; rr(g, 78, 36, 30, 10, 4);
  });
  S.lampR = lamp(false); S.lampL = lamp(true); S.lampRn = lamp(false, true); S.lampLn = lamp(true, true);
  S.house = ['#f6c6d0', '#bde4f4', '#fff1b8'].map(col => mk(260, 200, (g) => {
    g.fillStyle = col; g.fillRect(20, 80, 220, 120); poly(g, [5, 85, 130, 10, 255, 85], '#b5523b');
    g.fillStyle = '#4a7fb0'; g.fillRect(50, 110, 40, 36); g.fillRect(170, 110, 40, 36); g.fillStyle = '#6b4423'; g.fillRect(112, 130, 36, 70);
  }));
  S.barn = mk(260, 200, g => { g.fillStyle = '#a8322d'; g.fillRect(20, 70, 220, 130); poly(g, [10, 75, 130, 10, 250, 75], '#6b1f1c'); g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(95, 120, 70, 80); g.beginPath(); g.moveTo(95, 120); g.lineTo(165, 200); g.moveTo(165, 120); g.lineTo(95, 200); g.stroke(); });
  S.km = []; for (let k = 0; k <= 15; k++) S.km[k] = mk(150, 210, (g) => {
    g.fillStyle = '#777'; g.fillRect(68, 100, 14, 110);
    g.fillStyle = '#fff'; rr(g, 4, 4, 142, 100, 12); g.fillStyle = '#0a7a3c'; rr(g, 10, 10, 130, 88, 9);
    txt(g, k + '', 75, 46, '900 46px system-ui,Arial', '#fff'); txt(g, 'KM TO GO', 75, 82, '700 18px system-ui,Arial', '#fff');
  });
  const banner = (t, col) => mk(900, 260, (g) => {
    g.fillStyle = '#ddd'; g.fillRect(20, 40, 24, 220); g.fillRect(856, 40, 24, 220);
    g.fillStyle = col; g.fillRect(20, 20, 860, 90);
    const sq = 15; for (let x = 0; x < 860; x += sq) for (let y = 0; y < 2; y++) { g.fillStyle = ((x / sq + y) % 2) ? '#000' : '#fff'; g.fillRect(20 + x, 110 + y * sq, sq, sq); }
    txt(g, t, 450, 66, 'italic 900 70px system-ui,Arial', '#fff', 820);
  });
  S.startBanner = banner('START', '#c8102e'); S.finishBanner = banner('FINISH', '#1b2a6b'); S.lapBanner = banner('START · FINISH', '#c8102e');
  const bolt = g => { g.beginPath(); g.moveTo(72, 18); g.lineTo(40, 70); g.lineTo(62, 70); g.lineTo(52, 110); g.lineTo(88, 54); g.lineTo(66, 54); g.closePath(); };
  S.boost = mk(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 6, 64, 64, 62); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, '#5fe6ff'); gr.addColorStop(0.75, 'rgba(60,80,255,.85)'); gr.addColorStop(1, 'rgba(60,80,255,0)');
    g.fillStyle = gr; circ(g, 64, 64, 62); g.fillStyle = '#ffe24a'; g.strokeStyle = '#7a4b00'; g.lineWidth = 3; bolt(g); g.fill(); g.stroke();
  });
  S.boostHC = mk(128, 128, (g) => { g.fillStyle = '#00ffff'; circ(g, 64, 64, 56); g.lineWidth = 8; g.strokeStyle = '#fff'; g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.stroke(); g.fillStyle = '#000'; bolt(g); g.fill(); });
}
function makeBoard(t, bg, fg, neon) {
  return mk(320, 220, (g) => {
    g.fillStyle = '#555'; g.fillRect(60, 120, 14, 100); g.fillRect(246, 120, 14, 100);
    g.fillStyle = '#222'; g.fillRect(6, 6, 308, 128); g.fillStyle = bg; g.fillRect(14, 14, 292, 112);
    if (neon) { g.shadowColor = fg; g.shadowBlur = 18; }
    txt(g, t, 160, 72, 'italic 900 44px system-ui,Arial', fg, 280);
  });
}
// building generator, styled per city
function makeBuilding(R, st) {
  const bw = 220 + (R() * 100 | 0), bh = st.h[0] + (R() * (st.h[1] - st.h[0]) | 0);
  const col = st.cols[(R() * st.cols.length) | 0];
  const c = mk(bw, bh, (g) => {
    let top = 8;
    if (st.roof === 'mansard') { top = 46; poly(g, [0, 48, 18, 6, bw - 18, 6, bw, 48], '#5d6878'); g.fillStyle = '#cfd6df'; for (let x = 30; x < bw - 30; x += 46) rr(g, x, 18, 18, 22, 4); }
    else if (st.roof === 'dome' && R() < 0.5) { top = 50; g.fillStyle = shade(col, 0.85); g.beginPath(); g.arc(bw / 2, 52, bw * 0.22, Math.PI, 0); g.fill(); }
    g.fillStyle = col; g.fillRect(0, top, bw, bh - top);
    if (st.roof !== 'mansard') { g.fillStyle = shade(col, 0.72); g.fillRect(0, top - 6, bw, 12); }
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(bw - 18, top, 18, bh);
    if (st.glass && R() < 0.6) {
      const gr = g.createLinearGradient(0, 0, bw, 0); gr.addColorStop(0, st.night ? '#1b2a44' : '#7fa7c9'); gr.addColorStop(0.5, st.night ? '#33507a' : '#cfe3f3'); gr.addColorStop(1, st.night ? '#162238' : '#6b93b8');
      g.fillStyle = gr; g.fillRect(10, top + 10, bw - 30, bh - top - 50);
      g.fillStyle = 'rgba(0,0,0,.15)'; for (let y = top + 10; y < bh - 40; y += 18) g.fillRect(10, y, bw - 30, 2);
      if (st.night) { g.fillStyle = '#ffe9a6'; for (let i = 0; i < 40; i++) g.fillRect(12 + R() * (bw - 40), top + 12 + R() * (bh - top - 60), 10, 6); }
    } else {
      const cols = Math.floor((bw - 30) / 34), rows = Math.floor((bh - top - 70) / 40);
      for (let r = 0; r < rows; r++) {
        for (let k = 0; k < cols; k++) { g.fillStyle = R() < st.lit ? st.litCol : st.win; g.fillRect(16 + k * 34, top + 18 + r * 40, 22, 26); }
        if (st.balcony) { g.fillStyle = 'rgba(40,40,40,.55)'; g.fillRect(10, top + 44 + r * 40, bw - 30, 4); }
        if (st.brick) { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, top + 12 + r * 40, bw, 3); }
      }
    }
    if (st.neon) {
      const nc = ['#ff2bd6', '#29f0ff', '#ffe600', '#ff4040', '#7dff4a'];
      for (let i = 0; i < 2; i++) { const x = 14 + R() * (bw - 70), y = top + 30 + R() * (bh * 0.4), c1 = nc[(R() * 5) | 0];
        g.shadowColor = c1; g.shadowBlur = 16; g.fillStyle = '#111'; g.fillRect(x, y, 34, 120); g.fillStyle = c1; for (let k = 0; k < 4; k++) g.fillRect(x + 8, y + 10 + k * 27, 18, 16); g.shadowBlur = 0; }
    }
    g.fillStyle = st.night ? '#ffcf70' : '#3a2a1a'; g.fillRect(bw / 2 - 18, bh - 46, 36, 46);
  });
  c.ww = 2600 + (bw - 220) * 12; return c;
}

// ---------------------------------------------------------------- bikes
const BIKES = [
  { id: 'scooter', name: 'City Scooter', short: 'Scooter', top: 70, acc: 24, hand: 1.25, boost: 6, off: 35, w: 260, desc: 'Nippy and easy to steer, but slow at the top end. Long boosts.' },
  { id: 'commuter', name: 'Commuter 125', short: 'Commuter', top: 85, acc: 20, hand: 1.15, boost: 5, off: 45, w: 270, desc: 'Light, forgiving everyday bike.' },
  { id: 'electric', name: 'Volt E-Moto', short: 'Electric', top: 95, acc: 32, hand: 1.1, boost: 4, off: 40, w: 280, desc: 'Silent, with instant torque. Fastest off the line, short boosts.' },
  { id: 'cafe', name: 'Café Racer', short: 'Café racer', top: 100, acc: 22, hand: 1.12, boost: 5, off: 40, w: 290, desc: 'Retro looks, sharp handling, standard 100 km/h.' },
  { id: 'naked', name: 'Street Naked', short: 'Naked', top: 100, acc: 22, hand: 1.05, boost: 5, off: 45, w: 300, desc: 'The all-round standard bike: 100 km/h, boosts to 120.' },
  { id: 'sport', name: 'Superbike RR', short: 'Superbike', top: 110, acc: 27, hand: 0.95, boost: 4, off: 35, w: 300, desc: 'Highest top speed (110, boosts to 130), but twitchy and hates grass.' },
  { id: 'dirt', name: 'Motocross MX', short: 'Motocross', top: 90, acc: 25, hand: 1.2, boost: 5, off: 80, w: 260, desc: 'Barely slows on grass or sand. Great for shortcuts round traffic.' },
  { id: 'adventure', name: 'Adventure GS', short: 'Adventure', top: 98, acc: 19, hand: 1.0, boost: 6, off: 70, w: 340, desc: 'Big, comfortable all-terrain tourer, good off-road.' },
  { id: 'cruiser', name: 'V-Twin Cruiser', short: 'Cruiser', top: 95, acc: 17, hand: 0.8, boost: 6, off: 40, w: 340, desc: 'Low, long and heavy. Lazy steering, long boosts.' },
  { id: 'touring', name: 'Grand Tourer', short: 'Tourer', top: 100, acc: 16, hand: 0.85, boost: 7, off: 45, w: 360, desc: 'Huge and stable. Slow to accelerate, longest boosts.' }
];
const BIKE = id => BIKES.find(b => b.id === id) || BIKES[4];
const COLORS = [['#ff3d6e', 'Racing pink'], ['#c8102e', 'Red'], ['#ff8a3d', 'Orange'], ['#ffd23f', 'Yellow'], ['#2fbf71', 'Green'], ['#29d3ff', 'Sky blue'], ['#1b4fd8', 'Blue'], ['#7b5cff', 'Purple'], ['#f2f2f2', 'White'], ['#2b2b2b', 'Black']];

function bikeBack(type, color, helmet, num) {
  return mk(160, 210, (g) => {
    const T = type, dark = shade(color, 0.7), mid = shade(color, 0.85);
    g.fillStyle = 'rgba(0,0,0,.35)'; ell(g, 80, 201, (T === 'touring' || T === 'cruiser' || T === 'adventure') ? 68 : 58, 9);
    const tw = { scooter: 30, commuter: 28, electric: 34, cafe: 34, naked: 36, sport: 40, dirt: 24, adventure: 34, cruiser: 48, touring: 40 }[T] || 36;
    const th = T === 'scooter' ? 48 : 72;
    g.fillStyle = '#111'; rr(g, 80 - tw / 2, 202 - th, tw, th, tw * 0.4);
    if (T === 'dirt') { g.fillStyle = '#2a2a2a'; for (let y = 140; y < 198; y += 8) { g.fillRect(80 - tw / 2 - 4, y, 5, 5); g.fillRect(80 + tw / 2 - 1, y, 5, 5); } }
    else { g.fillStyle = '#333'; for (let y = 210 - th; y < 196; y += 9) g.fillRect(80 - tw / 2 + 4, y, tw - 8, 3); }
    if (T === 'touring' || T === 'adventure') { g.fillStyle = T === 'touring' ? dark : '#3b3f46'; rr(g, 6, 104, 42, 54, 8); rr(g, 112, 104, 42, 54, 8); if (T === 'adventure') { g.fillStyle = '#9aa0a8'; g.fillRect(6, 104, 42, 5); g.fillRect(112, 104, 42, 5); } }
    g.fillStyle = '#c0c4cc';
    if (T === 'cruiser') { rr(g, 8, 160, 46, 12, 6); rr(g, 106, 160, 46, 12, 6); }
    else if (T === 'dirt') rr(g, 102, 100, 16, 30, 6);
    else if (T === 'sport') { rr(g, 98, 114, 18, 26, 6); }
    else if (T === 'scooter') rr(g, 100, 166, 26, 10, 5);
    else if (T === 'commuter') rr(g, 100, 146, 26, 11, 5);
    else if (T !== 'electric' && T !== 'touring' && T !== 'adventure') { rr(g, 34, 142, 26, 13, 6); rr(g, 100, 142, 26, 13, 6); g.fillStyle = '#555'; circ(g, 36, 148, 5); circ(g, 124, 148, 5); }
    else if (T !== 'electric') { rr(g, 102, 150, 22, 12, 5); }
    // tail / body
    let lightY = 120, plate = true;
    switch (T) {
      case 'scooter': g.fillStyle = color; rr(g, 38, 100, 84, 74, 30); g.fillStyle = mid; rr(g, 48, 106, 64, 20, 8); lightY = 128; break;
      case 'commuter': poly(g, [50, 150, 110, 150, 102, 110, 58, 110], mid); g.fillStyle = '#333'; g.fillRect(48, 100, 64, 7); break;
      case 'cafe': g.fillStyle = color; ell(g, 80, 112, 32, 22); g.fillStyle = '#5a3a1e'; rr(g, 58, 92, 44, 14, 6); poly(g, [52, 150, 108, 150, 100, 116, 60, 116], mid); break;
      case 'sport': poly(g, [58, 150, 102, 150, 94, 92, 66, 92], color); poly(g, [66, 92, 94, 92, 88, 80, 72, 80], dark); lightY = 108; break;
      case 'dirt': g.fillStyle = color; rr(g, 64, 80, 32, 70, 8); g.fillStyle = '#fff'; rr(g, 68, 120, 24, 18, 4); plate = false; lightY = 108; break;
      case 'adventure': poly(g, [50, 150, 110, 150, 102, 108, 58, 108], mid); g.fillStyle = '#2b2f36'; rr(g, 54, 84, 52, 34, 6); break;
      case 'cruiser': g.fillStyle = color; rr(g, 50, 114, 60, 48, 24); g.fillStyle = '#4a2d18'; rr(g, 54, 100, 52, 18, 8); g.fillStyle = '#c0c4cc'; g.fillRect(52, 72, 6, 40); g.fillRect(102, 72, 6, 40); g.fillRect(52, 72, 56, 6); lightY = 132; break;
      case 'touring': poly(g, [48, 150, 112, 150, 104, 108, 56, 108], mid); g.fillStyle = dark; rr(g, 50, 76, 60, 42, 9); g.fillStyle = '#ff2a2a'; g.fillRect(56, 104, 48, 5); break;
      case 'electric': poly(g, [52, 150, 108, 150, 100, 108, 60, 108], color); g.save(); g.shadowColor = '#29f0ff'; g.shadowBlur = 12; g.fillStyle = '#29f0ff'; g.fillRect(58, 112, 44, 5); g.restore(); lightY = 122; break;
      default: poly(g, [46, 150, 114, 150, 104, 108, 56, 108], mid);
    }
    g.fillStyle = '#ff2a2a'; rr(g, 64, lightY, 32, 8, 3);
    if (plate) { g.fillStyle = '#f2f2f2'; rr(g, 66, lightY + 14, 28, 12, 2); txt(g, num, 80, lightY + 20.5, '700 10px Arial', '#111'); }
    // rider
    const tuck = T === 'sport' ? 14 : T === 'cafe' ? 8 : (T === 'cruiser' || T === 'scooter' || T === 'touring') ? -6 : 0;
    const ty = 50 + tuck;
    if (T !== 'scooter') { g.fillStyle = T === 'dirt' ? '#e8e8e8' : '#20232b'; rr(g, 36, ty + 46, 22, 54, 10); rr(g, 102, ty + 46, 22, 54, 10); g.fillStyle = '#111'; rr(g, 34, 140, 26, 14, 5); rr(g, 100, 140, 26, 14, 5); }
    g.fillStyle = color === '#2b2b2b' ? '#444' : color;
    g.beginPath(); g.moveTo(44, ty + 62); g.quadraticCurveTo(40, ty + 20, 58, ty); g.lineTo(102, ty); g.quadraticCurveTo(120, ty + 20, 116, ty + 62); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(56, ty + 6, 6, 50); g.fillRect(98, ty + 6, 6, 50);
    const barW = { cruiser: 150, touring: 132, dirt: 146, adventure: 140, sport: 116, cafe: 112 }[T] || 124, barY = T === 'cruiser' ? ty - 4 : ty + 12;
    g.fillStyle = shade(color === '#2b2b2b' ? '#555555' : color, 0.7); rr(g, 80 - barW / 2 + 10, barY, 34, 14, 7); rr(g, 80 + barW / 2 - 44, barY, 34, 14, 7);
    g.fillStyle = '#222'; g.fillRect(80 - barW / 2, barY + 2, 14, 10); g.fillRect(80 + barW / 2 - 14, barY + 2, 14, 10);
    g.fillStyle = '#ffffff'; circ(g, 80, ty + 32, 15); txt(g, num, 80, ty + 33, '900 16px Arial', '#111', 26);
    g.fillStyle = helmet; circ(g, 80, ty - 16, 24); g.fillStyle = color; g.fillRect(76, ty - 40, 8, 48);
    if (T === 'dirt') { g.fillStyle = color; g.fillRect(54, ty - 44, 52, 8); }
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(80, ty - 16, 24, 0.2, Math.PI - 0.2); g.fill();
  });
}
function wheel(g, x, y, r, knobby, spokes) {
  g.fillStyle = '#151515'; circ(g, x, y, r);
  if (knobby) { g.fillStyle = '#151515'; for (let a = 0; a < 20; a++) { const t = a / 20 * Math.PI * 2; g.fillRect(x + Math.cos(t) * r - 2.5, y + Math.sin(t) * r - 2.5, 5, 5); } }
  g.fillStyle = '#9aa0a8'; circ(g, x, y, r * 0.66); g.fillStyle = '#2b2b2b'; circ(g, x, y, r * 0.56);
  g.strokeStyle = '#b8bec6'; g.lineWidth = spokes ? 1.2 : 4; g.beginPath();
  const n = spokes ? 16 : 5; for (let a = 0; a < n; a++) { const t = a / n * Math.PI * 2; g.moveTo(x, y); g.lineTo(x + Math.cos(t) * r * 0.56, y + Math.sin(t) * r * 0.56); } g.stroke();
  g.fillStyle = '#ccc'; circ(g, x, y, r * 0.14);
}
function bikeSide(type, color) {
  return mk(260, 160, (g) => {
    const T = type, dark = shade(color, 0.7), gy = 150, seat = '#2a2522';
    const line = (pts, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); };
    g.fillStyle = 'rgba(0,0,0,.3)'; ell(g, 130, gy + 3, 110, 6);
    switch (T) {
      case 'scooter': {
        wheel(g, 64, gy - 20, 20); wheel(g, 196, gy - 20, 20);
        line([196, gy - 20, 182, 52], '#777', 6); line([170, 44, 196, 44], '#333', 5);
        poly(g, [30, 104, 52, 76, 120, 74, 128, 108, 104, 124, 38, 124], color); // rear body
        poly(g, [104, 124, 168, 124, 176, 112, 120, 112], dark);                   // floor
        poly(g, [168, 124, 194, 60, 182, 52, 160, 110], color);                    // apron
        g.fillStyle = seat; rr(g, 50, 66, 70, 14, 7); g.fillStyle = '#fff6b0'; circ(g, 186, 56, 6); break; }
      case 'commuter': {
        wheel(g, 62, gy - 26, 26, false, true); wheel(g, 200, gy - 26, 26, false, true);
        line([200, gy - 26, 178, 50], '#888', 6); line([62, gy - 26, 120, gy - 34], '#555', 6);
        line([100, 100, 170, 64, 120, 70, 90, 100], '#444', 5); g.fillStyle = '#333'; rr(g, 96, 92, 40, 30, 5);
        g.fillStyle = color; ell(g, 140, 68, 26, 13); g.fillStyle = seat; rr(g, 66, 62, 70, 10, 5);
        g.fillStyle = '#555'; g.fillRect(40, 60, 34, 5); line([110, 118, 40, 112], '#c0c4cc', 6);
        poly(g, [36, 70, 70, 62, 72, 74, 40, 80], color); line([170, 40, 190, 38], '#333', 4); g.fillStyle = '#fff6b0'; circ(g, 192, 56, 7); break; }
      case 'electric': {
        wheel(g, 62, gy - 27, 27); wheel(g, 202, gy - 27, 27);
        line([202, gy - 27, 180, 46], '#666', 7); line([62, gy - 27, 120, gy - 40], '#444', 8);
        poly(g, [86, 112, 160, 112, 176, 60, 120, 56, 90, 76], color); g.fillStyle = '#1d2230'; rr(g, 100, 78, 56, 30, 6);
        g.save(); g.shadowColor = '#29f0ff'; g.shadowBlur = 10; g.fillStyle = '#29f0ff'; g.fillRect(104, 92, 48, 4); g.restore();
        poly(g, [40, 62, 96, 60, 92, 72, 44, 74], dark); g.fillStyle = seat; rr(g, 70, 54, 56, 10, 5); line([172, 38, 192, 36], '#333', 4); g.fillStyle = '#bff8ff'; rr(g, 186, 50, 10, 14, 4); break; }
      case 'cafe': {
        wheel(g, 60, gy - 27, 27, false, true); wheel(g, 200, gy - 27, 27, false, true);
        line([200, gy - 27, 176, 54], '#888', 6); line([60, gy - 27, 118, gy - 40], '#555', 6);
        g.fillStyle = '#333'; rr(g, 100, 88, 50, 36, 6); line([110, 120, 40, 104], '#c0c4cc', 6);
        g.fillStyle = color; ell(g, 140, 66, 34, 15); g.fillStyle = seat; rr(g, 64, 60, 56, 10, 5); g.fillStyle = color; ell(g, 58, 60, 18, 12);
        line([170, 62, 196, 66], '#333', 4); g.fillStyle = '#ddd'; circ(g, 192, 62, 9); g.fillStyle = '#fff6b0'; circ(g, 194, 62, 6); break; }
      case 'sport': {
        wheel(g, 60, gy - 27, 27); wheel(g, 202, gy - 27, 27);
        line([202, gy - 27, 182, 54], '#c9a227', 7); line([60, gy - 27, 120, gy - 36], '#333', 8);
        poly(g, [96, 124, 160, 126, 200, 96, 204, 66, 176, 46, 130, 58, 100, 78], color);
        poly(g, [176, 46, 196, 40, 204, 66], 'rgba(40,60,90,.8)'); poly(g, [30, 50, 102, 66, 100, 78, 40, 66], color);
        g.fillStyle = seat; rr(g, 78, 56, 40, 9, 4); g.fillStyle = '#fff'; poly(g, [110, 90, 170, 80, 160, 96, 112, 104], 'rgba(255,255,255,.75)');
        line([100, 120, 70, 108], '#c0c4cc', 7); g.fillStyle = '#fff6b0'; poly(g, [196, 70, 206, 70, 204, 80, 194, 78]); break; }
      case 'dirt': {
        wheel(g, 60, gy - 31, 31, true, true); wheel(g, 204, gy - 32, 32, true, true);
        line([204, gy - 32, 180, 44], '#d6d6d6', 7); line([60, gy - 31, 118, gy - 50], '#666', 7);
        line([110, 106, 170, 56, 116, 64, 100, 104], '#666', 4); g.fillStyle = '#333'; rr(g, 104, 92, 34, 26, 5);
        poly(g, [26, 50, 110, 60, 104, 70, 30, 60], color); poly(g, [120, 54, 170, 50, 166, 66, 118, 70], color);
        poly(g, [170, 92, 226, 84, 220, 92, 176, 98], color); g.fillStyle = seat; rr(g, 56, 50, 100, 9, 4);
        line([112, 96, 80, 70, 40, 72], '#c0c4cc', 6); g.fillStyle = '#fff'; ell(g, 186, 52, 9, 13); line([168, 36, 194, 36], '#333', 4); break; }
      case 'adventure': {
        wheel(g, 60, gy - 29, 29, false, true); wheel(g, 206, gy - 31, 31, false, true);
        line([206, gy - 31, 180, 46], '#c9a227', 7); line([60, gy - 29, 120, gy - 40], '#555', 7);
        g.fillStyle = '#333'; rr(g, 100, 90, 52, 34, 6); poly(g, [110, 60, 176, 54, 186, 74, 150, 92, 112, 86], color);
        poly(g, [176, 54, 190, 26, 198, 30, 186, 66], 'rgba(150,190,220,.7)'); poly(g, [186, 74, 216, 84, 210, 92, 182, 84], dark);
        g.fillStyle = seat; rr(g, 64, 54, 64, 11, 5); g.fillStyle = '#3b3f46'; rr(g, 26, 72, 48, 38, 6); rr(g, 30, 34, 38, 26, 6);
        line([112, 120, 70, 116], '#c0c4cc', 6); g.fillStyle = '#fff6b0'; rr(g, 184, 62, 10, 12, 3); break; }
      case 'cruiser': {
        wheel(g, 56, gy - 26, 26, false, true); wheel(g, 214, gy - 25, 25, false, true);
        line([214, gy - 25, 178, 50], '#c0c4cc', 6); line([56, gy - 26, 120, gy - 30], '#333', 7);
        g.fillStyle = '#c0c4cc'; rr(g, 104, 92, 44, 34, 8); line([150, 120, 30, 118], '#e0e4ea', 7); line([150, 112, 40, 108], '#e0e4ea', 6);
        g.fillStyle = color; ell(g, 140, 74, 30, 13); poly(g, [24, 98, 88, 92, 80, 110, 30, 110], color);
        g.fillStyle = '#4a2d18'; rr(g, 70, 78, 50, 12, 6); line([170, 48, 168, 22, 186, 26], '#c0c4cc', 4); line([66, 84, 60, 50], '#c0c4cc', 4); g.fillStyle = '#ddd'; circ(g, 190, 60, 9); break; }
      case 'touring': {
        wheel(g, 60, gy - 26, 26); wheel(g, 206, gy - 26, 26);
        line([206, gy - 26, 184, 56], '#888', 7); g.fillStyle = '#333'; rr(g, 100, 94, 60, 32, 6);
        poly(g, [110, 66, 170, 46, 210, 72, 200, 100, 160, 104, 112, 92], color); poly(g, [168, 46, 182, 18, 192, 22, 184, 54], 'rgba(150,190,220,.7)');
        g.fillStyle = dark; rr(g, 30, 78, 64, 36, 10); rr(g, 22, 44, 44, 30, 8); g.fillStyle = seat; rr(g, 62, 60, 66, 12, 6); rr(g, 60, 46, 10, 18, 4);
        g.fillStyle = '#fff6b0'; rr(g, 200, 74, 10, 10, 3); break; }
      default: { // naked
        wheel(g, 60, gy - 27, 27); wheel(g, 202, gy - 27, 27);
        line([202, gy - 27, 180, 52], '#c9a227', 7); line([60, gy - 27, 120, gy - 38], '#444', 8);
        g.fillStyle = '#333'; rr(g, 100, 88, 52, 36, 6); line([108, 86, 168, 60], '#e33', 5);
        g.fillStyle = color; poly(g, [110, 60, 170, 56, 172, 80, 150, 88, 112, 80]); poly(g, [36, 56, 96, 62, 92, 72, 44, 66], color);
        g.fillStyle = seat; rr(g, 70, 56, 46, 10, 5); line([110, 120, 74, 92], '#c0c4cc', 7); line([170, 44, 192, 42], '#333', 4); g.fillStyle = '#fff6b0'; circ(g, 190, 60, 8); }
    }
  });
}

// ---------------------------------------------------------------- traffic vehicles (rear views)
function carBack(body, roof, o = {}) {
  const h = o.tall ? 170 : 150;
  return mk(220, h, g => {
    g.fillStyle = 'rgba(0,0,0,.35)'; ell(g, 110, h - 6, 104, 8);
    g.fillStyle = '#111'; rr(g, 22, h - 34, 38, 28, 6); rr(g, 160, h - 34, 38, 28, 6);
    g.fillStyle = body; rr(g, 8, h - 112, 204, 88, 18);
    poly(g, [36, h - 108, 184, h - 108, 164, h - 146 + (o.tall ? -10 : 0), 56, h - 146 + (o.tall ? -10 : 0)], roof || body);
    poly(g, [50, h - 110, 170, h - 110, 154, h - 138, 66, h - 138], '#1d2533');
    g.fillStyle = '#ff2a2a'; rr(g, 14, h - 86, 40, 16, 4); rr(g, 166, h - 86, 40, 16, 4);
    g.fillStyle = '#f5f5f5'; rr(g, 88, h - 66, 44, 16, 2); g.fillStyle = '#222'; rr(g, 8, h - 44, 204, 16, 6);
    if (o.sign) { g.fillStyle = o.signCol || '#ffd23f'; rr(g, 84, h - 160 + (o.tall ? -10 : 0), 52, 16, 4); txt(g, o.sign, 110, h - 152 + (o.tall ? -10 : 0), '900 12px Arial', '#111'); }
    if (o.checker) { for (let x = 10; x < 210; x += 10) { g.fillStyle = (x / 10) % 2 ? '#111' : '#fff'; g.fillRect(x, h - 96, 10, 6); } }
  });
}
function truckBack(col) { return mk(220, 240, g => { g.fillStyle = 'rgba(0,0,0,.35)'; ell(g, 110, 234, 106, 8); g.fillStyle = '#111'; rr(g, 16, 200, 50, 34, 6); rr(g, 154, 200, 50, 34, 6); g.fillStyle = col; rr(g, 6, 8, 208, 190, 6); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(110, 14); g.lineTo(110, 192); g.stroke(); g.fillStyle = '#888'; g.fillRect(100, 90, 6, 30); g.fillRect(114, 90, 6, 30); g.fillStyle = '#ff2a2a'; g.fillRect(10, 180, 30, 12); g.fillRect(180, 180, 30, 12); g.fillStyle = '#ffb000'; g.fillRect(6, 196, 208, 8); }); }
function busBack(col, double, sign) {
  const h = double ? 300 : 230;
  return mk(220, h, g => {
    g.fillStyle = 'rgba(0,0,0,.35)'; ell(g, 110, h - 6, 106, 8); g.fillStyle = '#111'; rr(g, 16, h - 40, 48, 34, 6); rr(g, 156, h - 40, 48, 34, 6);
    g.fillStyle = col; rr(g, 6, 6, 208, h - 40, 14);
    g.fillStyle = '#1d2533'; rr(g, 20, 40, 180, 60, 8); if (double) rr(g, 20, 130, 180, 60, 8);
    g.fillStyle = '#111'; rr(g, 50, 12, 120, 22, 4); txt(g, sign || '42', 110, 23, '900 15px Arial', '#ffb000', 112);
    g.fillStyle = '#ff2a2a'; rr(g, 14, h - 74, 26, 20, 4); rr(g, 180, h - 74, 26, 20, 4); g.fillStyle = '#f5f5f5'; rr(g, 86, h - 70, 48, 16, 2);
  });
}
function autoBack() {
  return mk(170, 180, g => {
    g.fillStyle = 'rgba(0,0,0,.35)'; ell(g, 85, 174, 78, 7); g.fillStyle = '#111'; rr(g, 12, 138, 30, 36, 8); rr(g, 128, 138, 30, 36, 8);
    g.fillStyle = '#111'; rr(g, 10, 10, 150, 78, 32); g.fillStyle = '#1e7d3a'; rr(g, 14, 84, 142, 62, 10);
    g.fillStyle = '#ffd23f'; g.fillRect(14, 84, 142, 18); g.fillStyle = '#2a2a2a'; rr(g, 34, 30, 102, 50, 10);
    g.fillStyle = '#ff2a2a'; rr(g, 18, 110, 22, 12, 3); rr(g, 130, 110, 22, 12, 3); g.fillStyle = '#f5f5f5'; rr(g, 64, 116, 42, 14, 2);
  });
}
const VEH_TYPES = {
  car: { name: 'car', w: 620, len: 450, spd: [35, 62], mk: R => carBack(['#c0392b', '#2c3e50', '#ecf0f1', '#7f8c8d', '#2980b9', '#27ae60', '#8e44ad', '#f39c12', '#151515'][(R() * 9) | 0]) },
  suv: { name: 'SUV', w: 660, len: 480, spd: [40, 65], mk: R => carBack(['#f4f4f4', '#d9d9d9', '#151515', '#c9b28f'][(R() * 4) | 0], null, { tall: true }) },
  taxiNY: { name: 'yellow cab', w: 620, len: 460, spd: [35, 60], mk: () => carBack('#f7c600', null, { sign: 'TAXI', signCol: '#fff', checker: true }) },
  taxiBY: { name: 'black and yellow taxi', w: 560, len: 400, spd: [30, 50], mk: () => carBack('#151515', '#f7c600', { sign: 'TAXI' }) },
  cabLDN: { name: 'black cab', w: 600, len: 450, spd: [30, 50], mk: () => carBack('#141414', null, { sign: 'TAXI', signCol: '#ffb000', tall: true }) },
  taxiTKO: { name: 'taxi', w: 600, len: 450, spd: [35, 55], mk: () => carBack('#2f6b3a', '#e8e3d3', { sign: '空車', signCol: '#ff5a36' }) },
  truck: { name: 'truck', w: 760, len: 900, spd: [28, 45], mk: R => truckBack(['#e67e22', '#ecf0f1', '#3498db', '#7f8c8d'][(R() * 4) | 0]) },
  bus: { name: 'bus', w: 800, len: 1200, spd: [25, 42], mk: () => busBack('#2a6fdb', false, 'CITY') },
  busBEST: { name: 'bus', w: 800, len: 1200, spd: [25, 40], mk: () => busBack('#c62828', false, '123 CHURCHGATE') },
  busRed: { name: 'double-decker bus', w: 800, len: 1100, spd: [25, 40], mk: () => busBack('#d0021b', true, '24 VICTORIA') },
  auto: { name: 'auto-rickshaw', w: 480, len: 300, spd: [25, 42], mk: () => autoBack() }
};
// ---------------------------------------------------------------- palettes / locations
const ZONES = [
  { theme: 'country', name: 'Countryside', skyTop: [58, 128, 226], skyBot: [190, 226, 255], grassL: [96, 178, 64], grassD: [84, 160, 54], far: [128, 156, 196], near: [70, 128, 78], sun: [255, 244, 200], city: 0, road: [108, 108, 114] },
  { theme: 'city', name: 'City', skyTop: [84, 120, 196], skyBot: [236, 206, 176], grassL: [160, 160, 166], grassD: [146, 146, 152], far: [150, 150, 178], near: [104, 104, 124], sun: [255, 226, 180], city: 1, road: [92, 92, 98] },
  { theme: 'forest', name: 'Forest', skyTop: [70, 140, 206], skyBot: [206, 234, 240], grassL: [44, 118, 50], grassD: [36, 104, 44], far: [96, 126, 146], near: [28, 84, 52], sun: [255, 248, 220], city: 0, road: [100, 100, 106] },
  { theme: 'desert', name: 'Desert', skyTop: [50, 124, 222], skyBot: [255, 222, 172], grassL: [220, 186, 116], grassD: [206, 170, 102], far: [206, 146, 104], near: [176, 112, 72], sun: [255, 238, 170], city: 0, road: [112, 104, 100] },
  { theme: 'coast', name: 'Sunset Coast', skyTop: [58, 54, 136], skyBot: [255, 150, 96], grassL: [214, 196, 146], grassD: [200, 182, 132], far: [124, 82, 124], near: [74, 62, 94], sun: [255, 214, 120], city: 0.35, road: [96, 92, 104] }
];
const LOCS = [
  { id: 'tour', name: 'World Tour (5 zones)', desc: 'Countryside, city, forest, desert and sunset coast. Sprint gets 3 km of each, a circuit passes through all five every lap.', tour: true,
    veh: { car: 6, suv: 1, truck: 2, bus: 1 } },
  { id: 'mumbai', name: 'Mumbai, India', desc: 'Golden hour on Marine Drive by the Arabian Sea. Gateway of India, the Sea Link, black-and-yellow taxis and lots of auto-rickshaws.', theme: 'mumbai',
    pal: { skyTop: [255, 128, 70], skyBot: [255, 214, 150], grassL: [176, 166, 150], grassD: [164, 154, 138], far: [150, 96, 90], near: [120, 80, 74], sun: [255, 236, 160], city: 0.6, road: [96, 90, 92], sea: [58, 104, 140] },
    marks: [['gateway', 0.12], ['sealink', 0.38], ['taj', 0.66], ['tower', 0.86]], boards: [['MUMBAI', '#ff8a3d', '#fff'], ['CHAI', '#2fbf71', '#fff'], ['BOLLYWOOD', '#c8102e', '#ffd23f']],
    bstyle: { cols: ['#f4d35e', '#ee964b', '#f95738', '#a8dadc', '#e9c46a', '#f1faee', '#90be6d', '#e5989b'], lit: 0.3, litCol: '#ffe9a6', win: '#4a4040', balcony: true, h: [280, 560] },
    veh: { auto: 6, taxiBY: 3, car: 2, busBEST: 1, truck: 1 } },
  { id: 'tokyo', name: 'Tokyo, Japan', desc: 'Neon nights in Shinjuku, with Tokyo Tower, Skytree and Mount Fuji on the horizon. Taxis and delivery trucks.', theme: 'tokyo', night: true,
    pal: { skyTop: [8, 8, 30], skyBot: [70, 38, 96], grassL: [52, 52, 66], grassD: [44, 44, 58], far: [40, 34, 70], near: [26, 22, 44], sun: [240, 240, 255], city: 1, road: [44, 44, 52] },
    marks: [['fuji', 0.2], ['tokyotower', 0.45], ['skytree', 0.75]], boards: [['TOKYO', '#111', '#ff2bd6'], ['NEON', '#111', '#29f0ff'], ['RAMEN', '#111', '#ffe600']], neonBoards: true,
    bstyle: { cols: ['#1d2233', '#252a3d', '#2b2140', '#1a2a33', '#30303a'], lit: 0.55, litCol: '#bfe8ff', win: '#12151f', neon: true, night: true, glass: true, h: [380, 780] },
    veh: { car: 4, taxiTKO: 3, truck: 2, bus: 1 } },
  { id: 'paris', name: 'Paris, France', desc: 'A warm afternoon on tree-lined boulevards: cream Haussmann buildings, the Eiffel Tower and the Arc de Triomphe.', theme: 'paris',
    pal: { skyTop: [96, 150, 220], skyBot: [250, 222, 196], grassL: [190, 182, 168], grassD: [178, 170, 156], far: [150, 150, 170], near: [120, 120, 140], sun: [255, 236, 190], city: 0.7, road: [104, 100, 102] },
    marks: [['eiffel', 0.25], ['arc', 0.55], ['dome', 0.8]], boards: [['PARIS', '#1b2a6b', '#fff'], ['CAFÉ', '#c8102e', '#fff'], ['CROISSANT', '#ffd23f', '#111']],
    bstyle: { cols: ['#e8dcc4', '#efe4cf', '#dccfb4', '#e3d6bd'], lit: 0.15, litCol: '#ffe9a6', win: '#3b4252', balcony: true, roof: 'mansard', h: [260, 340] },
    veh: { car: 6, suv: 1, bus: 1, truck: 1 } },
  { id: 'newyork', name: 'New York, USA', desc: 'Manhattan avenues under a blue sky, with the Empire State, the Chrysler Building, the Statue of Liberty and a sea of yellow cabs.', theme: 'newyork',
    pal: { skyTop: [60, 130, 220], skyBot: [210, 230, 250], grassL: [150, 150, 156], grassD: [138, 138, 144], far: [110, 120, 150], near: [80, 88, 112], sun: [255, 248, 220], city: 1, road: [84, 84, 90] },
    marks: [['empire', 0.2], ['chrysler', 0.42], ['liberty', 0.68], ['oneWTC', 0.88]], boards: [['NEW YORK', '#111', '#ffd23f'], ['BROADWAY', '#c8102e', '#fff'], ['PIZZA', '#2fbf71', '#fff']],
    bstyle: { cols: ['#8d6e63', '#a1887f', '#6d7b8a', '#b0bec5', '#7a6a5a', '#9e9e9e'], lit: 0.3, litCol: '#ffe9a6', win: '#2b3550', glass: true, h: [520, 1000] },
    veh: { taxiNY: 6, car: 3, suv: 1, bus: 1, truck: 1 } },
  { id: 'dubai', name: 'Dubai, UAE', desc: 'Blazing sun, desert sand and glass towers. Burj Khalifa, Burj Al Arab and the Dubai Frame, with SUVs on Sheikh Zayed Road.', theme: 'dubai',
    pal: { skyTop: [70, 150, 235], skyBot: [255, 236, 200], grassL: [232, 204, 150], grassD: [220, 190, 136], far: [214, 170, 120], near: [196, 150, 100], sun: [255, 250, 210], city: 0.8, road: [96, 96, 102] },
    marks: [['burj', 0.3], ['arab', 0.6], ['frame', 0.85]], boards: [['DUBAI', '#c9a227', '#fff'], ['GOLD SOUK', '#111', '#ffd23f'], ['DESERT SAFARI', '#ff8a3d', '#fff']],
    bstyle: { cols: ['#e8d8b8', '#cfd8dc', '#90a4ae', '#d7ccc8', '#b0bec5'], lit: 0.2, litCol: '#ffe9a6', win: '#37474f', glass: true, roof: 'dome', h: [400, 900] },
    veh: { suv: 5, car: 3, truck: 1, bus: 1 } },
  { id: 'london', name: 'London, UK', desc: 'An overcast day by the Thames: Big Ben, the London Eye, the Shard, red double-decker buses and black cabs.', theme: 'london',
    pal: { skyTop: [130, 140, 156], skyBot: [206, 210, 216], grassL: [150, 152, 150], grassD: [138, 140, 138], far: [120, 126, 140], near: [92, 98, 110], sun: [235, 235, 230], city: 0.8, road: [80, 82, 88], overcast: true },
    marks: [['bigben', 0.2], ['eye', 0.42], ['shard', 0.7]], boards: [['LONDON', '#c8102e', '#fff'], ['MIND THE GAP', '#1b2a6b', '#fff'], ['TEA', '#2fbf71', '#fff']],
    bstyle: { cols: ['#8e4a3a', '#9c5b45', '#7a3e30', '#b5a48a', '#d9d2c5'], lit: 0.2, litCol: '#ffe9a6', win: '#2b3040', brick: true, h: [260, 440] },
    veh: { busRed: 3, cabLDN: 3, car: 3, truck: 1 } },
  { id: 'country', name: 'Countryside', desc: 'Rolling green hills, forests, farms and a windmill. Light traffic of cars and trucks.', theme: 'countryside',
    pal: ZONES[0], marks: [['windmill', 0.3], ['barnSil', 0.7]], veh: { car: 4, truck: 2, suv: 1 } },
  { id: 'coast', name: 'Sunset Coast', desc: 'Palm-lined beach road at sunset, with sea views, a lighthouse and beach houses.', theme: 'coast',
    pal: Object.assign({}, ZONES[4], { sea: [70, 70, 150] }), marks: [['lighthouse', 0.35], ['lighthouse', 0.82]], veh: { car: 4, suv: 2, bus: 1 } }
];
const LOC = id => LOCS.find(l => l.id === id) || LOCS[0];
const HC_PAL = { skyTop: [0, 0, 40], skyBot: [0, 0, 90], grassL: [0, 70, 0], grassD: [0, 50, 0], far: [60, 60, 60], near: [30, 30, 30], sun: [255, 230, 0], city: 0, road: [16, 16, 16] };
function zoneF(z) { // 0..4.999 position through the 5 tour zones
  if (circuit) return clamp(mod(z - START_Z, trackLen) / trackLen * 5, 0, 4.999);
  return clamp((z - START_Z) / KM_UNITS / 3, 0, 4.999);
}
function paletteAt(z) {
  if (settings.hc) return HC_PAL;
  if (!loc.tour) return loc.pal;
  const zf = zoneF(z), zi = Math.floor(zf);
  const t = zi < 4 ? clamp((zf - zi - 0.85) / 0.15, 0, 1) : 0, s = t * t * (3 - 2 * t);
  const a = ZONES[zi], b = ZONES[Math.min(4, zi + 1)], out = {};
  for (const k in a) if (k !== 'name' && k !== 'theme') out[k] = typeof a[k] === 'number' ? lerp(a[k], b[k], s) : mix(a[k], b[k], s);
  out.name = s > 0.5 ? b.name : a.name; return out;
}
// per-location assets, generated once and cached
const assetCache = {};
function locAssets(l) {
  if (assetCache[l.id]) return assetCache[l.id];
  const R = mulberry32(l.id.length * 977 + 13), A = {};
  const genericB = { cols: ['#c9b79c', '#8fa3b8', '#b86b4b', '#d9d2c5', '#6f7d8c', '#a0522d', '#e0c068', '#7a8fa6'], lit: 0.25, litCol: '#ffe9a6', win: '#2b3550', h: [300, 560] };
  A.buildings = []; for (let i = 0; i < 8; i++) A.buildings.push(makeBuilding(R, l.bstyle || genericB));
  A.boards = (l.boards || [['TURBO', '#ff3d6e', '#fff'], ['VELOCITY 15K', '#1b2a6b', '#ffd23f'], ['GO FASTER', '#ffd23f', '#111'], ['MOTO FEST', '#29d3ff', '#0b1020'], ['FUEL UP', '#2fbf71', '#fff']]).map(b => makeBoard(b[0], b[1], b[2], l.neonBoards));
  A.veh = {}; for (const k in l.veh) { const T = VEH_TYPES[k]; A.veh[k] = [0, 1, 2].map(() => T.mk(R)); }
  return (assetCache[l.id] = A);
}

// landmark silhouettes for the background (s = height unit in px)
function landmark(type, x, b, s, col, night) {
  const g = ctx; g.fillStyle = col; g.strokeStyle = col;
  const R = (cx, w, h, y0) => g.fillRect(x + cx - w / 2, (y0 === undefined ? b : y0) - h, w, h);
  switch (type) {
    case 'eiffel': case 'tokyotower': {
      if (type === 'tokyotower' && night) { g.fillStyle = '#ff6a3d'; }
      poly(g, [x - 0.26 * s, b, x - 0.1 * s, b - 0.35 * s, x - 0.035 * s, b - 0.8 * s, x, b - 1.05 * s, x + 0.035 * s, b - 0.8 * s, x + 0.1 * s, b - 0.35 * s, x + 0.26 * s, b, x + 0.14 * s, b, x, b - 0.18 * s, x - 0.14 * s, b]);
      g.fillRect(x - 0.14 * s, b - 0.36 * s, 0.28 * s, 0.03 * s); g.fillRect(x - 0.07 * s, b - 0.66 * s, 0.14 * s, 0.025 * s);
      if (type === 'tokyotower') { g.fillStyle = night ? '#fff' : col; g.fillRect(x - 0.06 * s, b - 0.62 * s, 0.12 * s, 0.05 * s); }
      break; }
    case 'skytree': R(0, 0.06 * s, 1.35 * s); R(0, 0.14 * s, 0.05 * s, b - 0.85 * s); R(0, 0.1 * s, 0.04 * s, b - 1.05 * s); R(0, 0.14 * s, 0.25 * s); if (night) { g.fillStyle = '#7ad7ff'; R(0, 0.14 * s, 0.02 * s, b - 0.86 * s); } break;
    case 'fuji': { g.fillStyle = col; poly(g, [x - 1.6 * s, b, x - 0.25 * s, b - 0.8 * s, x + 0.25 * s, b - 0.8 * s, x + 1.6 * s, b]); g.fillStyle = night ? '#c9c9e8' : '#fff'; poly(g, [x - 0.25 * s, b - 0.8 * s, x + 0.25 * s, b - 0.8 * s, x + 0.5 * s, b - 0.62 * s, x + 0.2 * s, b - 0.66 * s, x, b - 0.6 * s, x - 0.2 * s, b - 0.67 * s, x - 0.5 * s, b - 0.62 * s]); break; }
    case 'burj': { const st = [[0.2, 0.25], [0.15, 0.5], [0.11, 0.75], [0.08, 0.95], [0.05, 1.15], [0.025, 1.35], [0.008, 1.55]]; st.forEach(([w, h]) => R(0, w * s, h * s)); break; }
    case 'arab': { poly(g, [x - 0.12 * s, b, x - 0.12 * s, b - 0.75 * s, x - 0.08 * s, b - 0.8 * s, x + 0.25 * s, b - 0.1 * s, x + 0.25 * s, b]); R(-0.1 * s, 0.02 * s, 0.9 * s); break; }
    case 'frame': { R(-0.15 * s, 0.07 * s, 0.6 * s); R(0.15 * s, 0.07 * s, 0.6 * s); R(0, 0.37 * s, 0.07 * s, b - 0.53 * s); break; }
    case 'bigben': { R(0, 0.12 * s, 0.75 * s); R(0, 0.16 * s, 0.16 * s, b - 0.62 * s); poly(g, [x - 0.08 * s, b - 0.78 * s, x, b - 1.02 * s, x + 0.08 * s, b - 0.78 * s]); g.fillStyle = 'rgba(255,240,200,.75)'; circ(g, x, b - 0.7 * s, 0.05 * s); break; }
    case 'eye': { g.lineWidth = Math.max(2, s * 0.02); g.beginPath(); g.arc(x, b - 0.45 * s, 0.4 * s, 0, Math.PI * 2); g.stroke(); g.lineWidth = Math.max(1, s * 0.006); g.beginPath(); for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2; g.moveTo(x, b - 0.45 * s); g.lineTo(x + Math.cos(t) * 0.4 * s, b - 0.45 * s + Math.sin(t) * 0.4 * s); } g.stroke(); poly(g, [x - 0.15 * s, b, x, b - 0.45 * s, x + 0.03 * s, b]); break; }
    case 'shard': poly(g, [x - 0.12 * s, b, x - 0.01 * s, b - 1.05 * s, x + 0.12 * s, b]); break;
    case 'empire': { [[0.24, 0.45], [0.17, 0.7], [0.1, 0.85], [0.06, 0.95], [0.015, 1.15]].forEach(([w, h]) => R(0, w * s, h * s)); break; }
    case 'chrysler': { R(0, 0.16 * s, 0.7 * s); poly(g, [x - 0.08 * s, b - 0.7 * s, x, b - 1.0 * s, x + 0.08 * s, b - 0.7 * s]); R(0, 0.008 * s, 1.12 * s); break; }
    case 'oneWTC': { poly(g, [x - 0.13 * s, b, x - 0.13 * s, b - 0.2 * s, x - 0.06 * s, b - 1.0 * s, x + 0.06 * s, b - 1.0 * s, x + 0.13 * s, b - 0.2 * s, x + 0.13 * s, b]); R(0, 0.01 * s, 1.25 * s); break; }
    case 'liberty': { R(0, 0.14 * s, 0.25 * s); R(0, 0.08 * s, 0.12 * s, b - 0.25 * s); poly(g, [x - 0.04 * s, b - 0.37 * s, x + 0.04 * s, b - 0.37 * s, x + 0.025 * s, b - 0.6 * s, x - 0.025 * s, b - 0.6 * s]); circ(g, x, b - 0.63 * s, 0.025 * s); R(0.04 * s, 0.015 * s, 0.22 * s, b - 0.5 * s); poly(g, [x + 0.025 * s, b - 0.72 * s, x + 0.055 * s, b - 0.72 * s, x + 0.04 * s, b - 0.77 * s]); break; }
    case 'gateway': { R(0, 0.6 * s, 0.42 * s); [-0.26, -0.09, 0.09, 0.26].forEach(o => { R(o * s, 0.07 * s, 0.1 * s, b - 0.42 * s); circ(g, x + o * s, b - 0.53 * s, 0.035 * s); }); g.fillStyle = 'rgba(255,220,170,.5)'; g.beginPath(); g.moveTo(x - 0.08 * s, b); g.lineTo(x - 0.08 * s, b - 0.2 * s); g.arc(x, b - 0.2 * s, 0.08 * s, Math.PI, 0); g.lineTo(x + 0.08 * s, b); g.fill(); break; }
    case 'taj': { R(0, 0.8 * s, 0.38 * s); g.beginPath(); g.arc(x, b - 0.38 * s, 0.13 * s, Math.PI, 0); g.fill(); [-0.32, 0.32].forEach(o => { g.beginPath(); g.arc(x + o * s, b - 0.38 * s, 0.06 * s, Math.PI, 0); g.fill(); }); break; }
    case 'tower': R(0, 0.12 * s, 0.85 * s); R(0.2 * s, 0.14 * s, 0.6 * s); break;
    case 'sealink': { g.fillRect(x - 0.9 * s, b - 0.12 * s, 1.8 * s, 0.03 * s); poly(g, [x - 0.06 * s, b - 0.1 * s, x - 0.01 * s, b - 0.7 * s, x + 0.01 * s, b - 0.7 * s, x + 0.06 * s, b - 0.1 * s]); g.lineWidth = 1; g.beginPath(); for (let k = 1; k <= 6; k++) { g.moveTo(x, b - 0.65 * s); g.lineTo(x - k * 0.13 * s, b - 0.11 * s); g.moveTo(x, b - 0.65 * s); g.lineTo(x + k * 0.13 * s, b - 0.11 * s); } g.stroke(); break; }
    case 'arc': { R(0, 0.36 * s, 0.4 * s); g.fillStyle = 'rgba(255,230,200,.45)'; g.beginPath(); g.moveTo(x - 0.07 * s, b); g.lineTo(x - 0.07 * s, b - 0.18 * s); g.arc(x, b - 0.18 * s, 0.07 * s, Math.PI, 0); g.lineTo(x + 0.07 * s, b); g.fill(); break; }
    case 'dome': { R(0, 0.3 * s, 0.25 * s); g.beginPath(); g.arc(x, b - 0.25 * s, 0.12 * s, Math.PI, 0); g.fill(); R(0, 0.015 * s, 0.48 * s); break; }
    case 'windmill': { R(0, 0.08 * s, 0.4 * s); g.lineWidth = Math.max(2, s * 0.025); g.beginPath(); const t0 = performance.now() / 2000 * (settings.rm ? 0 : 1); for (let k = 0; k < 4; k++) { const t = t0 + k * Math.PI / 2; g.moveTo(x, b - 0.4 * s); g.lineTo(x + Math.cos(t) * 0.25 * s, b - 0.4 * s + Math.sin(t) * 0.25 * s); } g.stroke(); break; }
    case 'barnSil': { R(0, 0.3 * s, 0.18 * s); poly(g, [x - 0.17 * s, b - 0.18 * s, x, b - 0.3 * s, x + 0.17 * s, b - 0.18 * s]); R(0.22 * s, 0.07 * s, 0.35 * s); break; }
    case 'lighthouse': { poly(g, [x - 0.06 * s, b, x - 0.035 * s, b - 0.5 * s, x + 0.035 * s, b - 0.5 * s, x + 0.06 * s, b]); g.fillStyle = '#fff3a0'; R(0, 0.06 * s, 0.05 * s, b - 0.5 * s); break; }
  }
}
// ---------------------------------------------------------------- track
let segments = [], pickups = [], traffic = [];
const lastY = () => segments.length ? segments[segments.length - 1].p2.world.y : 0;
function addSegment(curve, y) {
  const n = segments.length;
  segments.push({ index: n, curve, sprites: [], pickup: null, clip: 0,
    p1: { world: { y: lastY(), z: n * SEG }, camera: {}, screen: {} },
    p2: { world: { y, z: (n + 1) * SEG }, camera: {}, screen: {} } });
}
function addRoad(enter, hold, leave, curve, height) {
  const sy = lastY(), ey = sy + height * SEG, tot = enter + hold + leave;
  for (let n = 0; n < enter; n++) addSegment(easeIn(0, curve, n / enter), easeInOut(sy, ey, n / tot));
  for (let n = 0; n < hold; n++) addSegment(curve, easeInOut(sy, ey, (enter + n) / tot));
  for (let n = 0; n < leave; n++) addSegment(easeInOut(curve, 0, n / leave), easeInOut(sy, ey, (enter + hold + n) / tot));
}
const segAt = z => segments[Math.floor(mod(z, trackLen) / SEG) % segments.length];
// signed distance from a to b along the track (handles circuit wrap)
const relZ = (bz, az) => circuit ? mod(bz - az + trackLen / 2, trackLen) - trackLen / 2 : bz - az;

function scenery(theme, i, R, add, A) {
  const side = R() < 0.5 ? -1 : 1, ri = n => (R() * n) | 0;
  const bld = (x, s) => { const b = A.buildings[ri(A.buildings.length)]; add(i, b, s * x, { w: b.ww }); };
  switch (theme) {
    case 'country':
      if (i % 5 === 0) add(i, R() < 0.7 ? S.tree : S.bush, side * (1.3 + R() * 2.8), { w: 1400 });
      if (i % 9 === 0) add(i, S.tree, -side * (3 + R() * 4), { w: 1600 });
      if (i % 70 === 0) add(i, A.boards[ri(A.boards.length)], side * 1.35, { w: 1800 });
      break;
    case 'countryside':
      if (Math.floor(i / 300) % 2) { if (i % 3 === 0) add(i, S.pine, side * (1.25 + R() * 3.5), { w: 1100 }); }
      else { if (i % 5 === 0) add(i, R() < 0.7 ? S.tree : S.bush, side * (1.3 + R() * 2.8), { w: 1400 }); if (i % 120 === 60) add(i, S.barn, side * (2 + R()), { w: 2600 }); }
      if (i % 9 === 0) add(i, S.tree, -side * (3 + R() * 4), { w: 1600 });
      break;
    case 'city':
      if (i % 11 === 0) { bld(1.45 + R() * 0.3, -1); bld(1.45 + R() * 0.3, 1); }
      if (i % 18 === 0) { add(i, S.lampR, -1.15, { w: 420 }); add(i, S.lampL, 1.15, { w: 420 }); }
      if (i % 90 === 45) add(i, A.boards[ri(A.boards.length)], side * 1.3, { w: 1800 });
      break;
    case 'forest':
      if (i % 3 === 0) add(i, S.pine, side * (1.25 + R() * 3.5), { w: 1100 });
      if (i % 7 === 0) add(i, S.pine, -side * (2 + R() * 5), { w: 1300 });
      break;
    case 'desert':
      if (i % 9 === 0) add(i, S.cactus, side * (1.3 + R() * 3), { w: 520 });
      if (i % 17 === 0) add(i, S.rock, -side * (1.4 + R() * 4), { w: 1000 });
      if (i % 80 === 0) add(i, A.boards[ri(A.boards.length)], side * 1.35, { w: 1800 });
      break;
    case 'coast':
      if (i % 8 === 0) add(i, S.palm, -(1.3 + R() * 0.6), { w: 1300 });
      if (i % 14 === 0) add(i, S.house[ri(3)], 1.4 + R() * 0.6, { w: 2600 });
      if (i % 8 === 4) add(i, S.palm, 1.25, { w: 1200 });
      break;
    case 'mumbai': // sea + palms on the left (Marine Drive), buildings on the right
      if (i % 9 === 0) add(i, S.palm, -(1.25 + R() * 0.3), { w: 1300 });
      if (i % 12 === 6) add(i, S.lampR, -1.12, { w: 420 });
      if (i % 10 === 0) bld(1.4 + R() * 0.3, 1);
      if (i % 75 === 30) add(i, A.boards[ri(A.boards.length)], 1.3, { w: 1800 });
      break;
    case 'tokyo':
      if (i % 9 === 0) { bld(1.4 + R() * 0.25, -1); bld(1.4 + R() * 0.25, 1); }
      if (i % 14 === 0) { add(i, S.lampRn, -1.12, { w: 420 }); add(i, S.lampLn, 1.12, { w: 420 }); }
      if (i % 40 === 20) add(i, A.boards[ri(A.boards.length)], side * 1.28, { w: 1700 });
      break;
    case 'paris':
      if (i % 10 === 0) { bld(1.55 + R() * 0.15, -1); bld(1.55 + R() * 0.15, 1); }
      if (i % 6 === 3) { add(i, S.tree, -1.25, { w: 1300 }); add(i, S.tree, 1.25, { w: 1300 }); }
      if (i % 90 === 45) add(i, A.boards[ri(A.boards.length)], side * 1.3, { w: 1700 });
      break;
    case 'newyork':
      if (i % 9 === 0) { bld(1.4 + R() * 0.2, -1); bld(1.4 + R() * 0.2, 1); }
      if (i % 16 === 0) { add(i, S.lampR, -1.12, { w: 420 }); add(i, S.lampL, 1.12, { w: 420 }); }
      if (i % 60 === 30) add(i, A.boards[ri(A.boards.length)], side * 1.28, { w: 1700 });
      break;
    case 'dubai':
      if (i % 12 === 0) bld(1.5 + R() * 0.5, side);
      if (i % 7 === 0) { add(i, S.palm, -1.2, { w: 1200 }); add(i, S.palm, 1.2, { w: 1200 }); }
      if (i % 80 === 40) add(i, A.boards[ri(A.boards.length)], side * 1.3, { w: 1700 });
      break;
    case 'london':
      if (i % 10 === 0) { bld(1.45 + R() * 0.2, -1); bld(1.45 + R() * 0.2, 1); }
      if (i % 14 === 7) { add(i, S.lampR, -1.12, { w: 420 }); add(i, S.lampL, 1.12, { w: 420 }); }
      if (i % 50 === 25) add(i, S.tree, side * 1.25, { w: 1300 });
      if (i % 90 === 45) add(i, A.boards[ri(A.boards.length)], side * 1.3, { w: 1700 });
      break;
  }
}

function buildTrack(seed) {
  const R = mulberry32(seed); segments = []; pickups = [];
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const A = locAssets(loc);
  const startSeg = Math.floor(START_Z / SEG);
  if (circuit) {
    const lapSegs = Math.round(LAP_KM * 1000 * UPM / SEG);
    addRoad(0, startSeg + 60, 0, 0, 0);
    while (segments.length < lapSegs - 230) {
      const r = R(), dir = R() < 0.5 ? -1 : 1;
      if (r < 0.2) addRoad(20, ri(30, 80), 20, 0, (R() - 0.5) * 30);
      else if (r < 0.7) addRoad(ri(25, 50), ri(40, 110), ri(25, 50), dir * (2 + R() * 4), (R() - 0.5) * 40);
      else { const c = 2 + R() * 3; addRoad(ri(25, 40), ri(30, 60), ri(25, 40), dir * c, 0); addRoad(ri(25, 40), ri(30, 60), ri(25, 40), -dir * c, (R() - 0.5) * 20); }
    }
    addRoad(60, Math.max(10, lapSegs - segments.length - 60), 0, 0, -lastY() / SEG);
    trackLen = segments.length * SEG; finishZ = START_Z + laps * trackLen;
  } else {
    const finishSeg = Math.floor((START_Z + RACE_KM * KM_UNITS) / SEG);
    addRoad(0, startSeg + 90, 0, 0, 0);
    while (segments.length < finishSeg - 260) {
      const r = R(), dir = R() < 0.5 ? -1 : 1;
      if (r < 0.22) addRoad(20, ri(40, 140), 20, 0, (R() - 0.5) * 40);
      else if (r < 0.62) addRoad(ri(30, 60), ri(50, 160), ri(30, 60), dir * (1.5 + R() * 4), (R() - 0.5) * 50);
      else if (r < 0.82) { const c = 2 + R() * 3; addRoad(ri(30, 50), ri(40, 80), ri(30, 50), dir * c, 0); addRoad(ri(30, 50), ri(40, 80), ri(30, 50), -dir * c, (R() - 0.5) * 30); }
      else { const h = 10 + R() * 25; addRoad(25, 25, 25, 0, h); addRoad(25, 25, 25, 0, -h); addRoad(20, 20, 20, dir * 2, h * 0.5); }
    }
    addRoad(60, finishSeg - segments.length + 1500, 0, 0, -lastY() / SEG);
    trackLen = segments.length * SEG; finishZ = START_Z + RACE_KM * KM_UNITS;
  }
  const N = segments.length, finishSeg = Math.floor(mod(finishZ, trackLen) / SEG);
  const add = (i, img, x, opts = {}) => { if (segments[i]) segments[i].sprites.push(Object.assign({ img, x, w: img.ww || 1000, hit: true }, opts)); };
  if (circuit) add(startSeg, S.lapBanner, 0, { w: ROAD_W * 2.7, center: true, hit: false });
  else {
    add(startSeg, S.startBanner, 0, { w: ROAD_W * 2.7, center: true, hit: false });
    add(finishSeg, S.finishBanner, 0, { w: ROAD_W * 2.7, center: true, hit: false });
    for (let k = 1; k < 15; k++) add(Math.floor((START_Z + k * KM_UNITS) / SEG), S.km[15 - k], -1.2, { w: 650 });
  }
  for (let i = 0; i < N; i++) {
    if (Math.abs(i - startSeg) < 4 || (!circuit && Math.abs(i - finishSeg) < 4)) continue;
    const theme = loc.tour ? ZONES[Math.floor(zoneF(i * SEG))].theme : loc.theme;
    scenery(theme, i, R, add, A);
  }
  // boost pickups every ~250-400 m, sometimes in pairs
  const span = circuit ? trackLen - 200 * UPM : RACE_KM * KM_UNITS - 150 * UPM;
  for (let u = 300 * UPM; u < span; u += (250 + R() * 150) * UPM) {
    const si = Math.floor(mod(START_Z + u, trackLen) / SEG);
    const p = { seg: si, x: (R() * 1.5 - 0.75), active: true, t: 0 }; segments[si].pickup = p; pickups.push(p);
    if (R() < 0.35 && segments[si + 4]) { const q = { seg: si + 4, x: clamp(-p.x + (R() - 0.5) * 0.3, -0.8, 0.8), active: true, t: 0 }; segments[si + 4].pickup = q; pickups.push(q); }
  }
}
const TRAFFIC_DENSITY = { none: 0, light: 2.5, medium: 6, heavy: 14 };
function spawnTraffic(seed) {
  traffic = []; const dens = TRAFFIC_DENSITY[settings.traffic] || 0; if (!dens) return;
  const R = mulberry32(seed + 99), A = locAssets(loc);
  const zMin = START_Z + 220 * UPM, zMax = circuit ? START_Z + trackLen - 350 * UPM : finishZ;
  const n = Math.round(dens * (zMax - zMin) / KM_UNITS);
  for (let i = 0; i < n; i++) {
    const key = pickW(loc.veh, R), T = VEH_TYPES[key];
    const lane = (R() * 4) | 0, z = zMin + (zMax - zMin) * (i + R() * 0.8) / n;
    const base = lerp(T.spd[0], T.spd[1], R());
    traffic.push({ key, name: T.name, img: A.veh[key][(R() * 3) | 0], w: T.w, len: T.len, lane, x: LANE_X[lane], z, kmh: base, base, laneT: 2 + R() * 6 });
  }
}
// ---------------------------------------------------------------- audio
const Sound = {
  ac: null, master: null, eng: null,
  init() {
    if (this.ac) { if (this.ac.state !== 'running') this.ac.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      this.ac = new AC(); this.master = this.ac.createGain(); this.master.gain.value = settings.sound ? 0.5 : 0; this.master.connect(this.ac.destination);
      const o1 = this.ac.createOscillator(), o2 = this.ac.createOscillator(), f = this.ac.createBiquadFilter(), g = this.ac.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 600; g.gain.value = 0;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.master); o1.start(); o2.start(); this.eng = { o1, o2, f, g };
    } catch (e) { this.ac = null; }
  },
  enable(on) { if (this.master) this.master.gain.value = on ? 0.5 : 0; if (on && this.ac) this.init(); },
  engine(kmh, on) {
    if (!this.eng) return; const t = this.ac.currentTime, fr = 40 + kmh * 1.4 + (kmh > 100 ? 25 : 0);
    this.eng.o1.frequency.setTargetAtTime(fr, t, 0.06); this.eng.o2.frequency.setTargetAtTime(fr * 0.5, t, 0.06);
    this.eng.f.frequency.setTargetAtTime(350 + kmh * 10, t, 0.1); this.eng.g.gain.setTargetAtTime(on ? 0.06 : 0, t, 0.12);
  },
  tone(freq, dur, type = 'square', vol = 0.15, slide) {
    if (!this.ac || !settings.sound) return; const t = this.ac.currentTime, o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol) {
    if (!this.ac || !settings.sound) return; const n = Math.floor(this.ac.sampleRate * dur), b = this.ac.createBuffer(1, n, this.ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ac.createBufferSource(), g = this.ac.createGain(); g.gain.value = vol; s.buffer = b; s.connect(g); g.connect(this.master); s.start();
  },
  beep(go) { this.tone(go ? 880 : 440, go ? 0.6 : 0.22, 'square', 0.16); },
  boost() { this.tone(260, 0.45, 'sawtooth', 0.12, 1100); [660, 880, 1320].forEach((f, i) => setTimeout(() => this.tone(f, 0.09, 'triangle', 0.15), i * 55)); },
  bump() { this.noise(0.18, 0.35); this.tone(110, 0.18, 'sine', 0.3, 45); },
  finish() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'triangle', 0.18), i * 140)); }
};

// ---------------------------------------------------------------- UI helpers
const liveP = $('liveP'), liveA = $('liveA');
function say(msg, assertive) {
  if (!settings.announce && !assertive) return;
  const el = assertive ? liveA : liveP; el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 40);
}
let fxTimer = 0;
function showFx(text, cls) {
  const el = $('fx'); el.className = ''; void el.offsetWidth; el.textContent = text; el.className = 'show ' + cls;
  clearTimeout(fxTimer); fxTimer = setTimeout(() => { el.className = ''; }, settings.rm ? 900 : 1150);
}
let soundCueT = 0, bumpT = 0;
function soundCue() { soundCueT = 0.5; }

const overlays = ['menu', 'setup', 'garage', 'help', 'settings', 'pause', 'results'];
let overlayStack = [];
function showOverlay(id, push) {
  overlays.forEach(o => { $(o).hidden = o !== id; });
  if (push) overlayStack.push(id); else overlayStack = id ? [id] : [];
  if (id) { const f = (id === 'garage' && $('gBikes').querySelector('[tabindex="0"]')) || $(id).querySelector('button.primary') || $(id).querySelector('button, select'); if (f) setTimeout(() => f.focus(), 30); }
}
function backOverlay() {
  overlayStack.pop(); const prev = overlayStack[overlayStack.length - 1];
  overlays.forEach(o => { $(o).hidden = o !== prev; });
  if (prev === 'setup') refreshSetup();
  if (prev) { const f = $(prev).querySelector('button.primary'); if (f) f.focus(); }
}
const subOverlayOpen = () => ['settings', 'help', 'garage', 'setup'].some(o => !$(o).hidden);

function applySettings() {
  document.body.classList.toggle('hc', !!settings.hc);
  document.body.classList.toggle('rm', !!settings.rm);
  Sound.enable(settings.sound);
  const touchDev = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const showTouch = settings.touch === 'on' || (settings.touch === 'auto' && touchDev);
  $('touch').hidden = !(showTouch && state !== 'menu');
  const one = settings.assist === 'one';
  document.querySelector('#touch .tgroup.right').hidden = one;
  document.querySelector('#touch .tgroup.left').hidden = one || settings.assist === 'auto';
  $('oneBtn').hidden = !one;
  const desc = { off: 'Assist: off.', auto: 'Assist: auto-steer.', one: 'Assist: one-button.' }[settings.assist];
  $('menuAssist').textContent = `${raceLabel()} · ${LOC(settings.loc).name} · traffic ${settings.traffic} · ${BIKE(settings.bike).name}. ${desc} Game speed ${Math.round(settings.gameSpeed * 100)}%.`;
  saveSettings();
}
const raceLabel = () => settings.race === 'sprint' ? '15 km sprint' : `${settings.race} lap${settings.race === '1' ? '' : 's'}`;
function bindSettingsForm() {
  const map = [['sAssist', 'assist', 'v'], ['sSpeed', 'gameSpeed', 'n'], ['sDiff', 'difficulty', 'v'], ['sTouch', 'touch', 'v'],
    ['sAutoAccel', 'autoAccel', 'c'], ['sSound', 'sound', 'c'], ['sHC', 'hc', 'c'], ['sRM', 'rm', 'c'], ['sAnnounce', 'announce', 'c']];
  map.forEach(([id, key, t]) => {
    const el = $(id);
    if (t === 'c') el.checked = !!settings[key]; else el.value = String(settings[key]);
    el.addEventListener('change', () => { settings[key] = t === 'c' ? el.checked : t === 'n' ? parseFloat(el.value) : el.value; applySettings(); });
  });
}
function syncForm() { $('sAssist').value = settings.assist; $('sSpeed').value = String(settings.gameSpeed); $('sDiff').value = settings.difficulty; $('sTouch').value = settings.touch; $('sAutoAccel').checked = settings.autoAccel; $('sSound').checked = settings.sound; $('sHC').checked = settings.hc; $('sRM').checked = settings.rm; $('sAnnounce').checked = settings.announce; }

// ---------------------------------------------------------------- race setup + garage screens
const sideCache = {};
const sideURL = (id, col) => sideCache[id + col] || (sideCache[id + col] = bikeSide(id, col).toDataURL());
function bikeStatsText(b) { return `Top ${b.top} km/h (boost ${b.top + BOOST_ADD}) · acceleration ${accRating(b)}/10 · handling ${handRating(b)}/10 · boost ${b.boost}s · off-road ${b.off} km/h`; }
const accRating = b => Math.round(clamp((b.acc - 12) / 2, 1, 10));
const handRating = b => Math.round(clamp((b.hand - 0.7) / 0.06, 1, 10));
function buildSetup() {
  const sel = $('sLoc'); sel.innerHTML = '';
  LOCS.forEach(l => { const o = document.createElement('option'); o.value = l.id; o.textContent = l.name; sel.appendChild(o); });
  const onChange = () => { settings.race = $('sRace').value; settings.loc = $('sLoc').value; settings.traffic = $('sTraffic').value; refreshSetup(); applySettings(); if (state === 'menu') newRace(); };
  ['sRace', 'sLoc', 'sTraffic'].forEach(id => $(id).addEventListener('change', onChange));
}
function refreshSetup() {
  $('sRace').value = settings.race; $('sLoc').value = settings.loc; $('sTraffic').value = settings.traffic;
  $('locDesc').textContent = LOC(settings.loc).desc;
  const b = BIKE(settings.bike); $('setupBikeImg').src = sideURL(b.id, settings.color); $('setupBikeImg').alt = `${b.name} in ${colorName(settings.color)}`;
  $('setupBikeName').textContent = b.name; $('setupBikeStats').textContent = bikeStatsText(b);
}
const colorName = c => (COLORS.find(x => x[0] === c) || [0, 'custom'])[1];
function roving(container, onPick) {
  container.addEventListener('keydown', e => {
    const items = [...container.querySelectorAll('[role=radio]')]; const i = items.indexOf(document.activeElement); if (i < 0) return;
    let j = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % items.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = items.length - 1;
    if (j >= 0) { e.preventDefault(); items[j].focus(); onPick(items[j].dataset.v); }
  });
}
function buildGarage() {
  const grid = $('gBikes'); grid.innerHTML = '';
  BIKES.forEach(b => {
    const btn = document.createElement('button'); btn.className = 'bikecard'; btn.type = 'button';
    btn.setAttribute('role', 'radio'); btn.dataset.v = b.id;
    btn.setAttribute('aria-label', `${b.name}: top speed ${b.top} km/h, boosted ${b.top + BOOST_ADD}`);
    btn.innerHTML = `<img alt=""><span>${b.name}</span><small>${b.top} km/h · boost ${b.top + BOOST_ADD}</small>`;
    btn.onclick = () => pickBike(b.id); grid.appendChild(btn);
  });
  const sw = $('gColors'); sw.innerHTML = '';
  COLORS.forEach(([c, n]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'swatch'; b.style.background = c; b.setAttribute('role', 'radio'); b.dataset.v = c; b.setAttribute('aria-label', n); b.onclick = () => pickColor(c); sw.appendChild(b); });
  roving(grid, pickBike); roving(sw, pickColor);
}
function refreshGarage(announce) {
  const b = BIKE(settings.bike);
  $('gBikes').querySelectorAll('[role=radio]').forEach(el => { const on = el.dataset.v === b.id; el.setAttribute('aria-checked', on); el.tabIndex = on ? 0 : -1; el.querySelector('img').src = sideURL(el.dataset.v, settings.color); });
  $('gColors').querySelectorAll('[role=radio]').forEach(el => { const on = el.dataset.v === settings.color; el.setAttribute('aria-checked', on); el.tabIndex = on ? 0 : -1; });
  const sc = $('gPreviewSide').getContext('2d'); sc.clearRect(0, 0, 520, 300); sc.drawImage(bikeSide(b.id, settings.color), 0, 0, 520, 320);
  const bc = $('gPreviewBack').getContext('2d'); bc.clearRect(0, 0, 160, 210); bc.drawImage(bikeBack(b.id, settings.color, '#ffffff', 'P1'), 0, 0);
  $('gPreviewSide').setAttribute('aria-label', `Side view of the ${b.name} in ${colorName(settings.color)}`);
  $('gName').textContent = b.name; $('gDesc').textContent = b.desc;
  const rows = [['TOP SPEED', b.top / 130, `${b.top} km/h`], ['BOOSTED', (b.top + BOOST_ADD) / 130, `${b.top + BOOST_ADD} km/h`], ['ACCELERATION', accRating(b) / 10, `${accRating(b)}/10`], ['HANDLING', handRating(b) / 10, `${handRating(b)}/10`], ['BOOST TIME', b.boost / 8, `${b.boost} s`], ['OFF-ROAD', b.off / 90, `${b.off} km/h`]];
  $('gStats').innerHTML = rows.map(([k, f, v]) => `<dt>${k}</dt><dd aria-hidden="true"><span class="bar"><i style="width:${Math.round(clamp(f, 0, 1) * 100)}%"></i></span></dd><dd>${v}</dd>`).join('');
  if (announce) $('gLive').textContent = `${b.name}, ${colorName(settings.color)}. ${b.desc} ${bikeStatsText(b)}.`;
}
function pickBike(id) { settings.bike = id; saveSettings(); refreshGarage(true); applySettings(); if (state === 'menu') newRace(); }
function pickColor(c) { settings.color = c; saveSettings(); refreshGarage(true); applySettings(); if (state === 'menu') newRace(); }

// ---------------------------------------------------------------- input
const keys = {};
const keyMap = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ' ': 'space', ArrowDown: 'down', s: 'down', S: 'down' };
const racingActive = () => (state === 'countdown' || state === 'racing' || state === 'finished') && !paused;
addEventListener('keydown', e => {
  const tag = (e.target && e.target.tagName) || '';
  const k = e.key;
  if (k === 'Escape' || ((k === 'p' || k === 'P') && tag !== 'SELECT')) {
    if (subOverlayOpen()) { e.preventDefault(); backOverlay(); }
    else if (state === 'countdown' || state === 'racing') { e.preventDefault(); togglePause(); }
    return;
  }
  if (tag === 'SELECT' || tag === 'INPUT') return;
  if (k === 'm' || k === 'M') { settings.sound = !settings.sound; syncForm(); applySettings(); say('Sound ' + (settings.sound ? 'on' : 'off'), true); return; }
  if (k === 'h' || k === 'H') { settings.hc = !settings.hc; syncForm(); applySettings(); say('High contrast ' + (settings.hc ? 'on' : 'off'), true); return; }
  if (k === 'i' || k === 'I') { announceStatus(); return; }
  if (racingActive()) {
    if (keyMap[k] || k === 'Enter') e.preventDefault();
    if (keyMap[k]) keys[keyMap[k]] = true;
    if (settings.assist === 'one' && !e.repeat && !['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(k)) keys.one = true;
  }
});
addEventListener('keyup', e => { const k = e.key; if (keyMap[k]) keys[keyMap[k]] = false; if (settings.assist === 'one') keys.one = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (state === 'racing' || state === 'countdown') pauseGame(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && (state === 'racing' || state === 'countdown')) pauseGame(true); });
document.querySelectorAll('.tbtn').forEach(b => {
  const k = b.dataset.k;
  const on = e => { e.preventDefault(); keys[k] = true; b.classList.add('on'); Sound.init(); };
  const off = e => { e.preventDefault(); keys[k] = false; b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  b.addEventListener('contextmenu', e => e.preventDefault());
});
// ---------------------------------------------------------------- race state
let state = 'menu', paused = false;
let riders = [], player = null, raceTime = 0, realTime = 0, cdTime = 0, cdShown = 0, finishDelay = 0;
let farOff = 0, nearOff = 0, cityOff = 0, shake = 0, lean = 0, lastPos = 0, posSayT = 0, milestones = [], seed = 1;
const DIFF = { easy: [0.84, 0.95, 0.45], normal: [0.9, 0.995, 0.7], hard: [0.94, 1.0, 0.9] };
const AI_BIKES = { naked: 3, sport: 3, cafe: 2, adventure: 2, touring: 1, cruiser: 1, electric: 2, dirt: 1, commuter: 1, scooter: 0.5 };
const RIDER_DEFS = [
  ['You', '#ff3d6e', '#ffffff'], ['Rossi', '#ffd23f', '#1b2a6b'], ['Marquez', '#ff8a3d', '#ffffff'], ['Akira', '#29d3ff', '#ffffff'],
  ['Lorenzo', '#2fbf71', '#111111'], ['Stoner', '#7b5cff', '#ffd23f'], ['Pedrosa', '#e6e6e6', '#c8102e'], ['Nakano', '#c8102e', '#ffffff'],
  ['Bayliss', '#1b4fd8', '#ff8a3d'], ['Doohan', '#ff4fd8', '#111111'], ['Rainey', '#8b5a2b', '#ffd23f'], ['Sheene', '#00a19a', '#ffffff'],
  ['Fogarty', '#4a4f5a', '#29d3ff'], ['Haga', '#b6e600', '#111111'], ['Rea', '#f2f2f2', '#2fbf71']
];
const halfW = r => r.bike.w / ROAD_W / 2;

function newRace() {
  seed = (Math.random() * 1e9) | 0;
  circuit = settings.race !== 'sprint'; laps = circuit ? parseInt(settings.race, 10) || 1 : 1; loc = LOC(settings.loc);
  buildTrack(seed);
  const [mn, mx, sk] = DIFF[settings.difficulty] || DIFF.normal;
  const R = mulberry32(seed + 7);
  riders = RIDER_DEFS.map((d, i) => {
    const bike = i === 0 ? BIKE(settings.bike) : BIKE(pickW(AI_BIKES, R)), color = i === 0 ? settings.color : d[1];
    return {
      id: i, name: d[0], color, bike, img: bikeBack(bike.id, color, d[2], i === 0 ? 'P1' : String(i + 1)),
      isPlayer: i === 0, z: 0, x: 0, kmh: 0, boost: 0, boosts: 0, lean: 0, finished: false, finishTime: 0, pos: 0, est: false,
      lap: 1, lapStart: 0, lapTimes: [],
      maxKmh: i === 0 ? bike.top : bike.top * lerp(mn, mx, R()), accel: bike.acc * (0.75 + R() * 0.3), skill: clamp(sk + (R() - 0.5) * 0.3, 0.2, 1),
      laneX: (R() * 1.4 - 0.7), laneT: 2 + R() * 5, react: 0.15 + R() * 0.6, wob: R() * 6, targetP: null, prevSeg: 0, cooldown: 0
    };
  });
  player = riders[0];
  const playerSlot = 10, ai = []; for (let s = 0; s < N_RIDERS; s++) if (s !== playerSlot) ai.push(s);
  riders.forEach((r, i) => {
    const s = i === 0 ? playerSlot : ai[i - 1], row = Math.floor(s / 3), col = s % 3;
    r.z = START_Z - 300 - row * 520; r.x = [-0.55, 0, 0.55][col] + (i ? (R() - 0.5) * 0.08 : 0); r.prevSeg = Math.floor(r.z / SEG); r.laneX = r.x;
  });
  spawnTraffic(seed);
  raceTime = 0; realTime = 0; finishDelay = 0; lastPos = 0; posSayT = 0;
  const totalKm = (finishZ - START_Z) / KM_UNITS;
  milestones = [10, 5, 3, 2, 1, 0.5].filter(m => m < totalKm);
  farOff = nearOff = cityOff = 0; shake = 0; lean = 0;
  buildProgressDots(); computePositions();
}
function buildProgressDots() {
  const tr = $('progressTrack'); tr.querySelectorAll('.dot').forEach(d => d.remove());
  riders.forEach(r => { const d = document.createElement('div'); d.className = 'dot' + (r.isPlayer ? ' me' : ''); d.style.background = r.color; r.dot = d; tr.appendChild(d); });
}
function goFullscreen() { // Android/touch: hide the browser bars during a race (needs a tap, ignored if unsupported)
  const touchDev = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (!touchDev || document.fullscreenElement || !document.documentElement.requestFullscreen) return;
  try {
    const p = document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    const lock = () => { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { } };
    if (p && p.then) p.then(lock).catch(() => {}); else lock();
  } catch (e) { }
}
function startRace() {
  Sound.init(); goFullscreen(); newRace(); state = 'countdown'; paused = false; cdTime = 3.999; cdShown = 0;
  showOverlay(null); $('hud').hidden = false; $('pauseBtn').hidden = false; applySettings();
  const what = circuit ? `${laps} lap${laps > 1 ? 's' : ''} of ${(laps * trackLen / KM_UNITS).toFixed(1)} kilometres total` : '15 kilometre sprint';
  say(`Get ready. ${what} in ${loc.name}, ${settings.traffic} traffic. You ride the ${player.bike.name}, starting ${ordinal(player.pos)} of ${N_RIDERS}.`, true);
  showFx(loc.tour ? 'WORLD TOUR' : loc.name.split(',')[0].toUpperCase(), 'info');
}
function togglePause() { paused ? resumeGame() : pauseGame(false); }
function pauseGame(auto) {
  if (paused) return; paused = true; for (const k in keys) keys[k] = false; Sound.engine(0, false);
  $('pauseStatus').textContent = statusText();
  showOverlay('pause'); say('Paused' + (auto ? ' because the window lost focus' : '') + '. ' + statusText(), true);
}
function resumeGame() { paused = false; showOverlay(null); say('Resumed', true); last = performance.now(); }
function quitToMenu(next) {
  state = 'menu'; paused = false; $('hud').hidden = true; $('pauseBtn').hidden = true; $('countdown').textContent = ''; $('offroad').hidden = true;
  Sound.engine(0, false); document.body.classList.remove('boosting', 'bumped'); newRace(); applySettings();
  showOverlay('menu'); if (next === 'setup') { refreshSetup(); showOverlay('setup', true); }
}
function statusText() {
  if (!player) return '';
  const rem = Math.max(0, (finishZ - player.z) / KM_UNITS);
  return `Position ${player.pos} of ${N_RIDERS}.${circuit ? ` Lap ${player.lap} of ${laps}.` : ''} ${Math.round(player.kmh)} kilometres per hour. ${rem.toFixed(1)} kilometres to go.${player.boost > 0 ? ' Boost active.' : ''}`;
}
function announceStatus() { if (state === 'menu') say('Main menu.', true); else say(statusText(), true); }
function computePositions() {
  const order = riders.slice().sort((a, b) => (a.finished && b.finished) ? a.finishTime - b.finishTime : a.finished ? -1 : b.finished ? 1 : b.z - a.z);
  order.forEach((r, i) => r.pos = i + 1); return order;
}

// ---------------------------------------------------------------- AI & physics
function findBoostTarget(r, range) {
  const si = Math.floor(r.z / SEG), N = segments.length;
  for (let s = si + 2; s < si + range; s++) {
    const p = segments[mod(s, N)].pickup;
    if (p && p.active && Math.abs(p.x - r.x) < 0.15 + (s - si) * 0.012) return p;
  }
  return null;
}
function steerTarget(r, base, seekBoost) {
  let tx = base;
  if (seekBoost) {
    if (r.targetP) { const d = relZ(r.targetP.seg * SEG, r.z); if (!r.targetP.active || d < 0 || d > 120 * SEG) r.targetP = null; }
    if (!r.targetP) r.targetP = findBoostTarget(r, 90);
    if (r.targetP) tx = r.targetP.x;
  }
  for (const o of riders) {
    if (o === r || o.finished) continue;
    const dz = o.z - r.z;
    if (dz > 0 && dz < 45 * SEG && Math.abs(o.x - tx) < 0.2 && o.kmh <= r.kmh + 3) {
      const left = o.x - 0.3, right = o.x + 0.3;
      tx = (Math.abs(left - r.x) < Math.abs(right - r.x) && left > -0.85) || right > 0.85 ? left : right;
    }
  }
  for (const v of traffic) { // plan a line around slower traffic
    const dz = relZ(v.z, r.z), hw = v.w / ROAD_W / 2 + halfW(r) + 0.06;
    if (dz > -v.len && dz < 40 * SEG && Math.abs(v.x - tx) < hw) {
      const left = v.x - hw - 0.02, right = v.x + hw + 0.02;
      const okL = left > -0.92, okR = right < 0.92;
      tx = okL && (!okR || Math.abs(left - r.x) < Math.abs(right - r.x)) ? left : okR ? right : tx;
    }
  }
  return clamp(tx, -0.9, 0.9);
}
function collectPickups(r) {
  const cur = Math.floor(r.z / SEG), N = segments.length;
  for (let s = r.prevSeg; s <= cur; s++) {
    const seg = segments[mod(s, N)]; if (!seg.pickup) continue; const p = seg.pickup;
    if (p.active && Math.abs(p.x - r.x) < 0.16) {
      p.active = false; p.t = PICKUP_RESPAWN; r.boost = Math.min(r.bike.boost * 2, r.boost + r.bike.boost); r.boosts++;
      if (r.isPlayer) { Sound.boost(); soundCue(); showFx(`BOOST! ${r.bike.top + BOOST_ADD} km/h`, 'boost'); say(`Boost! Limit ${r.bike.top + BOOST_ADD} kilometres per hour for ${Math.round(r.boost)} seconds.`); }
    }
  }
  r.prevSeg = cur;
}
function updateTraffic(simDt, gameDt) {
  if (state !== 'racing' && state !== 'finished') return;
  for (const v of traffic) {
    let target = v.base, blocked = false;
    for (const o of traffic) { if (o === v || Math.abs(o.x - v.x) > 0.3) continue; const d = relZ(o.z, v.z); if (d > 0 && d < v.len + 1800) { target = Math.min(target, o.kmh - 2); blocked = true; } }
    v.laneT -= simDt;
    if (blocked && v.laneT < 0) { // try an adjacent lane if it is clear
      v.laneT = 3 + Math.random() * 4;
      const opts = [v.lane - 1, v.lane + 1].filter(l => l >= 0 && l < 4);
      for (const l of opts) { if (traffic.every(o => o === v || o.lane !== l || Math.abs(relZ(o.z, v.z)) > 2200)) { v.lane = l; break; } }
    }
    v.x += clamp(LANE_X[v.lane] - v.x, -1, 1) * simDt * 0.8;
    v.kmh = lerp(v.kmh, Math.max(5, target), clamp(simDt * 1.5, 0, 1));
    v.z += v.kmh / 3.6 * UPM * gameDt;
    if (circuit) v.z = mod(v.z, trackLen);
    else if (v.z > finishZ + 1000 * UPM) v.z -= (finishZ - START_Z);
  }
}
function trafficCollide(r) {
  for (const v of traffic) {
    const d = relZ(v.z, r.z); // >0: vehicle rear is ahead of rider
    if (d > 140 || d < -v.len) continue;
    const hw = v.w / ROAD_W / 2 + halfW(r) * 0.8; if (Math.abs(r.x - v.x) > hw) continue;
    if (d > -120) { r.kmh = Math.min(r.kmh, v.kmh * 0.8); r.z -= (140 - d) * 0.5; r.x += (r.x < v.x ? -1 : 1) * 0.03; }
    else { r.x += (r.x < v.x ? -1 : 1) * 0.1; r.kmh *= 0.9; }
    if (r.isPlayer) bump(`HIT ${v.name.toUpperCase()}!`, v.name);
    else { r.targetP = null; }
  }
}
function trackLaps(r) {
  if (!circuit || r.finished || r.z < START_Z) return;
  const newLap = Math.min(laps, Math.floor((r.z - START_Z) / trackLen) + 1);
  if (newLap > r.lap) {
    const over = (r.z - (START_Z + (newLap - 1) * trackLen)) / (r.kmh / 3.6 * UPM || 1), t = raceTime - over;
    r.lapTimes.push(t - r.lapStart); r.lapStart = t; r.lap = newLap;
    if (r.isPlayer) {
      const lt = r.lapTimes[r.lapTimes.length - 1], final = newLap === laps;
      showFx(final ? 'FINAL LAP!' : `LAP ${newLap}/${laps}`, 'info'); Sound.beep(true); soundCue();
      say(`${final ? 'Final lap' : `Lap ${newLap} of ${laps}`}. Last lap ${fmtTime(lt)}. Position ${r.pos}.`);
    }
  }
}
function update(dtReal) {
  const simDt = dtReal * settings.gameSpeed, gameDt = simDt * TIME_SCALE;
  if (state === 'countdown') {
    cdTime -= dtReal;
    const n = Math.ceil(cdTime);
    if (n !== cdShown) {
      cdShown = n;
      if (n > 0) { $('countdown').textContent = n; Sound.beep(false); soundCue(); say(String(n), true); }
      else { $('countdown').textContent = 'GO!'; Sound.beep(true); soundCue(); say('Go!', true); state = 'racing'; setTimeout(() => { if ($('countdown').textContent === 'GO!') $('countdown').textContent = ''; }, 900); }
    }
    if (state === 'countdown') { Sound.engine(keys.up || keys.space ? 60 : 15, true); return; }
  }
  if (state === 'results') return;
  raceTime += gameDt; realTime += dtReal;
  for (const p of pickups) if (!p.active) { p.t -= simDt; if (p.t <= 0) p.active = true; }
  updateTraffic(simDt, gameDt);

  // ----- player
  const pb = player.bike, pSeg = segAt(player.z);
  const assist = settings.assist !== 'off' || player.finished;
  let throttle, brake, steer;
  if (player.finished) { throttle = player.kmh < 50; brake = false; }
  else if (settings.assist === 'one') { throttle = settings.autoAccel || keys.one || keys.up || keys.space; brake = false; }
  else { brake = !!keys.down; throttle = !brake && (settings.autoAccel || keys.up || keys.space); }
  if (assist) { const tx = steerTarget(player, clamp(player.x, -0.8, 0.8), !player.finished); steer = clamp((tx - player.x) * 5, -1, 1); }
  else steer = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
  const pmax = player.boost > 0 ? pb.top + BOOST_ADD : pb.top;
  if (throttle) { if (player.kmh < pmax) player.kmh = Math.min(pmax, player.kmh + pb.acc * (player.kmh < 40 ? 1.2 : 0.85) * simDt); }
  else if (brake) player.kmh -= 70 * simDt;
  else player.kmh -= 9 * simDt;
  if (player.kmh > pmax) player.kmh = Math.max(pmax, player.kmh - 14 * simDt);
  const offroad = Math.abs(player.x) > 1.02;
  if (offroad && player.kmh > pb.off) player.kmh = Math.max(pb.off, player.kmh - 80 * simDt);
  player.kmh = clamp(player.kmh, 0, pb.top + BOOST_ADD);
  const sp = player.kmh / 100;
  const centri = simDt * 2 * sp * sp * pSeg.curve * 0.17 / pb.hand;
  player.x += steer * simDt * 1.7 * pb.hand * clamp(sp, 0.35, 1.05);
  if (!assist) player.x -= centri;
  player.x = clamp(player.x, -2.6, 2.6);
  lean = lerp(lean, steer * clamp(sp, 0, 1) + (assist ? 0 : -centri * 8), clamp(simDt * 8, 0, 1));
  const oldZ = player.z;
  player.z += player.kmh / 3.6 * UPM * gameDt;
  if (player.boost > 0) player.boost = Math.max(0, player.boost - simDt);
  $('offroad').hidden = !(offroad && state === 'racing' && player.kmh > 5 && pb.off < 70);
  if (Math.abs(player.x) > 1) {
    for (const sg of [segAt(player.z), segAt(player.z + SEG)]) for (const s of sg.sprites) {
      if (!s.hit || s.center) continue;
      const sw = s.w / ROAD_W, lo = s.x < 0 ? s.x - sw : s.x, hi = s.x < 0 ? s.x : s.x + sw;
      if (player.x + halfW(player) > lo && player.x - halfW(player) < hi && player.kmh > 10) { player.kmh = Math.min(player.kmh, 12); player.x *= 0.85; bump('CRASH!', 'scenery'); }
    }
  }
  collectPickups(player); trafficCollide(player);

  // ----- AI
  for (const r of riders) {
    if (r.isPlayer) continue;
    if (r.react > 0 && state === 'racing') { r.react -= simDt; continue; }
    const seg = segAt(r.z);
    r.laneT -= simDt; if (r.laneT <= 0) { r.laneX = Math.random() * 1.5 - 0.75; r.laneT = 3 + Math.random() * 6; }
    const seek = !r.finished && (r.cooldown -= simDt) < 0 && (r.targetP || Math.random() < r.skill * 0.15 + 0.03);
    const tx = steerTarget(r, r.laneX, seek || !!r.targetP);
    const oldX = r.x;
    r.x += clamp((tx - r.x) * 3, -1, 1) * simDt * 0.9 * r.bike.hand;
    r.lean = lerp(r.lean, clamp((r.x - oldX) / Math.max(simDt, 1e-4), -1, 1), 0.15);
    const gap = (player.z - r.z) / UPM;
    const bmax = r.boost > 0 ? r.bike.top + BOOST_ADD : r.bike.top;
    let target = r.finished ? 70 : r.maxKmh + Math.sin(raceTime * 0.05 + r.wob) * 1.2 + clamp(gap / 300, -2.5, 4) - Math.abs(seg.curve) * 0.4;
    if (r.boost > 0) target = bmax;
    target = Math.min(target, bmax);
    if (r.kmh < target) r.kmh = Math.min(target, r.kmh + r.accel * simDt * (r.kmh < 40 ? 1.3 : 1));
    else r.kmh = Math.max(target, r.kmh - 14 * simDt);
    r.z += r.kmh / 3.6 * UPM * gameDt;
    if (r.boost > 0) r.boost = Math.max(0, r.boost - simDt);
    const had = r.boosts; collectPickups(r); if (r.boosts > had) { r.targetP = null; r.cooldown = 2; }
    trafficCollide(r);
  }
  // ----- rider vs rider
  for (let i = 0; i < riders.length; i++) for (let j = i + 1; j < riders.length; j++) {
    const a = riders[i], b = riders[j];
    const dz = a.z - b.z; if (Math.abs(dz) > 260) continue;
    if (Math.abs(a.x - b.x) > (halfW(a) + halfW(b)) * 0.85) continue;
    const front = dz > 0 ? a : b, back = dz > 0 ? b : a;
    if (back.kmh > front.kmh - 1) {
      const wasFast = back.kmh - front.kmh;
      back.kmh = front.kmh * 0.93; back.z = Math.min(back.z, front.z - 240);
      const push = back.x < front.x ? -1 : 1; back.x += push * 0.05; front.x -= push * 0.02;
      if (back.isPlayer && wasFast > 2) bump('BUMP!', 'rider');
      if (front.isPlayer && wasFast > 6) shake = Math.max(shake, 0.25);
    }
  }
  // ----- laps & finish
  for (const r of riders) {
    trackLaps(r);
    if (!r.finished && r.z >= finishZ) {
      r.finished = true; const over = (r.z - finishZ) / (r.kmh / 3.6 * UPM || 1); r.finishTime = raceTime - over;
      if (circuit) r.lapTimes.push(r.finishTime - r.lapStart);
      if (r.isPlayer) onPlayerFinish();
    }
  }
  computePositions();
  if (state === 'racing') {
    const rem = (finishZ - player.z) / KM_UNITS;
    while (milestones.length && rem <= milestones[0]) { const m = milestones.shift(); say(`${m} kilometre${m === 1 ? '' : 's'} to go. Position ${player.pos} of ${N_RIDERS}.`); if (m <= 1 && !circuit) showFx(m === 1 ? 'FINAL KM' : '500 m', 'info'); }
    posSayT -= dtReal;
    if (player.pos !== lastPos && posSayT <= 0) { if (lastPos) say(`Position ${player.pos}`); lastPos = player.pos; posSayT = 3; }
  }
  if (state === 'finished') { finishDelay -= dtReal; if (finishDelay <= 0) showResults(); }
  const dSeg = (player.z - oldZ) / SEG;
  farOff += pSeg.curve * dSeg * 0.25 * (W / 1000); nearOff += pSeg.curve * dSeg * 0.6 * (W / 1000); cityOff += pSeg.curve * dSeg * 0.45 * (W / 1000);
  if (shake > 0) shake = Math.max(0, shake - dtReal);
  if (bumpT > 0) { bumpT -= dtReal; if (bumpT <= 0) document.body.classList.remove('bumped'); }
  document.body.classList.toggle('boosting', player.boost > 0 && !player.finished);
  Sound.engine(player.kmh, state === 'racing' || state === 'finished');
}
function bump(text, what) {
  if (bumpT > 0) return; bumpT = 0.45; Sound.bump(); soundCue(); showFx(text, 'bump'); shake = 0.35;
  document.body.classList.add('bumped');
  if (what === 'scenery') say('Crashed into scenery. Steer back onto the road.');
  else if (what !== 'rider') say(`Hit a ${what}. Slowed down.`);
}
function onPlayerFinish() {
  state = 'finished'; finishDelay = 3; Sound.finish(); soundCue();
  showFx(`FINISH! ${ordinal(player.pos)}`, 'info'); $('countdown').textContent = '';
  say(`Finished in ${ordinal(player.pos)} place. Race time ${fmtTime(player.finishTime)}.`, true);
}
function showResults() {
  state = 'results'; Sound.engine(0, false); document.body.classList.remove('boosting');
  riders.forEach(r => { if (!r.finished) { const remKm = (finishZ - r.z) / KM_UNITS; r.finishTime = raceTime + remKm / Math.max(50, r.maxKmh * 0.98) * 3600; r.est = true; } });
  const order = riders.slice().sort((a, b) => a.finishTime - b.finishTime); order.forEach((r, i) => r.pos = i + 1);
  const win = order[0].finishTime, tb = $('resTable').querySelector('tbody'); tb.innerHTML = '';
  order.forEach(r => {
    const best = r.lapTimes.length ? Math.min(...r.lapTimes) : 0;
    const tr = document.createElement('tr'); if (r.isPlayer) tr.className = 'me';
    tr.innerHTML = `<td>${r.pos}</td><td><span class="sw" style="background:${r.color}"></span>${r.isPlayer ? 'You' : r.name}</td><td>${r.bike.short}</td><td>${fmtTime(r.finishTime)}${r.est ? '*' : ''}</td><td>${r.pos === 1 ? 'Winner' : '+' + (r.finishTime - win).toFixed(1) + 's'}</td><td>${circuit && best ? fmtTime(best) : '–'}</td><td>${r.boosts}</td>`;
    tb.appendChild(tr);
  });
  const p = player.pos, lapsList = $('lapList'); lapsList.innerHTML = '';
  $('lapWrap').hidden = !circuit;
  if (circuit) { const best = Math.min(...player.lapTimes); player.lapTimes.forEach((t, i) => { const li = document.createElement('li'); li.textContent = `Lap ${i + 1}: ${fmtTime(t)}${t === best ? ' (best)' : ''}`; if (t === best) li.className = 'best'; lapsList.appendChild(li); }); }
  const what = circuit ? `${laps} lap${laps > 1 ? 's' : ''}` : '15 km sprint';
  $('resSummary').innerHTML = `${loc.name} · ${what} · ${settings.traffic} traffic · ${player.bike.name}<br>You finished <b>${ordinal(p)} of ${N_RIDERS}</b> in <b>${fmtTime(player.finishTime)}</b> race time (${fmtTime(realTime)} real time), with ${player.boosts} boost${player.boosts === 1 ? '' : 's'}. ${p === 1 ? '🏆 Victory!' : p === 2 ? '🥈 Podium!' : p === 3 ? '🥉 Podium!' : ''}<br><span class="small">The race clock runs on 3× game time. * means the time is estimated for a rider still on the course.</span>`;
  showOverlay('results'); $('pauseBtn').hidden = true;
  say(`Results. You finished ${ordinal(p)} of ${N_RIDERS}. Winner ${order[0].isPlayer ? 'you' : order[0].name}.${circuit ? ` Your best lap ${fmtTime(Math.min(...player.lapTimes))}.` : ''}`, true);
}
// ---------------------------------------------------------------- rendering
function project(p, cx, cy, cz) {
  p.camera.x = -cx; p.camera.y = p.world.y - cy; p.camera.z = p.world.z - cz;
  const s = p.screen.scale = CAM_DEPTH / p.camera.z;
  p.screen.x = Math.round(W / 2 + s * p.camera.x * KX); p.screen.y = Math.round(HY - s * p.camera.y * KY); p.screen.w = Math.round(s * ROAD_W * KX);
}
function quad(x1, y1, x2, y2, x3, y3, x4, y4, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath(); ctx.fill(); }
const RUMBLE_L = [236, 236, 236], RUMBLE_D = [206, 32, 40], LANE = [240, 240, 240];
function drawSegment(seg, pal, fog) {
  const p1 = seg.p1.screen, p2 = seg.p2.screen, hc = settings.hc;
  const alt = Math.floor(seg.index / RUMBLE) % 2;
  const fogC = pal.skyBot, f = hc ? 0 : fog;
  const g = alt ? pal.grassL : pal.grassD;
  ctx.fillStyle = rgb(f ? mix(g, fogC, f) : g); ctx.fillRect(0, p2.y, W, p1.y - p2.y);
  const Y1 = p1.y + 1, r1 = p1.w / 7, r2 = p2.w / 7;
  let rc = hc ? (alt ? [255, 230, 0] : [0, 0, 0]) : (alt ? RUMBLE_L : RUMBLE_D); rc = rgb(mix(rc, fogC, f));
  quad(p1.x - p1.w - r1, Y1, p1.x - p1.w, Y1, p2.x - p2.w, p2.y, p2.x - p2.w - r2, p2.y, rc);
  quad(p1.x + p1.w + r1, Y1, p1.x + p1.w, Y1, p2.x + p2.w, p2.y, p2.x + p2.w + r2, p2.y, rc);
  const road = alt ? pal.road : mix(pal.road, [0, 0, 0], 0.04);
  quad(p1.x - p1.w, Y1, p1.x + p1.w, Y1, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y, rgb(mix(road, fogC, f)));
  const startSeg = Math.floor(START_Z / SEG), finSeg = Math.floor(mod(finishZ, trackLen) / SEG);
  if ((seg.index >= finSeg && seg.index < finSeg + 3) || (seg.index >= startSeg && seg.index < startSeg + 2)) {
    const n = 10; for (let k = 0; k < n; k++) if ((k + seg.index) % 2) { const a = -1 + 2 * k / n, b = -1 + 2 * (k + 1) / n; quad(p1.x + p1.w * a, p1.y, p1.x + p1.w * b, p1.y, p2.x + p2.w * b, p2.y, p2.x + p2.w * a, p2.y, '#fff'); }
    return;
  }
  if (alt) {
    const l1 = p1.w / 28, l2 = p2.w / 28, lw1 = p1.w * 2 / LANES, lw2 = p2.w * 2 / LANES;
    const lc = rgb(mix(hc ? [255, 230, 0] : LANE, fogC, f));
    for (let l = 1; l < LANES; l++) { const x1 = p1.x - p1.w + lw1 * l, x2 = p2.x - p2.w + lw2 * l; quad(x1 - l1 / 2, p1.y, x1 + l1 / 2, p1.y, x2 + l2 / 2, p2.y, x2 - l2 / 2, p2.y, lc); }
  }
  if (hc) { const e1 = p1.w / 30, e2 = p2.w / 30; quad(p1.x - p1.w, p1.y, p1.x - p1.w + e1, p1.y, p2.x - p2.w + e2, p2.y, p2.x - p2.w, p2.y, '#fff'); quad(p1.x + p1.w - e1, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x + p2.w - e2, p2.y, '#fff'); }
}
const WAVES1 = [[1, 0.5, 0.3], [3, 0.28, 1.7], [7, 0.15, 4.1], [17, 0.07, 2.2]], WAVES2 = [[2, 0.45, 2.1], [5, 0.3, 0.4], [11, 0.17, 5.3], [23, 0.08, 1.1]];
function ridge(col, baseY, amp, off, waves) {
  ctx.fillStyle = rgb(col); ctx.beginPath(); ctx.moveTo(0, baseY + 2); const P = W * 2.5;
  for (let x = 0; x <= W + 10; x += 10) { const u = (x + off) / P; let v = 0; for (const w of waves) v += w[1] * Math.sin(2 * Math.PI * w[0] * u + w[2]); ctx.lineTo(x, baseY - amp * (0.5 + 0.5 * v)); }
  ctx.lineTo(W, baseY + 2); ctx.closePath(); ctx.fill();
}
function drawBackground(pal) {
  const hc = settings.hc, hy = HY, night = !hc && !!(loc && loc.night);
  const g = ctx.createLinearGradient(0, 0, 0, hy); g.addColorStop(0, rgb(pal.skyTop)); g.addColorStop(1, rgb(pal.skyBot));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, hy + 2);
  ctx.fillStyle = rgb(pal.grassD); ctx.fillRect(0, hy, W, H - hy);
  if (night) { ctx.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 70; i++) { const x = mod(hash(i) * W * 2 - farOff * 0.3, W * 2) - W * 0.5, y = hash(i + 50) * hy * 0.7; ctx.fillRect(x, y, 2, 2); } }
  const sx = W * 0.74, sy = hy * (night ? 0.25 : 0.42), sr = Math.min(W, H) * (night ? 0.04 : 0.06);
  if (!hc && !pal.overcast) { const sg = ctx.createRadialGradient(sx, sy, sr * 0.3, sx, sy, sr * 3); sg.addColorStop(0, rgba(pal.sun, night ? 0.4 : 0.9)); sg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sg; ctx.fillRect(sx - sr * 3, sy - sr * 3, sr * 6, sr * 6); }
  if (!pal.overcast) { ctx.fillStyle = rgb(pal.sun); circ(ctx, sx, sy, sr); if (night) { ctx.fillStyle = rgb(pal.skyTop); circ(ctx, sx + sr * 0.4, sy - sr * 0.2, sr * 0.85); } }
  if (!hc && !night) {
    ctx.fillStyle = pal.overcast ? 'rgba(235,238,242,0.85)' : 'rgba(255,255,255,0.75)'; const P = W * 2, nC = pal.overcast ? 14 : 7;
    for (let i = 0; i < nC; i++) { const cx = mod(hash(i) * P - farOff * 0.5 - raceTime * 4, P) - W * 0.3, cy = hy * (0.08 + hash(i + 9) * (pal.overcast ? 0.35 : 0.45)), s = W * (0.03 + hash(i + 3) * (pal.overcast ? 0.07 : 0.04));
      ctx.beginPath(); ctx.ellipse(cx, cy, s * 2, s * 0.6, 0, 0, 7); ctx.ellipse(cx + s, cy - s * 0.3, s * 1.2, s * 0.6, 0, 0, 7); ctx.ellipse(cx - s, cy - s * 0.1, s, s * 0.5, 0, 0, 7); ctx.fill(); }
  }
  if (!loc.sea || hc) ridge(pal.far, hy, H * (loc.tour || !pal.city ? 0.2 : 0.1), farOff, WAVES1);
  // landmarks (parallax on the far layer)
  if (loc.marks && !hc) {
    const P = W * 2.5, s = Math.min(H * 0.32, W * 0.35), col = rgb(mix(pal.far, night ? [10, 8, 25] : [30, 30, 50], 0.35));
    for (const [type, u] of loc.marks) { const x = mod(u * P - farOff * 0.8, P) - W * 0.4; if (x > -s * 2 && x < W + s * 2) landmark(type, x, hy + 1, type === 'fuji' ? s * 0.8 : s, col, night); }
  }
  if (loc.sea && !hc) { // sea band at the horizon
    const sea = ctx.createLinearGradient(0, hy - H * 0.035, 0, hy); sea.addColorStop(0, rgb(mix(pal.sea, pal.skyBot, 0.35))); sea.addColorStop(1, rgb(pal.sea));
    ctx.fillStyle = sea; ctx.fillRect(0, hy - H * 0.03, W, H * 0.03 + 2);
    ctx.fillStyle = 'rgba(255,240,200,.45)'; for (let i = 0; i < 20; i++) { const x = mod(hash(i + 7) * W * 1.5 - nearOff * 0.3, W * 1.5) - W * 0.2; ctx.fillRect(x, hy - H * (0.004 + hash(i) * 0.024), W * 0.04, 2); }
  }
  if (pal.city > 0.02) {
    ctx.globalAlpha = pal.city; const bw = W / 22, j0 = Math.floor(cityOff / bw);
    const tall = loc.id === 'newyork' || loc.id === 'tokyo' || loc.id === 'dubai' ? 0.3 : 0.2;
    for (let j = j0 - 1; j < j0 + 25; j++) {
      const x = j * bw - cityOff, h = (0.25 + hash(j) * 0.75) * H * tall, w = bw * (0.7 + hash(j + 99) * 0.3);
      ctx.fillStyle = rgb(mix(pal.near, night ? [10, 10, 25] : [40, 44, 70], 0.4 + hash(j + 5) * 0.3)); ctx.fillRect(x, hy - h, w, h + 2);
      ctx.fillStyle = night ? 'rgba(255,220,140,0.8)' : 'rgba(255,230,160,0.55)'; for (let y = hy - h + 6; y < hy - 6; y += 9) for (let k = 4; k < w - 4; k += 8) if (hash(j * 31 + y * 7 + k) > (night ? 0.55 : 0.7)) ctx.fillRect(x + k, y, 3, 4);
    }
    ctx.globalAlpha = 1;
  }
  if (!loc.sea || hc) ridge(pal.near, hy, H * (pal.city > 0.5 ? 0.03 : 0.09), nearOff, WAVES2);
}
function drawSprite(img, x, y, w, h, clipY) {
  if (w < 1 || h < 1 || x > W || x + w < 0) return;
  const cut = clipY ? Math.max(0, y + h - clipY) : 0; if (cut >= h) return;
  ctx.drawImage(img, 0, 0, img.width, img.height * (1 - cut / h), x, y, w, h - cut);
}
function drawFlame(cx, by, w, t) {
  const fl = w * (0.35 + 0.1 * Math.sin(t * 40));
  const g = ctx.createRadialGradient(cx, by, 1, cx, by + fl * 0.3, fl);
  g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.3, 'rgba(95,230,255,0.9)'); g.addColorStop(1, 'rgba(60,80,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, by + fl * 0.25, w * 0.18, fl * 0.6, 0, 0, 7); ctx.fill();
}
function drawRider(r, cx, bottom, w, clipY, rot) {
  const h = w * r.img.height / r.img.width;
  if (clipY && bottom - h > clipY) return;
  if (r.boost > 0 && !settings.rm) { drawFlame(cx - w * 0.29, bottom - h * 0.28, w, raceTime + r.id); drawFlame(cx + w * 0.29, bottom - h * 0.28, w, raceTime + r.id + 1); }
  if (rot && !clipY) { ctx.save(); ctx.translate(cx, bottom); ctx.rotate(rot); drawSprite(r.img, -w / 2, -h, w, h, 0); ctx.restore(); }
  else drawSprite(r.img, cx - w / 2, bottom - h, w, h, clipY);
  if (settings.hc && !r.isPlayer && w > 12) { ctx.strokeStyle = '#ffe600'; ctx.lineWidth = Math.max(2, w / 40); ctx.strokeRect(cx - w / 2, bottom - h, w, h - (clipY ? Math.max(0, bottom - clipY) : 0)); }
}
function render() {
  const t0 = performance.now(), L = trackLen, N = segments.length;
  const pz = mod(player.z, L);
  let camZ = pz - PLAYER_Z; if (camZ < 0) camZ += L;
  const pal = paletteAt(camZ);
  ctx.save();
  if (shake > 0 && !settings.rm) ctx.translate((Math.random() - 0.5) * 14 * shake * (W / 1000), (Math.random() - 0.5) * 10 * shake * (W / 1000));
  drawBackground(pal);
  const base = segments[Math.floor(camZ / SEG) % N], basePct = mod(camZ, SEG) / SEG;
  const pSeg = segments[Math.floor(pz / SEG) % N], pPct = mod(pz, SEG) / SEG;
  const playerY = lerp(pSeg.p1.world.y, pSeg.p2.world.y, pPct);
  let maxy = H, x = 0, dx = -(base.curve * basePct);
  const camX = player.x * ROAD_W, density = settings.hc ? 0 : (loc.night ? 3 : 4);
  for (let n = 0; n < DRAW_DIST; n++) {
    const idx = (base.index + n) % N, seg = segments[idx], looped = idx < base.index;
    seg.fog = 1 - 1 / Math.pow(Math.E, (n / DRAW_DIST) * (n / DRAW_DIST) * density);
    seg.clip = maxy;
    project(seg.p1, camX - x, playerY + CAM_H, camZ - (looped ? L : 0)); project(seg.p2, camX - x - dx, playerY + CAM_H, camZ - (looped ? L : 0));
    x += dx; dx += seg.curve;
    if (seg.p1.camera.z <= CAM_DEPTH || seg.p2.screen.y >= seg.p1.screen.y || seg.p2.screen.y >= maxy) continue;
    drawSegment(seg, pal, seg.fog); maxy = seg.p1.screen.y;
  }
  // bucket riders and traffic by segment offset from the camera
  const buckets = new Map();
  const put = (o, z) => { const n = mod(Math.floor(mod(z, L) / SEG) - base.index, N); if (n < DRAW_DIST) { if (!buckets.has(n)) buckets.set(n, []); buckets.get(n).push(o); } };
  for (const r of riders) if (!r.isPlayer) put(r, r.z);
  for (const v of traffic) put(v, v.z);
  const playerN = mod(pSeg.index - base.index, N);
  const pulse = settings.rm ? 1 : 1 + 0.12 * Math.sin(performance.now() / 120);
  for (let n = DRAW_DIST - 1; n >= 0; n--) {
    const seg = segments[(base.index + n) % N]; if (seg.p1.camera.z <= CAM_DEPTH) continue;
    const sc = seg.p1.screen.scale;
    for (const s of seg.sprites) {
      const dw = s.w * sc * KX, dh = dw * s.img.height / s.img.width;
      const sx = seg.p1.screen.x + sc * s.x * ROAD_W * KX;
      drawSprite(s.img, sx + dw * (s.center ? -0.5 : s.x < 0 ? -1 : 0), seg.p1.screen.y - dh, dw, dh, seg.clip);
    }
    if (seg.pickup && seg.pickup.active) {
      const p = seg.pickup, dw = 300 * sc * KX * pulse, img = settings.hc ? S.boostHC : S.boost;
      drawSprite(img, seg.p1.screen.x + sc * p.x * ROAD_W * KX - dw / 2, seg.p1.screen.y - dw - 120 * sc * KY, dw, dw, seg.clip);
    }
    const list = buckets.get(n);
    if (list) {
      list.sort((a, b) => mod(b.z, L) - mod(a.z, L));
      const s2 = seg.p2.camera.z > CAM_DEPTH ? seg.p2.screen : seg.p1.screen;
      for (const o of list) {
        const pct = mod(o.z, SEG) / SEG, scale = lerp(seg.p1.screen.scale, s2.scale, pct);
        const cx = lerp(seg.p1.screen.x, s2.x, pct) + scale * o.x * ROAD_W * KX, by = lerp(seg.p1.screen.y, s2.y, pct);
        if (n < playerN) ctx.globalAlpha = 0.45; // anything behind you is ghosted so it never hides your bike
        if (o.bike) drawRider(o, cx, by, o.bike.w * scale * KX, n > playerN ? seg.clip : 0, n <= playerN + 2 ? o.lean * 0.2 : 0);
        else { const dw = o.w * scale * KX, dh = dw * o.img.height / o.img.width; drawSprite(o.img, cx - dw / 2, by - dh, dw, dh, n > playerN ? seg.clip : 0);
          if (settings.hc && dw > 12) { ctx.strokeStyle = '#ff4040'; ctx.lineWidth = Math.max(2, dw / 40); ctx.strokeRect(cx - dw / 2, by - dh, dw, dh); } }
        ctx.globalAlpha = 1;
      }
    }
    if (n === playerN) {
      const ps = CAM_DEPTH / PLAYER_Z;
      const by = HY - ps * lerp(pSeg.p1.camera.y, pSeg.p2.camera.y, pPct) * KY;
      const bounce = settings.rm || player.kmh < 1 ? 0 : (Math.random() - 0.5) * 2 * (W / 1000) * (Math.abs(player.x) > 1 ? 3 : 0.6);
      drawRider(player, W / 2, by + bounce, player.bike.w * ps * KX, 0, lean * 0.32);
    }
  }
  if (player.boost > 0 && !settings.rm && state !== 'results') {
    ctx.strokeStyle = settings.hc ? 'rgba(0,255,255,.8)' : 'rgba(255,255,255,0.5)'; ctx.lineWidth = Math.max(1, W / 600);
    const cx = W / 2, cy = HY; ctx.beginPath();
    for (let i = 0; i < 26; i++) { const a = Math.random() * Math.PI * 2, r1 = W * (0.25 + Math.random() * 0.25), r2 = r1 + W * (0.08 + Math.random() * 0.15); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.7); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2 * 0.7); }
    ctx.stroke();
  }
  ctx.restore();
  render.ms = performance.now() - t0;
}

// ---------------------------------------------------------------- HUD
const hudCache = {};
function setText(id, v, html) { if (hudCache[id] === v) return; hudCache[id] = v; if (html) $(id).innerHTML = v; else $(id).textContent = v; }
function updateHUD() {
  if (!player || state === 'menu') return;
  const total = finishZ - START_Z, rem = Math.max(0, (finishZ - player.z) / KM_UNITS), done = clamp((player.z - START_Z) / KM_UNITS, 0, total / KM_UNITS);
  setText('hudPos', `${player.pos}<small>/${N_RIDERS}</small>`, true);
  setText('hudTime', fmtTime(player.finished ? player.finishTime : raceTime));
  setText('hudLapLbl', circuit ? 'LAP' : 'RACE'); setText('hudLap', circuit ? `${player.lap}/${laps}` : '15K sprint');
  setText('hudDist', `${rem.toFixed(2)}<small> km</small>`, true);
  setText('hudDone', `${done.toFixed(2)} km`);
  setText('hudSpeed', String(Math.round(player.kmh)));
  const top = player.bike.top;
  setText('limitLbl', player.boost > 0 ? `BOOST: limit ${top + BOOST_ADD} km/h (${player.boost.toFixed(1)}s)` : `${player.bike.short}: limit ${top} km/h`);
  const bw = (player.boost / (player.bike.boost * 2) * 100).toFixed(1) + '%';
  $('boostFill').style.width = bw; $('smBoost').style.width = bw; setText('smSpeed', String(Math.round(player.kmh)));
  for (const r of riders) { const p = clamp((r.z - START_Z) / total, 0, 1); r.dot.style.left = (p * 100).toFixed(2) + '%'; }
  $('cueSound').style.opacity = soundCueT > 0 && settings.sound ? 1 : 0;
}

// ---------------------------------------------------------------- loop
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000; last = now; dt = Math.min(dt, 0.05);
  if (!paused && state !== 'menu') update(dt);
  if (soundCueT > 0) soundCueT -= dt;
  render(); updateHUD();
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- wire up
buildSprites(); bindSettingsForm(); buildSetup(); buildGarage();
$('btnStart').onclick = () => { refreshSetup(); showOverlay('setup', true); };
$('btnQuick').onclick = startRace;
$('btnGarage').onclick = () => { refreshGarage(false); showOverlay('garage', true); };
$('btnSetupGarage').onclick = () => { refreshGarage(false); showOverlay('garage', true); };
$('btnGo').onclick = startRace;
$('btnSettings').onclick = () => { syncForm(); showOverlay('settings', true); };
$('btnHelp').onclick = () => showOverlay('help', true);
document.querySelectorAll('.overlay .back').forEach(b => b.onclick = backOverlay);
$('btnResume').onclick = resumeGame;
$('btnPSettings').onclick = () => { syncForm(); showOverlay('settings', true); };
$('btnRestart').onclick = startRace;
$('btnQuit').onclick = () => quitToMenu();
$('btnAgain').onclick = startRace;
$('btnMenu').onclick = () => quitToMenu();
$('btnResSetup').onclick = () => quitToMenu('setup');
$('pauseBtn').onclick = () => togglePause();
newRace(); applySettings(); showOverlay('menu');
// unlock audio on the first tap anywhere (Android Chrome) and re-measure when the browser bars or orientation change
['pointerdown', 'touchend', 'keydown'].forEach(ev => addEventListener(ev, () => { if (Sound.ac) Sound.init(); }, { passive: true }));
document.addEventListener('fullscreenchange', () => setTimeout(resize, 100));
if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', () => setTimeout(resize, 150));
requestAnimationFrame(frame);
// test hook
window.__v15k = { get state() { return state; }, get player() { return player; }, get riders() { return riders; }, get traffic() { return traffic; }, get raceTime() { return raceTime; },
  get finishZ() { return finishZ; }, get trackLen() { return trackLen; }, get laps() { return laps; }, settings, startRace, renderMs: () => render.ms, START_Z, KM_UNITS };
})();
