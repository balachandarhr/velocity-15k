// ---------------------------------------------------------------- 3D models (procedural low/mid-poly, vertex coloured)
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const UPZ = new THREE.Vector3(0, 0, 1);
function colorLin(c) { return Array.isArray(c) ? new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace) : (c instanceof THREE.Color ? c : new THREE.Color(c)); }
// A list of coloured parts that is merged into one geometry (one draw call)
class Parts {
  constructor() { this.L = []; }
  add(geo, col, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, mul = 1) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    _m4.compose(_v1.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _v2.set(sx, sy, sz)); g.applyMatrix4(_m4);
    this._col(g, col, mul); this.L.push(g); geo.dispose && geo !== g && 0; return this;
  }
  _col(g, col, mul) { const c = colorLin(col), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r * mul; a[i * 3 + 1] = c.g * mul; a[i * 3 + 2] = c.b * mul; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
  // a box stretched between two points (arms, legs, frame tubes)
  seg(a, b, w, h, col) {
    const d = _v3.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(); if (len < 1e-4) return this;
    let g = new THREE.BoxGeometry(w, h, len).toNonIndexed(); g.deleteAttribute('uv');
    _q.setFromUnitVectors(UPZ, d.normalize()); _m4.compose(_v1.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _v2.set(1, 1, 1)); g.applyMatrix4(_m4);
    this._col(g, col, 1); this.L.push(g); return this;
  }
  tube(a, b, r, col, seg = 8) {
    const d = _v3.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(); if (len < 1e-4) return this;
    let g = new THREE.CylinderGeometry(r, r, len, seg).toNonIndexed(); g.deleteAttribute('uv');
    _q.setFromUnitVectors(_v2.set(0, 1, 0), d.normalize()); _m4.compose(_v1.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _v2.set(1, 1, 1)); g.applyMatrix4(_m4);
    this._col(g, col, 1); this.L.push(g); return this;
  }
  merge() { if (!this.L.length) return null; const g = mergeGeometries(this.L); this.L.forEach(x => x.dispose()); this.L = []; g.computeBoundingSphere(); return g; }
}
const G = { // shared primitive templates
  box: new THREE.BoxGeometry(1, 1, 1), sph: new THREE.SphereGeometry(1, 14, 10), sphLo: new THREE.SphereGeometry(1, 8, 6), ico: new THREE.IcosahedronGeometry(1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14), cyl8: new THREE.CylinderGeometry(1, 1, 1, 8), cone: new THREE.ConeGeometry(1, 1, 10), cone4: new THREE.ConeGeometry(1, 1, 4), cone7: new THREE.ConeGeometry(1, 1, 7)
};
const B = (p, col, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, mul = 1) => p.add(G.box, col, x, y, z, rx, ry, rz, sx, sy, sz, mul);

