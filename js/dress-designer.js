import * as M from "./dress-model.js";
import { createScene } from "./dress-scene.js";
import { buildStitchPdf } from "./dress-pdf.js";

const KEY = "fc-dress-design-v1", $ = (s) => document.querySelector(s);
const h = (t, a = {}, ...c) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (v == null) continue; if (k === "class") e.className = v; else if (k === "html") e.innerHTML = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); } for (const x of c.flat()) if (x != null) e.append(x.nodeType ? x : document.createTextNode(x)); return e; };

let p = { ...M.DEFAULT, m: { ...M.DEFAULT.m } };
try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s) { p = { ...p, ...s, m: { ...p.m, ...(s.m || {}) } }; if (!M.FABRICS[p.fabric]) p.fabric = "crepe"; if (!M.NECKS[p.neck]) p.neck = "round"; if (!M.SLEEVES[p.sleeve]) p.sleeve = "short"; } } catch (e) {}
let unit = "cm";

const PALETTE = ["#b01e5a", "#d6246f", "#e8505b", "#e07b39", "#f2c14e", "#7aa95c", "#2e6f6a", "#1f7a8c", "#2a4d8f", "#1f2a44", "#6b4c9a", "#8b5e3c", "#f3ead8", "#ffffff", "#9aa0a6", "#111111"];
const SKINS = ["#f1d1b5", "#e0b089", "#c68b5e", "#8d5a3b", "#5b3a29"];
const NECK_SVG = { round: "M4 14 L14 10 Q20 28 26 10 L36 14 L36 38 L4 38Z", v: "M4 14 L15 10 L20 28 L25 10 L36 14 L36 38 L4 38Z", square: "M4 14 L13 10 L13 24 L27 24 L27 10 L36 14 L36 38 L4 38Z", sweetheart: "M4 24 L8 12 L13 12 Q16 26 20 20 Q24 26 27 12 L32 12 L36 24 L36 38 L4 38Z", boat: "M4 16 Q20 8 36 16 L36 38 L4 38Z", strapless: "M4 22 Q20 27 36 22 L36 38 L4 38Z" };
const sleeveSvg = (f) => { const L = 4 + f * 26; return `M12 10 L28 10 L28 38 L12 38Z M12 10 L${12 - 2 - L * 0.25} ${10 + L} L${12 - 6 - L * 0.25} ${10 + L} L9 12Z M28 10 L${28 + 2 + L * 0.25} ${10 + L} L${28 + 6 + L * 0.25} ${10 + L} L31 12Z`; };
const LOOKS = {
  "Summer sundress": { fabric: "cotton", color: "#f2c14e", print: "floral", trimColor: "#e8505b", sleeve: "none", neck: "round", waist: "natural", flare: 0.55, len: M.LENGTHS.knee, fit: "regular", belt: "none", hemTrim: "none", bow: "none", buttons: "none", necklace: "none", neckTrim: true },
  "Office sheath": { fabric: "crepe", color: "#1f2a44", print: "solid", sleeve: "short", sleeveStyle: "plain", neck: "boat", waist: "natural", flare: -0.15, len: M.LENGTHS.knee, fit: "fitted", belt: "none", hemTrim: "none", bow: "none", buttons: "none", necklace: "pearl", neckTrim: false },
  "Party gown": { fabric: "satin", color: "#7b1e3a", print: "solid", sleeve: "none", neck: "sweetheart", waist: "natural", flare: 0.6, len: M.LENGTHS.floor, fit: "fitted", belt: "thin", beltColor: "#d4a73a", hemTrim: "none", bow: "none", buttons: "none", necklace: "gold", earrings: true },
  "Boho maxi": { fabric: "linen", color: "#c97b4a", print: "stripes", trimColor: "#f3ead8", sleeve: "three", sleeveStyle: "puff", neck: "square", waist: "empire", flare: 0.4, len: M.LENGTHS.maxi, fit: "regular", belt: "none", hemTrim: "none", bow: "none", buttons: "none", necklace: "none" },
  "Princess frock": { fabric: "cotton", color: "#f2a7c3", print: "solid", sleeve: "short", sleeveStyle: "puff", neck: "round", waist: "natural", flare: 1, len: M.LENGTHS.midi, fit: "regular", belt: "none", hemTrim: "lace", trimColor: "#ffffff", bow: "waist", buttons: "none", necklace: "none", neckTrim: true },
  "Denim shirt dress": { fabric: "denim", color: "#3b5f8a", print: "solid", sleeve: "short", sleeveStyle: "plain", neck: "v", waist: "natural", flare: 0.25, len: M.LENGTHS.knee, fit: "regular", belt: "wide", beltColor: "#6b4a2b", hemTrim: "none", bow: "none", buttons: "front", trimColor: "#e8dcc0", necklace: "none" },
  "Evening chiffon": { fabric: "chiffon", color: "#2e6f6a", print: "solid", sleeve: "three", sleeveStyle: "bell", neck: "v", waist: "empire", flare: 0.8, len: M.LENGTHS.maxi, fit: "regular", belt: "thin", beltColor: "#d4a73a", hemTrim: "none", bow: "none", buttons: "none", necklace: "gold" },
  "Retro polka": { fabric: "cotton", color: "#c1272d", print: "polka", trimColor: "#ffffff", sleeve: "cap", sleeveStyle: "plain", neck: "sweetheart", waist: "natural", flare: 0.9, len: M.LENGTHS.knee, fit: "fitted", belt: "thin", beltColor: "#ffffff", hemTrim: "none", bow: "none", buttons: "none", necklace: "pearl", neckTrim: false },
};

