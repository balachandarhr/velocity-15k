// ---------------------------------------------------------------- 3D renderer (Three.js)
const HALF = 8, SEGM = SEG / UPM, KCURVE = 0.0014, VEH_K = 0.75, KERB = 0.9;
let YS = 0.5 / UPM;
const QUALITY = {
  low: { pr: 1, shadows: false, bloom: false, ahead: 340, fog: 380, scen: 0.55, sky: 70, map: 0, aa: false },
  medium: { pr: 1.5, shadows: true, bloom: false, ahead: 450, fog: 560, scen: 0.85, sky: 120, map: 1024 },
  high: { pr: 2, shadows: true, bloom: true, ahead: 560, fog: 760, scen: 1, sky: 170, map: 2048 }
};
const SUN = { tour: [40, 0.6], mumbai: [11, 0.5], tokyo: [38, -0.7], paris: [32, 0.9], newyork: [52, 0.4], dubai: [66, 0.3], london: [28, 0.8], country: [42, 0.6], coast: [6, 0.15] };
let renderer = null, scene = null, camera = null, composer = null, bloomPass = null, renderPass = null;
let qName = 'medium', Q = QUALITY.medium, autoQ = 'medium', fpsAvg = 60, softGPU = false, gpuName = '';
let hemi, sun, skyMat, skyMesh, stars, farGroup, groundMat, ground, roadMesh, roadGeo, raceGroup, pmrem, envRT = null;
let SCN = null, imgKind = new Map(), inst = new Map(), r3d = [], t3d = [], pickMesh, pickHalo, parts3d, beaconR, beaconT, headLamp = null;
let roadTex = null, TX, TZ, TY, TH, TM = 0, discY = -2, winS0 = -1e9, winSig = '', envSig = '', lastZoneSig = '', camInit = false;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), sunDir = new THREE.Vector3(0, 1, 0);
const isTouchDev = () => ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

