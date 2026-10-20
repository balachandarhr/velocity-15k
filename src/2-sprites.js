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
  c.ww = 2600 + (bw - 220) * 12; c.kind = 'building'; return c;
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
  return tag3(mk(220, h, g => {
    g.fillStyle = 'rgba(0,0,0,.35)'; ell(g, 110, h - 6, 104, 8);
    g.fillStyle = '#111'; rr(g, 22, h - 34, 38, 28, 6); rr(g, 160, h - 34, 38, 28, 6);
    g.fillStyle = body; rr(g, 8, h - 112, 204, 88, 18);
    poly(g, [36, h - 108, 184, h - 108, 164, h - 146 + (o.tall ? -10 : 0), 56, h - 146 + (o.tall ? -10 : 0)], roof || body);
    poly(g, [50, h - 110, 170, h - 110, 154, h - 138, 66, h - 138], '#1d2533');
    g.fillStyle = '#ff2a2a'; rr(g, 14, h - 86, 40, 16, 4); rr(g, 166, h - 86, 40, 16, 4);
    g.fillStyle = '#f5f5f5'; rr(g, 88, h - 66, 44, 16, 2); g.fillStyle = '#222'; rr(g, 8, h - 44, 204, 16, 6);
    if (o.sign) { g.fillStyle = o.signCol || '#ffd23f'; rr(g, 84, h - 160 + (o.tall ? -10 : 0), 52, 16, 4); txt(g, o.sign, 110, h - 152 + (o.tall ? -10 : 0), '900 12px Arial', '#111'); }
    if (o.checker) { for (let x = 10; x < 210; x += 10) { g.fillStyle = (x / 10) % 2 ? '#111' : '#fff'; g.fillRect(x, h - 96, 10, 6); } }
  }), { kind: 'car', body, roof: roof || body, tall: !!o.tall, sign: !!o.sign, signCol: o.signCol || '#ffd23f', checker: !!o.checker });
}
function tag3(c, v) { c.v3 = v; return c; }
function truckBack(col) { return tag3(mk(220, 240, g => { g.fillStyle = 'rgba(0,0,0,.35)'; ell(g, 110, 234, 106, 8); g.fillStyle = '#111'; rr(g, 16, 200, 50, 34, 6); rr(g, 154, 200, 50, 34, 6); g.fillStyle = col; rr(g, 6, 8, 208, 190, 6); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(110, 14); g.lineTo(110, 192); g.stroke(); g.fillStyle = '#888'; g.fillRect(100, 90, 6, 30); g.fillRect(114, 90, 6, 30); g.fillStyle = '#ff2a2a'; g.fillRect(10, 180, 30, 12); g.fillRect(180, 180, 30, 12); g.fillStyle = '#ffb000'; g.fillRect(6, 196, 208, 8); }), { kind: 'truck', body: col }); }
function busBack(col, double, sign) {
  const h = double ? 300 : 230;
  return tag3(mk(220, h, g => {
    g.fillStyle = 'rgba(0,0,0,.35)'; ell(g, 110, h - 6, 106, 8); g.fillStyle = '#111'; rr(g, 16, h - 40, 48, 34, 6); rr(g, 156, h - 40, 48, 34, 6);
    g.fillStyle = col; rr(g, 6, 6, 208, h - 40, 14);
    g.fillStyle = '#1d2533'; rr(g, 20, 40, 180, 60, 8); if (double) rr(g, 20, 130, 180, 60, 8);
    g.fillStyle = '#111'; rr(g, 50, 12, 120, 22, 4); txt(g, sign || '42', 110, 23, '900 15px Arial', '#ffb000', 112);
    g.fillStyle = '#ff2a2a'; rr(g, 14, h - 74, 26, 20, 4); rr(g, 180, h - 74, 26, 20, 4); g.fillStyle = '#f5f5f5'; rr(g, 86, h - 70, 48, 16, 2);
  }), { kind: 'bus', body: col, double: !!double });
}
function autoBack() {
  return tag3(mk(170, 180, g => {
    g.fillStyle = 'rgba(0,0,0,.35)'; ell(g, 85, 174, 78, 7); g.fillStyle = '#111'; rr(g, 12, 138, 30, 36, 8); rr(g, 128, 138, 30, 36, 8);
    g.fillStyle = '#111'; rr(g, 10, 10, 150, 78, 32); g.fillStyle = '#1e7d3a'; rr(g, 14, 84, 142, 62, 10);
    g.fillStyle = '#ffd23f'; g.fillRect(14, 84, 142, 18); g.fillStyle = '#2a2a2a'; rr(g, 34, 30, 102, 50, 10);
    g.fillStyle = '#ff2a2a'; rr(g, 18, 110, 22, 12, 3); rr(g, 130, 110, 22, 12, 3); g.fillStyle = '#f5f5f5'; rr(g, 64, 116, 42, 14, 2);
  }), { kind: 'auto' });
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
