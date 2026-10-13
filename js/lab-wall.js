/* Bauphysik — shared wall model (layers + climate), the layer editor, and the "Wandaufbau" lab (U-value & temperature profile) */
(function (TP) {
  const { h, svg } = TP;
  const P = TP.phys;
  TP.labs = TP.labs || {};

  /* ---------- presets (numbers from the lecture / past exam) ---------- */
  const L = (id, mm) => ({ id, d: mm / 1000 });
  TP.WALL_PRESETS = [
    { id: "fall1", name: "Außendämmung (Vorlesung, Fall 1)", note: "Innenputz / Mauerwerk / Dämmung / Außenputz — the textbook case: no condensate.",
      layers: [L("iputz", 15), L("ziegel", 250), L("mw", 100), L("aputz", 15)], cond: { ti: 20, phii: 0.5, te: -10, phie: 0.8 } },
    { id: "fall2b", name: "Innendämmung (gleiche Schichten)", note: "Same layers, same U-value as Fall 1 — but insulation inside. Compare the Glaser diagram!",
      layers: [L("iputz", 15), L("mw", 100), L("ziegel", 250), L("aputz", 15)], cond: { ti: 20, phii: 0.5, te: -10, phie: 0.8 },
      goal: { text: "Make the Innendämmung condensate-free without changing the layer order (hint: one very thin layer).", keepOrder: true } },
    { id: "fall2b-db", name: "Innendämmung + Dampfbremse (s_d 5 m)", note: "A vapour retarder on the warm side of the insulation helps a lot — but is it enough? Compare with the next example.",
      layers: [L("iputz", 15), L("dbremse", 0.5), L("mw", 100), L("ziegel", 250), L("aputz", 15)], cond: { ti: 20, phii: 0.5, te: -10, phie: 0.8 } },
    { id: "fall2b-ds", name: "Innendämmung + Dampfsperre (s_d 100 m)", note: "A real vapour barrier on the warm side of the insulation: condensate-free. One barrier is enough — a dam upstream.",
      layers: [L("iputz", 15), L("dsperre", 0.5), L("mw", 100), L("ziegel", 250), L("aputz", 15)], cond: { ti: 20, phii: 0.5, te: -10, phie: 0.8 } },
    { id: "fall2a", name: "Sandwich Spanplatte / EPS / Spanplatte V100 (VO15)", note: "The complete worked example of the Repetitorium (U = 0,337; condensate G_K = 0,27 kg/m²).",
      layers: [L("span", 19), L("eps", 100), L("spanv100", 19)], cond: { ti: 20, phii: 0.55, te: -10, phie: 0.8, dry: { ti: 15, phii: 0.7, te: 15, phie: 0.7 } },
      goal: { text: "Remove the condensate, keeping the layer order (like the exam: only a vapour barrier or thickness changes).", keepOrder: true } },
    { id: "exam24", name: "Prüfung 06.06.2024: Sandwichwand", note: "Real past exam wall: two insulation layers between two heavy concrete leaves. Exam rule: the layer order must stay.",
      layers: [L("gkb", 25), L("mwi", 100), L("osb", 25), L("beton", 120), L("wd", 220), L("beton", 200), L("putztr", 20), L("putzsys", 20)],
      cond: { ti: 20.7, phii: 0.77, te: -12.8, phie: 0.82, dry: { ti: 15, phii: 0.7, te: 15, phie: 0.7 } },
      goal: { text: "Optimise like in the exam: keep the layer order and make the condensate dry out completely every summer (G_A ≥ G_K). A fully condensate-free wall is not reachable with a realistic barrier — and note the OSB is timber, which strictly may never see condensate.", keepOrder: true, mode: "dry" } },
    { id: "holz", name: "Holzständerwand, diffusionsoffen", note: "Timber must never show condensate — even if it dries out in summer.",
      layers: [L("gkb", 12.5), L("dbremse", 0.5), L("zellulose", 200), L("holzfaser", 60), L("aputz", 10)], cond: { ti: 20, phii: 0.5, te: -10, phie: 0.8 } },
    { id: "ziegel38", name: "Ziegelwand 38 cm, ungedämmt", note: "Old building: a high U-value and a cold inner surface — see the Taupunkt & Schimmel lab.",
      layers: [L("iputz", 15), L("ziegel", 380), L("aputz", 20)], cond: { ti: 20, phii: 0.5, te: -10, phie: 0.8 } },
  ];
  TP.wallPreset = id => TP.WALL_PRESETS.find(p => p.id === id);
  const DEFCOND = { ti: 20, phii: 0.5, te: -10, phie: 0.8, rsi: 0.13, rse: 0.04, dry: { ti: 15, phii: 0.7, te: 15, phie: 0.7 }, hTau: 1440, hDry: 2160 };
  function fromPreset(id) {
    const p = TP.wallPreset(id) || TP.WALL_PRESETS[0];
    return { preset: p.id, layers: p.layers.map(l => ({ id: l.id, d: l.d })), cond: Object.assign({}, DEFCOND, JSON.parse(JSON.stringify(p.cond))), base: p.layers.map(l => l.id) };
  }
  (function init() {
    let w = TP.S.ui.wall;
    if (!w || !w.layers || !w.layers.every(l => P.MAT[l.id])) w = fromPreset("fall1");
    w.cond = Object.assign({}, DEFCOND, w.cond); w.cond.dry = Object.assign({}, DEFCOND.dry, w.cond.dry);
    TP.wall = w; TP.S.ui.wall = w;
  })();
  TP.wallLoad = id => { TP.wall = fromPreset(id); TP.S.ui.wall = TP.wall; TP.saveSoon(); };
  TP.wallChanged = TP.debounce(() => TP.save(), 400);
  TP.wallStack = () => P.stack(TP.wall.layers, TP.wall.cond);

  /* goal: satisfied when there is no condensate (and, if required, the base layer order is intact) */
  TP.wallGoalOk = function () {
    const p = TP.wallPreset(TP.wall.preset); if (!p || !p.goal) return null;
    const g = P.glaser(TP.wall.layers, TP.wall.cond);
    let ordered = true;
    if (p.goal.keepOrder) {
      const base = TP.wall.base || p.layers.map(l => l.id), seq = TP.wall.layers.map(l => l.id).filter(id => base.includes(id) && !(P.MAT[id].kind === "barrier" && !base.includes(id)));
      ordered = seq.length === base.length && seq.every((id, i) => id === base[i]);
    }
    const noCond = !g.condensate, okCond = p.goal.mode === "dry" ? (noCond || g.dried) : noCond;
    return { ok: okCond && ordered, noCond, okCond, dry: p.goal.mode === "dry", ordered };
  };

  /* ---------- the layer editor ---------- */
  const R1 = v => TP.fmt(v, 3);
  TP.wallEditor = function (onChange, opts) {
    opts = opts || {};
    const box = h("div.stack");
    const refreshMeta = () => TP.$$(".layer", box).forEach((el, i) => { const l = TP.wall.layers[i]; if (!l) return; const m = P.MAT[l.id]; el.querySelector(".meta").textContent = "λ " + R1(m.lam) + " · µ " + (m.mu >= 1e6 ? "∞" : TP.fmt(m.mu, 0)) + " · R " + R1(l.d / m.lam) + " · s_d " + TP.fmt(m.mu >= 1e6 ? NaN : m.mu * l.d, 2); });
    const changed = () => { TP.wallChanged(); onChange(); };
    let dragIdx = -1;
    function draw() {
      TP.clear(box);
      const W = TP.wall;
      /* preset */
      const ps = h("select", { onchange: e => { TP.wallLoad(e.target.value); draw(); onChange(); } }, TP.WALL_PRESETS.map(p => h("option", { value: p.id, selected: p.id === W.preset }, p.name)));
      if (!TP.wallPreset(W.preset)) ps.insertBefore(h("option", { value: "", selected: true }, "Eigener Aufbau"), ps.firstChild);
      box.appendChild(h("label.field", h("span", "Beispiel laden"), ps));
      const pr = TP.wallPreset(W.preset);
      if (pr) box.appendChild(h("div.muted", { style: { fontSize: "13px" } }, pr.note));
      /* climate */
      const num = (key, label, unit, step, scale, parent) => h("label.field", h("span", label), h("div.inwrap", h("input.num", {
        type: "number", step, value: +(((parent || W.cond)[key]) * (scale || 1)).toFixed(2),
        oninput: e => { const v = parseFloat(e.target.value); if (isFinite(v)) { (parent || W.cond)[key] = v / (scale || 1); W.preset = W.preset; changed(); refreshMeta(); } } }), h("span.unit", unit)));
      box.appendChild(h("div.card.pad", { style: { padding: "12px 14px" } },
        h("div.label", { style: { marginBottom: "8px" } }, "Randbedingungen"),
        h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 10px" } },
          num("ti", "Innen θ_i", "°C", 0.5), num("phii", "Innen φ_i", "%", 1, 100),
          num("te", "Außen θ_e", "°C", 0.5), num("phie", "Außen φ_e", "%", 1, 100),
          h("label.field", h("span", "R_si (Wärmestrom)"), h("select", { onchange: e => { W.cond.rsi = +e.target.value; changed(); } }, [["0.13", "horizontal 0,13"], ["0.10", "aufwärts 0,10"], ["0.17", "abwärts 0,17"], ["0.25", "Wärmebrücke 0,25"]].map(([v, t]) => h("option", { value: v, selected: Math.abs(W.cond.rsi - +v) < 1e-9 }, t)))),
          h("label.field", h("span", "R_se"), h("select", { onchange: e => { W.cond.rse = +e.target.value; changed(); } }, [["0.04", "0,04 (außen)"], ["0", "0 (hinterlüftet: endet davor)"]].map(([v, t]) => h("option", { value: v, selected: Math.abs(W.cond.rse - +v) < 1e-9 }, t)))))));
      /* layers */
      box.appendChild(h("div.row.between", h("span.label", "Schichten"), h("span.faint", { style: { fontSize: "12px" } }, "Innen → Außen · ziehen zum Umordnen")));
      box.appendChild(h("div.faint", { style: { fontSize: "11.5px", marginBottom: "-6px", textAlign: "center", letterSpacing: ".1em" } }, "▼ INNEN (warm)"));
      const list = h("div.layers");
      W.layers.forEach((l, i) => {
        const m = P.MAT[l.id];
        const sel = h("select", { onchange: e => { const nm = P.MAT[e.target.value]; l.id = nm.id; if (nm.kind === "barrier") l.d = P.barrierThickness[nm.id] || 0.0005; W.preset = W.preset; draw(); changed(); } },
          Object.keys(TP.KIND).map(k => { const grp = P.MATS.filter(x => x.kind === k); return grp.length ? h("optgroup", { label: TP.KIND[k].name }, grp.map(x => h("option", { value: x.id, selected: x.id === l.id }, x.name))) : null; }));
        const dmm = h("input.num", { type: "number", min: 0.1, step: l.d < 0.005 ? 0.1 : 5, value: +(l.d * 1000).toFixed(2), title: "Dicke in mm",
          oninput: e => { const v = parseFloat(e.target.value); if (v > 0) { l.d = v / 1000; changed(); refreshMeta(); } } });
        const row = h("div.layer", { draggable: "true" },
          h("span.sw", { style: { background: TP.matColor(m.kind), border: "1px solid var(--line)" } }),
          h("div.mini", sel, h("span.meta")),
          h("div.inwrap", dmm, h("span.unit", "mm")),
          h("div.ctl", { style: { gridColumn: 4 } },
            h("button", { title: "Nach innen", onclick: () => { if (i > 0) { [W.layers[i - 1], W.layers[i]] = [W.layers[i], W.layers[i - 1]]; draw(); changed(); } } }, "▲"),
            h("button", { title: "Löschen", onclick: () => { if (W.layers.length > 1) { W.layers.splice(i, 1); draw(); changed(); } } }, "✕"),
            h("button", { title: "Nach außen", onclick: () => { if (i < W.layers.length - 1) { [W.layers[i + 1], W.layers[i]] = [W.layers[i], W.layers[i + 1]]; draw(); changed(); } } }, "▼")));
        row.addEventListener("dragstart", e => { dragIdx = i; row.classList.add("drag"); e.dataTransfer.effectAllowed = "move"; });
        row.addEventListener("dragend", () => row.classList.remove("drag"));
        row.addEventListener("dragover", e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; });
        row.addEventListener("drop", e => { e.preventDefault(); if (dragIdx >= 0 && dragIdx !== i) { const [mv] = W.layers.splice(dragIdx, 1); W.layers.splice(i, 0, mv); draw(); changed(); } dragIdx = -1; });
        list.appendChild(row);
      });
      box.appendChild(list);
      box.appendChild(h("div.faint", { style: { fontSize: "11.5px", marginTop: "-6px", textAlign: "center", letterSpacing: ".1em" } }, "▲ AUSSEN (kalt)"));
      const addSel = h("select", Object.keys(TP.KIND).map(k => { const grp = P.MATS.filter(x => x.kind === k); return grp.length ? h("optgroup", { label: TP.KIND[k].name }, grp.map(x => h("option", { value: x.id }, x.name))) : null; }));
      box.appendChild(h("div.row", { style: { flexWrap: "nowrap" } }, addSel, h("button.btn.sm", { onclick: () => {
        const m = P.MAT[addSel.value]; W.layers.splice(W.layers.length, 0, { id: m.id, d: m.kind === "barrier" ? (P.barrierThickness[m.id] || 0.0005) : (m.kind === "insul" ? 0.1 : 0.02) });
        draw(); changed(); } }, "+ Schicht")));
      refreshMeta();
    }
    draw();
    box.redraw = draw; box.refreshMeta = refreshMeta;
    return box;
  };

  /* ---------- wall section + temperature profile ---------- */
  const VW = 780;
  function geometry(rows, left, right, bandPx) {
    const total = rows.reduce((s, r) => s + r.d, 0), avail = right - left - 2 * bandPx;
    let w = rows.map(r => Math.max(5, r.d / total * avail)), sum = w.reduce((a, b) => a + b, 0);
    if (sum > avail) { // thin layers kept visible: shrink the others proportionally
      const fixed = w.filter(x => x <= 5.0001).length * 5, scale = (avail - fixed) / (sum - fixed);
      w = w.map(x => (x <= 5.0001 ? 5 : x * scale));
    } else { const k = avail / sum; w = w.map(x => x * k); }
    const xs = [left + bandPx]; w.forEach(x => xs.push(xs[xs.length - 1] + x));
    return { xs, xSi: left + bandPx, xSe: xs[xs.length - 1], left, right, bandPx };
  }
  TP.wallChart = function (st, cond, opt) {
    opt = opt || {};
    const VW = opt.W || 780;            // drawn at the real pixel width (see U.chartHost), so text keeps its size
    const pfx = "w" + TP.uid() + "-";
    const s = svg("svg", { class: "chart", viewBox: `0 0 ${VW} 470`, role: "img", "aria-label": "Wall section and temperature profile" });
    s.appendChild(TP.matDefs(pfx));
    const rows = st.rows, n = rows.length, g = geometry(rows, 58, VW - 18, 26);
    /* section strip */
    const y0 = 30, hs = 92;
    s.appendChild(svg("rect", { x: g.left, y: y0, width: g.bandPx, height: hs, fill: "color-mix(in srgb, var(--ps) 14%, transparent)" }));
    s.appendChild(svg("rect", { x: g.right - g.bandPx, y: y0, width: g.bandPx, height: hs, fill: "color-mix(in srgb, var(--p) 14%, transparent)" }));
    s.appendChild(svg("text", { x: g.left + 4, y: y0 - 10, style: "font-weight:700;letter-spacing:.08em;font-size:12px" }, "INNEN"));
    s.appendChild(svg("text", { x: g.right - 4, y: y0 - 10, "text-anchor": "end", style: "font-weight:700;letter-spacing:.08em;font-size:12px" }, "AUSSEN"));
    rows.forEach((r, i) => {
      const x = g.xs[i], w = g.xs[i + 1] - x;
      s.appendChild(svg("rect", { x, y: y0, width: w, height: hs, fill: TP.matPaint(pfx, r.kind), stroke: "var(--ink3)", "stroke-width": 1 }));
      s.appendChild(svg("text", { x: x + w / 2, y: y0 + hs + 17, "text-anchor": "middle", style: "font-weight:700;font-size:13px" }, i + 1));
      if (w > 56) s.appendChild(svg("text", { x: x + w / 2, y: y0 + hs + 32, "text-anchor": "middle", style: "font-size:12px;fill:var(--ink3)" }, TP.fmt(r.d * 1000, r.d < 0.005 ? 1 : 0) + " mm"));
    });
    /* temperature plot */
    const top = 190, bot = 420, ys = [st.thSi, st.thSe, cond.ti, cond.te, 0];
    if (opt.dew != null) ys.push(opt.dew);
    const ax = TP.niceAxis(Math.min(...ys) - 1, Math.max(...ys) + 1, 5);
    const Y = v => bot - (v - ax.min) / (ax.max - ax.min) * (bot - top);
    const grid = svg("g.grid");
    ax.ticks.forEach(t => { grid.appendChild(svg("line", { x1: g.left, x2: g.right, y1: Y(t), y2: Y(t) })); s.appendChild(svg("text", { class: "gridlbl", x: g.left - 8, y: Y(t) + 4, "text-anchor": "end" }, TP.fmt(t, 0))); });
    s.insertBefore(grid, s.children[1]);
    s.appendChild(svg("text", { x: 4, y: top - 12, style: "font-size:13px;fill:var(--ink3)" }, "Temperatur θ in °C"));
    if (ax.min < 0 && ax.max > 0) s.appendChild(svg("line", { x1: g.left, x2: g.right, y1: Y(0), y2: Y(0), stroke: "var(--ink3)", "stroke-width": 1.2 }));
    // layer boundaries as thin vertical guides
    g.xs.forEach(x => s.appendChild(svg("line", { x1: x, x2: x, y1: y0 + hs, y2: bot, stroke: "var(--line)", "stroke-width": 1, "stroke-dasharray": "2 3" })));
    // x positions with θ values: air_i, si, boundaries, se, air_e
    const pts = [[g.left, cond.ti]];
    st.th.forEach((t, i) => pts.push([g.xs[i], t]));
    pts.push([g.right, cond.te]);
    // dew-point line of the indoor air
    if (opt.dew != null) {
      s.appendChild(svg("line", { x1: g.left, x2: g.right, y1: Y(opt.dew), y2: Y(opt.dew), stroke: "var(--ps)", "stroke-width": 1.6, "stroke-dasharray": "7 4" }));
      s.appendChild(svg("text", { x: g.right - 4, y: Y(opt.dew) - 6, "text-anchor": "end", style: "fill:var(--ps);font-size:13px;font-weight:600" }, "Taupunkt Innenluft " + TP.fmt(opt.dew, 1) + " °C"));
    }
    s.appendChild(svg("path", { class: "tline", d: pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + Y(p[1]).toFixed(1)).join("") }));
    [1, pts.length - 2].forEach(i => s.appendChild(svg("circle", { cx: pts[i][0], cy: Y(pts[i][1]), r: 4.2, fill: "var(--surface)", stroke: "var(--accent)", "stroke-width": 2 })));
    s.appendChild(svg("text", { x: g.xSi + 8, y: Y(st.thSi) - 10, style: "font-size:13px;font-weight:600;fill:var(--ink)" }, "θ_si " + TP.fmt(st.thSi, 1) + " °C"));
    s.appendChild(svg("text", { x: g.xSe - 8, y: Y(st.thSe) - 10, "text-anchor": "end", style: "font-size:13px;font-weight:600;fill:var(--ink)" }, "θ_se " + TP.fmt(st.thSe, 1) + " °C"));
    s.appendChild(svg("line", { x1: g.left, x2: g.right, y1: bot, y2: bot, class: "ax" }));
    s.appendChild(svg("text", { x: g.left + g.bandPx / 2, y: bot + 16, "text-anchor": "middle", style: "font-size:11.5px;fill:var(--ink3)" }, "R_si"));
    s.appendChild(svg("text", { x: g.right - g.bandPx / 2, y: bot + 16, "text-anchor": "middle", style: "font-size:11.5px;fill:var(--ink3)" }, "R_se"));
    s.appendChild(svg("text", { x: (g.xSi + g.xSe) / 2, y: bot + 34, "text-anchor": "middle", style: "font-size:13px;fill:var(--ink3)" }, "Position im Bauteil (maßstäblich, dünne Schichten verbreitert)"));
    /* hover */
    const cross = svg("line", { class: "cross", y1: y0, y2: bot, style: { display: "none" } }), dot = svg("circle", { r: 5, fill: "var(--accent)", style: { display: "none" } });
    s.appendChild(cross); s.appendChild(dot);
    const tip = TP.svgTip(s, VW);
    const hit = svg("rect", { x: g.left, y: y0, width: g.right - g.left, height: bot - y0, fill: "transparent" });
    function at(px) {
      for (let i = 0; i < pts.length - 1; i++) if (px >= pts[i][0] && px <= pts[i + 1][0]) {
        const t = pts[i + 1][0] === pts[i][0] ? 0 : (px - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
        const label = i === 0 ? "Wärmeübergang innen (R_si)" : i === pts.length - 2 ? "Wärmeübergang außen (R_se)" : (i) + " " + rows[i - 1].name;
        let mm = null; if (i >= 1 && i <= n) { mm = rows.slice(0, i - 1).reduce((s, r) => s + r.d, 0) * 1000 + t * rows[i - 1].d * 1000; }
        return { th: pts[i][1] + t * (pts[i + 1][1] - pts[i][1]), label, mm };
      }
      return null;
    }
    hit.addEventListener("mousemove", e => {
      const r = s.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * VW, a = at(px);
      if (!a) return;
      cross.setAttribute("x1", px); cross.setAttribute("x2", px); cross.style.display = ""; dot.setAttribute("cx", px); dot.setAttribute("cy", Y(a.th)); dot.style.display = "";
      tip.show(px, Y(a.th), [a.label, "θ = " + TP.fmt(a.th, 2) + " °C" + (a.mm != null ? "  ·  " + TP.fmt(a.mm, 0) + " mm von innen" : "")]);
    });
    hit.addEventListener("mouseleave", () => { cross.style.display = "none"; dot.style.display = "none"; tip.hide(); });
    s.appendChild(hit);
    return s;
  };

  /* ---------- Formblatt (as on the exam sheet) ---------- */
  TP.formblatt = function (st, cond, glaser) {
    const f = (v, d) => TP.fmt(v, d);
    const cols = ["Schicht", "d [m]", "λ [W/mK]", "R [m²K/W]", "Δθ [K]", "θ [°C]"].concat(glaser ? ["p_S [Pa]", "µ [–]", "µ·d [m]", "p [Pa]"] : []);
    const tbl = h("table.data", h("thead", h("tr", cols.map(c => h("th", c)))));
    const tb = h("tbody");
    const row = (cells, cls) => tb.appendChild(h("tr" + (cls ? "." + cls : ""), cells.map(c => h("td", c))));
    const q = st.q;
    const ex = glaser ? [] : null;
    const blank = glaser ? ["", "", "", ""] : [];
    row(["Innenluft", "", "", "", "", f(cond.ti, 2)].concat(glaser ? [f(P.ps(cond.ti), 0), "", "", f(glaser.pi, 0)] : []), "air");
    row(["Übergang innen (R_si)", "", "", f(st.rsi, 3), f(q * st.rsi, 2), f(st.thSi, 2)].concat(glaser ? [f(glaser.pSat[0], 0), "", "0", f(glaser.pLin[0], 0)] : []), glaser && glaser.over[0] ? "bad" : "");
    st.rows.forEach((r, i) => {
      const bad = glaser && glaser.over[i + 1];
      row([(i + 1) + " " + r.name, f(r.d, r.d < 0.01 ? 4 : 3), f(r.lam, 3), f(r.R, 4), f(q * r.R, 2), f(r.thOut, 2)].concat(glaser ? [f(glaser.pSat[i + 1], 0), r.mu >= 1e6 ? "∞" : f(r.mu, 0), f(r.sd, 3), f(glaser.pLin[i + 1], 0)] : []), bad ? "bad" : "");
    });
    row(["Übergang außen (R_se)", "", "", f(st.rse, 3), f(q * st.rse, 2), f(cond.te, 2)].concat(glaser ? [f(P.ps(cond.te), 0), "", "", f(glaser.pe, 0)] : []), "air");
    row(["Summe", f(st.rows.reduce((s, r) => s + r.d, 0), 3), "", f(st.RT, 4), f(st.dT, 1), ""].concat(glaser ? ["", "", f(glaser.S, 2), ""] : []), "sum");
    tbl.appendChild(tb);
    return h("div.tblscroll", tbl);
  };

  /* ---------- the lab ---------- */
  TP.labs.uwert = {
    render(el) {
      const out = h("div.lab");
      const main = h("div.main");
      let editor;
      const draw = () => {
        const W = TP.wall, st = TP.wallStack(), c = W.cond;
        const dew = P.dewT(c.phii, c.ti);
        TP.clear(main);
        const uLim = 0.35, fR = st.thSi - c.te, fRsi = (st.thSi - c.te) / (c.ti - c.te);
        const kp = (label, v, unit, cls) => h("div.kpi" + (cls ? "." + cls : ""), h("div.label", label), h("div.v", v, unit ? h("small", unit) : null));
        main.appendChild(h("div.kpis",
          kp("R_T", TP.fmt(st.RT, 3), "m²K/W"),
          kp("U-Wert", TP.fmt(st.U, 3), "W/m²K", st.U <= uLim ? "ok" : "warn"),
          kp("q̇ (Wärmestromdichte)", TP.fmt(st.q, 2), "W/m²"),
          kp("θ_si", TP.fmt(st.thSi, 2), "°C", st.thSi <= dew ? "bad" : ""),
          kp("f_Rsi", TP.fmt(fRsi, 3), "", fRsi >= 0.71 ? "ok" : fRsi >= 0.69 ? "warn" : "bad")));
        const notes = [];
        notes.push(st.U <= uLim ? "U ≤ 0,35 W/m²K: erfüllt die OIB-RL-6-Mindestanforderung für Außenwände." : "U > 0,35 W/m²K: erfüllt die OIB-RL-6-Mindestanforderung für Außenwände nicht (Beispielwert aus dem Repetitorium).");
        notes.push(st.thSi <= dew ? "θ_si liegt unter dem Taupunkt der Innenluft (" + TP.fmt(dew, 1) + " °C): Oberflächenkondensat!" : "θ_si liegt über dem Taupunkt der Innenluft (" + TP.fmt(dew, 1) + " °C): kein Oberflächenkondensat.");
        main.appendChild(h("div.callout" + (st.U <= uLim && st.thSi > dew ? ".ok" : ".warn"), notes.map(t => h("div", t))));
        const card = h("div.card.pad", h("div.row.between", h("h3", "Temperaturverlauf"), h("span.faint", { style: { fontSize: "12.5px" } }, "Maus über das Diagramm bewegen")));
        card.appendChild(TP.ui.chartHost(w => TP.wallChart(st, c, { dew, W: w })));
        card.appendChild(h("div.legend-row", { style: { marginTop: "6px" } }, h("span", h("i", { style: { background: "var(--accent)" } }), "θ(x)"), h("span", h("i", { style: { background: "var(--ps)" } }), "Taupunkt der Innenluft (Θ_S = φ^(1/8)·(110+θ_L) − 110)")));
        const fb = h("div.card.pad", h("h3", "Formblatt (wie in der Prüfung)"), h("div", { style: { marginTop: "8px" } }, TP.formblatt(st, c, null)),
          h("div.faint", { style: { fontSize: "12.5px", marginTop: "8px" } }, "R = d/λ → R_T = R_si + ΣR + R_se → U = 1/R_T → q̇ = U·(θ_i − θ_e) → θ_n = θ_(n−1) − q̇·R_n"));
        main.appendChild(h("div.split", card, h("div.stack", { style: { gap: "16px" } }, fb, h("div.callout", h("b", "Exam trap: "), "U says nothing about ΔT or area — those only enter through q̇ = U·A·Δθ. And U can never exceed 1/(R_si+R_se) = 5,88 W/m²K."))));
      };
      editor = TP.wallEditor(draw);
      out.appendChild(h("div.side", editor));
      out.appendChild(main);
      el.appendChild(out);
      draw();
    },
  };
})(window.TP);
