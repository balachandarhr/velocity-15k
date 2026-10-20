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
let last = performance.now(), renderMs = 0;
function render(dt) { const t0 = performance.now(); if (use2D) render2D(); else render3D(dt); renderMs = performance.now() - t0; }
function frame(now) {
  let dt = (now - last) / 1000; last = now; dt = Math.min(dt, 0.05);
  if (!paused && state !== 'menu') update(dt);
  if (soundCueT > 0) soundCueT -= dt;
  render(dt); updateHUD();
  if (!use2D && !$('garage').hidden) renderGarage(dt);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- wire up
buildSprites(); if (!init3D()) { use2D = true; ctx = canvas.getContext('2d'); } resize(); bindSettingsForm(); buildSetup(); buildGarage();
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
window.__v15k3 = () => ({ scene, renderer, farGroup, ground, skyMesh, roadMesh, raceGroup, parts3d, stars, camera });
window.__dbg = { get cd() { return cdTime; }, get paused() { return paused; }, get last() { return last; } };
window.__v15k = { sim(sec) { for (let i = 0; i < sec * 60; i++) update(1 / 60); }, get state() { return state; }, get player() { return player; }, get riders() { return riders; }, get traffic() { return traffic; }, get raceTime() { return raceTime; },
  get finishZ() { return finishZ; }, get trackLen() { return trackLen; }, get laps() { return laps; }, settings, startRace, renderMs: () => renderMs, START_Z, KM_UNITS,
  gfx: () => ({ webgl: !use2D, quality: use2D ? '2d' : qName, auto: autoQ, fps: fpsAvg, calls: renderer ? renderer.info.render.calls : 0, tris: renderer ? renderer.info.render.triangles : 0, pr: renderer ? renderer.getPixelRatio() : 1 }) };
})();
