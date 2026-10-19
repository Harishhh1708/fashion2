// Dress model: parameters, body, dress shape, 3D grids, flat pattern pieces, yardage and stitching steps.
// Pure maths (no DOM, no three.js) so the same numbers drive the 3D view AND the printed PDF pattern.
export const TAU = Math.PI * 2;
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const sm = (t) => { t = cl(t, 0, 1); return t * t * (3 - 2 * t); };

export const SIZES = {
  XS: { bust: 80, waist: 62, hip: 87, height: 160, shoulder: 36, neck: 33, bicep: 25, arm: 56 },
  S: { bust: 84, waist: 66, hip: 91, height: 162, shoulder: 37, neck: 34, bicep: 26, arm: 57 },
  M: { bust: 88, waist: 70, hip: 95, height: 164, shoulder: 38, neck: 35, bicep: 27, arm: 58 },
  L: { bust: 96, waist: 78, hip: 103, height: 166, shoulder: 39.5, neck: 36.5, bicep: 29, arm: 59 },
  XL: { bust: 104, waist: 86, hip: 111, height: 168, shoulder: 41, neck: 38, bicep: 31, arm: 60 },
  XXL: { bust: 112, waist: 94, hip: 119, height: 168, shoulder: 42.5, neck: 39.5, bicep: 33, arm: 60 },
};
export const MEAS_LABELS = { bust: "Bust", waist: "Waist", hip: "Hip", height: "Height", shoulder: "Shoulder width", neck: "Neck", bicep: "Upper arm", arm: "Arm length" };

export const FABRICS = {
  cotton: { name: "Cotton", w: 112, drape: 0.35, rough: 0.9, sheen: 0, weave: "plain", alpha: 1, needle: "80/12", st: 2.5, note: "Easy to sew. Pre-wash and press. Good for beginners." },
  linen: { name: "Linen", w: 140, drape: 0.3, rough: 0.95, sheen: 0, weave: "slub", alpha: 1, needle: "90/14", st: 3, note: "Creases easily. Finish edges well, it frays." },
  crepe: { name: "Crepe", w: 140, drape: 0.6, rough: 0.8, sheen: 0.1, weave: "crepe", alpha: 1, needle: "80/12", st: 2.5, note: "Falls nicely. Use a sharp needle and pins in the seam allowance." },
  satin: { name: "Satin", w: 112, drape: 0.75, rough: 0.28, sheen: 1, weave: "fine", alpha: 1, needle: "70/10", st: 2.2, note: "Slippery. Use fine pins, tissue under seams. Line it for comfort." },
  silk: { name: "Silk", w: 112, drape: 0.9, rough: 0.4, sheen: 0.8, weave: "fine", alpha: 1, needle: "70/10", st: 2.2, note: "Hand wash. Test the iron on a scrap, low heat." },
  chiffon: { name: "Chiffon", w: 140, drape: 1, rough: 0.55, sheen: 0.3, weave: "fine", alpha: 0.85, needle: "60/8", st: 2, note: "Sheer: needs a lining. Use French seams. Place tissue paper under the fabric while cutting." },
  velvet: { name: "Velvet", w: 112, drape: 0.55, rough: 0.7, sheen: 1, weave: "pile", alpha: 1, needle: "90/14", st: 3, note: "Pile has a direction: cut all pieces the same way. Press from the back on a towel." },
  denim: { name: "Denim", w: 140, drape: 0.15, rough: 0.85, sheen: 0, weave: "twill", alpha: 1, needle: "100/16", st: 3, note: "Heavy: use a denim needle and longer stitch. Topstitch seams." },
};
export const LENGTHS = { mini: 0.21, knee: 0.31, midi: 0.4, maxi: 0.54, floor: 0.58 };
export const NECKS = { round: "Round", v: "V-neck", square: "Square", sweetheart: "Sweetheart", boat: "Boat (wide)", strapless: "Strapless" };
export const SLEEVES = { none: ["Sleeveless", 0], cap: ["Cap", 0.12], short: ["Short", 0.3], elbow: ["Elbow", 0.52], three: ["3/4", 0.72], full: ["Full", 1] };
export const WAISTS = { empire: 0.672, natural: 0.6, dropped: 0.545 };
export const EASE = { fitted: 4, regular: 8, loose: 14 };
export const PRINTS = { solid: "Plain", stripes: "Stripes", polka: "Polka dots", check: "Check", floral: "Floral", gingham: "Gingham" };

