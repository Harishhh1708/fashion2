// 3D scene for the dress designer: mannequin, fabric materials (procedural weave + prints), dress meshes, trims and accessories.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import * as M from "./dress-model.js";

const TAU = Math.PI * 2, V = (x, y, z) => new THREE.Vector3(x, y, z);
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), sm = (t) => { t = cl(t, 0, 1); return t * t * (3 - 2 * t); };

// ---------- textures ----------
const texCache = new Map();
const cv = (n) => { const c = document.createElement("canvas"); c.width = c.height = n; return c; };
function wrapTex(c, tileM, srgb) {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / tileM, 1 / tileM); t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}
function printTex(kind, col, acc, scale) {
  const key = [kind, col, acc, scale].join("|"); if (texCache.has(key)) return texCache.get(key);
  const N = 512, c = cv(N), g = c.getContext("2d"); g.fillStyle = col; g.fillRect(0, 0, N, N);
  const rep = (fn) => { for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) { g.save(); g.translate(dx, dy); fn(); g.restore(); } };
  const dot = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  let tile = 0.16;
  if (kind === "stripes") { tile = 0.12; g.fillStyle = acc; for (let i = 0; i < 8; i++) g.fillRect(i * 64 + 14, 0, 36, N); }
  else if (kind === "polka") { g.fillStyle = acc; rep(() => { dot(128, 128, 34); dot(384, 384, 34); }); }
  else if (kind === "check") { tile = 0.12; g.fillStyle = acc; g.fillRect(0, 0, 256, 256); g.fillRect(256, 256, 256, 256); }
  else if (kind === "gingham") { tile = 0.12; g.fillStyle = acc; g.globalAlpha = 0.5; g.fillRect(0, 0, 128, N); g.fillRect(256, 0, 128, N); g.fillRect(0, 0, N, 128); g.fillRect(0, 256, N, 128); g.globalAlpha = 1; }
  else if (kind === "floral") {
    tile = 0.26; const fl = [[100, 110, 1], [330, 70, 0.8], [220, 300, 1.1], [450, 380, 0.9], [60, 430, 0.8]];
    rep(() => fl.forEach(([x, y, s]) => {
      g.fillStyle = "#4f8a4b"; g.globalAlpha = 0.9; [[-1, 0.4], [1, 0.9]].forEach(([d, r]) => { g.save(); g.translate(x + d * 34 * s, y + 30 * s); g.rotate(d * 0.9 + r); g.beginPath(); g.ellipse(0, 0, 22 * s, 8 * s, 0, 0, TAU); g.fill(); g.restore(); });
      g.globalAlpha = 1; g.fillStyle = acc; for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; dot(x + Math.cos(a) * 22 * s, y + Math.sin(a) * 22 * s, 17 * s); }
      g.fillStyle = "#e0a526"; dot(x, y, 11 * s);
    }));
  }
  const t = wrapTex(c, tile * scale, true); texCache.set(key, t); return t;
}
function weaveTex(kind) {
  const key = "w" + kind; if (texCache.has(key)) return texCache.get(key);
  const N = 256, c = cv(N), g = c.getContext("2d"); g.fillStyle = "#808080"; g.fillRect(0, 0, N, N);
  const noise = (amt) => { const d = g.getImageData(0, 0, N, N), a = d.data; for (let i = 0; i < a.length; i += 4) { const v = (Math.random() - 0.5) * amt; a[i] += v; a[i + 1] += v; a[i + 2] += v; } g.putImageData(d, 0, 0); };
  if (kind === "plain" || kind === "fine") { const s = kind === "plain" ? 8 : 4; for (let y = 0; y < N; y += s) for (let x = 0; x < N; x += s) { g.fillStyle = ((x + y) / s) % 2 ? "#9a9a9a" : "#6e6e6e"; g.fillRect(x, y, s, s); } noise(40); }
  else if (kind === "twill") { g.strokeStyle = "#b5b5b5"; g.lineWidth = 3; for (let k = -N; k < N * 2; k += 8) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + N, N); g.stroke(); } noise(30); }
  else if (kind === "slub") { for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},0.10)`; g.fillRect(0, Math.random() * N, N, 1 + Math.random() * 3); } for (let y = 0; y < N; y += 4) { g.fillStyle = y % 8 ? "#8c8c8c" : "#747474"; g.fillRect(0, y, N, 2); } noise(36); }
  else if (kind === "crepe") { noise(120); g.filter = "blur(1px)"; g.drawImage(c, 0, 0); g.filter = "none"; noise(40); }
  else { noise(150); }
  const t = wrapTex(c, 0.03, false); texCache.set(key, t); return t;
}

// ---------- geometry helpers ----------
function geoFrom(g) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(g.pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(g.uv, 2));
  geo.setAttribute("aCut", new THREE.Float32BufferAttribute(g.cut, 1)); geo.setAttribute("aBand", new THREE.Float32BufferAttribute(g.band, 2));
  geo.setIndex(g.idx); geo.computeVertexNormals(); return geo;
}
function tubeGeo(rows, cols, fn) {
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= rows; j++) { const o = fn(j / rows); for (let i = 0; i <= cols; i++) { const th = (i / cols) * TAU, c = Math.cos(th), s = Math.sin(th); pos.push(o.c[0] + o.u[0] * o.a * c + o.v[0] * o.b * s, o.c[1] + o.u[1] * o.a * c + o.v[1] * o.b * s, o.c[2] + o.u[2] * o.a * c + o.v[2] * o.b * s); uv.push((th * (o.a + o.b)) / 2, o.s); } }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const lerp = (a, b, t) => a + (b - a) * t;
function spl(ts, vs) { return (t) => { t = cl(t, ts[0], ts[ts.length - 1]); let i = 0; while (i < ts.length - 2 && t > ts[i + 1]) i++; const u = sm((t - ts[i]) / (ts[i + 1] - ts[i])); return lerp(vs[i], vs[i + 1], u); }; }

export function createScene(canvas, stage) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x887766, 0.35));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.2); key.position.set(2.2, 4, 3.2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -1.8, right: 1.8, top: 2.4, bottom: -1, near: 0.5, far: 12 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.01; scene.add(key);
  const rim = new THREE.DirectionalLight(0xbcd6ff, 0.9); rim.position.set(-3, 2.5, -3); scene.add(rim);
  const floor = new THREE.Group(); scene.add(floor);
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.98, 0.04, 72), new THREE.MeshStandardMaterial({ color: 0xe9e4dc, roughness: 0.6 })); pod.position.y = -0.02; pod.receiveShadow = true; floor.add(pod);
  const group = new THREE.Group(); scene.add(group);
  const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.minDistance = 0.6; controls.maxDistance = 9; controls.maxPolarAngle = Math.PI * 0.52; controls.autoRotateSpeed = 1.6;
  let hgt = 1.64;
  const size = (w, h) => { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const resize = () => { const w = stage.clientWidth, h = stage.clientHeight; if (w && h) size(w, h); };
  new ResizeObserver(resize).observe(stage); resize();
  const view = (az = 0, el = 0.06) => { const d = hgt * 2.15 * (camera.aspect < 0.8 ? 1.3 : 1); camera.position.set(Math.sin(az) * d, hgt * (0.55 + el), Math.cos(az) * d); controls.target.set(0, hgt * 0.52, 0); controls.update(); };
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

  const disposeGroup = () => { group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); } }); group.clear(); };
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, side: THREE.DoubleSide, ...extra });
  const mesh = (geo, mat, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; return m; };

  function fabricMaterial(p, sh, bandH) {
    const f = M.FABRICS[p.fabric], map = printTex(p.print, p.color, p.trimColor, p.printScale), bump = weaveTex(f.weave);
    const mat = new THREE.MeshPhysicalMaterial({ map, bumpMap: bump, bumpScale: { denim: 2.2, linen: 1.6, velvet: 1.2, cotton: 1.4 }[p.fabric] || 0.7, roughness: f.rough, metalness: 0, side: THREE.DoubleSide, transparent: f.alpha < 1, opacity: f.alpha, envMapIntensity: 1.1,
      sheen: p.fabric === "velvet" ? 1 : f.sheen * 0.5, sheenRoughness: 0.45, sheenColor: new THREE.Color(p.color).lerp(new THREE.Color("#ffffff"), p.fabric === "velvet" ? 0.5 : 0.3), clearcoat: p.fabric === "satin" ? 0.4 : p.fabric === "silk" ? 0.2 : 0, clearcoatRoughness: 0.3 });
    const trim = new THREE.Color(p.trimColor), edge = p.neckTrim ? 0.007 : 0, band = bandH || 0, lace = p.hemTrim === "lace" ? 1 : 0;
    mat.onBeforeCompile = (s) => {
      s.uniforms.uTrim = { value: trim }; s.uniforms.uEdge = { value: edge }; s.uniforms.uBand = { value: band }; s.uniforms.uLace = { value: lace };
      s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nattribute float aCut;attribute vec2 aBand;varying float vCut;varying vec2 vBand;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvCut=aCut;vBand=aBand;");
      s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vCut;varying vec2 vBand;uniform vec3 uTrim;uniform float uEdge;uniform float uBand;uniform float uLace;")
        .replace("#include <map_fragment>", `#include <map_fragment>