const sc = createScene($("#cv"), $("#stage")); window.__ddReady = true;
let timer = 0, sh = null;
const say = (t, k = "ok") => { const m = $("#msg"); m.textContent = t; m.className = "msg " + k; m.hidden = !t; if (t) setTimeout(() => (m.hidden = true), 4500); };
const refreshers = [];
function stats() {
  const pk = M.makePieces(p), lay = M.layoutOnFabric(p, pk), f = M.FABRICS[p.fabric], w = [];
  if (f.alpha < 1) w.push("Sheer fabric: add a lining.");
  if (p.m.hip < p.m.waist) w.push("Hip is smaller than waist: check measurements.");
  if (p.neck === "strapless" && p.m.bust > 100) w.push("Strapless needs boning/support for this bust size.");
  $("#stats").innerHTML = `<b>${p.name}</b><br>Fabric needed: <b>${lay.yards} m</b> (${f.w} cm wide)<br>Hem sweep: <b>${(sh.Chem * 100).toFixed(0)} cm</b> &middot; ${sh.n} skirt panels<br>Length: <b>${(M.DEFAULT.m.height * 0 + p.m.height * 0.825 - sh.yHem * 100).toFixed(0)} cm</b> (neck to hem)` + w.map((x) => `<div class="warn">${x}</div>`).join("");
}
function rebuild() { sh = sc.build(p); stats(); refreshers.forEach((f) => f()); $("#status").textContent = ""; }
function schedule() { cancelAnimationFrame(timer); timer = requestAnimationFrame(rebuild); }
function set(o) { Object.assign(p, o); if (p.neck === "strapless") p.sleeve = "none"; schedule(); }