export const DEFAULT = {
  name: "My dress", size: "M", m: { ...SIZES.M }, waist: "natural", fit: "regular", len: LENGTHS.knee, flare: 0.5,
  neck: "round", neckDepth: 0.5, backDepth: 0.2, sleeve: "short", sleeveStyle: "plain",
  fabric: "crepe", color: "#b01e5a", print: "solid", printScale: 1, trimColor: "#f3ead8",
  belt: "none", beltColor: "#2b2b2b", bow: "none", buttons: "none", hemTrim: "none", neckTrim: false, necklace: "none", earrings: false,
  skin: "#d9a67e", hair: "#2a1a12", mannequin: false,
};
const Y = { chin: 0.865, neckB: 0.835, hps: 0.825, tip: 0.805, up: 0.775, arm: 0.73, bust: 0.715, under: 0.665, waist: 0.6, mid: 0.55, hip: 0.495, low: 0.46 };

// smooth monotone-ish spline through (x ascending, y)
function spline(xs, ys) {
  const n = xs.length, d = [];
  for (let i = 0; i < n; i++) {
    const a = i ? (ys[i] - ys[i - 1]) / (xs[i] - xs[i - 1]) : 0, b = i < n - 1 ? (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]) : 0;
    d[i] = i === 0 ? b : i === n - 1 ? a : a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  }
  return (x) => {
    x = cl(x, xs[0], xs[n - 1]); let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * d[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * d[i + 1];
  };
}
const ab = (C, q) => { const a = C / (TAU * Math.sqrt((1 + q * q) / 2)); return [a, a * q]; };
const ell = (a, b) => TAU * Math.sqrt((a * a + b * b) / 2);

export function bodyProfile(m) {
  const H = m.height / 100, s = H / 1.65, sh = m.shoulder / 200, nk = (m.neck / 100) / TAU;
  const bu = m.bust / 100, wa = m.waist / 100, hi = m.hip / 100;
  const k = [
    [Y.low, ...ab(hi * 0.99, 0.78)], [Y.hip, ...ab(hi, 0.76)], [Y.mid, ...ab((wa + hi) / 2 * 1.0, 0.72)], [Y.waist, ...ab(wa, 0.67)],
    [Y.under, ...ab(bu * 0.9, 0.7)], [Y.bust, ...ab(bu, 0.74)], [Y.arm, ...ab(bu * 0.985, 0.7)], [Y.up, ...ab(bu * 0.96, 0.62)],
    [Y.tip, sh * 0.97, 0.082 * s], [0.82, sh * 0.62, 0.072 * s], [Y.neckB, nk * 1.12, nk * 1.08], [Y.chin, nk, nk],
  ];
  const ys = k.map((r) => r[0] * H);
  return { H, s, sh, a: spline(ys, k.map((r) => r[1])), b: spline(ys, k.map((r) => r[2])) };
}

// ---- dress shape numbers shared by 3D and pattern ----
export function dressShape(p) {
  const m = p.m, B = bodyProfile(m), H = B.H, s = B.s;
  const D = EASE[p.fit] / 100 / TAU, th = 0.002;
  const bod = (y) => { const f = sm((y / H - Y.up) / (Y.arm - Y.up + 0.0001) * -1 + 0) ; const fade = sm((Y.up - y / H) / (Y.up - Y.arm)); return [B.a(y) + D * fade + th, B.b(y) + D * fade + th]; };
  const ySeam = H * WAISTS[p.waist], yHem = H * (Y.waist - p.len), yHip = H * Y.hip, L = ySeam - yHem;
  const [as, bs] = bod(ySeam), [ah, bh] = bod(yHip);
  const Cseam = ell(as, bs), Ch = ell(ah, bh), Cfull = Cseam + TAU * L;
  let Cmin = Cseam + (Ch - Cseam) * (L / Math.max(0.01, ySeam - yHip)); Cmin = Math.max(Cmin, Cseam);
  const fl = p.flare;
  const Chem = fl >= 0 ? Cmin + fl * (Cfull - Cmin) : Ch * (1 + 0.75 * fl);
  const dR = (Chem - Cseam) / TAU, Ls = Math.hypot(L, Math.max(0, dR));
  const rho0 = Chem - Cseam > 0.02 ? (Cseam * Ls) / (Chem - Cseam) : Infinity;
  // panels: smallest count whose flat panel fits the fabric width
  const fw = FABRICS[p.fabric].w / 100 - 0.05;
  let n = 4; for (const c of [4, 6, 8, 12, 16]) { n = c; const half = Math.min(Math.PI / 2, (Chem / c) / (rho0 + Ls) / 2 * 0 + 0); const wide = isFinite(rho0) ? 2 * (rho0 + Ls) * Math.sin(Math.min(Math.PI / 2, (Cseam / c) / rho0 / 2)) : Chem / c; if (wide <= fw) break; }
  const skirtAB = (y) => {
    if (y >= ySeam) return bod(y);
    const sN = cl((ySeam - y) / L, 0, 1);
    if (fl < 0 && y >= yHip) return bod(y);
    const C = fl >= 0 ? Cseam + (Chem - Cseam) * sN : lerp(Ch, Chem, cl((yHip - y) / (yHip - yHem), 0, 1));
    const q0 = fl >= 0 ? bs / as : bh / ah, qH = fl > 0.15 ? 0.97 : 0.88;
    const q = lerp(q0, qH, sm(sN * 1.4));
    let [a, b] = ab(C, q); const bb = bod(y); return [Math.max(a, bb[0]), Math.max(b, bb[1])];
  };
  return { B, H, s, D, ySeam, yHem, yHip, L, Cseam, Ch, Chem, Cfull, Ls, rho0, n, bod, skirtAB, fl, hemY: yHem };
}