// ---------------------------------------------------------------- bikes
const BSPEC = {
  scooter: { wb: 1.25, rf: 0.23, rr: 0.23, ty: 0.075, seat: 0.78, pose: 0.05 }, commuter: { wb: 1.3, rf: 0.3, rr: 0.3, ty: 0.06, seat: 0.8, pose: 0.15 },
  electric: { wb: 1.38, rf: 0.31, rr: 0.31, ty: 0.08, seat: 0.84, pose: 0.35 }, cafe: { wb: 1.4, rf: 0.31, rr: 0.31, ty: 0.08, seat: 0.8, pose: 0.6 },
  naked: { wb: 1.42, rf: 0.31, rr: 0.31, ty: 0.09, seat: 0.83, pose: 0.35 }, sport: { wb: 1.4, rf: 0.31, rr: 0.31, ty: 0.1, seat: 0.86, pose: 0.9 },
  dirt: { wb: 1.48, rf: 0.37, rr: 0.35, ty: 0.08, seat: 0.96, pose: 0.25 }, adventure: { wb: 1.52, rf: 0.35, rr: 0.33, ty: 0.09, seat: 0.9, pose: 0.12 },
  cruiser: { wb: 1.68, rf: 0.33, rr: 0.31, ty: 0.11, seat: 0.68, pose: -0.12 }, touring: { wb: 1.62, rf: 0.32, rr: 0.32, ty: 0.1, seat: 0.82, pose: 0.05 }
};
const DARK = '#24262b', BLACK = '#111214', CHROME = '#c9ced6', ALU = '#9aa1ab', SEATC = '#18181a', GLASS = '#3c4a5c';
function wheelGeo(r, ty, cast, knobby) {
  const p = new Parts(), rim = r - ty;
  p.add(new THREE.TorusGeometry(rim, ty, 8, 22), knobby ? '#1c1c1c' : BLACK, 0, 0, 0, 0, Math.PI / 2, 0);
  p.add(G.cyl, cast ? '#2b2e33' : ALU, 0, 0, 0, 0, 0, Math.PI / 2, rim * 0.98, 0.05, rim * 0.98);
  for (let k = 0; k < 3; k++) p.add(G.box, cast ? '#6c737d' : CHROME, 0, 0, 0, k * Math.PI / 3, 0, 0, 0.07, rim * 1.9, 0.045);
  p.add(G.cyl, CHROME, 0.065, 0, 0, 0, 0, Math.PI / 2, rim * 0.55, 0.012, rim * 0.55);
  p.add(G.cyl, ALU, 0, 0, 0, 0, 0, Math.PI / 2, 0.06, 0.2, 0.06);
  return p.merge();
}
// returns geometry for paint/plastic/rider (body), metal parts (chrome), glowing lights and the two wheels
function bikeGeos(type, color, jacket, helmet) {
  const sp = BSPEC[type] || BSPEC.naked, body = new Parts(), metal = new Parts(), lights = new Parts();
  const zf = -sp.wb / 2, zr = sp.wb / 2, sy = sp.seat, col = color;
  const headY = sy + (type === 'cruiser' ? 0.32 : type === 'scooter' ? 0.25 : type === 'dirt' ? 0.12 : 0.2), headZ = zf + (type === 'cruiser' ? 0.42 : 0.32);
  // forks + steering head
  const fx = 0.09;
  if (type !== 'scooter') { metal.tube([fx, sp.rf, zf], [fx, headY - 0.02, headZ], 0.028, type === 'dirt' || type === 'adventure' ? '#c9a227' : CHROME); metal.tube([-fx, sp.rf, zf], [-fx, headY - 0.02, headZ], 0.028, type === 'dirt' || type === 'adventure' ? '#c9a227' : CHROME); }
  else { body.seg([0, sp.rf, zf], [0, headY - 0.1, headZ], 0.08, 0.1, DARK); }
  // swingarm
  metal.seg([0.12, sp.rr + 0.05, 0.12], [0.12, sp.rr, zr], 0.05, 0.07, ALU); metal.seg([-0.12, sp.rr + 0.05, 0.12], [-0.12, sp.rr, zr], 0.05, 0.07, ALU);
  // handlebar + grips
  let barY = headY + 0.08, barZ = headZ + 0.08, barW = 0.36;
  if (type === 'sport' || type === 'cafe') { barY = headY - 0.04; barZ = headZ + 0.1; barW = 0.3; }
  if (type === 'cruiser') { barY = headY + 0.28; barZ = headZ + 0.18; barW = 0.4; }
  if (type === 'dirt' || type === 'adventure') { barW = 0.42; barY = headY + 0.12; }
  metal.tube([-barW, barY, barZ], [barW, barY, barZ], 0.016, type === 'cruiser' ? CHROME : BLACK);
  body.tube([-barW, barY, barZ], [-barW + 0.11, barY, barZ], 0.022, BLACK); body.tube([barW - 0.11, barY, barZ], [barW, barY, barZ], 0.022, BLACK);
  body.add(G.box, BLACK, -barW - 0.04, barY + 0.08, barZ - 0.02, 0, 0, 0, 0.12, 0.05, 0.02); body.add(G.box, BLACK, barW + 0.04, barY + 0.08, barZ - 0.02, 0, 0, 0, 0.12, 0.05, 0.02); // mirrors
  // engine / motor
  if (type === 'electric') { B(body, '#1d2026', 0, sp.rr + 0.18, -0.02, 0.32, 0.36, 0.62); B(lights, [60, 230, 255], 0, sp.rr + 0.2, -0.02, 0.335, 0.05, 0.5); }
  else if (type === 'cruiser') { B(body, DARK, 0, sp.rr + 0.06, 0, 0.3, 0.26, 0.5); metal.add(G.cyl, CHROME, 0, sp.rr + 0.3, -0.12, -0.45, 0, 0, 0.1, 0.36, 0.1); metal.add(G.cyl, CHROME, 0, sp.rr + 0.3, 0.12, 0.45, 0, 0, 0.1, 0.36, 0.1); }
  else if (type !== 'scooter') { B(body, DARK, 0, sp.rr + 0.12, -0.02, 0.3, 0.32, 0.46); metal.add(G.box, ALU, 0, sp.rr + 0.32, -0.12, -0.35, 0, 0, 0.32, 0.16, 0.2); }
  // exhaust
  if (type === 'cruiser') { metal.tube([0.17, sp.rr + 0.05, 0.05], [0.2, sp.rr + 0.1, zr + 0.25], 0.045, CHROME); metal.tube([0.19, sp.rr + 0.2, 0.0], [0.22, sp.rr + 0.24, zr + 0.18], 0.04, CHROME); }
  else if (type === 'sport') metal.tube([0.0, sp.rr - 0.05, 0.05], [0.14, sp.rr + 0.18, zr - 0.05], 0.06, '#5a5f66');
  else if (type === 'dirt') metal.tube([0.16, sp.rr + 0.2, -0.05], [0.17, sy + 0.02, zr + 0.05], 0.05, ALU);
  else if (type !== 'electric') metal.tube([0.18, sp.rr + 0.02, 0.05], [0.2, sp.rr + 0.16, zr + 0.12], 0.055, type === 'scooter' ? '#55595f' : CHROME);
  // fuel tank, seat, tail
  if (type === 'scooter') {
    B(body, col, 0, sp.rr + 0.33, 0.28, 0.38, 0.46, 0.78); B(body, DARK, 0, 0.27, -0.2, 0.32, 0.06, 0.5);
    B(body, col, 0, 0.62, zf + 0.22, 0.44, 0.62, 0.09, 0.28); B(body, col, 0, headY - 0.02, headZ + 0.02, 0.3, 0.16, 0.2);
    B(body, SEATC, 0, sy, 0.22, 0.3, 0.08, 0.5); B(body, col, 0, sp.rf + 0.12, zf, 0.16, 0.04, 0.34);
  } else {
    const tankC = type === 'touring' ? col : col;
    if (type === 'cruiser') { body.add(G.sph, tankC, 0, sy + 0.1, -0.22, 0, 0, 0, 0.17, 0.13, 0.3); }
    else B(body, tankC, 0, sy + 0.06, -0.2, type === 'dirt' ? 0.26 : 0.34, 0.22, 0.46, -0.12);
    if (type === 'cruiser') B(body, SEATC, 0, sy, 0.18, 0.34, 0.08, 0.46, 0.05); else B(body, SEATC, 0, sy, 0.2, 0.3, 0.08, type === 'dirt' ? 0.7 : 0.5);
    if (type === 'touring' || type === 'adventure') B(body, SEATC, 0, sy + 0.06, 0.48, 0.3, 0.1, 0.25);
    // frame spine
    body.seg([0, headY - 0.05, headZ + 0.05], [0, sy - 0.05, 0.25], 0.09, 0.08, DARK);
    // tail section / rear fender
    if (type === 'cruiser') body.add(G.sph, col, 0, sp.rr + 0.1, zr - 0.05, 0, 0, 0, 0.17, 0.2, 0.42);
    else if (type === 'cafe') body.add(G.sph, col, 0, sy + 0.08, 0.5, 0, 0, 0, 0.15, 0.1, 0.18);
    else B(body, col, 0, sy + 0.04, zr - 0.18, 0.22, 0.1, 0.42, -0.25);
    // front fender
    if (type === 'dirt') B(body, '#f2f2f2', 0, headY - 0.12, zf - 0.1, 0.16, 0.03, 0.5, 0.15);
    else B(body, type === 'cruiser' ? col : DARK, 0, sp.rf + sp.rf * 0.55, zf, 0.16, 0.04, 0.36, 0, 0, 0);
  }
  // fairings / panniers per type
  if (type === 'sport') {
    B(body, col, 0, sp.rf + 0.42, zf + 0.32, 0.42, 0.42, 0.42, -0.55); B(body, GLASS, 0, headY + 0.08, headZ - 0.02, 0.3, 0.02, 0.24, 0.85);
    B(body, col, 0, sp.rr + 0.18, -0.08, 0.4, 0.3, 0.62); B(body, '#f2f2f2', 0.205, sp.rr + 0.22, -0.08, 0.01, 0.12, 0.4);
  } else if (type === 'touring') {
    B(body, col, 0, sy - 0.02, zf + 0.42, 0.72, 0.5, 0.42, -0.3); B(body, GLASS, 0, sy + 0.38, zf + 0.42, 0.5, 0.42, 0.025, -0.45);
    B(body, col, 0.34, sp.rr + 0.22, zr - 0.12, 0.2, 0.36, 0.52); B(body, col, -0.34, sp.rr + 0.22, zr - 0.12, 0.2, 0.36, 0.52); B(body, col, 0, sy + 0.25, zr + 0.06, 0.42, 0.3, 0.36);
    B(body, col, 0, sp.rr + 0.16, -0.05, 0.42, 0.3, 0.5);
  } else if (type === 'adventure') {
    B(body, col, 0, sp.rf + 0.42, zf - 0.04, 0.14, 0.05, 0.34, 0.25); B(body, GLASS, 0, headY + 0.16, headZ + 0.02, 0.32, 0.3, 0.02, -0.35); B(body, col, 0, headY, headZ - 0.02, 0.34, 0.22, 0.18);
    B(metal, ALU, 0.33, sp.rr + 0.25, zr - 0.1, 0.18, 0.34, 0.46); B(metal, ALU, -0.33, sp.rr + 0.25, zr - 0.1, 0.18, 0.34, 0.46); B(metal, ALU, 0, sy + 0.26, zr + 0.05, 0.38, 0.28, 0.34);
    metal.tube([0.2, sp.rr + 0.35, -0.3], [0.22, sp.rr + 0.05, -0.15], 0.018, BLACK); metal.tube([-0.2, sp.rr + 0.35, -0.3], [-0.22, sp.rr + 0.05, -0.15], 0.018, BLACK);
  } else if (type === 'dirt') {
    B(body, '#f2f2f2', 0, headY - 0.04, headZ - 0.1, 0.26, 0.24, 0.03, -0.3); B(body, col, 0.16, sy - 0.05, 0.05, 0.02, 0.18, 0.4); B(body, col, -0.16, sy - 0.05, 0.05, 0.02, 0.18, 0.4);
  } else if (type === 'cafe') {
    B(body, col, 0, headY - 0.0, headZ - 0.02, 0.24, 0.22, 0.12);
  } else if (type === 'commuter') { B(metal, BLACK, 0, sy + 0.06, zr - 0.05, 0.3, 0.02, 0.32); B(body, col, 0, headY, headZ - 0.04, 0.26, 0.2, 0.16); }
  else if (type === 'electric') { B(body, col, 0, headY - 0.02, headZ - 0.04, 0.26, 0.18, 0.18, -0.3); B(lights, [60, 230, 255], 0, headY - 0.02, headZ - 0.135, 0.2, 0.02, 0.01); }
  else if (type === 'naked') { /* exposed, round lamp */ }
  // lights
  const hlZ = (type === 'touring' ? zf + 0.2 : type === 'sport' ? zf + 0.12 : headZ - 0.13), hlY = type === 'touring' ? sy - 0.05 : type === 'sport' ? sp.rf + 0.45 : headY - 0.04;
  lights.add(G.sphLo, [255, 250, 225], 0, hlY, hlZ, 0, 0, 0, 0.08, 0.075, 0.04, 2.6);
  lights.add(G.box, [255, 40, 40], 0, type === 'scooter' ? sp.rr + 0.5 : sy + 0.08, type === 'scooter' ? 0.67 : zr + 0.04, 0, 0, 0, 0.14, 0.05, 0.03, 2.4);
  if (type === 'touring' || type === 'adventure') { lights.add(G.box, [255, 40, 40], 0.34, sp.rr + 0.3, zr + 0.15, 0, 0, 0, 0.12, 0.04, 0.02, 2.2); lights.add(G.box, [255, 40, 40], -0.34, sp.rr + 0.3, zr + 0.15, 0, 0, 0, 0.12, 0.04, 0.02, 2.2); }
  // number plate
  B(body, '#f4f4f4', 0, sp.rr + 0.42, zr + 0.12, 0.18, 0.11, 0.01, 0.35);
  // ---------------- rider
  const a = clamp(sp.pose, -0.3, 1) * 1.05, hipZ = type === 'cruiser' ? 0.22 : type === 'scooter' ? 0.25 : 0.18, hip = [0, sy + 0.1, hipZ];
  const up = [0, Math.cos(a), -Math.sin(a)], sh = [0, hip[1] + up[1] * 0.52, hip[2] + up[2] * 0.52];
  const trousers = '#1e2129', boots = BLACK, gloves = '#15161a';
  body.add(G.box, jacket, 0, hip[1] + up[1] * 0.27, hip[2] + up[2] * 0.27, -a, 0, 0, 0.4, 0.56, 0.26);
  body.add(G.box, shadeHex(jacket, 0.6), 0, hip[1] + up[1] * 0.3, hip[2] + up[2] * 0.3 + Math.cos(a) * 0.135, -a, 0, 0, 0.3, 0.42, 0.02); // back stripe
  body.add(G.box, trousers, 0, hip[1] - 0.02, hip[2] + 0.02, 0, 0, 0, 0.38, 0.16, 0.3);
  const head = [0, sh[1] + Math.cos(a) * 0.19 + 0.05, sh[2] - Math.sin(a) * 0.2 - 0.03];
  body.add(G.sph, helmet, head[0], head[1], head[2], 0, 0, 0, 0.155, 0.155, 0.17);
  body.add(G.box, '#0e1420', head[0], head[1] + 0.01, head[2] - 0.13, -0.15, 0, 0, 0.2, 0.08, 0.06);
  body.add(G.box, jacket, head[0], head[1] + 0.03, head[2] + 0.02, 0, 0, 0, 0.02, 0.06, 0.3); // helmet stripe
  for (const sgn of [-1, 1]) {
    const s = [sgn * 0.2, sh[1] - 0.04, sh[2]], g = [sgn * (barW - 0.05), barY + 0.02, barZ];
    const el = [(s[0] + g[0]) / 2 + sgn * 0.08, (s[1] + g[1]) / 2 - 0.05, (s[2] + g[2]) / 2 + 0.05];
    body.seg(s, el, 0.11, 0.11, jacket); body.seg(el, g, 0.09, 0.09, jacket); body.add(G.box, gloves, g[0], g[1], g[2], 0, 0, 0, 0.1, 0.08, 0.1);
    let knee, foot;
    if (type === 'scooter') { knee = [sgn * 0.2, sy + 0.12, -0.12]; foot = [sgn * 0.13, 0.32, -0.2]; }
    else if (type === 'cruiser') { knee = [sgn * 0.24, sy + 0.08, -0.25]; foot = [sgn * 0.24, sp.rr + 0.05, -0.5]; }
    else { knee = [sgn * 0.21, sy + 0.02 + a * 0.08, -0.2 - a * 0.05]; foot = [sgn * 0.17, sp.rr + 0.12, 0.08 + a * 0.06]; }
    const hp = [sgn * 0.13, hip[1] - 0.02, hip[2]];
    body.seg(hp, knee, 0.15, 0.15, trousers); body.seg(knee, foot, 0.12, 0.12, trousers); body.add(G.box, boots, foot[0], foot[1] - 0.03, foot[2] - 0.04, 0, 0, 0, 0.11, 0.12, 0.24);
  }
  const knob = type === 'dirt' || type === 'adventure';
  return { body: body.merge(), metal: metal.merge(), lights: lights.merge(), wf: wheelGeo(sp.rf, sp.ty, !knob && type !== 'cruiser', knob), wr: wheelGeo(sp.rr, sp.ty * (type === 'cruiser' ? 1.4 : 1.1), !knob && type !== 'cruiser', knob), sp };
}
function shadeHex(hex, f) { const c = new THREE.Color(hex); return c.multiplyScalar(f); }
const MAT = {};
function initMaterials(low) { // Low quality uses cheaper Lambert/Phong shading (big win on phones)
  for (const k in MAT) MAT[k].dispose();
  const Std = (o) => low ? new THREE.MeshPhongMaterial(Object.assign({ vertexColors: true, shininess: o.metalness > 0.5 ? 80 : 30, specular: o.metalness > 0.5 ? 0x777777 : 0x222222 }, o.extra || {})) : new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: o.roughness, metalness: o.metalness }, o.extra || {}));
  MAT.paint = Std({ roughness: 0.42, metalness: 0.15 });
  MAT.metal = Std({ roughness: 0.28, metalness: 0.85 });
  MAT.tyre = Std({ roughness: 0.7, metalness: 0.35 });
  MAT.glow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  MAT.car = Std({ roughness: 0.35, metalness: 0.3 });
  MAT.ghost = Std({ roughness: 0.5, metalness: 0.1, extra: { transparent: true, opacity: 0.2, depthWrite: false } });
  MAT.veg = low ? new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, flatShading: true });
}
function makeBike3D(type, color, jacket, helmet) {
  const g = bikeGeos(type, color, jacket, helmet), root = new THREE.Group(), lean = new THREE.Group(); root.add(lean);
  const body = new THREE.Mesh(g.body, MAT.paint), metal = g.metal ? new THREE.Mesh(g.metal, MAT.metal) : null, lights = new THREE.Mesh(g.lights, MAT.glow);
  const wf = new THREE.Mesh(g.wf, MAT.tyre), wr = new THREE.Mesh(g.wr, MAT.tyre);
  wf.position.set(0, g.sp.rf, -g.sp.wb / 2); wr.position.set(0, g.sp.rr, g.sp.wb / 2);
  for (const m of [body, metal, wf, wr]) if (m) { m.castShadow = true; m.receiveShadow = false; lean.add(m); }
  lean.add(lights);
  root.userData = { lean, wf, wr, body, metal, sp: g.sp, parts: [body, metal, wf, wr].filter(Boolean) };
  return root;
}
function disposeTree(o) { o.traverse(m => { if (m.geometry) m.geometry.dispose(); }); }

