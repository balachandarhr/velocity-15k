// ---------------------------------------------------------------- 2D fallback renderer (used only when WebGL is unavailable)
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
function render2D() {
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
  renderMs = performance.now() - t0;
}