if(vCut<0.0) discard;
if(uEdge>0.0 && vCut<uEdge) diffuseColor.rgb=uTrim;
if(uBand>0.0 && vBand.x<uBand){ diffuseColor.rgb=uTrim; if(uLace>0.5){ vec2 g=fract(vec2(vBand.y*0.4775,vBand.x*70.0)); if(length(g-0.5)<0.2 && vBand.x>0.012) discard; } }`);
    };
    mat.customProgramCacheKey = () => "dress-fabric-v1";
    return mat;
  }

  function build(p) {
    disposeGroup();
    const sh = M.dressShape(p), B = sh.B, H = sh.H, s = sh.s, m = p.m; hgt = H;
    const skinC = p.mannequin ? "#d9d3cb" : p.skin, skin = std(skinC, { roughness: p.mannequin ? 0.6 : 0.55 });
    const add = (o) => { group.add(o); return o; };
    // torso (y from low hip to chin)
    add(mesh(tubeGeo(70, 72, (t) => { const y = lerp(0.455 * H, 0.866 * H, t); return { c: [0, y, 0], u: [1, 0, 0], v: [0, 0, 1], a: B.a(y), b: B.b(y), s: y }; }), skin));
    // head
    const hr = 0.093 * s, hy = 0.866 * H + 0.1 * s;
    const head = mesh(new THREE.SphereGeometry(1, 40, 28), skin); head.scale.set(hr * 0.93, hr * 1.2, hr * 1.02); head.position.set(0, hy, 0.004); add(head);
    if (!p.mannequin) {
      const hair = new THREE.MeshStandardMaterial({ color: p.hair, roughness: 0.45, side: THREE.DoubleSide });
      const cap = mesh(new THREE.SphereGeometry(1, 40, 28, 0, TAU, 0, Math.PI * 0.62), hair); cap.scale.set(hr * 1.0, hr * 1.24, hr * 1.1); cap.position.set(0, hy + 0.004, -0.008); cap.rotation.x = -0.28; add(cap);
      const bun = mesh(new THREE.SphereGeometry(1, 24, 18), hair); bun.scale.setScalar(hr * 0.5); bun.position.set(0, hy + hr * 0.95, -hr * 0.75); add(bun);
      const nose = mesh(new THREE.SphereGeometry(1, 12, 10), skin); nose.scale.set(0.008 * s, 0.012 * s, 0.012 * s); nose.position.set(0, hy - 0.006, hr * 1.0); add(nose);
    }
    // legs + feet
    const lx = 0.5 * (B.a(0.5 * H) * 0.62 + 0.02);
    const legR = spl([0, 0.3, 0.55, 0.8, 1], [m.hip / 100 / TAU * 0.64, m.hip / 100 / TAU * 0.5, 0.047 * s, 0.05 * s, 0.03 * s]);
    for (const sd of [-1, 1]) {
      add(mesh(tubeGeo(24, 28, (t) => { const y = lerp(0.5 * H, 0.04 * H, t); return { c: [sd * lx, y, 0], u: [1, 0, 0], v: [0, 0, 1], a: legR(t), b: legR(t), s: y }; }), skin));
      const ft = mesh(new THREE.SphereGeometry(1, 20, 14), skin); ft.scale.set(0.034 * s, 0.03 * s, 0.1 * s); ft.position.set(sd * lx, 0.028 * s, 0.045 * s); add(ft);
    }
    // arms
    const al = 0.2, S = (sd) => V(sd * (B.sh * 0.97 - 0.02 * s), 0.772 * H, 0), armLen = m.arm / 100, bic = m.bicep / 100 / TAU;
    const dirOf = (sd) => V(sd * Math.sin(al), -Math.cos(al), 0), u1 = (sd) => V(sd * Math.cos(al), Math.sin(al), 0);
    const armR = (t) => spl([0, 0.45, 0.55, 1], [bic * 1.12, bic * 0.88, bic * 0.8, bic * 0.58])(t);
    for (const sd of [-1, 1]) {
      const d = dirOf(sd), u = u1(sd), S0 = S(sd);
      add(mesh(tubeGeo(24, 28, (t) => { const c = S0.clone().addScaledVector(d, t * armLen), r = armR(t); return { c: [c.x, c.y, c.z], u: [u.x, u.y, u.z], v: [0, 0, 1], a: r, b: r * 0.95, s: t * armLen }; }), skin));
      const ball = mesh(new THREE.SphereGeometry(1, 20, 14), skin); ball.scale.setScalar(bic * 1.15); ball.position.copy(S0); add(ball);
      const hand = mesh(new THREE.SphereGeometry(1, 18, 14), skin); hand.scale.set(0.03 * s, 0.062 * s, 0.017 * s); hand.position.copy(S0.clone().addScaledVector(d, armLen + 0.03 * s)); hand.rotation.z = -sd * al; add(hand);
    }
    // dress
    const bandH = p.hemTrim === "lace" || p.hemTrim === "band" ? 0.08 * s : 0;
    const mat = fabricMaterial(p, sh, bandH);
    add(mesh(geoFrom(M.buildBodice(p, sh)), mat)); add(mesh(geoFrom(M.buildSkirt(p, sh)), mat));
    const trimMat = std(p.trimColor, { roughness: 0.4 }), beltMat = std(p.beltColor, { roughness: 0.38 }), gold = std("#d4a73a", { metalness: 1, roughness: 0.25 }), pearl = new THREE.MeshPhysicalMaterial({ color: "#f5efe6", roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1 });
    // sleeves
    const sl = M.SLEEVES[p.sleeve];
    if (sl[1] > 0 && p.neck !== "strapless") {
      const Ltot = sl[1] * armLen, st = p.sleeveStyle;
      for (const sd of [-1, 1]) {
        const d = dirOf(sd), u = u1(sd), S0 = S(sd).add(V(0, 0.003, 0));
        const g = tubeGeo(34, 56, (t) => {
          const c = S0.clone().addScaledVector(d, t * Ltot), ta = (t * Ltot) / armLen; let r = armR(ta) + 0.012 + p.m.bicep * 0 + (M.EASE[p.fit] / 100) / TAU * 0.5;
          if (st === "puff") r += 0.04 * s * Math.pow(Math.sin(Math.PI * cl(t / 0.92, 0, 1)), 0.8) * (1 - sm((t - 0.86) / 0.14)) * (0.5 + 0.5 * Math.min(1, sl[1] * 2));
          if (st === "bell") r += 0.085 * s * Math.pow(t, 2.3);
          const fold = 1 + (M.FABRICS[p.fabric].drape * 0.03) * Math.sin(t * 9) * (st === "plain" ? 0.4 : 1);
          return { c: [c.x, c.y, c.z], u: [u.x, u.y, u.z], v: [0, 0, 1], a: r * 1.06 * fold, b: r * fold, s: t * Ltot };
        });
        const sm2 = mesh(g, mat.clone()); sm2.material.map = mat.map; sm2.material.onBeforeCompile = (sd2) => { sd2.uniforms.uTrim = { value: new THREE.Color(p.trimColor) }; sd2.uniforms.uEdge = { value: 0 }; sd2.uniforms.uBand = { value: 0 }; sd2.uniforms.uLace = { value: 0 }; sd2.vertexShader = sd2.vertexShader.replace("#include <common>", "#include <common>\nattribute float aCut;attribute vec2 aBand;varying float vCut;varying vec2 vBand;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvCut=1.0;vBand=vec2(9.0,0.0);"); sd2.fragmentShader = sd2.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vCut;varying vec2 vBand;uniform vec3 uTrim;uniform float uEdge;uniform float uBand;uniform float uLace;"); };
        sm2.material.customProgramCacheKey = () => "dress-sleeve-v1"; add(sm2);
      }
    }
    // helpers for ring bands
    const dressAB = (y) => (y >= sh.ySeam ? sh.bod(y) : sh.skirtAB(y));
    const ring = (yc, h, pad, mt, cols = 110) => mesh(tubeGeo(2, cols, (t) => { const y = yc + (t - 0.5) * h, [a, b] = dressAB(y); const [a2, b2] = dressAB(yc); return { c: [0, y, 0], u: [1, 0, 0], v: [0, 0, 1], a: Math.max(a, a2 * 0.99) + pad, b: Math.max(b, b2 * 0.99) + pad, s: y }; }), mt);
    // belt
    if (p.belt !== "none") {
      const bh = (p.belt === "wide" ? 0.06 : 0.025) * s; add(ring(sh.ySeam, bh, 0.004, beltMat));
      const [, bz] = dressAB(sh.ySeam), bk = mesh(new THREE.BoxGeometry(0.05 * s, bh * 1.05, 0.006), gold); bk.position.set(0, sh.ySeam, bz + 0.008); add(bk);
      const inner = mesh(new THREE.BoxGeometry(0.032 * s, bh * 0.6, 0.007), beltMat); inner.position.set(0, sh.ySeam, bz + 0.0095); add(inner);
    }
    // bow
    if (p.bow !== "none") {
      const bowMat = p.belt !== "none" && p.bow === "waist" ? beltMat : trimMat, ne = M.neckEdges(p, sh);
      const y = p.bow === "neck" ? Math.max(ne.front(0) - 0.03 * s, 0.7 * H) : sh.ySeam, zz = (p.bow === "neck" ? sh.bod(y)[1] : dressAB(y)[1]) + 0.016;
      const bow = new THREE.Group(); bow.position.set(0, y, zz);
      for (const sd of [-1, 1]) { const lp = mesh(new THREE.SphereGeometry(1, 20, 14), bowMat); lp.scale.set(0.06 * s, 0.032 * s, 0.014 * s); lp.position.set(sd * 0.055 * s, 0.004, 0); lp.rotation.z = sd * 0.35; bow.add(lp); const tl = mesh(new THREE.BoxGeometry(0.024 * s, 0.13 * s, 0.006), bowMat); tl.position.set(sd * 0.022 * s, -0.07 * s, -0.002); tl.rotation.z = sd * 0.16; bow.add(tl); }
      const kn = mesh(new THREE.SphereGeometry(1, 14, 12), bowMat); kn.scale.set(0.02 * s, 0.022 * s, 0.016 * s); bow.add(kn); add(bow);
    }
    // buttons
    if (p.buttons !== "none") {
      const front = p.buttons === "front", ne = M.neckEdges(p, sh), top = front ? Math.min(0.775 * H, ne.front(0) - 0.035 * s) : Math.min(0.775 * H, ne.back(0) - 0.035 * s), bot = sh.ySeam + 0.035 * s, n = Math.max(3, Math.floor((top - bot) / (0.058 * s)) + 1);
      const bgeo = new THREE.CylinderGeometry(0.0085 * s, 0.0085 * s, 0.005, 20);
      for (let i = 0; i < n; i++) { const y = lerp(bot, top, i / Math.max(1, n - 1)), [, bb] = sh.bod(y), b = mesh(bgeo, pearl); b.position.set(0, y, (front ? 1 : -1) * (bb + 0.003)); b.rotation.x = front ? Math.PI / 2 : -Math.PI / 2; add(b); }
    }
    // hem ruffle
    if (p.hemTrim === "ruffle") {
      const top = sh.yHem + 0.075 * s, bot = sh.yHem - 0.012 * s;
      add(mesh(tubeGeo(18, 220, (t) => { const y = lerp(top, bot, t), [a, b] = sh.skirtAB(y), fl = 1.05 + 0.03 * Math.sin(1.2 * t * 3); return { c: [0, y - 0.012 * s * (1 - t) * 0, 0], u: [1, 0, 0], v: [0, 0, 1], a: a * fl, b: b * fl, s: y }; }).clone(), trimMat));
      // scalloped wave: displace vertices
      const last = group.children[group.children.length - 1], pos = last.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i), th = Math.atan2(z, x), tt = cl((top - y) / (top - bot), 0, 1); const k = 1 + 0.05 * Math.sin(th * 46) * (0.25 + 0.75 * tt); pos.setX(i, x * k); pos.setZ(i, z * k); pos.setY(i, y + 0.01 * s * Math.sin(th * 23) * tt); } last.geometry.computeVertexNormals();
    }
    // jewellery
    if (p.necklace !== "none") {
      const yN = 0.838 * H, pts = []; const N = 56;
      for (let i = 0; i < N; i++) { const ph = (i / N) * TAU, sf = Math.pow(Math.max(0, Math.sin(ph)), 2), y = yN - 0.05 * s * sf, bb = B.b(y), x = 0.068 * s * Math.cos(ph) * (1 + 1.3 * sf), z = (Math.sin(ph) >= 0 ? 1 : 0.9) * Math.max(0.066 * s, bb * 0.98) * Math.sin(ph) + (Math.sin(ph) > 0 ? 0.006 : 0); pts.push(V(x, y, z)); }
      if (p.necklace === "pearl") { const g = new THREE.SphereGeometry(0.0055 * s, 14, 10), im = new THREE.InstancedMesh(g, pearl, N), mx = new THREE.Matrix4(); pts.forEach((q, i) => { mx.setPosition(q); im.setMatrixAt(i, mx); }); im.castShadow = true; add(im); }
      else { add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 120, 0.0016 * s, 6, true), gold)); const pe = mesh(new THREE.SphereGeometry(0.009 * s, 16, 12), gold); pe.position.copy(pts[Math.round(N / 4)]).add(V(0, -0.012 * s, 0.004)); add(pe); }
    }
    if (p.earrings && !p.mannequin) for (const sd of [-1, 1]) { const x = sd * hr * 0.98, y = hy - 0.012 * s; const st = mesh(new THREE.SphereGeometry(0.006 * s, 12, 10), gold); st.position.set(x, y, 0.004); add(st); const dr = mesh(new THREE.SphereGeometry(1, 14, 12), p.necklace === "pearl" ? pearl : gold); dr.scale.set(0.006 * s, 0.014 * s, 0.006 * s); dr.position.set(x, y - 0.02 * s, 0.004); add(dr); }
    return sh;
  }

  // capture portrait views (JPEG base64) for the PDF
  function captureViews() {
    const out = [], w0 = stage.clientWidth, h0 = stage.clientHeight, auto = controls.autoRotate, pos = camera.position.clone(), tg = controls.target.clone();
    controls.autoRotate = false; renderer.setClearColor(0xf1ece4, 1); const W = 480, Hh = 760; size(W, Hh); pod.visible = true;
    for (const az of [0, Math.PI / 2, Math.PI]) { view(az, 0.04); renderer.render(scene, camera); const url = renderer.domElement.toDataURL("image/jpeg", 0.88); out.push({ b64: url.split(",")[1], w: W, h: Hh }); }
    renderer.setClearColor(0x000000, 0); controls.autoRotate = auto; size(w0, h0); camera.position.copy(pos); controls.target.copy(tg); controls.update(); return out;
  }
  function snapshot() { renderer.render(scene, camera); return renderer.domElement.toDataURL("image/png"); }
  return { build, view, controls, captureViews, snapshot, renderer, scene };
}