// ---------------------------------------------------------------- traffic vehicles
const vehGeoCache = new Map();
function vehicleGeos(img, w, len) {
  const v = img.v3 || { kind: 'car', body: '#888888' }, key = JSON.stringify(v) + w + len;
  if (vehGeoCache.has(key)) return vehGeoCache.get(key);
  const p = new Parts(), L = new Parts(), W2 = w / 2, l2 = len / 2, wheel = (x, z, r, wd) => { p.add(G.cyl, BLACK, x, r, z, 0, 0, Math.PI / 2, r, wd, r); p.add(G.cyl, ALU, x + Math.sign(x) * 0.01, r, z, 0, 0, Math.PI / 2, r * 0.55, wd + 0.01, r * 0.55); };
  const tail = (y, x, s = 1) => { L.add(G.box, [255, 30, 30], x, y, l2 + 0.01, 0, 0, 0, 0.32 * s, 0.14 * s, 0.03, 2.2); L.add(G.box, [255, 30, 30], -x, y, l2 + 0.01, 0, 0, 0, 0.32 * s, 0.14 * s, 0.03, 2.2); };
  const head = (y, x) => { L.add(G.box, [255, 250, 220], x, y, -l2 - 0.01, 0, 0, 0, 0.3, 0.12, 0.03, 2.4); L.add(G.box, [255, 250, 220], -x, y, -l2 - 0.01, 0, 0, 0, 0.3, 0.12, 0.03, 2.4); };
  if (v.kind === 'car') {
    const tall = v.tall ? 1.18 : 1, r = 0.33 * tall;
    B(p, v.body, 0, 0.62 * tall, 0, w, 0.62 * tall, len);
    B(p, v.body, 0, 0.9 * tall, -l2 + 0.55, w * 0.98, 0.1, 1.0, 0.12);
    B(p, GLASS, 0, 1.2 * tall, 0.15, w * 0.84, 0.5 * tall, len * 0.48); B(p, v.roof || v.body, 0, 1.47 * tall, 0.15, w * 0.8, 0.06, len * 0.44);
    B(p, '#222', 0, 0.38 * tall, l2 - 0.02, w * 1.01, 0.18, 0.08); B(p, '#222', 0, 0.38 * tall, -l2 + 0.02, w * 1.01, 0.18, 0.08);
    B(p, '#f5f5f5', 0, 0.62 * tall, l2 + 0.02, 0.5, 0.14, 0.02);
    if (v.sign) B(p, v.signCol || '#ffd23f', 0, 1.6 * tall, 0.15, 0.6, 0.18, 0.3);
    if (v.checker) for (let k = 0; k < 8; k++) B(p, k % 2 ? '#111' : '#fff', W2 + 0.005, 0.72 * tall, -l2 + 0.5 + k * (len - 1) / 8, 0.01, 0.12, (len - 1) / 8);
    wheel(W2 - 0.12, -l2 + 0.85, r, 0.24); wheel(-W2 + 0.12, -l2 + 0.85, r, 0.24); wheel(W2 - 0.12, l2 - 0.8, r, 0.24); wheel(-W2 + 0.12, l2 - 0.8, r, 0.24);
    tail(0.75 * tall, W2 - 0.25); head(0.68 * tall, W2 - 0.3);
  } else if (v.kind === 'truck') {
    B(p, '#e8e8e8', 0, 1.45, -l2 + 1.2, w, 2.1, 2.3); B(p, GLASS, 0, 2.0, -l2 + 0.06, w * 0.9, 0.8, 0.1); B(p, v.body, 0, 2.0, 1.15, w * 1.02, 2.9, len - 2.5);
    B(p, '#333', 0, 0.55, 0, w * 0.9, 0.3, len - 0.4); B(p, '#ffb000', 0, 0.5, l2 + 0.02, w, 0.12, 0.04);
    for (const z of [-l2 + 0.9, l2 - 2.2, l2 - 1.0]) { wheel(W2 - 0.18, z, 0.48, 0.34); wheel(-W2 + 0.18, z, 0.48, 0.34); }
    tail(0.8, W2 - 0.25, 1.1); head(1.0, W2 - 0.35);
  } else if (v.kind === 'bus') {
    const h = v.double ? 4.2 : 3.0;
    B(p, v.body, 0, 0.4 + h / 2, 0, w, h, len); B(p, GLASS, 0, 0.4 + 1.85, 0, w * 1.01, 0.95, len * 0.88);
    if (v.double) B(p, GLASS, 0, 0.4 + 3.35, 0, w * 1.01, 0.85, len * 0.9);
    B(p, GLASS, 0, 0.4 + 1.85, -l2 - 0.005, w * 0.9, 1.2, 0.02); B(p, '#111', 0, 0.4 + h - 0.35, l2 + 0.01, 1.4, 0.3, 0.02); B(p, '#ffb000', 0, 0.4 + h - 0.35, l2 + 0.02, 1.2, 0.18, 0.02, 0, 0, 0, 1.3);
    for (const z of [-l2 + 2.2, l2 - 2.6]) { wheel(W2 - 0.2, z, 0.5, 0.32); wheel(-W2 + 0.2, z, 0.5, 0.32); }
    tail(0.95, W2 - 0.3, 1.2); head(0.9, W2 - 0.35);
  } else { // auto-rickshaw
    B(p, '#1e7d3a', 0, 0.62, 0.2, w, 0.7, len * 0.75); B(p, '#ffd23f', 0, 0.98, 0.2, w * 1.01, 0.12, len * 0.75); B(p, '#151515', 0, 1.62, 0.15, w * 1.04, 0.1, len * 0.85);
    for (const sx of [-1, 1]) B(p, '#151515', sx * (W2 - 0.03), 1.28, 0.15, 0.05, 0.62, 0.06); B(p, '#151515', 0, 1.28, l2 - 0.05, w, 0.62, 0.04);
    B(p, '#1e7d3a', 0, 0.85, -l2 + 0.3, 0.7, 0.9, 0.5, 0.2); B(p, GLASS, 0, 1.3, -l2 + 0.45, 0.8, 0.5, 0.03, -0.2);
    wheel(0, -l2 + 0.3, 0.22, 0.12); wheel(W2 - 0.08, l2 - 0.45, 0.24, 0.14); wheel(-W2 + 0.08, l2 - 0.45, 0.24, 0.14);
    tail(0.7, W2 - 0.2, 0.7); L.add(G.sphLo, [255, 250, 220], 0, 0.9, -l2, 0, 0, 0, 0.09, 0.09, 0.04, 2.4);
  }
  const out = { body: p.merge(), lights: L.merge() }; vehGeoCache.set(key, out); return out;
}

