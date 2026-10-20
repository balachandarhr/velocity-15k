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