// ---- necklines: cut edge functions (metres) ----
export function neckEdges(p, sh) {
  const { H, s } = sh, yR = H * Y.neckB, dp = p.neckDepth, bd = p.backDepth;
  let wN, f;
  switch (p.neck) {
    case "v": { wN = 0.085 * s; const D = (0.03 + 0.17 * dp) * s; f = (x) => yR - D * (1 - x / wN); break; }
    case "square": { wN = 0.09 * s; const D = (0.02 + 0.1 * dp) * s; f = () => yR - D; break; }
    case "sweetheart": { wN = 0.14 * s; const yb = H * (0.765 - dp * 0.05), A = 0.03 * s; f = (x) => yb + A * Math.sin(Math.PI * Math.min(1, x / wN)); break; }
    case "boat": { wN = 0.15 * s; const D = (0.025 + 0.03 * dp) * s; f = (x) => yR - D * (1 - Math.pow(x / wN, 4)); break; }
    case "strapless": { wN = 0.215 * s; const yb = H * (0.755 - dp * 0.03); f = (x) => yb + 0.012 * s * (x / wN); break; }
    default: { wN = 0.078 * s; const D = (0.02 + 0.09 * dp) * s; f = (x) => yR - D * Math.sqrt(Math.max(0, 1 - (x / wN) ** 2)); }
  }
  const bw = p.neck === "strapless" ? wN : Math.max(wN, 0.078 * s);
  const Db = (0.02 + bd * 0.27) * s;
  const fb = p.neck === "strapless" ? f : bd > 0.6 ? (x) => yR - Db * (1 - x / bw) : (x) => yR - Db * Math.sqrt(Math.max(0, 1 - (x / bw) ** 2));
  return { wN, bw, front: f, back: fb };
}
const hasStrapCut = (p) => p.sleeve === "none" && p.neck !== "strapless" && p.neck !== "boat";

// signed "keep" value (>=0 kept, <0 cut). Also used for edge trim width.
export function makeCut(p, sh) {
  const ne = neckEdges(p, sh), H = sh.H, s = sh.s, strap = hasStrapCut(p);
  const yA = H * Y.arm, yT = H * Y.tip, xA = sh.bod(yA)[0] * 0.97, xS = ne.wN + 0.035 * s;
  return (x, y, z) => {
    const ax = Math.abs(x); let c = 9;
    const w = z >= 0 ? ne.wN : ne.bw, f = z >= 0 ? ne.front : ne.back;
    c = Math.min(c, Math.max(ax - w, f(Math.min(ax, w)) - y));
    if (strap && xS < xA * 0.95) { const u = cl((y - yA) / (yT - yA), 0, 1.5), lim = xA - (xA - xS) * Math.pow(Math.sin(Math.min(u, 1) * Math.PI / 2), 1.2); c = Math.min(c, Math.max(lim - ax, yA - y)); }
    return c;
  };
}

// ---- 3D grids (plain arrays) ----
function grid(cols, rows, fn) {
  const pos = [], uv = [], cut = [], band = [], idx = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { const r = fn(i, j); pos.push(r.x, r.y, r.z); uv.push(r.u, r.v); cut.push(r.cut); band.push(r.bh, r.arc); }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  return { pos, uv, cut, band, idx };
}
const foldAmp = (p, sh) => FABRICS[p.fabric].drape * (0.2 + 0.8 * Math.max(0, p.flare));

export function buildBodice(p, sh) {
  const cols = 168, rows = 90, yTop = sh.H * 0.84, y0 = sh.ySeam, cut = makeCut(p, sh), Cs = sh.Cseam;
  return grid(cols, rows, (i, j) => {
    const th = (i / cols) * TAU, y = lerp(y0, yTop, j / rows), [a, b] = sh.bod(y);
    const x = a * Math.cos(th), z = b * Math.sin(th);
    return { x, y, z, u: (th / TAU) * Cs, v: y, cut: cut(x, y, z), bh: 9, arc: 0 };
  });
}