// ---------------------------------------------------------------- scenery models (unit width 1, origin at ground centre)
function sceneryModels() {
  const M = {};
  { const p = new Parts(); p.add(G.cyl8, '#6b4a2b', 0, 0.22, 0, 0, 0, 0, 0.07, 0.44, 0.07); p.add(G.ico, '#3f8f3a', 0, 0.72, 0, 0, 0, 0, 0.42, 0.38, 0.42); p.add(G.ico, '#4fa645', 0.14, 0.92, 0.06, 0, 0.5, 0, 0.3, 0.28, 0.3); p.add(G.ico, '#357d33', -0.18, 0.8, -0.1, 0, 1, 0, 0.26, 0.24, 0.26); M.tree = p.merge(); }
  { const p = new Parts(); p.add(G.cyl8, '#5a3d24', 0, 0.12, 0, 0, 0, 0, 0.05, 0.25, 0.05); for (let k = 0; k < 4; k++) p.add(G.cone7, k % 2 ? '#1f6b3a' : '#26794a', 0, 0.42 + k * 0.38, 0, 0, k, 0, 0.46 - k * 0.09, 0.6, 0.46 - k * 0.09); M.pine = p.merge(); }
  { const p = new Parts(); p.add(G.ico, '#2f7f33', -0.2, 0.22, 0, 0, 0, 0, 0.3, 0.26, 0.3); p.add(G.ico, '#3e9443', 0.1, 0.27, 0.05, 0, 1, 0, 0.32, 0.3, 0.3); p.add(G.ico, '#2b7530', 0.32, 0.18, -0.05, 0, 2, 0, 0.22, 0.2, 0.22); M.bush = p.merge(); }
  { const p = new Parts(), c = '#2f7d3a'; p.add(G.cyl8, c, 0, 1.0, 0, 0, 0, 0, 0.13, 2.0, 0.13); p.add(G.sphLo, c, 0, 2.0, 0, 0, 0, 0, 0.13, 0.13, 0.13); p.add(G.cyl8, c, -0.27, 1.05, 0, 0, 0, 0, 0.09, 0.6, 0.09); p.add(G.cyl8, c, -0.15, 0.78, 0, 0, 0, Math.PI / 2, 0.08, 0.3, 0.08); p.add(G.cyl8, c, 0.27, 1.25, 0, 0, 0, 0, 0.09, 0.6, 0.09); p.add(G.cyl8, c, 0.15, 0.98, 0, 0, 0, Math.PI / 2, 0.08, 0.3, 0.08); M.cactus = p.merge(); }
  { const p = new Parts(); p.add(new THREE.DodecahedronGeometry(1, 0), '#8a6f5a', 0, 0.22, 0, 0.3, 0.5, 0.1, 0.5, 0.36, 0.42); p.add(new THREE.DodecahedronGeometry(1, 0), '#9c826c', 0.3, 0.12, 0.15, 0.8, 0.2, 0.4, 0.25, 0.2, 0.22); M.rock = p.merge(); }
  { const p = new Parts(); let x = 0, y = 0; const segs = 7;
    for (let k = 0; k < segs; k++) { const nx = x + 0.035 * (k / segs) * 1.2, ny = y + 1.35 / segs; p.tube([x, y, 0], [nx, ny, 0], 0.045 - k * 0.003, k % 2 ? '#8a6a45' : '#7a5c3b', 7); x = nx; y = ny; }
    for (let k = 0; k < 7; k++) { const ang = k / 7 * Math.PI * 2; p.add(G.box, k % 2 ? '#2f8a3a' : '#3fa24a', x + Math.cos(ang) * 0.24, y - 0.06, Math.sin(ang) * 0.24, 0, -ang, 0.5, 0.52, 0.02, 0.12); }
    p.add(G.sphLo, '#5a3d1e', x, y - 0.06, 0, 0, 0, 0, 0.06, 0.06, 0.06); M.palm = p.merge(); }
  { const p = new Parts(); p.add(G.cyl8, '#4a4f57', 0, 3.6, 0, 0, 0, 0, 0.09, 7.2, 0.09); p.add(G.cyl8, '#4a4f57', 0, 0.3, 0, 0, 0, 0, 0.16, 0.6, 0.16); p.seg([0, 7.1, 0], [1.9, 7.35, 0], 0.08, 0.08, '#4a4f57'); p.add(G.box, '#3a3e45', 2.1, 7.32, 0, 0, 0, 0, 0.7, 0.14, 0.32); M.lamp = p.merge(); }
  { const p = new Parts(); p.add(G.box, [255, 236, 190], 2.1, 7.22, 0, 0, 0, 0, 0.6, 0.05, 0.26); M.lampHead = p.merge(); }
  { const p = new Parts(); p.add(G.box, '#ffffff', 0, 0.3, 0, 0, 0, 0, 1, 0.6, 0.8); p.add(G.cyl, '#8e3b2e', 0, 0.6, 0, 0, 0, Math.PI / 2, 0.01, 1.04, 0.01); const roof = new THREE.CylinderGeometry(0.5, 0.5, 1.06, 3); p.add(roof, '#8e3b2e', 0, 0.72, 0, Math.PI / 2, 0, Math.PI / 2, 0.9, 1, 0.55);
    p.add(G.box, '#5a3a22', 0, 0.16, 0.405, 0, 0, 0, 0.14, 0.3, 0.02); for (const x of [-0.3, 0.3]) p.add(G.box, '#3b4a5f', x, 0.38, 0.405, 0, 0, 0, 0.16, 0.14, 0.02); M.house = p.merge(); }
  { const p = new Parts(); p.add(G.box, '#a8322d', 0, 0.3, 0, 0, 0, 0, 1, 0.6, 1.1); const roof = new THREE.CylinderGeometry(0.5, 0.5, 1.12, 4); p.add(roof, '#5b1c19', 0, 0.62, 0, Math.PI / 2, 0, Math.PI / 4, 0.75, 1, 0.42);
    p.add(G.box, '#ffffff', 0, 0.22, 0.555, 0, 0, 0, 0.36, 0.44, 0.02); p.add(G.box, '#a8322d', 0, 0.22, 0.56, 0, 0, 0, 0.3, 0.38, 0.02); p.add(G.cyl, '#b9b9b9', 0.65, 0.5, 0, 0, 0, 0, 0.16, 1, 0.16); p.add(G.sph, '#9a9a9a', 0.65, 1, 0, 0, 0, 0, 0.16, 0.12, 0.16); M.barn = p.merge(); }
  { const p = new Parts(); p.add(G.cyl8, '#6f747c', 0, 0.5, 0, 0, 0, 0, 1, 1, 1); M.post = p.merge(); }
  return M;
}