// ---- control builders ----
function section(pane, title) { pane.append(h("h3", {}, title)); }
function chips(pane, key, opts, { onPick, disabled, isOn } = {}) {
  const box = h("div", { class: "chips" }); const btns = Object.entries(opts).map(([v, label]) => { const b = h("button", { class: "chip", type: "button", onclick: () => (onPick ? onPick(v) : set({ [key]: v })) }, label); box.append(b); return [v, b]; });
  refreshers.push(() => btns.forEach(([v, b]) => { b.setAttribute("aria-pressed", String(isOn ? isOn(v) : onPick ? false : p[key] === v)); if (disabled) b.disabled = disabled(); })); pane.append(box); return btns;
}
function tiles(pane, key, opts, draw, { disabled } = {}) {
  const box = h("div", { class: "tiles" }), btns = Object.entries(opts).map(([v, label]) => { const b = h("button", { class: "tile", type: "button", onclick: () => set({ [key]: v }) }, draw(v), label); box.append(b); return [v, b]; });
  refreshers.push(() => btns.forEach(([v, b]) => { b.setAttribute("aria-pressed", String(p[key] === v)); if (disabled) b.disabled = disabled(v); })); pane.append(box);
}
function range(pane, key, label, min, max, step, fmt, onInput) {
  const out = h("span", { class: "out" }), inp = h("input", { type: "range", min, max, step, "aria-label": label });
  inp.addEventListener("input", () => { (onInput || ((v) => set({ [key]: v })))(+inp.value); out.textContent = fmt(+inp.value); });
  pane.append(h("label", { class: "l" }, label, out), inp); refreshers.push(() => { inp.value = p[key]; out.textContent = fmt(p[key]); });
}
function colorRow(pane, key, label) { const i = h("input", { type: "color" }); i.addEventListener("input", () => set({ [key]: i.value })); pane.append(h("div", { class: "crow" }, label, i)); refreshers.push(() => (i.value = p[key])); }
function check(pane, key, label, disabled) { const i = h("input", { type: "checkbox" }); i.addEventListener("change", () => set({ [key]: i.checked })); pane.append(h("label", { class: "chk" }, i, label)); refreshers.push(() => { i.checked = !!p[key]; if (disabled) i.disabled = disabled(); }); }
function palette(pane, key, cols) {
  const box = h("div", { class: "pal" }), bs = cols.map((c) => { const b = h("button", { type: "button", style: `background:${c}`, "aria-label": c, onclick: () => set({ [key]: c }) }); box.append(b); return [c, b]; });
  const i = h("input", { type: "color", "aria-label": "Custom colour" }); i.addEventListener("input", () => set({ [key]: i.value })); box.append(i); pane.append(box);
  refreshers.push(() => { bs.forEach(([c, b]) => b.setAttribute("aria-pressed", String(c.toLowerCase() === String(p[key]).toLowerCase()))); i.value = p[key]; });
}