export function buildSkirt(p, sh, rows = 80) {
  const n = sh.n, cp = Math.ceil(168 / n), cols = n * (cp + 1), fa = foldAmp(p, sh), nf = 6 + Math.round(10 * Math.max(0, p.flare));
  const rect = !isFinite(sh.rho0), Psi = rect ? 0 : sh.Cseam / n / sh.rho0, lace = p.hemTrim === "lace", bandH = p.hemTrim === "band" || lace ? 0.08 * sh.s : 0;
  const cut = makeCut(p, sh);
  const g = { pos: [], uv: [], cut: [], band: [], idx: [] };
  for (let j = 0; j <= rows; j++) {
    const t = j / rows, y = lerp(sh.ySeam, sh.yHem, t), [a, b] = sh.skirtAB(y);
    for (let pn = 0; pn < n; pn++) for (let k = 0; k <= cp; k++) {
      const f = k / cp - 0.5, th = ((pn + k / cp) / n) * TAU;
      const fold = 1 + fa * 0.09 * sm(t * 1.6) * (Math.sin(nf * th + 0.6) + 0.35 * Math.sin(2.3 * nf * th + 1.7) * sm(t)) + 0.012 * Math.sin(th * 3 + t * 2);
      const x = a * fold * Math.cos(th), z = b * fold * Math.sin(th);
      let u, v;
      if (rect) { u = f * (sh.Cseam / n) + pn * 0.37; v = t * sh.Ls; }
      else { const rho = sh.rho0 + t * sh.Ls, ps = f * Psi; u = rho * Math.sin(ps) + pn * 0.37; v = rho * Math.cos(ps) - sh.rho0; }
      const scal = lace ? 0.012 * sh.s * (0.5 + 0.5 * Math.cos(th * 40)) : 0;
      let c = 9, bh = y - sh.yHem; if (lace) { c = bh - scal; }
      g.pos.push(x, y, z); g.uv.push(u, v); g.cut.push(Math.min(c, cut(x, y, z))); g.band.push(bandH > 0 ? bh : 9, th * 40);
    }
  }
  const W = cp + 1;
  for (let j = 0; j < rows; j++) for (let pn = 0; pn < n; pn++) for (let k = 0; k < cp; k++) {
    const a = j * cols + pn * W + k, b = a + 1, c = a + cols, d = c + 1; g.idx.push(a, c, b, b, c, d);
  }
  g.bandH = bandH; return g;
}

// ---- flat pattern pieces (centimetres, y down) ----
const poly = (pts) => pts;
function bez(p0, p1, p2, p3, n = 14) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return o; }
const plen = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
export const bbox = (pts) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of pts) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return { x0: a, y0: b, x1: c, y1: d, w: c - a, h: d - b }; };

// offset polygon with a per-edge distance (edge i = pts[i]->pts[i+1]); orientation detected
export function offsetPoly(pts, dist, fold) {
  const n = pts.length; let A = 0; for (let i = 0; i < n; i++) { const q = pts[(i + 1) % n]; A += pts[i][0] * q[1] - q[0] * pts[i][1]; }
  const sg = A > 0 ? 1 : -1, ls = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[i], p1 = pts[(i + 1) % n]; let dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const nx = sg * dy, ny = -sg * dx, d = dist[i]; ls.push([p0[0] + nx * d, p0[1] + ny * d, dx, dy]);
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = ls[(i + n - 1) % n], b = ls[i], cr = a[2] * b[3] - a[3] * b[2];
    let x, y;
    if (Math.abs(cr) < 1e-6) { x = b[0]; y = b[1]; }
    else { const t = ((b[0] - a[0]) * b[3] - (b[1] - a[1]) * b[2]) / cr; x = a[0] + a[2] * t; y = a[1] + a[3] * t; const dd = Math.hypot(x - pts[i][0], y - pts[i][1]); if (dd > 6) { x = b[0]; y = b[1]; } }
    out.push([fold ? Math.max(0, x) : x, y]);
  }
  return out;
}

