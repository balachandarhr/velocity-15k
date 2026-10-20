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
  if (!use2D) onNewRace3D();
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