const tabs = [["Style", (pn) => {
  section(pn, "Ready-made looks (start here, then change anything)");
  const looks = h("div", { class: "chips" }); Object.entries(LOOKS).forEach(([n, o]) => looks.append(h("button", { class: "chip", type: "button", onclick: () => { Object.assign(p, M.DEFAULT, { m: p.m, size: p.size, name: p.name, skin: p.skin, hair: p.hair, mannequin: p.mannequin }, o); if (p.neck === "strapless") p.sleeve = "none"; rebuild(); sc.view(0); } }, n))); pn.append(looks);
  section(pn, "Waistline"); chips(pn, "waist", { empire: "Empire (under bust)", natural: "Natural waist", dropped: "Dropped (low)" });
  section(pn, "Fit"); chips(pn, "fit", { fitted: "Fitted", regular: "Regular", loose: "Loose" });
  section(pn, "Dress length"); chips(pn, "len", { mini: "Mini", knee: "Knee", midi: "Midi", maxi: "Ankle", floor: "Floor" }, { onPick: (v) => set({ len: M.LENGTHS[v] }), isOn: (v) => Math.abs(p.len - M.LENGTHS[v]) < 0.012 });
  range(pn, "len", "Fine-tune length (from waist)", 0.15, 0.58, 0.005, (v) => Math.round(v * p.m.height) + " cm");
  range(pn, "flare", "Skirt flare", -0.25, 1, 0.01, (v) => (v < -0.05 ? "Slim / pencil" : v < 0.15 ? "Straight" : v < 0.5 ? "A-line" : v < 0.85 ? "Flared" : "Full circle"));
  pn.append(h("p", { class: "hint" }, "Flare 100% is a full circle skirt. The pattern and fabric amount update automatically."));
}], ["Neck & sleeves", (pn) => {
  section(pn, "Neckline"); tiles(pn, "neck", M.NECKS, (v) => h("span", { html: `<svg viewBox="0 0 40 40"><path d="${NECK_SVG[v]}"/></svg>` }));
  range(pn, "neckDepth", "Neckline depth", 0, 1, 0.01, (v) => Math.round(v * 100) + "%"); range(pn, "backDepth", "Back neckline (0 = closed, 100% = open back)", 0, 1, 0.01, (v) => Math.round(v * 100) + "%");
  check(pn, "neckTrim", "Contrast piping on neckline / armholes");
  section(pn, "Sleeves"); const o = {}; Object.entries(M.SLEEVES).forEach(([k, v]) => (o[k] = v[0]));
  tiles(pn, "sleeve", o, (v) => h("span", { html: `<svg viewBox="0 0 40 40"><path d="${sleeveSvg(M.SLEEVES[v][1])}"/></svg>` }), { disabled: (v) => p.neck === "strapless" && v !== "none" });
  section(pn, "Sleeve style"); chips(pn, "sleeveStyle", { plain: "Plain", puff: "Puff", bell: "Bell" }, { disabled: () => p.sleeve === "none" });
}], ["Fabric", (pn) => {
  section(pn, "Fabric"); const o = {}; Object.entries(M.FABRICS).forEach(([k, v]) => (o[k] = v.name));
  tiles(pn, "fabric", o, (v) => { const f = M.FABRICS[v]; return h("span", { class: "sw", style: `display:block;background:linear-gradient(135deg,${p.color},color-mix(in srgb,${p.color} 60%,#fff));opacity:${0.55 + f.drape * 0.45}` }); });
  const info = h("p", { class: "hint" }); pn.append(info); refreshers.push(() => { const f = M.FABRICS[p.fabric]; info.textContent = `${f.name}: ${f.note} Width ${f.w} cm. Needle ${f.needle}.`; });
  section(pn, "Colour"); palette(pn, "color", PALETTE);
  section(pn, "Print"); chips(pn, "print", M.PRINTS); range(pn, "printScale", "Print size", 0.5, 2.2, 0.05, (v) => Math.round(v * 100) + "%");
  colorRow(pn, "trimColor", "Print / trim / piping colour");
}], ["Trims & accessories", (pn) => {
  section(pn, "Belt"); chips(pn, "belt", { none: "None", thin: "Thin", wide: "Wide" }); colorRow(pn, "beltColor", "Belt colour");
  section(pn, "Bow"); chips(pn, "bow", { none: "None", waist: "At waist", neck: "At neckline" });
  section(pn, "Buttons"); chips(pn, "buttons", { none: "None", front: "Front", back: "Back" });
  section(pn, "Hem trim"); chips(pn, "hemTrim", { none: "Plain", lace: "Lace", ruffle: "Ruffle", band: "Contrast band" });
  section(pn, "Jewellery (not stitched)"); chips(pn, "necklace", { none: "No necklace", pearl: "Pearls", gold: "Gold chain" }); check(pn, "earrings", "Earrings");
}], ["Size & model", (pn) => {
  section(pn, "Size"); const o = {}; Object.keys(M.SIZES).forEach((k) => (o[k] = k)); const bt = chips(pn, "size", o, { onPick: (v) => { p.size = v; p.m = { ...M.SIZES[v] }; rebuild(); } });
  refreshers.push(() => bt.forEach(([v, b]) => b.setAttribute("aria-pressed", String(p.size === v))));
  pn.append(h("p", { class: "hint" }, "Sample size chart. Always type YOUR measurements below for a dress that fits."));
  const u = h("select", { "aria-label": "Units" }, h("option", { value: "cm" }, "Centimetres"), h("option", { value: "in" }, "Inches")); u.onchange = () => { unit = u.value; refreshers.forEach((f) => f()); }; pn.append(u);
  const g = h("div", { class: "mgrid" }); const inputs = [];
  Object.entries(M.MEAS_LABELS).forEach(([k, l]) => { const i = h("input", { type: "number", step: "0.5", min: "10", "aria-label": l }); i.addEventListener("change", () => { const v = (+i.value) * (unit === "in" ? 2.54 : 1); if (v > 10) { p.m[k] = Math.round(v * 10) / 10; p.size = "custom"; rebuild(); } }); g.append(h("label", {}, l), i); inputs.push([k, i]); });
  pn.append(g); refreshers.push(() => inputs.forEach(([k, i]) => (i.value = Math.round(p.m[k] / (unit === "in" ? 2.54 : 1) * 10) / 10)));
  section(pn, "Mannequin"); palette(pn, "skin", SKINS); check(pn, "mannequin", "Plain mannequin (no hair / face / jewellery)"); colorRow(pn, "hair", "Hair colour");
}]];
const tabBar = $("#tabs"), panes = $("#panes");
tabs.forEach(([name, fn], i) => { const pn = h("div", { class: "pane", role: "tabpanel", hidden: i ? "" : null }); fn(pn); panes.append(pn); const b = h("button", { role: "tab", type: "button", "aria-selected": String(!i), onclick: () => { [...tabBar.children].forEach((x, j) => { x.setAttribute("aria-selected", String(i === j)); panes.children[j].hidden = i !== j; }); } }, name); tabBar.append(b); });