export function makePieces(p) {
  const sh = dressShape(p), m = p.m, s = sh.s, H = m.height, ne = neckEdges(p, sh), SA = 1.5;
  const cm = (v) => v * 100, hps = Y.hps * H, strapless = p.neck === "strapless";
  const seamLen = hps - WAISTS[p.waist] * H, wN = cm(ne.wN), wB = cm(ne.bw), drop = 4.5 * (H / 165);
  const Wb = (m.bust + EASE[p.fit]) / 4, Wseam = sh.Cseam * 100 / 4, dA = (Y.hps - Y.arm) * H + 3;
  const closure = p.buttons === "front" ? "front" : p.buttons === "back" ? "back" : "zip";
  const edgeY = (fn, x) => cm(sh.H * Y.neckB - fn(x / 100)) ; // depth below neck-base (cm) for a given x (cm)
  const pieces = [];
  const bodice = (back) => {
    const f = back ? ne.back : ne.front, w = back ? wB : wN, pts = [], al = [];
    const nd = (x) => cm(sh.H * Y.neckB - f(x / 100)) + (hps - Y.neckB * H) * -1 * 0;
    const depthAt = (x) => Math.max(0, edgeY(f, x)) + 0.0 + (Y.neckB * H - hps);
    // neckline from CF (x=0) to HPS (x=w)
    const nk = []; const N = 18; for (let i = 0; i <= N; i++) { const x = (i / N) * w; nk.push([x, Math.max(0, Math.min(depthAt(x), depthAt(0)))]); }
    nk[nk.length - 1][1] = 0;
    let top = nk, tip, shoulder = [];
    if (strapless) { const yT = (hps - (back ? 0.75 : 0.755) * H) ; top = [[0, yT]]; const xt = Wb * 0.93; top.push([xt, yT - 0.8]); shoulder = []; tip = null; }
    const xT = hasStrapCut(p) ? Math.max(wN + 4, 0) : m.shoulder / 2, yT = drop;
    const U = [Wb, dA - (back ? 1.5 : 0)];
    let arm = [];
    if (!strapless) { const dy = U[1] - yT; arm = bez([xT, yT], [xT - 1, yT + 0.45 * dy], [xT + 0.35 * (U[0] - xT) - 0.6, U[1] - 0.05 * dy], U); }
    const body = [];
    for (const q of top) body.push(q);
    if (!strapless) { body.push([xT, yT]); for (const q of arm.slice(1)) body.push(q); } else { body.push(U); }
    if (strapless) { body.pop(); body.push([Wb, top[top.length - 1][1] + 0.5]); }
    const bt = body[body.length - 1];
    body.push([Wb * 0.5 + Wseam * 0.5 + 0.0, (bt[1] + seamLen) / 2], [Wseam, seamLen], [0, seamLen]);
    const n = body.length; const dist = new Array(n).fill(SA);
    const foldCF = back ? closure === "front" : closure !== "front";
    const lastEdge = n - 1; dist[lastEdge] = foldCF ? 0 : SA + (closure === (back ? "back" : "front") ? 1.5 : 0);
    dist[n - 2] = 3.0 > SA ? 1.5 : SA; // bottom: waist seam
    return { pts: body, dist, fold: foldCF, hasArm: !strapless, arm, name: back ? "Bodice back" : "Bodice front" };
  };
  const mk = (id, name, qty, b, grain, note, extra = {}) => pieces.push({ id, name, qty, grain, note, sew: b.pts, cut: offsetPoly(b.pts, b.dist, b.fold), fold: !!b.fold, ...extra });
  const fr = bodice(false), bk = bodice(true);
  const frontQty = closure === "front" ? "Cut 2 (1 mirrored)" : "Cut 1 on fold", backQty = closure === "front" ? "Cut 1 on fold" : closure === "back" ? "Cut 2 (1 mirrored) - button placket" : "Cut 2 (1 mirrored) - zip at centre back";
  mk("A", fr.name, frontQty, fr, "vertical", "Centre front is the left edge.", { fold: closure !== "front" });
  mk("B", bk.name, backQty, bk, "vertical", "Centre back is the left edge.", { fold: bk.fold });
  const armholeLen = (fr.hasArm ? plen(fr.arm) + plen(bk.arm) : 0);
  // sleeve
  const sl = SLEEVES[p.sleeve];
  if (sl[1] > 0) {
    const Ltot = sl[1] * m.arm, W = m.bicep + (p.sleeveStyle === "bell" ? 6 : 5), wr = m.bicep * 0.62 + 7, target = armholeLen + (p.sleeveStyle === "puff" ? 4 : 2.5);
    const capLen = (hh) => { const q = []; for (let i = 0; i <= 24; i++) { const x = -W / 2 + (W * i) / 24; q.push([x, hh * (1 - Math.pow(Math.max(0, Math.cos(Math.PI * x / W)), 0.9))]); } return q; };
    let lo = 2, hi = 22; for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; if (plen(capLen(mid)) < target) lo = mid; else hi = mid; }
    const cap = capLen(Math.min(lo, Ltot * 0.8)), capH = cap[0][1] === 0 ? Math.max(...cap.map((q) => q[1])) : 0, under = Math.max(3, Ltot - capH);
    const bot0 = lerp(W - 1, wr, sl[1] * sl[1]), bot = p.sleeveStyle === "puff" ? bot0 * 1.6 : p.sleeveStyle === "bell" ? bot0 * 1.9 : bot0, ex = p.sleeveStyle === "puff" ? 4 : 0;
    const pts = [...cap.map(([x, y]) => [x, y - capH]), [bot / 2, under + ex], [-bot / 2, under + ex]];
    const dist = pts.map((_, i) => (i === pts.length - 2 ? (p.sleeveStyle === "puff" ? 1.5 : 3) : SA));
    pieces.push({ id: "C", name: "Sleeve", qty: "Cut 2 (1 mirrored)", grain: "vertical", note: `Cap length ${plen(cap).toFixed(1)} cm vs armhole ${armholeLen.toFixed(1)} cm. ${p.sleeveStyle === "puff" ? "Gather the hem to " + (m.bicep * 0.95).toFixed(0) + " cm (elastic casing)." : ""}`, sew: pts, cut: offsetPoly(pts, dist, false), fold: false, sleeveInfo: { Ltot, W, bot, capH } });
  }
  // skirt panel
  const n = sh.n, L = sh.L * 100, hemA = 3, pts = [], dist = [];
  if (isFinite(sh.rho0) && sh.fl >= 0) {
    const r0 = sh.rho0 * 100, Ls = sh.Ls * 100, Psi = sh.Cseam * 100 / n / r0, N = 16;
    for (let i = 0; i <= N; i++) { const a = -Psi / 2 + (Psi * i) / N; pts.push([r0 * Math.sin(a), r0 * Math.cos(a) - r0]); }
    for (let i = N; i >= 0; i--) { const a = -Psi / 2 + (Psi * i) / N, r = r0 + Ls; pts.push([r * Math.sin(a), r * Math.cos(a) - r0]); }
    for (let i = 0; i < pts.length; i++) dist.push(i < N ? 1.5 : i === N ? SA : i < 2 * N + 1 ? hemA : SA);
    dist[N] = SA; dist[2 * N + 1] = SA;
    // edge i is pts[i]->pts[i+1]: top arc 0..N-1, right side N, hem N+1..2N, left side 2N+1
    for (let i = 0; i < pts.length; i++) dist[i] = i < N ? SA : i === N ? SA : i < 2 * N + 1 ? hemA : SA;
    pieces.push({ id: "D", name: "Skirt panel", qty: `Cut ${n}`, grain: "vertical", note: `Each panel: ${(Psi * 180 / Math.PI).toFixed(1)} deg sector, waist arc ${(sh.Cseam * 100 / n).toFixed(1)} cm, hem arc ${(sh.Chem * 100 / n).toFixed(1)} cm. Hem allowance ${hemA} cm.`, sew: pts, cut: offsetPoly(pts, dist, false), fold: false, sector: { r0, r1: r0 + Ls, deg: Psi * 180 / Math.PI } });
  } else {
    const wt = sh.Cseam * 100 / n, wm = sh.Chem * 100 / n, wh = sh.Ch * 100 / n, dh = (sh.ySeam - sh.yHip) * 100;
    const q = [[-wt / 2, 0], [-wh / 2, dh], [-wm / 2, L]], P = [...q, ...q.slice().reverse().map(([x, y]) => [-x, y])].reverse();
    const pp = [[-wt / 2, 0], [wt / 2, 0], [wh / 2, dh], [wm / 2, L], [-wm / 2, L], [-wh / 2, dh]];
    const d = [SA, SA, SA, hemA, SA, SA];
    pieces.push({ id: "D", name: "Skirt panel", qty: `Cut ${n}`, grain: "vertical", note: `Straight skirt panel. Hem allowance ${hemA} cm.`, sew: pp, cut: offsetPoly(pp, d, false), fold: false });
  }
  // rectangles (cut directly with ruler)
  const rects = [], fw = FABRICS[p.fabric].w - 4;
  const strips = (name, h, len, qtyNote) => { const k = Math.ceil(len / fw); rects.push({ name, w: Math.min(len, fw), h, qty: k, note: qtyNote + (k > 1 ? ` (join ${k} strips end to end, total ${len.toFixed(0)} cm)` : "") }); };
  const neckPer = (strapless ? 0 : (wN + wB) * 2 + 10) + (hasStrapCut(p) ? 2 * (plen(fr.arm || [[0, 0]]) + plen(bk.arm || [[0, 0]])) / 2 + 4 : 0);
  if (neckPer > 0) strips("Bias binding strips (cut on the 45 deg bias)", 3.5, neckPer + 6, "Finishes neckline" + (hasStrapCut(p) ? " and armholes" : ""));
  if (p.belt !== "none") { const bw = p.belt === "wide" ? 6 : 2.5; rects.push({ name: "Belt", w: m.waist + 15, h: bw * 2 + 3, qty: 1, note: "Fold in half lengthwise, interface one half" }); }
  if (p.hemTrim === "ruffle") strips("Hem ruffle strips", 11, sh.Chem * 100 * 2 + 6, "Gathered to the hem circumference (2x fullness)");
  if (p.hemTrim === "band") strips("Contrast hem band strips", 11, sh.Chem * 100 + 6, "8 cm finished band");
  if (p.bow !== "none") rects.push({ name: "Bow", w: 40, h: 14, qty: 1, note: "Fold, sew, turn, tie a bow; plus 8 x 6 cm knot strip" });
  return { pieces, rects, sh, armholeLen, closure, seamLen };
}