function pickAutoQuality() {
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  if (softGPU) return 'low';
  if (isTouchDev()) return (mem <= 4 || cores <= 4 || Math.min(screen.width, screen.height) < 360) ? 'low' : 'medium';
  return cores <= 2 ? 'medium' : 'high';
}
function init3D() {
  try {
    const probe = document.createElement('canvas'); if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return false;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouchDev() || (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
  } catch (e) { console.warn('WebGL unavailable, falling back to the 2D renderer.', e); renderer = null; return false; }
  const gl = renderer.getContext();
  try { const ext = /firefox/i.test(navigator.userAgent) ? null : gl.getExtension('WEBGL_debug_renderer_info'); gpuName = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)); } catch (e) { }
  softGPU = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpuName);
  autoQ = pickAutoQuality();
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); }, false);
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 9000); camera.rotation.order = 'YXZ';
  pmrem = new THREE.PMREMGenerator(renderer);
  SCN = sceneryModels();
  hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 1.2); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffffff, 2.4); sun.shadow.camera.near = 1; sun.shadow.camera.far = 500;
  Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target);
  // sky dome
  skyMat = new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, sunCol: { value: new THREE.Color() }, sunDir: { value: sunDir }, sunSize: { value: 1 }, glow: { value: 1 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = (modelMatrix*vec4(position,0.)).xyz; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 top, bot, sunCol, sunDir; uniform float sunSize, glow; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float h = clamp(d.y, 0., 1.); vec3 c = mix(bot, top, pow(h, 0.6));
        float s = max(dot(d, normalize(sunDir)), 0.); c += sunCol * (smoothstep(0.9993, 0.9997, s) * 8. * sunSize + pow(s, 14.) * 0.45 * glow + pow(s, 3.) * 0.12 * glow);
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`, side: THREE.BackSide, depthWrite: false, fog: false });
  skyMesh = new THREE.Mesh(new THREE.SphereGeometry(5000, 32, 16), skyMat); skyMesh.renderOrder = -10; skyMesh.frustumCulled = false; scene.add(skyMesh);
  { const n = 900, pos = new Float32Array(n * 3), R = mulberry32(5); for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, e = Math.asin(0.08 + R() * 0.92); pos.set([Math.cos(a) * Math.cos(e) * 4500, Math.sin(e) * 4500, Math.sin(a) * Math.cos(e) * 4500], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85, depthWrite: false })); stars.frustumCulled = false; scene.add(stars); }
  // far ground disc (fades to the horizon colour like fog; sea for coastal maps)
  groundMat = new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunCol: { value: new THREE.Color() }, r0: { value: 100 }, r1: { value: 600 }, sea: { value: 0 }, t: { value: 0 }, ctr: { value: new THREE.Vector2() } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform vec3 col, hor, sunCol; uniform float r0, r1, sea, t; uniform vec2 ctr; varying vec3 vW;
      void main(){ float d = distance(vW.xz, ctr); float f = smoothstep(r0, r1, d); vec3 c = col;
        if (sea > 0.5) { float w = sin(vW.x * 0.07 + t * 1.3) * sin(vW.z * 0.05 - t) + 0.5 * sin((vW.x + vW.z) * 0.11 + t * 2.); c *= 0.9 + 0.12 * w; c += sunCol * pow(max(w, 0.), 16.) * 0.12 * (1. - f); }
        gl_FragColor = vec4(mix(c, hor, f), 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`, fog: false });
  ground = new THREE.Mesh(new THREE.CircleGeometry(6000, 48).rotateX(-Math.PI / 2), groundMat); ground.renderOrder = -5; ground.receiveShadow = false; scene.add(ground);
  farGroup = new THREE.Group(); scene.add(farGroup);
  // road (dynamic window of segments)
  const maxV = 620 * 30 * 6; roadGeo = new THREE.BufferGeometry();
  for (const [k, n] of [['position', 3], ['normal', 3], ['color', 3], ['uv', 2]]) roadGeo.setAttribute(k, new THREE.BufferAttribute(new Float32Array(maxV * n), n).setUsage(THREE.DynamicDrawUsage));
  roadGeo.setDrawRange(0, 0);
  roadTex = noiseTex(256, 232, 46, 3);
  roadMesh = new THREE.Mesh(roadGeo, new THREE.MeshBasicMaterial()); roadMesh.receiveShadow = true; roadMesh.frustumCulled = false; scene.add(roadMesh);
  raceGroup = new THREE.Group(); scene.add(raceGroup);
  // boost particles
  { const n = 420, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    parts3d = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.42, map: radialTex(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    parts3d.frustumCulled = false; parts3d.userData = { n, i: 0, life: new Float32Array(n), vel: new Float32Array(n * 3) }; scene.add(parts3d); }
  // image -> scenery kind
  for (const k of ['tree', 'pine', 'bush', 'cactus', 'rock', 'palm', 'barn']) imgKind.set(S[k], k);
  for (const k of ['lampR', 'lampL', 'lampRn', 'lampLn']) imgKind.set(S[k], 'lamp');
  S.house.forEach((h, i) => { imgKind.set(h, 'house'); h.houseCol = ['#f6c6d0', '#bde4f4', '#fff1b8'][i]; });
  addEventListener('resize', resize3D);
  r3ready = true; applyGfx(true); resize3D();
  return true;
}
function noiseTex(size, base, amp, seed) {
  const c = mk(size, size, g => { const id = g.createImageData(size, size), R = mulberry32(seed); for (let i = 0; i < size * size; i++) { const v = base + (R() - 0.5) * amp; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; } g.putImageData(id, 0, 0);
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(0,0,0,${0.015 + R() * 0.025})`; circ(g, R() * size, R() * size, 2 + R() * 9); } });
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t;
}
let _radial = null;
function radialTex() { if (_radial) return _radial; const c = mk(64, 64, g => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }); _radial = new THREE.CanvasTexture(c); return _radial; }
function canvasTex(c, crop) {
  let src = c; if (crop) src = mk(crop[2] - crop[0], crop[3] - crop[1], g => g.drawImage(c, crop[0], crop[1], crop[2] - crop[0], crop[3] - crop[1], 0, 0, crop[2] - crop[0], crop[3] - crop[1]));
  const t = new THREE.CanvasTexture(src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); return t;
}
function effQuality() { return settings.gfx === 'low' || settings.gfx === 'medium' || settings.gfx === 'high' ? settings.gfx : autoQ; }
function applyGfx(force) {
  if (!renderer) return;
  const q = effQuality(); const info = $('gfxInfo');
  if (info) info.textContent = `Using ${q} quality${settings.gfx === 'auto' ? ' (picked automatically for this device' + (softGPU ? ', software graphics detected' : '') + ')' : ''}. ${q === 'low' ? 'Shadows and glow are off.' : q === 'medium' ? 'Shadows on, glow off.' : 'Soft shadows and boost glow on.'}`;
  if (q === qName && !force) return;
  qName = q; Q = QUALITY[q];
  renderer.shadowMap.enabled = Q.shadows; sun.castShadow = Q.shadows; renderer.shadowMap.type = THREE.PCFShadowMap; sun.shadow.radius = q === "high" ? 3 : 1;
  if (Q.shadows) { sun.shadow.mapSize.set(Q.map, Q.map); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  scene.traverse(o => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => m.needsUpdate = true); } });
  if (Q.bloom && !composer) {
    composer = new EffectComposer(renderer); renderPass = new RenderPass(scene, camera); composer.addPass(renderPass);
    bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.45, 1.0); composer.addPass(bloomPass); composer.addPass(new OutputPass());
  }
  initMaterials(q === 'low'); roadMesh.material.dispose();
  roadMesh.material = q === 'low' ? new THREE.MeshLambertMaterial({ vertexColors: true, map: roadTex }) : new THREE.MeshStandardMaterial({ vertexColors: true, map: roadTex, roughness: 0.93, metalness: 0 });
  if (TX) onNewRace3D(); if (gBike) { const k = gKey; gKey = ''; garagePreview3D(settings.bike, settings.color); void k; }
  winS0 = -1e9; fpsLowT = 0; resize3D();
}
function resize3D() {
  if (!renderer) return;
  const w = Math.max(320, innerWidth), h = Math.max(240, innerHeight), pr = Math.min(window.devicePixelRatio || 1, Q.pr);
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(pr); composer.setSize(w, h); bloomPass.resolution.set(w * pr / 2, h * pr / 2); }
}

// ---------------------------------------------------------------- track frames (centre line built by integrating curve -> heading)
function buildFrames() {
  const N = segments.length; TM = circuit ? N * (laps + 2) + 1400 : N + 4;
  TX = new Float64Array(TM + 2); TZ = new Float64Array(TM + 2); TY = new Float32Array(TM + 2); TH = new Float64Array(TM + 2);
  let x = 0, z = 0, h = 0, mn = 1e9;
  for (let s = 0; s <= TM + 1; s++) {
    const seg = segments[s % N]; TX[s] = x; TZ[s] = z; TH[s] = h; TY[s] = seg.p1.world.y * YS; mn = Math.min(mn, TY[s]);
    const hm = h + seg.curve * KCURVE * 0.5; x += Math.sin(hm) * SEGM; z -= Math.cos(hm) * SEGM; h += seg.curve * KCURVE;
  }
  discY = mn - (loc.sea ? 2.2 : 1.2);
}
const F = { x: 0, y: 0, z: 0, h: 0, rx: 1, rz: 0, slope: 0 };
function frameAt(zu) {
  let sf = zu / SEG; if (!(sf >= 0)) sf = 0; if (sf > TM - 1) sf = TM - 1;
  const s = Math.floor(sf), f = sf - s;
  F.x = TX[s] + (TX[s + 1] - TX[s]) * f; F.z = TZ[s] + (TZ[s + 1] - TZ[s]) * f; F.y = TY[s] + (TY[s + 1] - TY[s]) * f; F.h = TH[s] + (TH[s + 1] - TH[s]) * f;
  F.rx = Math.cos(F.h); F.rz = Math.sin(F.h); F.slope = (TY[s + 1] - TY[s]) / SEGM; return F;
}

// ---------------------------------------------------------------- per-race scene
const raceDispose = [];
function track3(o) { raceDispose.push(o); return o; }
function clearRace3D() {
  for (const o of raceDispose) o.dispose && o.dispose(); raceDispose.length = 0;
  while (raceGroup.children.length) raceGroup.remove(raceGroup.children[0]);
  while (farGroup.children.length) farGroup.remove(farGroup.children[0]);
  inst.clear(); r3d = []; t3d = [];
}
function onNewRace3D() {
  if (!renderer) return;
  clearRace3D(); YS = (loc.sea ? 0.14 : 0.5) / UPM; buildFrames();
  const A = locAssets(loc), night = !!loc.night;
  // scenery instancing: count capacity per kind / texture
  const cap = new Map(), bump = (k, n = 1) => cap.set(k, (cap.get(k) || 0) + n);
  for (const seg of segments) for (const sp of seg.sprites) {
    const k = sceneKey(sp.img); bump(k); if (k === 'lamp') bump('lampHead'), bump('pool');
    if (k.startsWith('board:') || k.startsWith('km:') || k.startsWith('banner:')) bump('post', 2);
  }
  const mkInst = (key, geo, mat, n, shadow = true) => { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); m.count = 0; m.castShadow = shadow && Q.shadows; m.receiveShadow = true; m.frustumCulled = false; raceGroup.add(m); inst.set(key, m); return m; };
  const vegMat = MAT.veg;
  for (const [key, n] of cap) {
    if (SCN[key]) {
      if (key === 'lampHead') mkInst(key, SCN.lampHead, track3(new THREE.MeshBasicMaterial({ color: night ? new THREE.Color(3, 2.6, 1.8) : new THREE.Color(0.9, 0.88, 0.8), toneMapped: !night })), n, false);
      else mkInst(key, SCN[key], key === 'lamp' || key === 'post' ? MAT.metal : vegMat, n, key !== 'post');
    } else if (key === 'pool') { if (night) mkInst(key, track3(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), track3(new THREE.MeshBasicMaterial({ map: radialTex(), color: new THREE.Color(1.0, 0.75, 0.42), transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false })), n, false); }
    else if (key.startsWith('img:')) { /* filled lazily below */ }
  }
  // textured kinds (buildings / boards / km signs / banners)
  const texMeshes = new Map();
  for (const seg of segments) for (const sp of seg.sprites) {
    const key = sceneKey(sp.img); if (inst.has(key) || !key.includes(':')) continue;
    const kind = key.split(':')[0], img = sp.img, n = cap.get(key);
    if (kind === 'building') {
      const t = track3(canvasTex(img)); const roof = track3(new THREE.MeshStandardMaterial({ color: 0x5b5f66, roughness: 0.9 }));
      const fac = track3(new THREE.MeshStandardMaterial({ map: t, roughness: 0.75, metalness: 0.05, emissiveMap: night ? t : null, emissive: night ? new THREE.Color(1, 1, 1) : new THREE.Color(0, 0, 0), emissiveIntensity: night ? 1.1 : 0 }));
      mkInst(key, boxBase(), [fac, fac, roof, roof, fac, fac], n);
    } else {
      const crop = kind === 'board' ? [6, 6, 314, 134] : kind === 'km' ? [4, 4, 146, 104] : [20, 20, 880, 140];
      const t = track3(canvasTex(img, crop)), edge = track3(new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.7 }));
      const face = track3(new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, emissiveMap: t, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: night || loc.neonBoards ? 0.9 : 0.18 }));
      mkInst(key, boxBase(), [edge, edge, edge, edge, face, face], n);
      img.cropAspect = (crop[3] - crop[1]) / (crop[2] - crop[0]);
    }
  }
  // riders
  riders.forEach((r, i) => { const o = makeBike3D(r.bike.id, r.color, r.isPlayer ? settings.color : r.color, RIDER_DEFS[i][2]); o.rotation.order = 'YXZ'; raceGroup.add(o); track3({ dispose: () => disposeTree(o) }); r3d.push(o); });
  // traffic
  traffic.forEach(v => { const g = vehicleGeos(v.img, v.w / ROAD_W * HALF * VEH_K, v.len / UPM); const grp = new THREE.Group(), b = new THREE.Mesh(g.body, MAT.car), l = new THREE.Mesh(g.lights, MAT.glow); b.castShadow = true; grp.add(b, l); grp.rotation.order = 'YXZ'; grp.visible = false; grp.userData.body = b; raceGroup.add(grp); t3d.push(grp); });
  // boost pickups + halos
  pickMesh = new THREE.InstancedMesh(track3(new THREE.OctahedronGeometry(0.5, 0)), track3(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.2, 3.0), toneMapped: false })), Math.max(1, pickups.length)); pickMesh.frustumCulled = false; raceGroup.add(pickMesh);
  { const g = track3(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(Math.max(1, pickups.length) * 3), 3).setUsage(THREE.DynamicDrawUsage));
    pickHalo = new THREE.Points(g, track3(new THREE.PointsMaterial({ size: 3.0, map: radialTex(), color: new THREE.Color(0.1, 0.45, 0.9), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))); pickHalo.frustumCulled = false; raceGroup.add(pickHalo); }
  // high-contrast beacons above rivals (yellow) and traffic (red)
  const cone = track3(new THREE.ConeGeometry(0.45, 0.9, 4).rotateX(Math.PI));
  beaconR = new THREE.InstancedMesh(cone, track3(new THREE.MeshBasicMaterial({ color: 0xffe600, toneMapped: false })), N_RIDERS); beaconR.frustumCulled = false; raceGroup.add(beaconR);
  beaconT = new THREE.InstancedMesh(cone, track3(new THREE.MeshBasicMaterial({ color: 0xff3030, toneMapped: false })), Math.max(1, traffic.length)); beaconT.frustumCulled = false; raceGroup.add(beaconT);
  // night: headlight on the player's bike
  if (headLamp) { scene.remove(headLamp); scene.remove(headLamp.target); headLamp.dispose(); headLamp = null; }
  if (night && qName !== 'low') { headLamp = new THREE.SpotLight(0xfff2d0, 60, 70, 0.42, 0.5, 1.4); scene.add(headLamp); scene.add(headLamp.target); }
  buildFar3D(); setSun(); winS0 = -1e9; envSig = ''; lastZoneSig = ''; camInit = false;
}
function boxBase() { return track3(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)); }
function sceneKey(img) {
  const k = imgKind.get(img); if (k) return k;
  if (img.kind === 'building') return 'building:' + (img.__id || (img.__id = ++sceneKey.n));
  if (S.km.includes(img)) return 'km:' + S.km.indexOf(img);
  if (img === S.startBanner || img === S.finishBanner || img === S.lapBanner) return 'banner:' + (img === S.startBanner ? 's' : img === S.finishBanner ? 'f' : 'l');
  return 'board:' + (img.__id || (img.__id = ++sceneKey.n));
}
sceneKey.n = 0;
function setSun() {
  const [el, az] = SUN[loc.id] || SUN.tour, e = el * Math.PI / 180;
  sunDir.set(Math.sin(az) * Math.cos(e), Math.sin(e), -Math.cos(az) * Math.cos(e)).normalize();
}

// ---------------------------------------------------------------- far scenery: mountains, skyline, landmarks, clouds
function buildFar3D() {
  const pal = paletteAt(START_Z), hc = settings.hc, night = !!loc.night && !hc, sky = pal.skyBot;
  const haze = (c, t) => colorLin(mix(c, sky, t));
  const R = mulberry32(seed + 3), p = new Parts();
  const cityF = pal.city || 0, sea = !!loc.sea;
  // mountains ring
  const nM = 34;
  for (let i = 0; i < nM; i++) {
    const a = i / nM * Math.PI * 2 + R() * 0.1, d = 2600 + R() * 600, h = (110 + R() * 300) * (loc.tour || !cityF ? 1 : 0.55) * (sea ? 0.5 : 1), r = 300 + R() * 500;
    if (sea && Math.sin(a) < 0.2) continue; // keep the sea side open
    p.add(G.cone7, haze(pal.far, 0.3 + R() * 0.15), Math.cos(a) * d, h / 2 - 20, Math.sin(a) * d, 0, R() * 3, 0, r, h, r * (0.7 + R() * 0.5));
  }
  if (!cityF || loc.tour) for (let i = 0; i < 26; i++) { const a = R() * Math.PI * 2, d = 1500 + R() * 500, h = 50 + R() * 120, r = 200 + R() * 260; if (sea && Math.sin(a) < 0.2) continue; p.add(G.cone7, haze(pal.near, 0.25), Math.cos(a) * d, h / 2 - 15, Math.sin(a) * d, 0, R() * 3, 0, r, h, r); }
  const mm = p.merge(); if (mm) { const m = new THREE.Mesh(track3(mm), track3(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, fog: false }))); farGroup.add(m); }
  // skyline ring (cities)
  if (cityF > 0.02 && !hc) {
    const tall = loc.id === 'newyork' || loc.id === 'tokyo' || loc.id === 'dubai' ? 1.6 : 1, q = new Parts(), n = Math.round(Q.sky * cityF);
    for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2; if (sea && Math.sin(a) < 0.25) continue; const d = 650 + R() * 700, h = (25 + R() * R() * 160) * tall, w = 25 + R() * 45;
      q.add(G.box, haze(mix(pal.near, night ? [16, 18, 38] : [70, 74, 96], 0.45 + R() * 0.3), night ? 0.15 : 0.38), Math.cos(a) * d, h / 2 - 5, Math.sin(a) * d, 0, -a, 0, w, h, w * (0.7 + R() * 0.6)); }
    const g = q.merge(); if (g) {
      const wt = track3(winTex(night));
      const m = new THREE.Mesh(track3(boxUV(g)), track3(new THREE.MeshLambertMaterial({ vertexColors: true, map: wt, emissiveMap: night ? wt : null, emissive: night ? new THREE.Color(1, 0.85, 0.6) : new THREE.Color(0, 0, 0), emissiveIntensity: night ? 1.4 : 0, fog: false }))); farGroup.add(m); }
  }
  // landmarks
  if (loc.marks && !hc) for (const [type, u] of loc.marks) {
    const g = landmarkGeo(type); if (!g) continue; track3(g);
    const glow = night && LM_GLOW[type];
    const colAttr = g.attributes.color; const skyC = colorLin(sky);
    for (let i = 0; i < colAttr.count; i++) { const c = new THREE.Color(colAttr.getX(i), colAttr.getY(i), colAttr.getZ(i)); if (glow) c.lerp(colorLin(LM_GLOW[type]), 0.5).multiplyScalar(0.8); else c.lerp(skyC, night ? 0.25 : 0.32); colAttr.setXYZ(i, c.r, c.g, c.b); }
    const m = new THREE.Mesh(g, glow ? track3(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })) : track3(new THREE.MeshLambertMaterial({ vertexColors: true, fog: false })));
    const a = -Math.PI / 2 + (u - 0.5) * 2.3, d = type === 'fuji' ? 3400 : type === 'sealink' ? 1500 : 1350;
    const sc = type === 'fuji' ? 1 : type === 'windmill' || type === 'barnSil' || type === 'lighthouse' ? 2.2 : 1.05;
    m.position.set(Math.cos(a) * d, type === 'sealink' ? -12 : -6, Math.sin(a) * d); m.scale.setScalar(sc); m.lookAt(0, m.position.y, 0); farGroup.add(m);
    if (type === 'windmill') m.userData.spin = true;
  }
  // clouds
  if (!night && !hc) {
    const ct = track3(cloudTex()), n = pal.overcast ? 26 : 12;
    for (let i = 0; i < n; i++) { const mat = track3(new THREE.SpriteMaterial({ map: ct, color: pal.overcast ? 0xd8dce2 : 0xffffff, transparent: true, opacity: pal.overcast ? 0.9 : 0.8, fog: false, depthWrite: false }));
      const s = new THREE.Sprite(mat), a = R() * Math.PI * 2, d = 2400 + R() * 1400; s.position.set(Math.cos(a) * d, 380 + R() * (pal.overcast ? 300 : 700), Math.sin(a) * d); const w = 600 + R() * 900; s.scale.set(w, w * 0.32, 1); s.renderOrder = -8; farGroup.add(s); }
  }
}
function boxUV(g) { // planar UVs for the merged skyline so the window texture tiles per ~12 m
  const pos = g.attributes.position, nrm = g.attributes.normal, uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { const nx = Math.abs(nrm.getX(i)), nz = Math.abs(nrm.getZ(i)); const u = nx > nz ? pos.getZ(i) : pos.getX(i); uv[i * 2] = u / 14; uv[i * 2 + 1] = pos.getY(i) / 14; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
function winTex(night) {
  const c = mk(128, 128, g => { g.fillStyle = night ? '#101018' : '#c9ccd4'; g.fillRect(0, 0, 128, 128); const R = mulberry32(night ? 9 : 4);
    for (let y = 6; y < 128; y += 16) for (let x = 6; x < 128; x += 16) { g.fillStyle = night ? (R() < 0.45 ? '#ffd890' : '#141822') : (R() < 0.15 ? '#e8e2c8' : '#6a7486'); g.fillRect(x, y, 9, 10); } });
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function cloudTex() {
  const c = mk(256, 96, g => { const R = mulberry32(11); for (let i = 0; i < 26; i++) { const x = 30 + R() * 196, y = 40 + R() * 30, r = 14 + R() * 26, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------- road + roadside window
let RV = 0, RP, RN, RC, RU;
const _a = [0, 0, 0], _b = [0, 0, 0], _c = [0, 0, 0], _d = [0, 0, 0];
function rpt(s, lat, y, o) { const h = TH[s]; o[0] = TX[s] + Math.cos(h) * lat; o[1] = y; o[2] = TZ[s] + Math.sin(h) * lat; }
function rvert(p, nx, ny, nz, c, u, v) { const i = RV * 3; RP[i] = p[0]; RP[i + 1] = p[1]; RP[i + 2] = p[2]; RN[i] = nx; RN[i + 1] = ny; RN[i + 2] = nz; RC[i] = c.r; RC[i + 1] = c.g; RC[i + 2] = c.b; RU[RV * 2] = u; RU[RV * 2 + 1] = v; RV++; }
// strip between lateral la..lb, from segment s to s+1, heights given absolutely
function strip(s, la, lb, yan, ybn, yaf, ybf, c, uvs = 0.25) {
  if (RV + 6 > RP.length / 3) return;
  rpt(s, la, yan, _a); rpt(s, lb, ybn, _b); rpt(s + 1, lb, ybf, _c); rpt(s + 1, la, yaf, _d);
  const e1x = _b[0] - _a[0], e1y = _b[1] - _a[1], e1z = _b[2] - _a[2], e2x = _c[0] - _a[0], e2y = _c[1] - _a[1], e2z = _c[2] - _a[2];
  let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
  const v0 = s * SEGM * uvs, v1 = (s + 1) * SEGM * uvs, u0 = la * uvs, u1 = lb * uvs; // ~4 m texture tiles
  rvert(_a, nx, ny, nz, c, u0, v0); rvert(_b, nx, ny, nz, c, u1, v0); rvert(_c, nx, ny, nz, c, u1, v1);
  rvert(_a, nx, ny, nz, c, u0, v0); rvert(_c, nx, ny, nz, c, u1, v1); rvert(_d, nx, ny, nz, c, u0, v1);
}
const flat = (s, la, lb, up, c) => strip(s, la, lb, TY[s] + up, TY[s] + up, TY[s + 1] + up, TY[s + 1] + up, c);
const palCache = new Map();
function palC(pal) { // linear colours for a palette
  let o = palCache.get(pal); if (o && !pal.__dyn) return o;
  o = { road: colorLin(pal.road), road2: colorLin(mix(pal.road, [0, 0, 0], 0.05)), gL: colorLin(pal.grassL), gD: colorLin(pal.grassD), gFar: colorLin(mix(pal.grassD, pal.far, 0.25)), sea: pal.sea ? colorLin(pal.sea) : null };
  if (!pal.__dyn) palCache.set(pal, o); return o;
}
const CW = new THREE.Color(0.86, 0.86, 0.86), CRED = colorLin([206, 32, 40]), CY = colorLin([255, 230, 0]), CBLK = new THREE.Color(0.01, 0.01, 0.01), CWHT = new THREE.Color(1, 1, 1), CWALL = colorLin([150, 140, 125]);
function buildWindow(s0) {
  const N = segments.length, s1 = Math.min(TM - 2, s0 + Q.ahead + 50), hc = settings.hc;
  RP = roadGeo.attributes.position.array; RN = roadGeo.attributes.normal.array; RC = roadGeo.attributes.color.array; RU = roadGeo.attributes.uv.array; RV = 0;
  const startSeg = Math.floor(START_Z / SEG), finSeg = Math.floor(mod(finishZ, trackLen) / SEG), sea = !!loc.sea && !hc;
  let pal = paletteAt(s0 * SEG), pc = palC(pal);
  for (let s = Math.max(0, s0); s < s1; s++) {
    const idx = s % N, alt = Math.floor(idx / RUMBLE) % 2;
    if (loc.tour && !hc && (s & 7) === 0) { pal = paletteAt(s * SEG); pal.__dyn = 1; pc = palC(pal); }
    const roadC = hc ? (alt ? new THREE.Color(0.012, 0.012, 0.012) : CBLK) : (alt ? pc.road : pc.road2);
    // road surface (or chequered start / finish)
    if ((idx >= finSeg && idx < finSeg + 3) || (idx >= startSeg && idx < startSeg + 2)) { for (let k = 0; k < 10; k++) flat(s, -HALF + k * HALF / 5, -HALF + (k + 1) * HALF / 5, 0, (k + idx) % 2 ? CWHT : CBLK); }
    else {
      flat(s, -HALF, HALF, 0, roadC);
      const lc = hc ? CY : CW;
      flat(s, -HALF + 0.25, -HALF + 0.42, 0.012, hc ? CWHT : CW); flat(s, HALF - 0.42, HALF - 0.25, 0.012, hc ? CWHT : CW);
      if (alt) for (const lx of [-HALF / 2, 0, HALF / 2]) flat(s, lx - 0.09, lx + 0.09, 0.012, lc);
    }
    // kerbs
    const kc = hc ? (alt ? CY : CBLK) : (alt ? CW : CRED);
    strip(s, -HALF - KERB, -HALF, TY[s] + 0.03, TY[s] + 0.09, TY[s + 1] + 0.03, TY[s + 1] + 0.09, kc);
    strip(s, HALF, HALF + KERB, TY[s] + 0.09, TY[s] + 0.03, TY[s + 1] + 0.09, TY[s + 1] + 0.03, kc);
    // verges / pavements and the embankment down to the far ground
    const gN = hc ? (alt ? colorLin(HC_PAL.grassL) : colorLin(HC_PAL.grassD)) : (alt ? pc.gL : pc.gD), gF = hc ? colorLin(HC_PAL.grassD) : pc.gFar;
    const E = HALF + KERB, M = HALF + 62, O = HALF + 320;
    flat(s, E, HALF + 8, 0.03, gN); flat(s, HALF + 8, M, 0.0, gF); strip(s, M, O, TY[s], discY, TY[s + 1], discY, gF);
    if (sea) { flat(s, -HALF - 6, -E, 0.03, gN); strip(s, -HALF - 6.4, -HALF - 6, TY[s] - 0.0, TY[s] + 0.55, TY[s + 1], TY[s + 1] + 0.55, CWALL); strip(s, -HALF - 7, -HALF - 6.4, discY + 0.4, TY[s], discY + 0.4, TY[s + 1], CWALL); }
    else { flat(s, -HALF - 8, -E, 0.03, gN); flat(s, -M, -HALF - 8, 0.0, gF); strip(s, -O, -M, discY, TY[s], discY, TY[s + 1], gF); }
  }
  roadGeo.setDrawRange(0, RV);
  for (const k of ['position', 'normal', 'color', 'uv']) { const a = roadGeo.attributes[k]; a.clearUpdateRanges(); a.addUpdateRange(0, RV * a.itemSize); a.needsUpdate = true; }
  // scenery instances in the window
  for (const m of inst.values()) m.count = 0;
  const night = !!loc.night;
  for (let s = Math.max(0, s0); s < s1; s++) {
    const seg = segments[s % N]; if (!seg.sprites.length) continue;
    for (let k = 0; k < seg.sprites.length; k++) placeSprite(seg.sprites[k], s, k, night);
  }
  for (const m of inst.values()) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere && 0; }
}
const _pos = new THREE.Vector3(), _scl = new THREE.Vector3(), _quat = new THREE.Quaternion(), _eul = new THREE.Euler(0, 0, 0, 'YXZ'), _mat = new THREE.Matrix4(), _col = new THREE.Color();
function putInst(key, x, y, z, yaw, sx, sy, sz, tint) {
  const m = inst.get(key); if (!m || m.count >= m.instanceMatrix.count) return;
  _pos.set(x, y, z); _quat.setFromEuler(_eul.set(0, yaw, 0)); _scl.set(sx, sy, sz); _mat.compose(_pos, _quat, _scl); m.setMatrixAt(m.count, _mat);
  if (tint) m.setColorAt(m.count, tint); m.count++;
}
const VEG = { tree: 1, pine: 1, bush: 1, cactus: 1, rock: 1, palm: 1 };
function placeSprite(sp, s, k, night) {
  const key = sceneKey(sp.img), kind = key.split(':')[0];
  if (VEG[kind] && Q.scen < 1 && Math.abs(sp.x) > 1.6 && hash(s * 13 + k) > Q.scen) return;
  const wn = sp.w / ROAD_W, side = sp.x < 0 ? -1 : 1, cxn = sp.center ? sp.x : sp.x + side * wn / 2, h = TH[s], ch = Math.cos(h), sh = Math.sin(h);
  const at = lat => [TX[s] + ch * lat, TZ[s] + sh * lat];
  const wm = wn * HALF, y = TY[s] + (Math.abs(cxn) * HALF > HALF + 62 ? -1 : 0);
  const hv = hash(s * 7.13 + k * 3.1);
  switch (kind) {
    case 'tree': case 'pine': case 'bush': case 'cactus': case 'rock': case 'palm': {
      const [x, z] = at(cxn * HALF), sc = wm * (kind === 'tree' ? 1.15 : kind === 'pine' ? 1.0 : kind === 'palm' ? 1.25 : kind === 'cactus' ? 0.75 : 1) * (0.85 + hv * 0.3);
      _col.setRGB(0.85 + hv * 0.3, 0.9 + hash(hv) * 0.2, 0.85 + hv * 0.15);
      putInst(kind, x, y, z, hv * 6.28, sc, sc * (kind === 'palm' ? 1.0 : 1), sc, _col); break; }
    case 'lamp': {
      const lat = sp.x * HALF, [x, z] = at(lat), yaw = side < 0 ? -h : -h + Math.PI;
      putInst('lamp', x, TY[s], z, yaw, 1, 1, 1); putInst('lampHead', x, TY[s], z, yaw, 1, 1, 1);
      if (night) { const [px, pz] = at(lat - side * 2.4); putInst('pool', px, TY[s] + 0.04, pz, -h, 11, 1, 11); }
      break; }
    case 'house': case 'barn': {
      const [x, z] = at(cxn * HALF), yaw = side > 0 ? -h - Math.PI / 2 : -h + Math.PI / 2;
      putInst(kind, x, y, z, yaw, wm, wm, wm, kind === 'house' ? _col.set(sp.img.houseCol) : null); break; }
    case 'building': {
      const bwm = Math.max(8, wm * 0.95), H = Math.max(9, wm * sp.img.height / sp.img.width * 1.25), len = 14.5 + hv * 3.5, [x, z] = at(cxn * HALF + side * 1.5);
      putInst(key, x, y - 0.5, z, -h, bwm, H + 0.5, len); break; }
    case 'board': {
      const pw = wm * 0.92, ph = pw * sp.img.cropAspect, [x, z] = at(cxn * HALF), yaw = -h - side * 0.3, py = TY[s] + 3.0;
      putInst(key, x, py, z, yaw, pw, ph, 0.22);
      for (const o of [-0.33, 0.33]) { const [qx, qz] = [x + Math.cos(yaw) * pw * o, z - Math.sin(yaw) * pw * o]; putInst('post', qx, TY[s], qz, 0, 0.12, py + 0.1 - TY[s], 0.12); }
      break; }
    case 'km': {
      const pw = Math.max(1.6, wm * 0.8), ph = pw * sp.img.cropAspect, lat = sp.x * HALF - 0.6, [x, z] = at(lat), py = TY[s] + 1.3;
      putInst(key, x, py, z, -h + 0.25, pw, ph, 0.08); putInst('post', x, TY[s], z, 0, 0.07, 1.35, 0.07); break; }
    case 'banner': {
      const pw = HALF * 2 + 2.2, ph = pw * sp.img.cropAspect, py = TY[s] + 5.2, [x, z] = at(0);
      putInst(key, x, py, z, -h, pw, ph, 0.35);
      for (const o of [-1, 1]) { const [qx, qz] = at(o * (HALF + 1.1)); putInst('post', qx, TY[s], qz, 0, 0.28, 5.4 + ph, 0.28); }
      break; }
  }
}

// ---------------------------------------------------------------- per-frame update
let camLat = 0, camLatL = 0, camY = 0, fpsLowT = 0, fpsT = 0, fpsN = 0, menuT = 0, fpsLast = 0;
const _tmp = new THREE.Vector3(), _skyTop = new THREE.Color(), _skyBot = new THREE.Color();
function render3D(dt) {
  if (!player || !TX) return;
  const now = performance.now(), hc = settings.hc, rm = settings.rm, night = !!loc.night && !hc;
  // fps tracking + adaptive quality (auto only)
  const rdt = fpsLast ? Math.min(1, (now - fpsLast) / 1000) : 0; fpsLast = now; fpsT += rdt; fpsN++; if (fpsT > 1) { fpsAvg = fpsN / fpsT; fpsT = 0; fpsN = 0;
    if (settings.gfx === 'auto' && state === 'racing' && !paused && !document.hidden) { if (fpsAvg < 32 && autoQ !== 'low') { fpsLowT++; if (fpsLowT >= 3) { autoQ = autoQ === 'high' ? 'medium' : 'low'; applyGfx(); say(`Graphics lowered to ${autoQ} for smoother play.`); } } else fpsLowT = 0; } }
  const pal = paletteAt(player.z), zoneSig = (loc.tour ? Math.floor(zoneF(player.z)) : 0) + (hc ? 'h' : '');
  if (zoneSig !== lastZoneSig) { const first = !lastZoneSig; lastZoneSig = zoneSig; if (!first) { while (farGroup.children.length) farGroup.remove(farGroup.children[0]); buildFar3D(); } envSig = ''; winS0 = -1e9; }
  // sky, fog, lights
  _skyTop.copy(colorLin(pal.skyTop)); _skyBot.copy(colorLin(pal.skyBot));
  skyMat.uniforms.top.value.copy(_skyTop); skyMat.uniforms.bot.value.copy(_skyBot); skyMat.uniforms.sunCol.value.copy(colorLin(pal.sun)).multiplyScalar(night ? 0.5 : 1);
  skyMat.uniforms.sunSize.value = pal.overcast || hc ? 0 : night ? 0.35 : 1; skyMat.uniforms.glow.value = pal.overcast || hc ? 0.15 : night ? 0.3 : 1;
  const fogFar = hc ? Q.fog * 1.3 : Q.fog * (pal.overcast ? 0.8 : 1);
  if (!scene.fog) scene.fog = new THREE.Fog(0xffffff, 10, 500); scene.fog.color.copy(_skyBot); scene.fog.near = fogFar * 0.22; scene.fog.far = fogFar;
  stars.visible = night;
  hemi.color.copy(_skyTop).lerp(CWHT, night ? 0.25 : 0.55); hemi.groundColor.copy(colorLin(pal.grassD)).multiplyScalar(0.8);
  hemi.intensity = hc ? 2.2 : night ? 1.25 : pal.overcast ? 1.9 : 1.15;
  sun.color.copy(colorLin(pal.sun)); if (night) sun.color.setRGB(0.55, 0.62, 1.0); sun.intensity = hc ? 1.2 : night ? 0.45 : pal.overcast ? 0.85 : 2.6;
  if (envSig !== zoneSig + qName) { envSig = zoneSig + qName; if (qName === 'low') { scene.environment = null; } else updateEnv(); }
  // track window
  const pSeg = Math.floor(player.z / SEG);
  const sig = (hc ? 'h' : '') + qName;
  if (pSeg - winS0 > 110 || pSeg < winS0 + 30 || sig !== winSig) { winSig = sig; winS0 = Math.max(0, pSeg - 40); buildWindow(winS0); }
  // riders
  const spinK = (settings.gameSpeed || 1) * TIME_SCALE / 3.6;
  const vis = Q.fog * UPM * 1.05;
  riders.forEach((r, i) => {
    const o = r3d[i]; if (!o) return; const rel = r.z - player.z;
    if (!r.isPlayer && (rel > vis || rel < -30 * UPM)) { o.visible = false; return; }
    o.visible = true; const f = frameAt(r.z - 70), lat = r.x * HALF;
    o.position.set(f.x + f.rx * lat, f.y, f.z + f.rz * lat);
    const ln = r.isPlayer ? lean : r.lean;
    o.rotation.set(Math.atan(f.slope), -f.h - ln * 0.07, 0);
    const u = o.userData; u.lean.rotation.z = -ln * (r.isPlayer ? 0.5 : 0.45);
    if (r.isPlayer && !rm && player.kmh > 1 && Math.abs(player.x) > 1) u.lean.position.y = (Math.random() - 0.5) * 0.04; else u.lean.position.y = 0;
    const w = r.kmh * spinK * dt; u.wf.rotation.x -= w / u.sp.rf; u.wr.rotation.x -= w / u.sp.rr;
    const ghost = !r.isPlayer && rel < 0 && rel > -7 * UPM && Math.abs(r.x - player.x) * HALF < 3;
    if (ghost !== !!u.ghost) { u.ghost = ghost; u.parts.forEach((m, j) => m.material = ghost ? MAT.ghost : (j === 0 ? MAT.paint : m === u.metal ? MAT.metal : MAT.tyre)); u.parts.forEach(m => m.castShadow = !ghost); }
    if (r.boost > 0 && !rm && (r.isPlayer || rel > -10 * UPM && rel < 80 * UPM)) emitBoost(o, u, r.isPlayer ? 2 : 1);
  });
  // traffic
  let bt = 0;
  traffic.forEach((v, i) => {
    const g = t3d[i]; if (!g) return; const rz = relZ(v.z, player.z);
    if (rz > vis || rz < -25 * UPM) { g.visible = false; return; }
    g.visible = true; const f = frameAt(player.z + rz + v.len / 2), lat = v.x * HALF;
    g.position.set(f.x + f.rx * lat, f.y, f.z + f.rz * lat); g.rotation.set(Math.atan(f.slope), -f.h - (v.x - (v.px ?? v.x)) * 2, 0); v.px = v.x;
    const ghost = rz + v.len < 0 && rz + v.len > -7 * UPM && Math.abs(v.x - player.x) * HALF < 3.5;
    g.userData.body.material = ghost ? MAT.ghost : MAT.car; g.userData.body.castShadow = !ghost;
    if (hc && bt < beaconT.instanceMatrix.count) { _mat.makeTranslation(g.position.x, g.position.y + (v.len > 800 ? 5.4 : 3.2), g.position.z); beaconT.setMatrixAt(bt++, _mat); }
  });
  beaconT.count = bt; beaconT.instanceMatrix.needsUpdate = true;
  let br = 0; if (hc) riders.forEach((r, i) => { if (r.isPlayer || !r3d[i].visible) return; const p = r3d[i].position; _mat.makeTranslation(p.x, p.y + 2.5 + (rm ? 0 : Math.sin(now / 200 + i) * 0.12), p.z); beaconR.setMatrixAt(br++, _mat); });
  beaconR.count = br; beaconR.instanceMatrix.needsUpdate = true;
  // pickups
  let pc = 0; const hp = pickHalo.geometry.attributes.position, spin = rm ? 0 : now / 400;
  for (const p of pickups) {
    if (!p.active) continue; const z = p.seg * SEG + SEG / 2, rz = relZ(z, mod(player.z, trackLen) + (circuit ? 0 : 0)); const az = circuit ? player.z + relZ(z, player.z) : z;
    const d = az - player.z; if (d < -10 * UPM || d > vis) continue;
    const f = frameAt(az), lat = p.x * HALF, x = f.x + f.rx * lat, y = f.y + 1.25 + (rm ? 0 : Math.sin(now / 300 + p.seg) * 0.12), zz = f.z + f.rz * lat;
    _quat.setFromEuler(_eul.set(0, spin + p.seg, 0)); _mat.compose(_pos.set(x, y, zz), _quat, _scl.set(1, 1.3, 1)); pickMesh.setMatrixAt(pc, _mat); hp.setXYZ(pc, x, y, zz); pc++; void rz;
  }
  pickMesh.count = pc; pickMesh.instanceMatrix.needsUpdate = true; pickHalo.geometry.setDrawRange(0, pc); hp.needsUpdate = true;
  pickMesh.material.color.setRGB(hc ? 3 : 0.3, hc ? 3 : 2.2, hc ? 0 : 3.0);
  updateParticles(dt);
  // camera
  const pf = frameAt(player.z - 70), pl = player.x * HALF, px = pf.x + pf.rx * pl, py = pf.y, pz = pf.z + pf.rz * pl;
  if (state === 'menu') {
    menuT += rm ? 0 : dt * 0.12; const a = 2.4 + menuT, d = 7.5;
    camPos.set(px + Math.sin(a) * d, py + 2.2, pz + Math.cos(a) * d); camLook.set(px, py + 0.8, pz); camera.position.copy(camPos); camera.lookAt(camLook); camInit = false;
  } else {
    const k = clamp(dt * 7, 0, 1);
    if (!camInit) { camLat = player.x * HALF; camLatL = camLat; camY = py; camInit = true; }
    camLat = lerp(camLat, lerp(player.x, 0, 0.1) * HALF, k); camLatL = lerp(camLatL, player.x * HALF * 0.9, clamp(dt * 10, 0, 1)); camY = lerp(camY, py, clamp(dt * 6, 0, 1));
    const back = frameAt(player.z - 4.6 * UPM), bx = back.x + back.rx * camLat, bz = back.z + back.rz * camLat, by = Math.max(back.y, camY - 0.5) + 1.85;
    camPos.set(bx, by, bz);
    const ahead = frameAt(player.z + 12 * UPM); camLook.set(ahead.x + ahead.rx * camLatL, ahead.y + 0.75, ahead.z + ahead.rz * camLatL);
    camera.position.copy(camPos);
    if (shake > 0 && !rm) camera.position.add(_tmp.set((Math.random() - 0.5) * shake * 0.5, (Math.random() - 0.5) * shake * 0.35, 0));
    camera.lookAt(camLook);
    if (!rm) camera.rotation.z += -lean * 0.035;
  }
  const portrait = innerHeight > innerWidth, base = portrait ? 78 : 60;
  const kick = rm ? 0 : clamp((player.kmh - 50) / 70, 0, 1) * 7 + (player.boost > 0 ? 7 : 0);
  const fov = lerp(camera.fov, base + kick, clamp(dt * 4, 0, 1)); if (Math.abs(fov - camera.fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  // far stuff follows the camera
  skyMesh.position.copy(camera.position); stars.position.copy(camera.position);
  farGroup.position.set(camera.position.x, discY + 1, camera.position.z);
  for (const m of farGroup.children) if (m.userData.spin && !rm) m.rotation.z = 0;
  ground.position.set(camera.position.x, discY, camera.position.z);
  const gu = groundMat.uniforms; gu.ctr.value.set(camera.position.x, camera.position.z); gu.t.value = rm ? 0 : now / 1000;
  gu.sea.value = loc.sea && !hc ? 1 : 0; gu.col.value.copy(loc.sea && !hc ? colorLin(pal.sea || [60, 100, 140]) : colorLin(hc ? HC_PAL.grassD : mix(pal.grassD, pal.far, 0.25))); gu.hor.value.copy(_skyBot); gu.sunCol.value.copy(colorLin(pal.sun));
  gu.r0.value = loc.sea && !hc ? 700 : scene.fog.near; gu.r1.value = loc.sea && !hc ? 4800 : scene.fog.far;
  // sun follows the player so the shadow map stays sharp around the action
  sun.target.position.set(px + pf.rx * 0 + Math.sin(pf.h) * 14, py, pz - Math.cos(pf.h) * 14); sun.position.copy(sun.target.position).addScaledVector(sunDir, 220);
  if (headLamp) { const o = r3d[0]; headLamp.position.set(px, py + 1.0, pz).addScaledVector(_tmp.set(Math.sin(pf.h), 0, -Math.cos(pf.h)), 0.9); headLamp.target.position.set(px, py, pz).addScaledVector(_tmp.set(Math.sin(pf.h), 0, -Math.cos(pf.h)), 26); void o; }
  // render
  if (composer && Q.bloom) { bloomPass.strength = rm ? 0.35 : (night ? 0.9 : 0.5) + (player.boost > 0 ? 0.35 : 0); bloomPass.threshold = night ? 0.9 : 1.6; composer.render(); }
  else renderer.render(scene, camera);
}
function updateEnv() {
  if (envRT) { envRT.dispose(); envRT = null; }
  const es = new THREE.Scene(); const m = new THREE.Mesh(new THREE.SphereGeometry(100, 24, 12), skyMat); es.add(m);
  const g = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: groundMat.uniforms.col.value.clone().multiplyScalar(0.7) })); g.position.y = -2; es.add(g);
  envRT = pmrem.fromScene(es, 0, 0.1, 300); scene.environment = envRT.texture; scene.environmentIntensity = settings.hc ? 0.4 : loc.night ? 0.5 : 0.75;
  m.geometry.dispose(); g.geometry.dispose(); g.material.dispose();
}
const _ex = new THREE.Vector3();
function emitBoost(o, u, n) {
  const P = parts3d.userData, pos = parts3d.geometry.attributes.position, h = o.rotation.y;
  for (let k = 0; k < n; k++) {
    const i = P.i; P.i = (P.i + 1) % P.n;
    _ex.set((Math.random() - 0.5) * 0.25, u.sp.rr + 0.15 + Math.random() * 0.15, u.sp.wb / 2 + 0.25).applyEuler(o.rotation).add(o.position);
    pos.setXYZ(i, _ex.x, _ex.y, _ex.z); P.life[i] = 0.45 + Math.random() * 0.25;
    P.vel[i * 3] = Math.sin(-h) * -6 * 0 + (Math.random() - 0.5) * 1.5 + Math.sin(h) * 4; P.vel[i * 3 + 1] = 0.4 + Math.random() * 0.8; P.vel[i * 3 + 2] = Math.cos(h) * 4 + (Math.random() - 0.5) * 1.5;
  }
}
function updateParticles(dt) {
  const P = parts3d.userData, pos = parts3d.geometry.attributes.position, col = parts3d.geometry.attributes.color;
  for (let i = 0; i < P.n; i++) {
    if (P.life[i] <= 0) { if (col.getX(i) || col.getY(i)) col.setXYZ(i, 0, 0, 0); continue; }
    P.life[i] -= dt; const t = clamp(P.life[i] / 0.6, 0, 1);
    pos.setXYZ(i, pos.getX(i) + P.vel[i * 3] * dt, pos.getY(i) + P.vel[i * 3 + 1] * dt, pos.getZ(i) + P.vel[i * 3 + 2] * dt);
    col.setXYZ(i, 0.05 * t + 0.3 * t * t * t, 0.35 * t + 0.35 * t * t * t, 1.0 * t);
  }
  pos.needsUpdate = true; col.needsUpdate = true;
}

// ---------------------------------------------------------------- garage 3D preview
let gR = null, gScene, gCam, gBike = null, gKey = '', gT = 0;
function garagePreview3D(type, color) {
  if (use2D) return false;
  const cv = $('gPreviewSide');
  if (!gR) {
    try { gR = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { return false; }
    gR.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); gR.setSize(520, 300, false); cv.style.width = '520px';
    gR.toneMapping = THREE.ACESFilmicToneMapping; gR.shadowMap.enabled = true; gR.shadowMap.type = THREE.PCFShadowMap;
    gScene = new THREE.Scene(); gCam = new THREE.PerspectiveCamera(30, 520 / 300, 0.1, 100);
    gScene.add(new THREE.HemisphereLight(0xdfe8ff, 0x334055, 1.4));
    const d = new THREE.DirectionalLight(0xffffff, 2.6); d.position.set(3, 6, 4); d.castShadow = true; d.shadow.mapSize.set(1024, 1024); Object.assign(d.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 }); gScene.add(d);
    const rim = new THREE.DirectionalLight(0x88ccff, 1.4); rim.position.set(-4, 3, -4); gScene.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(2.6, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1b2233, roughness: 0.55, metalness: 0.2 })); floor.receiveShadow = true; gScene.add(floor);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.45, 2.6, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x29d3ff, toneMapped: false })); ring.position.y = 0.005; gScene.add(ring);
    const pm = new THREE.PMREMGenerator(gR), es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), new THREE.MeshBasicMaterial({ color: 0x8aa4c8, side: THREE.BackSide }))); const top = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); top.position.y = 8; top.rotation.x = Math.PI / 2; es.add(top);
    gScene.environment = pm.fromScene(es, 0.02).texture;
  }
  const key = type + color;
  if (key !== gKey) { if (gBike) { gScene.remove(gBike); disposeTree(gBike); } gBike = makeBike3D(type, color, color, '#ffffff'); gBike.traverse(m => { if (m.isMesh) m.castShadow = true; }); gScene.add(gBike); gKey = key; }
  renderGarage(0);
  return true;
}
function renderGarage(dt) {
  if (!gR || !gBike) return;
  if (!settings.rm) gT += dt * 0.45;
  const a = settings.rm ? 0.9 : 0.9 + gT, sp = BSPEC[settings.bike] || BSPEC.naked, d = 4.4 + (sp.wb - 1.4) * 1.5;
  gCam.position.set(Math.sin(a) * d, 1.35, Math.cos(a) * d); gCam.lookAt(0, 0.62, 0);
  if (!settings.rm) { gBike.userData.wf.rotation.x -= dt * 3; gBike.userData.wr.rotation.x -= dt * 3; }
  gR.render(gScene, gCam);
}
