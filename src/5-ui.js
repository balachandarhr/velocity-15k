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
  if (!use2D && typeof applyGfx === 'function') applyGfx();
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
    ['sGfx', 'gfx', 'v'], ['sAutoAccel', 'autoAccel', 'c'], ['sSound', 'sound', 'c'], ['sHC', 'hc', 'c'], ['sRM', 'rm', 'c'], ['sAnnounce', 'announce', 'c']];
  map.forEach(([id, key, t]) => {
    const el = $(id);
    if (t === 'c') el.checked = !!settings[key]; else el.value = String(settings[key]);
    el.addEventListener('change', () => { settings[key] = t === 'c' ? el.checked : t === 'n' ? parseFloat(el.value) : el.value; applySettings(); });
  });
}
function syncForm() { $('sGfx').value = settings.gfx; $('sAssist').value = settings.assist; $('sSpeed').value = String(settings.gameSpeed); $('sDiff').value = settings.difficulty; $('sTouch').value = settings.touch; $('sAutoAccel').checked = settings.autoAccel; $('sSound').checked = settings.sound; $('sHC').checked = settings.hc; $('sRM').checked = settings.rm; $('sAnnounce').checked = settings.announce; }

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
  if (!garagePreview3D(b.id, settings.color)) { const sc = $('gPreviewSide').getContext('2d'); if (sc) { sc.clearRect(0, 0, 520, 300); sc.drawImage(bikeSide(b.id, settings.color), 0, 0, 520, 320); } }
  const bc = $('gPreviewBack').getContext('2d'); bc.clearRect(0, 0, 160, 210); bc.drawImage(bikeBack(b.id, settings.color, '#ffffff', 'P1'), 0, 0);
  $('gPreviewSide').setAttribute('aria-label', `3D view of the ${b.name} in ${colorName(settings.color)}, slowly turning`);
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