// ---- layout (shelf packing) for yardage ----
export function mirrorFold(pts) { const l = pts.slice(), r = pts.slice().reverse().map(([x, y]) => [-x, y]); return [...l, ...r]; }
export function layoutOnFabric(p, pk) {
  const fw = FABRICS[p.fabric].w, items = [];
  for (const pc of pk.pieces) {
    const cnt = pc.id === "D" ? pk.sh.n : pc.id === "C" ? 2 : pc.fold ? 1 : 2;
    const cut = pc.fold ? mirrorFold(pc.cut) : pc.cut;
    for (let i = 0; i < cnt; i++) items.push({ id: pc.id, name: pc.name, pts: cut, ...bbox(cut) });
  }
  for (const r of pk.rects) for (let i = 0; i < r.qty; i++) items.push({ id: "R", name: r.name, pts: [[0, 0], [r.w, 0], [r.w, r.h], [0, r.h]], ...bbox([[0, 0], [r.w, r.h]]) });
  items.sort((a, b) => b.h - a.h);
  let y = 0, x = 0, rowH = 0; const placed = [];
  for (const it of items) {
    if (x + it.w > fw && x > 0) { y += rowH + 1; x = 0; rowH = 0; }
    placed.push({ ...it, ox: x - it.x0, oy: y - it.y0, px: x, py: y }); x += it.w + 1; rowH = Math.max(rowH, it.h);
  }
  const used = y + rowH, need = (used * 1.1 + 10) / 100;
  return { fw, placed, used, yards: Math.ceil(need * 10) / 10 };
}

