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
LOCS.forEach(l => { l.sea = !!(l.pal && l.pal.sea); });
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