// ---------------------------------------------------------------- landmarks (far ring, metres)
function landmarkGeo(type) {
  const p = new Parts(), b = (c, x, y, z, sx, sy, sz, ry = 0) => B(p, c, x, y + sy / 2, z, sx, sy, sz, 0, ry, 0);
  const cyl = (c, x, y, z, rt, rb, h, seg = 12, ry = 0) => p.add(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y + h / 2, z, 0, ry, 0);
  switch (type) {
    case 'eiffel': case 'tokyotower': { const c1 = type === 'eiffel' ? '#6b5440' : '#e0402a', c2 = type === 'eiffel' ? '#7d6650' : '#f2f2f2';
      cyl(c1, 0, 0, 0, 28, 62, 60, 4, Math.PI / 4); cyl(c2, 0, 60, 0, 17, 26, 8, 4, Math.PI / 4); cyl(c1, 0, 68, 0, 9, 17, 95, 4, Math.PI / 4); cyl(c2, 0, 163, 0, 7, 9, 8, 4, Math.PI / 4); cyl(c1, 0, 171, 0, 2, 7, 105, 4, Math.PI / 4); cyl(c2, 0, 276, 0, 0.6, 2, 30, 6);
      b('#ffffff', 0, 0, 0, 70, 1, 70); break; }
    case 'skytree': cyl('#dfe6ee', 0, 0, 0, 14, 34, 340, 9); cyl('#9fb3c8', 0, 340, 0, 26, 18, 22, 16); cyl('#dfe6ee', 0, 362, 0, 8, 14, 90, 9); cyl('#9fb3c8', 0, 452, 0, 14, 10, 14, 16); cyl('#dfe6ee', 0, 466, 0, 1.5, 6, 140, 8); break;
    case 'fuji': p.add(new THREE.ConeGeometry(700, 380, 18, 2), '#3d4e7a', 0, 190, 0); p.add(new THREE.ConeGeometry(250, 136, 18), '#f3f6fb', 0, 380 - 68, 0); break;
    case 'burj': { let h = 0, r = 30; for (let k = 0; k < 9; k++) { const hh = 75 - k * 3; cyl(k % 2 ? '#a9bccd' : '#c4d3e0', 0, h, 0, r * 0.85, r, hh, 6, k * 0.3); h += hh; r *= 0.8; } cyl('#dbe4ec', 0, h, 0, 0.8, 4, 160, 6); break; }
    case 'arab': p.add(new THREE.ConeGeometry(55, 300, 3), '#f2f4f6', 0, 150, 0, 0, Math.PI / 2, 0, 1, 1, 0.45); b('#c9d2da', -40, 0, 0, 10, 330, 10); b('#9aa6b1', 0, 0, 0, 120, 12, 60); break;
    case 'frame': b('#c9a227', -55, 0, 0, 26, 150, 18); b('#c9a227', 55, 0, 0, 26, 150, 18); b('#c9a227', 0, 150, 0, 136, 24, 18); b('#9ad0ff', 0, 150, 9.5, 100, 14, 1); break;
    case 'bigben': b('#c9b48a', 0, 0, 0, 22, 140, 22); b('#e9dfc5', 0, 104, 11.5, 14, 14, 1); b('#e9dfc5', 11.5, 104, 0, 1, 14, 14); b('#b39c70', 0, 140, 0, 26, 18, 26); p.add(new THREE.ConeGeometry(17, 50, 4), '#5f6b56', 0, 183, 0, 0, Math.PI / 4, 0); b('#b39c70', 80, 0, 0, 150, 48, 30); break;
    case 'eye': { p.add(new THREE.TorusGeometry(110, 3, 6, 40), '#e8eef4', 0, 125, 0); for (let k = 0; k < 16; k++) p.add(G.box, '#c9d2da', 0, 125, 0, 0, 0, k * Math.PI / 16, 0.8, 220, 0.8); for (let k = 0; k < 32; k++) { const a = k / 32 * Math.PI * 2; p.add(G.sphLo, '#ffffff', Math.cos(a) * 110, 125 + Math.sin(a) * 110, 0, 0, 0, 0, 4, 3, 4); }
      p.seg([-40, 0, 20], [0, 125, 0], 4, 4, '#c9d2da'); p.seg([40, 0, 20], [0, 125, 0], 4, 4, '#c9d2da'); break; }
    case 'shard': p.add(new THREE.ConeGeometry(40, 310, 4), '#a9c0d6', 0, 155, 0, 0, 0.3, 0); break;
    case 'empire': b('#b7aa94', 0, 0, 0, 70, 160, 50); b('#c2b6a0', 0, 160, 0, 52, 90, 38); b('#ccc1ab', 0, 250, 0, 34, 60, 26); b('#d6ccb8', 0, 310, 0, 18, 30, 16); cyl('#d6ccb8', 0, 340, 0, 2, 6, 40, 8); cyl('#e8e8e8', 0, 380, 0, 0.5, 1.5, 50, 6); break;
    case 'chrysler': b('#b9bfc6', 0, 0, 0, 50, 220, 50); for (let k = 0; k < 4; k++) cyl('#dfe5ea', 0, 220 + k * 18, 0, 22 - k * 5, 26 - k * 5, 18, 12); p.add(new THREE.ConeGeometry(6, 70, 8), '#eef2f5', 0, 292 + 35, 0); break;
    case 'oneWTC': cyl('#9cb6cf', 0, 0, 0, 22, 44, 410, 4, Math.PI / 4); cyl('#e8e8e8', 0, 410, 0, 0.8, 3, 120, 6); break;
    case 'liberty': b('#8a8578', 0, 0, 0, 44, 50, 44); cyl('#6fae9a', 0, 50, 0, 7, 10, 52, 10); p.add(G.sphLo, '#6fae9a', 0, 107, 0, 0, 0, 0, 6, 7, 6); p.seg([5, 95, 0], [10, 125, 0], 3.5, 3.5, '#6fae9a'); p.add(G.cone, '#f2c94c', 10, 129, 0, Math.PI, 0, 0, 3, 7, 3); break;
    case 'gateway': b('#c9a77c', -28, 0, 0, 16, 70, 24); b('#c9a77c', 28, 0, 0, 16, 70, 24); b('#c9a77c', 0, 60, 0, 72, 22, 26); for (const x of [-30, -10, 10, 30]) p.add(G.sph, '#bf9a6c', x, 86, 0, 0, 0, 0, 6, 8, 6); break;
    case 'taj': b('#e7d5b3', 0, 0, 0, 240, 70, 60); b('#e7d5b3', 0, 0, 0, 80, 92, 64); p.add(G.sph, '#b5452f', 0, 92, 0, 0, 0, 0, 26, 30, 26); for (const x of [-100, -55, 55, 100]) p.add(G.sph, '#b5452f', x, 70, 0, 0, 0, 0, 10, 14, 10); break;
    case 'tower': { const R = mulberry32(7); for (let k = 0; k < 6; k++) b(['#8aa0b6', '#a5b6c6', '#7d8fa3'][k % 3], (k - 2.5) * 34, 0, (R() - 0.5) * 30, 26, 110 + R() * 150, 26); break; }
    case 'sealink': b('#d9d6cf', 0, 22, 0, 900, 4, 22); for (const x of [-120, 120]) { p.seg([x - 14, 26, 0], [x, 150, 0], 5, 5, '#d9d6cf'); p.seg([x + 14, 26, 0], [x, 150, 0], 5, 5, '#d9d6cf'); for (let k = 1; k <= 6; k++) { p.seg([x, 145, 0], [x - k * 32, 26, 0], 0.8, 0.8, '#eeeeee'); p.seg([x, 145, 0], [x + k * 32, 26, 0], 0.8, 0.8, '#eeeeee'); } } for (let k = -10; k <= 10; k++) b('#cfccc4', k * 42, 0, 0, 5, 22, 8); break;
    case 'arc': b('#d8cbb0', -24, 0, 0, 22, 50, 26); b('#d8cbb0', 24, 0, 0, 22, 50, 26); b('#d8cbb0', 0, 50, 0, 70, 22, 26); break;
    case 'dome': b('#d8cbb0', 0, 0, 0, 120, 30, 60); cyl('#d8cbb0', 0, 30, 0, 26, 28, 30, 16); p.add(new THREE.SphereGeometry(26, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#d4a940', 0, 60, 0); cyl('#d4a940', 0, 86, 0, 0.5, 3, 24, 8); break;
    case 'windmill': cyl('#efe6d8', 0, 0, 0, 7, 12, 40, 8); p.add(new THREE.ConeGeometry(9, 12, 8), '#6b3f2b', 0, 46, 0); for (let k = 0; k < 4; k++) p.add(G.box, '#f4efe6', 0, 40, 11, 0, 0, k * Math.PI / 2 + 0.3, 4, 52, 0.6); break;
    case 'barnSil': b('#a8322d', 0, 0, 0, 40, 22, 26); p.add(new THREE.CylinderGeometry(20, 20, 27, 4), '#5b1c19', 0, 26, 0, Math.PI / 2, 0, Math.PI / 4, 1, 1, 0.5); cyl('#b9b9b9', 34, 0, 0, 8, 8, 46, 12); break;
    case 'lighthouse': for (let k = 0; k < 5; k++) cyl(k % 2 ? '#d63a3a' : '#f4f4f4', 0, k * 14, 0, 7 - (k + 1) * 0.6, 7 - k * 0.6, 14, 12); cyl('#333', 0, 70, 0, 4.5, 4.5, 2, 12); cyl('#fff7c0', 0, 72, 0, 3.5, 3.5, 6, 12); p.add(G.cone, '#333', 0, 81, 0, 0, 0, 0, 4.5, 6, 4.5); b('#7d7d7d', 0, 0, 0, 30, 3, 30); break;
  }
  return p.merge();
}
const LM_GLOW = { tokyotower: [255, 140, 60], skytree: [150, 200, 255], lighthouse: [255, 240, 180] };
