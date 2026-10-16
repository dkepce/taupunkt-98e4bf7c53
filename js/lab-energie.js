/* Bauphysik — labs: Energiebilanz (VO7/VO9: Φ_T, Φ_V, Φ_S, Φ_I, η_h, Q_H) and Sonnenstand (VO14: Sonnenbahndiagramm, Horizontüberhöhung) */
(function (TP) {
  const { h, svg } = TP;
  const fmt = TP.fmt;
  TP.labs = TP.labs || {};
  const RAD = Math.PI / 180;

  function numField(label, unit, get, set, step, min, max) {
    return h("label.field", h("span", label), h("div.inwrap", h("input.num", { type: "number", step, min, max, value: get(), oninput: e => { const v = parseFloat(e.target.value); if (isFinite(v)) set(v); } }), h("span.unit", unit)));
  }
  function slider(label, unit, get, set, min, max, step, dec) {
    const out = h("span.mono", fmt(get(), dec == null ? 1 : dec) + " " + unit);
    const inp = h("input", { type: "range", min, max, step, value: get(), oninput: e => { const v = parseFloat(e.target.value); set(v); out.textContent = fmt(v, dec == null ? 1 : dec) + " " + unit; } });
    return h("label.field", h("div.row.between", h("span", label), out), inp);
  }
  const kpi = (label, v, unit, cls) => h("div.kpi" + (cls ? "." + cls : ""), h("div.label", label), h("div.v", v, unit ? h("small", unit) : null));
  const sunColor = "#e8a317";

  /* ===================================================================================
     Lab: Energiebilanz — losses vs. usable gains (VO7 Übung 5–7, VO9)
     =================================================================================== */
  const EN = TP.en = { HT: 9, HV: 15, dT: 23.1, C: 3.16, PS: 1025, PI: 338, AE: 30, mo: 31 };
  const PRESETS = {
    vo7: ["Büro aus der VO7", { HT: 9, HV: 15, dT: 23.1, C: 3.16, PS: 1025, PI: 338, AE: 30, mo: 31 }],
    alt: ["Altbau", { HT: 40, HV: 25, dT: 20, C: 6, PS: 400, PI: 300, AE: 60, mo: 31 }],
    passiv: ["Passivhaus-nah", { HT: 4, HV: 3, dT: 20, C: 10, PS: 300, PI: 250, AE: 60, mo: 31 }],
  };
  const etaOf = (g, a) => Math.abs(g - 1) < 1e-6 ? a / (a + 1) : (1 - Math.pow(g, a)) / (1 - Math.pow(g, a + 1));
  TP.etaOf = etaOf;

  TP.labs.energie = {
    render(el) {
      const out = h("div.lab"), main = h("div.main"), side = h("div.side");
      const calc = () => {
        const PT = EN.HT * EN.dT, PV = EN.HV * EN.dT, loss = PT + PV, gain = EN.PS + EN.PI, g = gain / loss;
        const tau = EN.C * 1e6 / (EN.HT + EN.HV) / 3600, a = 1 + tau / 16, eta = etaOf(g, a);
        const br = loss - eta * gain, QH = Math.max(0, br) * EN.mo * 86400 / 1e6;
        return { PT, PV, loss, gain, g, tau, a, eta, br, QH, kwh: QH / 3.6 };
      };
      const draw = () => {
        const c = calc();
        TP.clear(main);
        main.appendChild(h("div.kpis", kpi("Zeitkonstante τ", fmt(c.tau, 1), "h"), kpi("Parameter a", fmt(c.a, 2), ""), kpi("γ_h = Gewinne/Verluste", fmt(c.g, 2), "", c.g > 1 ? "warn" : ""),
          kpi("Ausnutzungsgrad η_h", fmt(c.eta, 3), "", c.eta < 0.5 ? "warn" : "ok"), kpi("Q_H (" + EN.mo + " Tage)", fmt(c.kwh, 0), "kWh"), kpi("Q_H / A_E", fmt(c.kwh / EN.AE, 1), "kWh/m²")));
        main.appendChild(h("div.callout" + (c.br <= 0 ? ".ok" : c.g > 1 ? ".warn" : ""),
          c.br <= 0 ? [h("b", "Kein Heizbedarf. "), "η·(Φ_S+Φ_I) deckt alle Verluste — Q_H = 0 (die Klammer wird nicht negativ gezählt)."] :
            c.g > 1 ? [h("b", "Mehr Gewinne als Verluste (γ > 1), aber η < 1: "), "nur ", fmt(c.eta * 100, 0), " % der Gewinne sind nutzbar. Mehr Speichermasse (C ↑ → τ ↑ → a ↑) erhöht η."] :
              [h("b", "Verluste überwiegen (γ < 1). "), "η ist hoch (", fmt(c.eta * 100, 0), " %): fast alle Gewinne werden genutzt, der Rest muss geheizt werden."]));
        /* bars: losses vs. gains */
        const mx = Math.max(c.loss, c.gain, 1), pct = v => (v / mx * 100).toFixed(1) + "%";
        const seg = (w, bg, txt, color) => h("div", { style: { width: w, background: bg, color: color || "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12.5px", fontWeight: 600, minWidth: 0, overflow: "hidden", whiteSpace: "nowrap" } }, txt);
        const bar = (title, ...segs) => h("div", { style: { marginBottom: "14px" } }, h("div.label", { style: { marginBottom: "5px" } }, title), h("div", { style: { display: "flex", height: "34px", borderRadius: "8px", overflow: "hidden", background: "var(--surface2, rgba(127,127,127,.12))" } }, segs));
        const usable = c.eta * c.gain, wasted = c.gain - usable;
        const balCard = h("div.card.pad", h("h3", "Bilanz in Watt"),
          bar("Verluste (voll angerechnet)", seg(pct(c.PT), "var(--bad)", "Φ_T " + fmt(c.PT, 0)), seg(pct(c.PV), "color-mix(in srgb, var(--bad) 60%, var(--surface))", "Φ_V " + fmt(c.PV, 0))),
          bar("Gewinne (Φ_S + Φ_I)", seg(pct(usable), "var(--ok)", "genutzt " + fmt(usable, 0)), seg(pct(wasted), "color-mix(in srgb, var(--ink3) 45%, var(--surface))", wasted > 0.5 ? "verloren " + fmt(wasted, 0) : "", "var(--ink)")),
          bar("Heizbedarf (Rest)", seg(pct(Math.max(0, c.br)), "var(--p)", c.br > 0 ? fmt(c.br, 0) + " W" : "")),
          TP.texEl("Q_H=\\left[\\Phi_T+\\Phi_V-\\eta_h(\\Phi_S+\\Phi_I)\\right]\\Delta t=\\left[" + TP.txNum(c.loss, 0) + "-" + TP.txNum(c.eta, 3) + "\\cdot" + TP.txNum(c.gain, 0) + "\\right]\\cdot" + TP.txNum(EN.mo * 86400, 0) + "=" + TP.txNum(c.QH, 1) + "\\ \\mathrm{MJ}", true));
        /* η(γ) */
        const mk = VW => {
          const VH = 330, L = 50, R = VW - 18, T = 16, B = VH - 38, s = svg("svg", { class: "chart", viewBox: `0 0 ${VW} ${VH}` });
          const gM = 4, X = v => L + v / gM * (R - L), Y = v => B - v * (B - T);
          const gr = svg("g.grid");
          [0, 0.25, 0.5, 0.75, 1].forEach(v => { gr.appendChild(svg("line", { x1: L, x2: R, y1: Y(v), y2: Y(v) })); s.appendChild(svg("text", { class: "gridlbl", x: L - 8, y: Y(v) + 4, "text-anchor": "end" }, fmt(v, 2))); });
          for (let v = 0; v <= gM; v++) { gr.appendChild(svg("line", { x1: X(v), x2: X(v), y1: T, y2: B })); s.appendChild(svg("text", { class: "gridlbl", x: X(v), y: B + 16, "text-anchor": "middle" }, v)); }
          s.appendChild(gr);
          const curve = (aa, stroke, w, dash) => { let d = ""; for (let g = 0.02; g <= gM + 1e-9; g += 0.02) d += (d ? "L" : "M") + X(g).toFixed(1) + " " + Y(etaOf(g, aa)).toFixed(1); s.appendChild(svg("path", { d, fill: "none", stroke, "stroke-width": w, "stroke-dasharray": dash || "" })); };
          [[1, "leicht"], [3, "mittel"], [6, "schwer"]].forEach(([aa, nm]) => { curve(aa, "var(--ink3)", 1.2, "5 4"); s.appendChild(svg("text", { x: R - 4, y: Y(etaOf(gM, aa)) - 5, "text-anchor": "end", style: "font-size:12px;fill:var(--ink3)" }, "a = " + aa + " (" + nm + ")")); });
          curve(c.a, "var(--p)", 2.6);
          const gx = Math.min(c.g, gM);
          s.appendChild(svg("line", { x1: X(gx), x2: X(gx), y1: Y(c.eta), y2: B, stroke: "var(--p)", "stroke-dasharray": "3 3" }));
          s.appendChild(svg("circle", { cx: X(gx), cy: Y(c.eta), r: 6, fill: "var(--p)", stroke: "var(--surface)", "stroke-width": 2 }));
          s.appendChild(svg("text", { x: X(gx) + 10, y: Y(c.eta) - 8, style: "font-size:13px;font-weight:700;fill:var(--ink)" }, "η = " + fmt(c.eta, 2)));
          s.appendChild(svg("text", { x: 4, y: 12, style: "font-size:13px;fill:var(--ink3)" }, "η_h"));
          s.appendChild(svg("text", { x: (L + R) / 2, y: VH - 4, "text-anchor": "middle", style: "font-size:13px;fill:var(--ink3)" }, "γ_h = (Φ_S+Φ_I)/(Φ_T+Φ_V)"));
          return s;
        };
        const etaCard = h("div.card.pad", h("div.row.between", h("h3", "Ausnutzungsgrad η(γ)"), h("span.faint", { style: { fontSize: "12.5px" } }, "a = 1 + τ/16 h")), TP.ui.chartHost(mk),
          h("div.callout", h("b", "Lesen: "), "je größer γ (viele Gewinne gegenüber den Verlusten), desto kleiner η — ein Teil der Gewinne fällt zur falschen Zeit an. Schwere Bauweise (große τ) hebt die Kurve an, weil sie Gewinne zwischenspeichert."));
        main.appendChild(h("div.split.even", balCard, etaCard));
      };
      const buildSide = () => {
        TP.clear(side);
        side.appendChild(h("div.card.pad", { style: { padding: "14px 16px" } }, h("div.label", { style: { marginBottom: "10px" } }, "Beispiel laden"),
          h("div.row", { style: { flexWrap: "wrap", gap: "6px" } }, Object.keys(PRESETS).map(k => h("button.btn.ghost", { onclick: () => { Object.assign(EN, PRESETS[k][1]); buildSide(); draw(); } }, PRESETS[k][0]))),
          h("div.faint", { style: { fontSize: "12px", marginTop: "8px" } }, "„Büro aus der VO7“ ergibt η = 0,39. Die VO rechnet mit gerundetem η und kommt auf 62 MJ; ungerundet sind es ≈ 47 MJ — die Klammer ist eine kleine Differenz großer Zahlen und reagiert stark auf Rundung.")));
        side.appendChild(h("div.card.pad", { style: { padding: "14px 16px" } }, h("div.label", { style: { marginBottom: "10px" } }, "Verluste"),
          h("div.stack", { style: { gap: "12px" } }, slider("H_T (Transmission)", "W/K", () => EN.HT, v => { EN.HT = v; draw(); }, 2, 60, 0.5), slider("H_V (Lüftung)", "W/K", () => EN.HV, v => { EN.HV = v; draw(); }, 2, 60, 0.5), slider("Δθ = θ_i − θ_e", "K", () => EN.dT, v => { EN.dT = v; draw(); }, 2, 35, 0.1))));
        side.appendChild(h("div.card.pad", { style: { padding: "14px 16px" } }, h("div.label", { style: { marginBottom: "10px" } }, "Gewinne & Speichermasse"),
          h("div.stack", { style: { gap: "12px" } }, slider("Solare Gewinne Φ_S", "W", () => EN.PS, v => { EN.PS = v; draw(); }, 0, 2500, 25, 0), slider("Interne Gewinne Φ_I", "W", () => EN.PI, v => { EN.PI = v; draw(); }, 0, 800, 10, 0), slider("Wärmekapazität C", "MJ/K", () => EN.C, v => { EN.C = v; draw(); }, 0.5, 20, 0.1))));
        side.appendChild(h("div.card.pad", { style: { padding: "14px 16px" } }, h("div.label", { style: { marginBottom: "10px" } }, "Bezug"),
          h("div.stack", { style: { gap: "12px" } }, numField("Energiebezugsfläche A_E", "m²", () => EN.AE, v => { EN.AE = v; draw(); }, 1, 1),
            h("label.field", h("span", "Monat"), h("select", { onchange: e => { EN.mo = +e.target.value; draw(); } }, [["Januar / Dezember / März", 31], ["April / November", 30], ["Februar", 28]].map(([t, v]) => h("option", { value: v, selected: EN.mo === v }, t + " (" + v + " Tage)")))))));
      };
      out.appendChild(side); out.appendChild(main); el.appendChild(out); buildSide(); draw();
    },
  };

  /* ===================================================================================
     Lab: Sonnenstand — Sonnenbahndiagramm (polar + Zylinder), Horizontüberhöhung, Ablese-Training
     =================================================================================== */
  const KEYDATES = [["21.6.", 23.45, "jun"], ["21.5. / 23.7.", 20.1, "mai, jul"], ["21.4. / 23.8.", 11.8, "apr, aug"], ["21.3. / 23.9.", 0, "mär, sep"], ["21.2. / 23.10.", -11.8, "feb, okt"], ["21.1. / 22.11.", -20.1, "jan, nov"], ["21.12.", -23.45, "dez"]];
  const SO = TP.so = { lat: 48, dec: 23.45, date: "21.6.", t: 12, obs: 0, cyl: false };
  const QZ = { on: false, hide: false, date: null, t: 0, ans: { h: "", a: "" }, res: null };
  const declOf = N => 23.45 * Math.sin(360 / 365 * (284 + N) * RAD);
  const dateOfN = N => { const d = new Date(2025, 0, N); return d.getDate() + "." + (d.getMonth() + 1) + "."; };
  const nOfDec = () => { let best = 172, bd = 1e9; for (let N = 1; N <= 365; N++) { const e = Math.abs(declOf(N) - SO.dec); if (e < bd) { bd = e; best = N; } } return best; };
  /* sun position: height h and azimuth A (° from north, clockwise) at solar time t (hours) */
  function sunPos(lat, dec, t) {
    const w = 15 * (t - 12) * RAD, ph = lat * RAD, d = dec * RAD;
    const sh = Math.sin(ph) * Math.sin(d) + Math.cos(ph) * Math.cos(d) * Math.cos(w), hh = Math.asin(Math.max(-1, Math.min(1, sh)));
    let cA = (Math.sin(d) - sh * Math.sin(ph)) / (Math.cos(hh) * Math.cos(ph)); cA = Math.max(-1, Math.min(1, cA));
    let A = Math.acos(cA) / RAD; if (w > 0) A = 360 - A;
    return { h: hh / RAD, A };
  }
  const hidden = (p, obs) => obs > 0 && p.A >= 120 && p.A <= 240 && p.h < obs;
  const hhmm = t => { const m = Math.round(t * 60), H = Math.floor(m / 60) % 24, M = m % 60; return H + ":" + String(M).padStart(2, "0"); };

  TP.labs.sonne = {
    render(el) {
      const out = h("div.lab"), main = h("div.main"), side = h("div.side");
      const info = () => {
        const p = sunPos(SO.lat, SO.dec, SO.t), x = -Math.tan(SO.lat * RAD) * Math.tan(SO.dec * RAD);
        let rise = null, set = null, len = null;
        if (x >= 1) len = 0; else if (x <= -1) len = 24; else { const w0 = Math.acos(x) / RAD / 15; rise = 12 - w0; set = 12 + w0; len = 2 * w0; }
        let sunH = 0; for (let t = 0; t < 24; t += 1 / 12) { const q = sunPos(SO.lat, SO.dec, t); if (q.h > 0 && !hidden(q, SO.obs)) sunH += 1 / 12; }
        return { p, rise, set, len, sunH, hmax: 90 - SO.lat + SO.dec };
      };
      const curve = dec => { const pts = []; for (let t = 0; t <= 24.001; t += 0.1) { const q = sunPos(SO.lat, dec, t); if (q.h >= 0) pts.push(Object.assign({ t }, q)); } return pts; };
      /* ---- polar chart ---- */
      const mkPolar = VW => {
        const S = VW, cx = S / 2, cy = S / 2, R = S / 2 - 30, s = svg("svg", { class: "chart", viewBox: `0 0 ${S} ${S}` });
        const rr = hh => R * (90 - hh) / 90, P = (hh, A) => [cx + rr(hh) * Math.sin(A * RAD), cy - rr(hh) * Math.cos(A * RAD)];
        const g = svg("g.grid");
        [0, 15, 30, 45, 60, 75].forEach(hh => { g.appendChild(svg("circle", { cx, cy, r: rr(hh), fill: "none" })); if (hh > 0) s.appendChild(svg("text", { x: cx + 3, y: cy - rr(hh) - 2, style: "font-size:10.5px;fill:var(--ink3)" }, hh + "°")); });
        for (let A = 0; A < 360; A += 30) { const q = P(0, A); g.appendChild(svg("line", { x1: cx, y1: cy, x2: q[0], y2: q[1] })); }
        s.appendChild(g);
        [["N", 0], ["O", 90], ["S", 180], ["W", 270]].forEach(([l, A]) => { const q = [cx + (R + 15) * Math.sin(A * RAD), cy - (R + 15) * Math.cos(A * RAD)]; s.appendChild(svg("text", { x: q[0], y: q[1] + 5, "text-anchor": "middle", style: "font-size:14px;font-weight:700;fill:var(--ink2)" }, l)); });
        /* horizon obstruction (south sector 120°–240°) */
        if (SO.obs > 0) { const a1 = P(0, 120), a2 = P(0, 240), b1 = P(SO.obs, 120), b2 = P(SO.obs, 240); const ro = rr(0), ri = rr(SO.obs); s.appendChild(svg("path", { d: `M${a1[0]} ${a1[1]}A${ro} ${ro} 0 0 1 ${a2[0]} ${a2[1]}L${b2[0]} ${b2[1]}A${ri} ${ri} 0 0 0 ${b1[0]} ${b1[1]}Z`, fill: "var(--ink3)", opacity: 0.35, stroke: "var(--ink3)" })); }
        const path = pts => pts.map((q, i) => (i ? "L" : "M") + P(q.h, q.A).map(v => v.toFixed(1)).join(" ")).join("");
        KEYDATES.forEach(([lbl, d, short]) => { const pts = curve(d); if (pts.length < 2) return; s.appendChild(svg("path", { d: path(pts), fill: "none", stroke: "var(--ink3)", "stroke-width": 1.2, opacity: 0.8 })); const q = P(pts[0].h, pts[0].A); s.appendChild(svg("text", { x: q[0] + 6, y: q[1] + (d === 0 ? 15 : -3), style: "font-size:10.5px;fill:var(--ink3)" }, short)); });
        const sel = curve(SO.dec); if (sel.length > 1) {
          s.appendChild(svg("path", { d: path(sel), fill: "none", stroke: sunColor, "stroke-width": 3 }));
          for (let t = Math.ceil(sel[0].t); t <= sel[sel.length - 1].t; t++) { const q = sunPos(SO.lat, SO.dec, t), pt = P(q.h, q.A); s.appendChild(svg("circle", { cx: pt[0], cy: pt[1], r: 3.2, fill: hidden(q, SO.obs) ? "var(--ink3)" : "var(--bad)" })); if (t % 3 === 0 && !QZ.hide) s.appendChild(svg("text", { x: pt[0] + 6, y: pt[1] + 14, style: "font-size:11px;fill:var(--bad)" }, t + "h")); }
        }
        const p = sunPos(SO.lat, SO.dec, SO.t);
        if (p.h > 0 && !QZ.hide) { const pt = P(p.h, p.A); s.appendChild(svg("line", { x1: cx, y1: cy, x2: pt[0], y2: pt[1], stroke: sunColor, "stroke-dasharray": "4 3" })); s.appendChild(svg("circle", { cx: pt[0], cy: pt[1], r: 9, fill: sunColor, stroke: "var(--surface)", "stroke-width": 2 })); }
        return s;
      };
      /* ---- cylinder chart (Blick nach Süden) ---- */
      const mkCyl = VW => {
        const VH = 340, L = 44, R = VW - 16, T = 16, B = VH - 38, s = svg("svg", { class: "chart", viewBox: `0 0 ${VW} ${VH}` });
        const X = A => L + (A - 45) / 270 * (R - L), Y = hh => B - hh / 75 * (B - T), gr = svg("g.grid");
        for (let hh = 0; hh <= 75; hh += 15) { gr.appendChild(svg("line", { x1: L, x2: R, y1: Y(hh), y2: Y(hh) })); s.appendChild(svg("text", { class: "gridlbl", x: L - 6, y: Y(hh) + 4, "text-anchor": "end" }, hh + "°")); }
        [[90, "O 90°"], [135, "SO"], [180, "S 180°"], [225, "SW"], [270, "W 270°"]].forEach(([A, l]) => { gr.appendChild(svg("line", { x1: X(A), x2: X(A), y1: T, y2: B })); s.appendChild(svg("text", { class: "gridlbl", x: X(A), y: B + 16, "text-anchor": "middle" }, l)); });
        s.appendChild(gr);
        if (SO.obs > 0) s.appendChild(svg("rect", { x: X(120), y: Y(SO.obs), width: X(240) - X(120), height: B - Y(SO.obs), fill: "var(--ink3)", opacity: 0.35 }));
        const path = pts => pts.map((q, i) => (i ? "L" : "M") + X(q.A).toFixed(1) + " " + Y(q.h).toFixed(1)).join("");
        KEYDATES.forEach(([lbl, d]) => { const pts = curve(d); if (pts.length > 1) s.appendChild(svg("path", { d: path(pts), fill: "none", stroke: "var(--ink3)", "stroke-width": 1.2, opacity: 0.8 })); });
        const sel = curve(SO.dec); if (sel.length > 1) {
          s.appendChild(svg("path", { d: path(sel), fill: "none", stroke: sunColor, "stroke-width": 3 }));
          for (let t = Math.ceil(sel[0].t); t <= sel[sel.length - 1].t; t++) { const q = sunPos(SO.lat, SO.dec, t); s.appendChild(svg("circle", { cx: X(q.A), cy: Y(q.h), r: 3.2, fill: hidden(q, SO.obs) ? "var(--ink3)" : "var(--bad)" })); if (t % 2 === 0 && !QZ.hide) s.appendChild(svg("text", { x: X(q.A), y: Y(q.h) - 7, "text-anchor": "middle", style: "font-size:11px;fill:var(--bad)" }, t + "h")); }
        }
        const p = sunPos(SO.lat, SO.dec, SO.t);
        if (p.h > 0 && !QZ.hide) s.appendChild(svg("circle", { cx: X(p.A), cy: Y(p.h), r: 9, fill: sunColor, stroke: "var(--surface)", "stroke-width": 2 }));
        s.appendChild(svg("text", { x: 4, y: 12, style: "font-size:13px;fill:var(--ink3)" }, "Sonnenhöhe h"));
        s.appendChild(svg("text", { x: (L + R) / 2, y: VH - 4, "text-anchor": "middle", style: "font-size:13px;fill:var(--ink3)" }, "Azimut (Blick nach Süden: Ost links, West rechts)"));
        return s;
      };
      const quizCard = () => {
        const c = h("div.card.pad", h("div.row.between", h("h3", "Ablese-Training"), h("span.faint", { style: { fontSize: "12.5px" } }, "Wie in der Prüfung: aus dem Diagramm ablesen")));
        if (!QZ.on) { c.appendChild(h("div.muted", { style: { margin: "8px 0 12px" } }, "Die Sonne wird ausgeblendet — lies Sonnenhöhe und Azimut für Datum und Uhrzeit aus den Kurven ab und tippe sie ein.")); c.appendChild(h("button.btn.primary", { onclick: newQuiz }, "Aufgabe starten")); return c; }
        c.appendChild(h("div", { style: { margin: "8px 0" } }, "Wo steht die Sonne am ", h("b", QZ.dateLabel), " um ", h("b", QZ.t + ":00 Uhr"), " Sonnenzeit (", fmt(SO.lat, 0), "° N)?"));
        const hi = h("input.num", { type: "text", inputmode: "decimal", placeholder: "z. B. 35", value: QZ.ans.h, oninput: e => { QZ.ans.h = e.target.value; } }), ai = h("input.num", { type: "text", inputmode: "decimal", placeholder: "z. B. 150", value: QZ.ans.a, oninput: e => { QZ.ans.a = e.target.value; } });
        c.appendChild(h("div.row", { style: { gap: "12px", flexWrap: "wrap" } }, h("label.field", h("span", "Sonnenhöhe h"), h("div.inwrap", hi, h("span.unit", "°"))), h("label.field", h("span", "Azimut (N = 0°, O = 90°, S = 180°)"), h("div.inwrap", ai, h("span.unit", "°")))));
        const fb = h("div");
        if (QZ.res) fb.appendChild(QZ.res);
        c.appendChild(fb);
        c.appendChild(h("div.row", { style: { justifyContent: "flex-end", gap: "8px", marginTop: "10px" } }, h("button.btn.ghost", { onclick: newQuiz }, "Neue Aufgabe"), !QZ.hide ? null : h("button.btn.primary", { onclick: () => {
          const hv = TP.num(QZ.ans.h), av = TP.num(QZ.ans.a);
          if (isNaN(hv) && isNaN(av)) { TP.toast("Bitte Höhe und Azimut eintragen."); return; }
          const p = sunPos(SO.lat, SO.dec, SO.t), okH = Math.abs(hv - p.h) <= 4, okA = Math.abs(av - p.A) <= 8;
          QZ.hide = false; TP.logAct && TP.logAct("calc");
          QZ.res = h("div.callout." + (okH && okA ? "ok" : okH || okA ? "warn" : "bad"), h("b", okH && okA ? "Richtig. " : "Nicht ganz. "), "Exakt: h = " + fmt(p.h, 1) + "°, Azimut = " + fmt(p.A, 0) + "° (Toleranz beim Ablesen: ±4° bzw. ±8°). Die Sonne ist jetzt im Diagramm eingezeichnet.");
          draw();
        } }, "Prüfen")));
        return c;
      };
      const newQuiz = () => {
        const k = TP.pick(KEYDATES), t = TP.pick([8, 9, 10, 11, 12, 13, 14, 15, 16]);
        let tries = 0, p; do { p = sunPos(SO.lat, k[1], t); tries++; } while (p.h <= 3 && tries < 5);
        QZ.on = true; QZ.hide = true; QZ.dateLabel = k[0]; QZ.t = t; QZ.ans = { h: "", a: "" }; QZ.res = null; SO.dec = k[1]; SO.date = k[0]; SO.t = t; buildSide(); draw();
      };
      const draw = () => {
        const I = info(), shown = !QZ.hide;
        TP.clear(main);
        main.appendChild(h("div.kpis", kpi("Sonnenhöhe h", shown ? (I.p.h > 0 ? fmt(I.p.h, 1) : "unter Horizont") : "?", shown && I.p.h > 0 ? "°" : ""), kpi("Azimut", shown && I.p.h > 0 ? fmt(I.p.A, 0) : "?", shown && I.p.h > 0 ? "°" : ""),
          kpi("Deklination δ", fmt(SO.dec, 1), "°"), kpi("Höchststand (12 h)", fmt(I.hmax, 1), "°"), kpi("Sonnenaufgang – -untergang", I.rise == null ? "–" : hhmm(I.rise) + " – " + hhmm(I.set), ""), kpi("Direkte Sonne", fmt(I.sunH, 1), "h/Tag", SO.obs > 0 && I.sunH < I.len - 0.05 ? "warn" : "")));
        main.appendChild(h("div.card.pad", h("div.row.between", h("h3", SO.cyl ? "Sonnenbahndiagramm — Zylinderprojektion" : "Sonnenbahndiagramm — Polarprojektion"),
          h("div.row", { style: { gap: "6px" } }, h("button.btn" + (SO.cyl ? ".ghost" : ".primary"), { onclick: () => { SO.cyl = false; draw(); } }, "Polar"), h("button.btn" + (SO.cyl ? ".primary" : ".ghost"), { onclick: () => { SO.cyl = true; draw(); } }, "Zylinder"))),
          h("div", { style: { margin: "6px auto 0", maxWidth: SO.cyl ? "980px" : "620px" } }, TP.ui.chartHost(SO.cyl ? mkCyl : mkPolar, { maxW: SO.cyl ? 980 : 620 })),
          h("div.faint", { style: { fontSize: "12.5px", marginTop: "6px" } }, "Orange = gewähltes Datum (" + SO.date + "), rote Punkte = volle Stunden, graue Kurven = die Standardtage der VO (21.6., 21.5./23.7. … 21.12.). Mitte der Polarprojektion = Zenit (h = 90°), äußerer Ring = Horizont.")));
        main.appendChild(quizCard());
        main.appendChild(h("div.split.even",
          h("div.callout", h("b", "Sonnenzeit ≠ Sommerzeit. "), "Das Diagramm zeigt wahre Sonnenzeit: 12 h = Sonne genau im Süden (Azimut 180°). Mit Sommerzeit (MESZ) steht die Sonne erst um ca. 13:00–13:30 im Süden; für den exakten Abgleich die Winterzeit verwenden."),
          h("div.callout", h("b", "Planungsprinzip. "), "Im Winter tief (", fmt(90 - SO.lat - 23.45, 0), "° um 12 h): viel Sonne soll durchs Fenster. Im Sommer hoch (", fmt(90 - SO.lat + 23.45, 0), "°): fixer Überhang schattiert. Horizontüberhöhung = Teil der Sonnenbahn, der von Bergen/Nachbargebäuden abgeschnitten wird.")));
      };
      const buildSide = () => {
        TP.clear(side);
        const dateSlider = slider("Datum (Tag im Jahr)", "", () => nOfDec(), v => { SO.dec = declOf(v); SO.date = dateOfN(v); QZ.on = false; QZ.hide = false; draw(); }, 1, 365, 1, 0);
        side.appendChild(h("div.card.pad", { style: { padding: "14px 16px" } }, h("div.label", { style: { marginBottom: "10px" } }, "Datum & Uhrzeit"),
          h("div.row", { style: { flexWrap: "wrap", gap: "6px", marginBottom: "10px" } }, [["21.6.", 172], ["22.9.", 265], ["21.12.", 355], ["21.3.", 80]].map(([l, N]) => h("button.btn.ghost", { onclick: () => { SO.dec = declOf(N); SO.date = l; QZ.on = false; QZ.hide = false; buildSide(); draw(); } }, l))),
          h("div.stack", { style: { gap: "12px" } }, dateSlider, slider("Sonnenzeit", "Uhr", () => SO.t, v => { SO.t = v; draw(); }, 4, 20, 0.25, 2))));
        side.appendChild(h("div.card.pad", { style: { padding: "14px 16px" } }, h("div.label", { style: { marginBottom: "10px" } }, "Standort"),
          h("div.stack", { style: { gap: "12px" } }, slider("Breite φ (Wien ≈ 48°)", "° N", () => SO.lat, v => { SO.lat = v; draw(); }, 0, 65, 0.5), slider("Horizontüberhöhung im Süden", "°", () => SO.obs, v => { SO.obs = v; draw(); }, 0, 50, 1, 0))));
      };
      out.appendChild(side); out.appendChild(main); el.appendChild(out); buildSide(); draw();
    },
  };
})(window.TP);