export function notions(p, pk) {
  const f = FABRICS[p.fabric], l = [];
  const zip = Math.ceil((pk.seamLen + 20) / 5) * 5;
  if (pk.closure === "zip") l.push(`Invisible zip, ${zip} cm (centre back)`);
  if (pk.closure !== "zip") { const cnt = Math.max(5, Math.round((pk.seamLen - 6) / 6)); l.push(`${cnt} buttons (1.2 cm) + thread`); l.push(`Invisible zip, 20 cm in a side seam for easy on/off`); }
  l.push(`Matching thread (all-purpose polyester), 1 reel`, `Needle size ${f.needle}`, "Hook and eye for the top of the zip / back neckline");
  if (p.belt !== "none") l.push(`Belt interfacing, ${(p.belt === "wide" ? 6 : 2.5) * 1} cm x ${p.m.waist + 15} cm; buckle or hook for the belt`);
  if (p.sleeve !== "none" && p.sleeveStyle === "puff") l.push("Elastic 1 cm wide, 2 x " + Math.round(p.m.bicep * 0.95) + " cm (puff sleeve hem)");
  if (p.hemTrim === "lace") l.push(`Lace trim 8 cm wide, ${(pk.sh.Chem * 100 + 5).toFixed(0)} cm`);
  if (f.alpha < 1 || p.fabric === "silk" || p.fabric === "satin") l.push(`Lining fabric (lightweight), about ${layoutOnFabric(p, pk).yards} m`);
  l.push("Fusible interfacing (light), 0.3 m for neckline and belt", "Tailor's chalk, pins, seam ripper, tape measure, iron");
  return l;
}

