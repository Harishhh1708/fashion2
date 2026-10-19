// Builds the "stitching guide" PDF: cover, measurements, materials, cutting layout, steps, and TRUE-SCALE pattern pages (A4, tiled when big).
// No libraries: a small PDF writer using the built-in Helvetica fonts and optional JPEG images.
import { FABRICS, NECKS, SLEEVES, MEAS_LABELS, PRINTS, EASE, LENGTHS, makePieces, layoutOnFabric, notions, stitchSteps, bbox, mirrorFold } from "./dress-model.js";

const PT = 72 / 2.54, PW = 21, PH = 29.7;
const HW = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
const WD = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const clean = (s) => String(s).replace(/×/g, "x").replace(/[°]/g, " deg").replace(/[–—]/g, "-").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7e]/g, "?");
const tw = (s, size, bold) => { let w = 0; for (const ch of clean(s)) { const i = HW.indexOf(ch); w += (i < 0 ? 556 : WD[i]) * (bold ? 1.06 : 1); } return (w * size) / 1000 / PT; }; // width in cm
const esc = (s) => clean(s).replace(/[\\()]/g, (c) => "\\" + c);
const rgb = (h) => { const n = parseInt(h.replace("#", ""), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const f2 = (v) => (Math.round(v * 100) / 100).toString();

class Pg {
  constructor() { this.c = []; this.imgs = []; }
  op(s) { this.c.push(s); }
  X(x) { return f2(x * PT); } Y(y) { return f2((PH - y) * PT); }
  col(h, stroke) { const [r, g, b] = rgb(h); this.op(`${f2(r)} ${f2(g)} ${f2(b)} ${stroke ? "RG" : "rg"}`); }
  line(x1, y1, x2, y2, w = 0.5, c = "#000000", dash) { this.col(c, true); this.op(`${f2(w)} w ${dash ? `[${dash.map((d) => f2(d * PT)).join(" ")}] 0 d` : "[] 0 d"} ${this.X(x1)} ${this.Y(y1)} m ${this.X(x2)} ${this.Y(y2)} l S`); }
  path(pts, { close = true, stroke = "#000000", fill, w = 0.6, dash } = {}) {
    if (!pts.length) return; let s = `${f2(w)} w ${dash ? `[${dash.map((d) => f2(d * PT)).join(" ")}] 0 d` : "[] 0 d"} ${this.X(pts[0][0])} ${this.Y(pts[0][1])} m `;
    for (let i = 1; i < pts.length; i++) s += `${this.X(pts[i][0])} ${this.Y(pts[i][1])} l `;
    if (close) s += "h ";
    if (fill) this.col(fill, false); if (stroke) this.col(stroke, true);
    this.op(s + (fill && stroke ? "B" : fill ? "f" : "S"));
  }
  rect(x, y, w, h, o = {}) { this.path([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o); }
  text(x, y, str, size = 10, { bold, color = "#000000", align = "l" } = {}) {
    const w = tw(str, size, bold); if (align === "c") x -= w / 2; else if (align === "r") x -= w;
    this.col(color, false); this.op(`BT /${bold ? "F2" : "F1"} ${size} Tf ${this.X(x)} ${this.Y(y)} Td (${esc(str)}) Tj ET`);
  }
  wrap(x, y, str, size, maxW, { bold, color, lh = 1.25 } = {}) {
    const words = clean(str).split(" "); let line = "", yy = y;
    for (const w of words) { const t = line ? line + " " + w : w; if (tw(t, size, bold) > maxW && line) { this.text(x, yy, line, size, { bold, color }); yy += (size / PT) * lh; line = w; } else line = t; }
    if (line) { this.text(x, yy, line, size, { bold, color }); yy += (size / PT) * lh; } return yy;
  }
  image(name, x, y, w, h) { this.imgs.push(name); this.op(`q ${f2(w * PT)} 0 0 ${f2(h * PT)} ${this.X(x)} ${this.Y(y + h)} cm /${name} Do Q`); }
  clip(x, y, w, h) { this.op(`q ${this.X(x)} ${this.Y(y + h)} ${f2(w * PT)} ${f2(h * PT)} re W n`); }
  unclip() { this.op("Q"); }
}

function writePdf(pages, images, title) {
  const objs = []; const add = (s) => { objs.push(s); return objs.length; };
  add("<< /Type /Catalog /Pages 2 0 R >>"); add(""); add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"); add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const imgIds = {}; const bin = [];
  images.forEach((im, i) => { const id = add(null); imgIds["Im" + i] = id; bin.push([id, im]); });
  const kids = [];
  const xo = Object.keys(imgIds).map((k) => `/${k} ${imgIds[k]} 0 R`).join(" ");
  for (const pg of pages) {
    const cid = add(`<< /Length ${pg.c.join("\n").length} >>\nstream\n${pg.c.join("\n")}\nendstream`);
    const pid = add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f2(PW * PT)} ${f2(PH * PT)}] /Contents ${cid} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << ${xo} >> >> >>`); kids.push(pid);
  }
  objs[1] = `<< /Type /Pages /Kids [${kids.map((k) => k + " 0 R").join(" ")}] /Count ${kids.length} >>`;
  const info = add(`<< /Title (${esc(title)}) /Producer (FashionCAD Studio) >>`);
  // assemble as bytes (images are binary)
  const enc = new TextEncoder(), parts = []; let len = 0; const offs = [];
  const push = (u8) => { parts.push(u8); len += u8.length; };
  push(enc.encode("%PDF-1.4\n"));
  objs.forEach((o, i) => {
    offs[i] = len; const bi = bin.find((b) => b[0] === i + 1);
    if (bi) { const im = bi[1]; push(enc.encode(`${i + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`)); push(im.bytes); push(enc.encode("\nendstream\nendobj\n")); }
    else push(enc.encode(`${i + 1} 0 obj\n${o}\nendobj\n`));
  });
  const xr = len; let x = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`; offs.forEach((o) => (x += String(o).padStart(10, "0") + " 00000 n \n"));
  push(enc.encode(x + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xr}\n%%EOF`));
  const out = new Uint8Array(len); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out;
}
const b64bytes = (b64) => { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };

// ---- piece drawing ----
function drawPiece(pg, pc, ox, oy, { half = true } = {}) {
  const T = (pts) => pts.map(([x, y]) => [x + ox, y + oy]);
  pg.path(T(pc.cut), { stroke: "#000000", w: 1 });
  pg.path(T(pc.sew), { stroke: "#777777", w: 0.5, dash: [0.25, 0.2] });
  const b = bbox(pc.cut), cx = ox + (pc.fold || pc.id === "B" ? b.x0 + b.w * 0.5 : b.x0 + b.w / 2), cy = oy + b.y0 + b.h * 0.5;
  const gl = Math.min(14, b.h * 0.45), gx = ox + b.x0 + b.w * 0.5 + (pc.id === "D" ? 0 : 0);
  pg.line(gx, cy - gl / 2, gx, cy + gl / 2, 0.8); pg.path([[gx, cy - gl / 2], [gx - 0.35, cy - gl / 2 + 0.9], [gx + 0.35, cy - gl / 2 + 0.9]], { fill: "#000000", w: 0.3 }); pg.path([[gx, cy + gl / 2], [gx - 0.35, cy + gl / 2 - 0.9], [gx + 0.35, cy + gl / 2 - 0.9]], { fill: "#000000", w: 0.3 });
  const sb = bbox(pc.sew), tx = ox + b.x0 + b.w * 0.5;
  pg.text(tx + 0.7, cy - 1.8, `${pc.id}  ${pc.name}`, 11, { bold: true });
  pg.text(tx + 0.7, cy - 0.9, pc.qty, 8.5); pg.text(tx + 0.7, cy - 0.1, `Sewn size ${sb.w.toFixed(1)} x ${sb.h.toFixed(1)} cm`, 8);
  if (pc.fold || (pc.id === "A" && pc.fold)) { const x0 = ox + b.x0; pg.line(x0 - 0.0, oy + b.y0 + 1, x0, oy + b.y1 - 1, 1.6, "#d6246f"); pg.text(x0 + 0.5, oy + b.y0 + 3, "PLACE ON FOLD", 8, { bold: true, color: "#d6246f" }); }
  else if (pc.id === "A" || pc.id === "B") pg.text(ox + b.x0 + 0.5, oy + b.y0 + 3, pc.id === "A" ? "CENTRE FRONT" : "CENTRE BACK", 8, { color: "#d6246f", bold: true });
  pg.text(tx + 0.7, cy + 0.9, "Solid = cut line, dashed = sew line", 7, { color: "#555555" });
}
const scaleBox = (pg, x, y) => { pg.rect(x, y, 5, 5, { stroke: "#000000", w: 0.7 }); pg.text(x + 2.5, y + 2.7, "5 cm", 8, { align: "c", bold: true }); pg.text(x + 5.4, y + 2.2, "Print at 100% / Actual size.", 8); pg.text(x + 5.4, y + 3, "This square must measure 5 x 5 cm.", 8); };

export function buildStitchPdf(p, views = []) {
  const pk = makePieces(p), sh = pk.sh, f = FABRICS[p.fabric], lay = layoutOnFabric(p, pk), pages = [], m = p.m;
  const images = views.map((v) => ({ w: v.w, h: v.h, bytes: b64bytes(v.b64) }));
  const nw = () => { const g = new Pg(); pages.push(g); return g; };
  const head = (g, t) => { g.text(1.5, 2.1, t, 16, { bold: true }); g.line(1.5, 2.5, PW - 1.5, 2.5, 1.4, "#d6246f"); };
  // 1 cover
  let g = nw(); g.text(1.5, 2.2, "FashionCAD Studio", 10, { color: "#d6246f", bold: true }); g.text(1.5, 3.4, "Stitching guide", 26, { bold: true }); g.text(1.5, 4.4, p.name || "My dress", 14);
  const vw = (PW - 3 - 0.8) / Math.max(1, images.length);
  images.forEach((im, i) => { const h = Math.min(11, (vw * im.h) / im.w), w = (h * im.w) / im.h; g.image("Im" + i, 1.5 + i * (vw + 0.4) + (vw - w) / 2, 5.4, w, h); });
  let y = 17.2; g.line(1.5, y - 0.5, PW - 1.5, y - 0.5, 0.5, "#999999");
  const rows = [["Style", `${p.neck === "strapless" ? "Strapless" : NECKS[p.neck] + " neckline"}, ${SLEEVES[p.sleeve][0].toLowerCase()} sleeves${p.sleeve !== "none" && p.sleeveStyle !== "plain" ? " (" + p.sleeveStyle + ")" : ""}, ${p.waist} waist`], ["Skirt", `${Object.keys(LENGTHS).find((k) => Math.abs(LENGTHS[k] - p.len) < 0.02) || "custom"} length, flare ${Math.round(p.flare * 100)}% (${sh.n} panels)`], ["Fabric", `${f.name}, ${PRINTS[p.print]}, ${f.w} cm wide - ${f.note}`], ["Trims", [p.belt !== "none" ? p.belt + " belt" : "", p.bow !== "none" ? "bow" : "", p.buttons !== "none" ? "buttons (" + p.buttons + ")" : "", p.hemTrim !== "none" ? p.hemTrim + " hem" : "", p.neckTrim ? "contrast piping" : ""].filter(Boolean).join(", ") || "none"], ["Size", `${p.size === "custom" ? "Custom" : p.size}: bust ${m.bust}, waist ${m.waist}, hip ${m.hip}, height ${m.height} cm`], ["Fabric needed", `${lay.yards} m of ${f.w} cm wide fabric (estimate)`]];
  for (const [k, v] of rows) { g.text(1.5, y, k, 10, { bold: true }); y = g.wrap(5, y, v, 10, PW - 6.5, {}) + 0.15; }
  g.rect(1.5, y + 0.2, 1.1, 0.7, { fill: p.color, stroke: "#000000", w: 0.4 }); g.text(2.9, y + 0.75, `Main colour ${p.color}`, 9);
  g.rect(8.5, y + 0.2, 1.1, 0.7, { fill: p.trimColor, stroke: "#000000", w: 0.4 }); g.text(9.9, y + 0.75, `Trim colour ${p.trimColor}`, 9);
  g.wrap(1.5, y + 2.3, "Contents: 1 Cover  2 Measurements  3 Materials and cutting list  4 Cutting layout  5 Stitching steps  6 Pattern pages (print at 100%).", 9, PW - 3, { color: "#555555" });
  g.wrap(1.5, y + 3.3, "This guide is generated from your design. Sizes come from the measurements you entered; always compare with your own body and make a test garment (toile) from cheap fabric before cutting the real one.", 9, PW - 3, { color: "#555555" });
  // 2 measurements
  g = nw(); head(g, "Measurements and fit"); y = 3.6;
  g.text(1.5, y, "Body measurements used (cm)", 11, { bold: true }); y += 0.7;
  Object.entries(MEAS_LABELS).forEach(([k, l], i) => { g.text(1.5 + (i % 2) * 9, y + Math.floor(i / 2) * 0.7, `${l}:`, 10); g.text(6 + (i % 2) * 9, y + Math.floor(i / 2) * 0.7, `${m[k]} cm`, 10, { bold: true }); }); y += 4 * 0.7 + 0.9;
  g.text(1.5, y, "Finished dress measurements", 11, { bold: true }); y += 0.8;
  const ease = EASE[p.fit], H = m.height, cmv = (v) => (v * 100).toFixed(1);
  const fin = [["Measure", "Body", "Finished", "Note"], ["Bust", m.bust, (m.bust + ease).toFixed(1), `ease ${ease} cm (${p.fit} fit)`], ["Waist seam", m.waist, cmv(sh.Cseam), "at the waist seam"], ["Hip", m.hip, cmv(sh.Ch), "at hip level"], ["Hem sweep", "-", cmv(sh.Chem), "circumference at hem"], ["Shoulder to shoulder", m.shoulder, m.shoulder, ""], ["Bodice length (neck-shoulder point to waist seam)", "-", pk.seamLen.toFixed(1), ""], ["Skirt length (seam to hem)", "-", (sh.L * 100).toFixed(1), "before hem allowance"], ["Total length (neck-shoulder point to hem)", "-", (H * 0.825 - sh.yHem * 100).toFixed(1), ""], ["Sleeve length", "-", SLEEVES[p.sleeve][1] ? (SLEEVES[p.sleeve][1] * m.arm).toFixed(1) : "none", "from shoulder point"], ["Armhole (front + back)", "-", pk.armholeLen ? pk.armholeLen.toFixed(1) : "-", "sleeve cap is made to fit this"]];
  const cx = [1.5, 9.8, 12.2, 14.6];
  fin.forEach((r, i) => { r.forEach((c, j) => g.wrap(cx[j], y, String(c), i ? 9 : 9.5, j === 0 ? 8 : j === 3 ? 4.8 : 2, { bold: !i }) && 0); const lines = Math.max(1, Math.ceil(tw(r[0], 9) / 8)); y += 0.55 * lines + 0.2; g.line(1.5, y - 0.35, PW - 1.5, y - 0.35, 0.3, "#bbbbbb"); });
  y += 0.6; y = g.wrap(1.5, y, "How to measure: bust = fullest part around the chest; waist = narrowest part; hip = fullest part around the hips (about 20 cm below the waist); shoulder = bone to bone across the back; arm = shoulder bone to wrist. Keep the tape snug but not tight. Edit the numbers in the designer if your body is different from the chosen size.", 9.5, PW - 3);
  y = g.wrap(1.5, y + 0.4, "Seam allowance in this pattern: 1.5 cm on all seams, 3 cm on the hem. Zip seam: 1.5 cm.", 9.5, PW - 3, { bold: true });
  // 3 materials + cutting table
  g = nw(); head(g, "Materials and cutting list"); y = 3.6;
  g.text(1.5, y, `Fabric: ${f.name}, ${f.w} cm wide - about ${lay.yards} m`, 11, { bold: true }); y += 0.6; y = g.wrap(1.5, y, `Needle ${f.needle}, stitch length ${f.st} mm. ${f.note}`, 9.5, PW - 3) + 0.3;
  g.text(1.5, y, "Notions and tools", 11, { bold: true }); y += 0.7;
  for (const n of notions(p, pk)) y = g.wrap(2.2, y, "- " + n, 9.5, PW - 4) + 0.05;
  y += 0.5; g.text(1.5, y, "Pattern pieces to cut", 11, { bold: true }); y += 0.8;
  const tc = [1.5, 2.6, 8.7, 14.5];["ID", "Piece", "How many", "Sewn size (cm)"].forEach((h, i) => g.text(tc[i], y, h, 9, { bold: true })); y += 0.3; g.line(1.5, y, PW - 1.5, y, 0.5); y += 0.55;
  for (const pc of pk.pieces) { const b = bbox(pc.sew); g.text(tc[0], y, pc.id, 9, { bold: true }); g.text(tc[1], y, pc.name, 9); const yy = g.wrap(tc[2], y, pc.qty, 9, 5.6); g.text(tc[3], y, `${b.w.toFixed(1)} x ${b.h.toFixed(1)}${pc.fold ? " (half)" : ""}`, 9); y = Math.max(yy, y + 0.55) + 0.1; }
  if (pk.rects.length) { y += 0.4; g.text(1.5, y, "Rectangles - no pattern needed, mark with a ruler (add seam allowance already included)", 10, { bold: true }); y += 0.7; for (const r of pk.rects) y = g.wrap(1.5, y, `${r.name}: ${r.w.toFixed(0)} x ${r.h.toFixed(1)} cm, cut ${r.qty}. ${r.note}`, 9.5, PW - 3) + 0.15; }
  // 4 layout
  g = nw(); head(g, "Cutting layout"); y = 3.4; g.wrap(1.5, y, `Fabric ${f.w} cm wide, folded or single layer as shown. Pieces are shown from your pattern; place them in this order, all with the grainline parallel to the selvedge. Length used about ${lay.used.toFixed(0)} cm + 10% extra.`, 9.5, PW - 3);
  const sc = Math.min(17 / lay.fw, 21 / Math.max(lay.used, 30)), ox0 = 2, oy0 = 5.8;
  g.rect(ox0, oy0, lay.fw * sc, Math.max(lay.used, 30) * sc, { stroke: "#000000", fill: "#f4f1ea", w: 0.8 }); g.text(ox0 + lay.fw * sc / 2, oy0 - 0.35, `${f.w} cm`, 9, { align: "c", bold: true });
  const cols = ["#f8c9dc", "#cfe8ff", "#d8f0cf", "#ffe6a8", "#e3d1ff", "#d0f0ee"];
  lay.placed.forEach((it, i) => { g.path(it.pts.map(([x, y]) => [ox0 + (x + it.ox) * sc, oy0 + (y + it.oy) * sc]), { fill: cols[i % cols.length], stroke: "#333333", w: 0.5 }); if (it.w * sc > 0.9) g.text(ox0 + (it.px + it.w / 2) * sc, oy0 + (it.py + it.h / 2) * sc, it.id, Math.min(11, Math.max(6, it.w * sc * 6)), { align: "c", bold: true }); });
  g.text(1.5, oy0 + Math.max(lay.used, 30) * sc + 1, `Scale 1 : ${(1 / sc).toFixed(1)}. A = front, B = back, C = sleeve, D = skirt panel, R = rectangles.`, 8.5, { color: "#555555" });
  // 5 steps
  const steps = stitchSteps(p, pk); g = nw(); head(g, "Stitching steps"); y = 3.5;
  steps.forEach(([t, d], i) => {
    const need = 1.4 + Math.ceil(tw(d, 9.5) / (PW - 4.5)) * 0.5;
    if (y + need > PH - 1.8) { g = nw(); head(g, "Stitching steps (continued)"); y = 3.5; }
    g.rect(1.5, y - 0.55, 0.75, 0.75, { fill: "#d6246f", stroke: null }); g.text(1.875, y - 0.02, String(i + 1), 9.5, { bold: true, color: "#ffffff", align: "c" });
    g.text(2.6, y, t, 11, { bold: true }); y = g.wrap(2.6, y + 0.6, d, 9.5, PW - 4.3) + 0.45;
  });
  // 6 pattern pages
  const A4w = 19, A4h = 27.0, ov = 1, tiled = [], small = [];
  for (const pc of pk.pieces) { const b = bbox(pc.cut); (b.w <= A4w - 0.5 && b.h <= A4h - 1 ? small : tiled).push({ pc, b }); }
  const pools = []; let cur = null, sx = 0, sy = 0, rh = 0;
  const newPool = () => { cur = { g: nw(), items: [] }; pools.push(cur); sx = 0; sy = 0; rh = 0; };
  small.sort((a, b) => b.b.h - a.b.h); if (small.length) newPool();
  for (const it of small) {
    if (sx + it.b.w > A4w && sx > 0) { sy += rh + 1; sx = 0; rh = 0; }
    if (sy + it.b.h > A4h) { newPool(); }
    drawPiece(cur.g, it.pc, 1 + sx - it.b.x0, 1.5 + sy - it.b.y0); sx += it.b.w + 1; rh = Math.max(rh, it.b.h);
  }
  const tileInfo = [];
  for (const it of tiled) {
    const nx = Math.ceil((it.b.w - ov) / (A4w - ov)), ny = Math.ceil((it.b.h - ov) / (A4h - ov)); tileInfo.push({ pc: it.pc, b: it.b, nx, ny });
    for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++) {
      const tg = nw(), tx0 = it.b.x0 + c * (A4w - ov), ty0 = it.b.y0 + r * (A4h - ov);
      tg.clip(1, 1.5, A4w, A4h); drawPiece(tg, it.pc, 1 - tx0, 1.5 - ty0); tg.unclip();
      tg.rect(1, 1.5, A4w, A4h, { stroke: "#d6246f", w: 0.4, dash: [0.2, 0.2] });
      for (const [px, py] of [[1, 1.5], [1 + A4w, 1.5], [1, 1.5 + A4h], [1 + A4w, 1.5 + A4h]]) { tg.line(px - 0.4, py, px + 0.4, py, 0.6, "#d6246f"); tg.line(px, py - 0.4, px, py + 0.4, 0.6, "#d6246f"); }
      tg.text(1, 1.1, `Piece ${it.pc.id} ${it.pc.name}  -  TILE ${r * nx + c + 1} of ${nx * ny}  (row ${r + 1}, column ${c + 1})  -  overlap 1 cm, tape pages together`, 8.5, { bold: true });
    }
  }
  if (pools[0]) scaleBox(pools[0].g, 1, 1.0 + A4h - 4.5 - 0.4 + 1.5 - 1 + 0.0);
  else if (tileInfo.length) { /* scale box on assembly page */ }
  if (tileInfo.length) {
    let ag = nw(); head(ag, "Pattern assembly map"); let yy = 3.5; ag.wrap(1.5, yy, "These pieces are too large for one sheet. Print all pages at 100%, cut off nothing yet, and tape the pages together in this order (tile numbers read left to right, then down). Then cut around the OUTER solid line. Large skirt panels can also be marked straight onto the fabric using string and chalk: see the radius note on the piece list.", 9.5, PW - 3); yy += 2.6;
    scaleBox(ag, 1.5, yy); yy += 6;
    for (let ii = 0; ii < tileInfo.length; ii++) {
      const ti = tileInfo[ii];
      const sc = Math.min(0.12, 8 / Math.max(ti.b.w, 1), 7 / Math.max(ti.b.h, 1)), px = 2, py = yy;
      if (py + ti.b.h * sc + 2 > PH - 1.5) { ag = nw(); head(ag, "Pattern assembly map (continued)"); yy = 3.6; ii--; continue; }
      ag.text(1.5, py, `Piece ${ti.pc.id} ${ti.pc.name}: ${ti.nx} x ${ti.ny} sheets = ${ti.nx * ti.ny} tiles. Size ${ti.b.w.toFixed(0)} x ${ti.b.h.toFixed(0)} cm.`, 9, { bold: true });
      ag.path(ti.pc.cut.map(([x, y]) => [px + (x - ti.b.x0) * sc, py + 0.7 + (y - ti.b.y0) * sc]), { fill: "#f8c9dc", stroke: "#333333", w: 0.5 });
      for (let r = 0; r < ti.ny; r++) for (let c = 0; c < ti.nx; c++) { const x0 = px + c * (A4w - ov) * sc, y0 = py + 0.7 + r * (A4h - ov) * sc; ag.rect(x0, y0, A4w * sc, A4h * sc, { stroke: "#d6246f", w: 0.3, dash: [0.15, 0.15] }); ag.text(x0 + 0.2, y0 + 0.6, String(r * ti.nx + c + 1), 7, { color: "#d6246f", bold: true }); }
      if (ti.pc.sector) ag.text(px + 9.5, py + 2, `Marking on fabric: pivot at the apex, arcs of radius ${ti.pc.sector.r0.toFixed(1)} cm (waist) and ${ti.pc.sector.r1.toFixed(1)} cm (hem), angle ${ti.pc.sector.deg.toFixed(1)} deg. Add seam and hem allowance.`, 8, {});
      yy = py + ti.b.h * sc + 2;
    }
  }
  const all = pages.length; pages.forEach((pg, i) => { if (i) pg.text(PW / 2, PH - 0.7, `FashionCAD Studio - ${p.name || "My dress"} - page ${i + 1} of ${all}`, 7.5, { align: "c", color: "#777777" }); });
  return writePdf(pages, images, (p.name || "Dress") + " - stitching guide");
}
