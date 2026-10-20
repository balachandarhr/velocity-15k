/* Velocity 15K: 3D motorbike racer. Three.js (vendored) with a Canvas 2D fallback. */
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
  bike: 'naked', color: '#ff3d6e', race: 'sprint', loc: 'tour', traffic: 'light', gfx: 'auto' };
let settings = Object.assign({}, defaults);
try { Object.assign(settings, JSON.parse(localStorage.getItem('v15k-settings') || '{}')); } catch (e) { }
const saveSettings = () => { try { localStorage.setItem('v15k-settings', JSON.stringify(settings)); } catch (e) { } };

// ---------------------------------------------------------------- canvas
const canvas = $('game');
let ctx = null, use2D = false, r3ready = false; // ctx is only created if WebGL is unavailable (2D fallback renderer)
let W = 0, H = 0, KX = 0, KY = 0, HY = 0;
function resize() {
  if (!use2D) { W = Math.max(320, innerWidth); H = Math.max(240, innerHeight); KX = W / 2; HY = H / 2; KY = H / 2; if (r3ready) resize3D(); return; }
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