export function stitchSteps(p, pk) {
  const f = FABRICS[p.fabric], s = [], sl = SLEEVES[p.sleeve], strapless = p.neck === "strapless", bind = p.sleeve === "none" && p.neck !== "strapless";
  const zip = pk.closure === "zip", wl = { empire: "just under the bust (empire)", natural: "at the natural waist", dropped: "at the dropped (low) waist" }[p.waist];
  s.push(["Prepare the fabric", `Pre-wash and iron the ${f.name.toLowerCase()} (${f.note}) Fold it right side in, selvedges together. Straight grain (the vertical arrow) runs parallel to the selvedge.`]);
  s.push(["Print and join the pattern", "Print the pattern pages at 100% (Actual size, NOT 'fit to page'). Check the 5 cm test square. Tape tiled pages together matching the marks. Cut out each piece on the OUTER dashed cut line (it already includes the seam allowance)."]);
  s.push(["Cut", "Pin each piece on the fabric along the grainline arrow and cut as written on the piece (fold / pair / quantity). Use the cutting layout page. Cut notches 0.5 cm long. Transfer the sewing line with tailor's chalk if needed."]);
  s.push(["Interface and finish edges", "Fuse light interfacing to the neckline edges (and belt). Finish all raw edges with a zigzag or overlock stitch." + (p.fabric === "chiffon" ? " For chiffon use French seams throughout instead." : "")]);
  s.push(["Shoulder seams", strapless ? "(Strapless: skip.)" : `Right sides together, sew front to back at both shoulders, seam allowance 1.5 cm, stitch length ${f.st} mm. Press seams open.`]);
  s.push(["Neckline" + (bind ? " and armholes" : ""), `Sew the bias binding strip (3.5 cm) right sides together to the raw edge, 1 cm in. Trim, clip curves, fold over to the inside, press and edge-stitch.${p.neckTrim ? " Use the contrast colour for the binding so it shows as piping." : ""}`]);
  if (sl[1] > 0) s.push(["Sleeves", `Sew the underarm seam of each sleeve. ${p.sleeveStyle === "puff" ? "Make two rows of gathering stitches on the hem and cap, gather to fit; sew the elastic casing at the hem. " : ""}Gather the cap very slightly (about ${(pk.armholeLen ? 1 : 0)} to 2 cm ease), pin the sleeve into the armhole matching the shoulder seam with the sleeve top centre, and stitch. Press toward the sleeve.`]);
  s.push(["Side seams", `Sew front to back along both side seams from the sleeve hem (or armhole) to the waist seam. Press open.${zip ? "" : " Insert a 20 cm invisible zip in the left side seam."}`]);
  if (zip) s.push(["Centre back zip", "Sew the centre back seam from the hem up to the zip end, leaving the zip opening. Insert the invisible zip with an invisible-zip foot: sew right next to the teeth. Close the rest of the seam below the zip."]);
  else s.push(["Button placket", `Press the 1.5 cm placket allowance double and stitch. Mark button positions evenly from neckline to waist (${Math.max(5, Math.round((pk.seamLen - 6) / 6))} buttons) and make buttonholes on the overlapping side.`]);
  s.push(["Skirt panels", `Sew the ${pk.sh.n} skirt panels together along the long sides (1.5 cm seam), keeping the grain straight. Press seams open. Run two rows of long stitches on the waist edge only if you need to ease it to the bodice (check against the waist measure).`]);
  s.push(["Join skirt to bodice", `Pin the skirt to the bodice ${wl}: match centre front, centre back and side seams. Stitch 1.5 cm seam, press toward the bodice, finish the seam together.`]);
  if (p.belt !== "none") s.push(["Belt", "Fold the belt strip in half lengthwise, right sides together, sew the long edge and ends, turn, press. Sew a hook or buckle. Place it at the waist seam."]);
  if (p.bow !== "none") s.push(["Bow", "Make a tube from the bow strip, turn it, form a bow, wrap with the knot strip and hand-stitch it to the " + (p.bow === "neck" ? "neckline" : "waist belt or seam") + "."]);
  const hem = { none: `Double fold the hem 1.5 cm then 1.5 cm and stitch (or blind-hem by hand).`, lace: "Press the hem allowance up 1.5 cm, lay the lace trim on the right side and edge-stitch both edges of the lace.", ruffle: "Gather the ruffle strip to the hem circumference, lay it right side up on the skirt with its top edge about 8 cm above the hem edge, stitch along the gathering line and topstitch so it covers the hem.", band: "Sew the contrast band to the hem right sides together, fold, press and topstitch." }[p.hemTrim];
  s.push(["Hem", `Let the dress hang for 24 hours before hemming if your skirt is flared (bias areas stretch). ${hem}`]);
  s.push(["Finishing", `Sew buttons / hooks and eyes, press the whole dress from the wrong side with a pressing cloth, check all seams, clip threads.${f.alpha < 1 ? " Attach the lining at the neckline and zip." : ""}`]);
  return s;
}