// view buttons
const vb = $("#views");
[["Front", 0], ["3/4", 0.7], ["Side", 1.57], ["Back", 3.14]].forEach(([n, az]) => vb.append(h("button", { class: "chip", type: "button", onclick: () => { sc.controls.autoRotate = false; sc.view(az); } }, n)));
vb.append(h("button", { class: "chip", type: "button", onclick: (e) => { sc.controls.autoRotate = !sc.controls.autoRotate; e.target.setAttribute("aria-pressed", String(sc.controls.autoRotate)); } }, "Spin"));

// header actions
const nm = $("#dname"); nm.value = p.name; nm.addEventListener("input", () => { p.name = nm.value || "My dress"; stats(); });
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(p)); say("Design saved in this browser."); } catch (e) { say("Could not save (browser storage full or blocked).", "error"); } };
$("#save").onclick = save; setInterval(() => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} }, 4000);
$("#reset").onclick = () => { if (confirm("Start a new design? Unsaved changes are lost.")) { p = { ...M.DEFAULT, m: { ...M.DEFAULT.m } }; nm.value = p.name; rebuild(); sc.view(0); } };
$("#png").onclick = () => { const a = h("a", { href: sc.snapshot(), download: (p.name || "dress").replace(/[^\w-]+/g, "_") + ".png" }); a.click(); };
async function makePdf(btns) {
  btns.forEach((b) => (b.disabled = true)); $("#status").textContent = "Making PDF…";
  try { await new Promise((r) => setTimeout(r, 30)); const views = sc.captureViews(), bytes = buildStitchPdf(p, views), url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const a = h("a", { href: url, download: (p.name || "dress").replace(/[^\w-]+/g, "_") + "-stitching-guide.pdf" }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); say("PDF downloaded. Print the pattern pages at 100% (Actual size)."); }
  catch (e) { console.error(e); say("PDF failed: " + e.message, "error"); }
  btns.forEach((b) => (b.disabled = false)); $("#status").textContent = "";
}
const pb = [$("#pdf"), $("#pdf2")]; pb.forEach((b) => (b.onclick = () => makePdf(pb)));

rebuild(); sc.view(0);
