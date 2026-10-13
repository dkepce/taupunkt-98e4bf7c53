/* Taupunkt — more labs: Taupunkt & Schimmel (VO8/VO4), Wärmeeindringung (VO10), Operative Temperatur (VO6/VO12) */
(function (TP) {
  const { h, svg } = TP;
  const P = TP.phys;
  const fmt = TP.fmt;

  /* tiny control builders shared by the labs */
  function numField(label, unit, get, set, step, min, max) {
    return h("label.field", h("span", label), h("div.inwrap", h("input.num", { type: "number", step, min, max, value: get(), oninput: e => { const v = parseFloat(e.target.value); if (isFinite(v)) set(v); } }), h("span.unit", unit)));
  }
  function slider(label, unit, get, set, min, max, step, dec) {
    const out = h("span.mono", fmt(get(), dec == null ? 1 : dec) + " " + unit);
    const inp = h("input", { type: "range", min, max, step, value: get(), oninput: e => { const v = parseFloat(e.target.value); set(v); out.textContent = fmt(v, dec == null ? 1 : dec) + " " + unit; } });
    return h("label.field", h("div.row.between", h("span", label), out), inp);
  }
  const kpi = (label, v, unit, cls) => h("div.kpi" + (cls ? "." + cls : ""), h("div.label", label), h("div.v", v, unit ? h("small", unit) : null));

  /* ===================================================================================
     Lab: Taupunkt & Schimmel — surface condensation, φ_si, f_Rsi
     =================================================================================== */
  const FS = TP.fs = { ti: 20, phii: 0.5, te: -10, U: 0.8, rsi: 0.13 };
  TP.labs.feuchte = {
    render(el) {
      const out = h("div.lab"), main = h("div.main");
      const draw = () => {
        const r = P.surface(FS.ti, FS.phii, FS.te, FS.U, FS.rsi);
        const crit = { mould: P.phiCrit(FS.ti, FS.te, FS.U, FS.rsi, 0.8), cond: P.phiCrit(FS.ti, FS.te, FS.U, FS.rsi, 1.0) };
        // largest U that avoids mould / condensation for the CURRENT room climate (bisection on U)
        const uMax = lim => { let lo = 0.01, hi = 6; for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; const x = P.surface(FS.ti, FS.phii, FS.te, mid, FS.rsi).phiSi; if (x > lim) hi = mid; else lo = mid; } return lo; };
        const uM = uMax(0.8), uC = uMax(1.0);
        TP.clear(main);
        const state = r.phiSi >= 1 ? "bad" : r.phiSi >= 0.8 ? "warn" : "ok";
        main.appendChild(h("div.kpis",
          kpi("θ_si (innere Oberfläche)", fmt(r.thSi, 2), "°C", r.thSi <= r.dew ? "bad" : ""),
          kpi("Taupunkt θ_S der Raumluft", fmt(r.dew, 2), "°C"),
          kpi("φ an der Oberfläche", fmt(r.phiSi * 100, 1), "%", state),
          kpi("f_Rsi", fmt(r.fRsi, 3), "", r.fRsi >= 0.71 ? "ok" : r.fRsi >= 0.69 ? "warn" : "bad")));
        main.appendChild(h("div.callout." + state,
          r.phiSi >= 1 ? [h("b", "Oberflächenkondensat: "), "θ_si ≤ θ_S — the surface is colder than the dew point of the room air, water condenses on it."] :
            r.phiSi >= 0.8 ? [h("b", "Schimmelgefahr: "), "no liquid water yet, but φ_si ≥ 80 % for long periods lets mould grow (Bedingung: Feuchtigkeit, Temperatur, Nahrung, Zeit)."] :
              [h("b", "Unkritisch: "), "φ_si < 80 % — neither condensation nor mould risk at this climate."]));
        /* p_S(θ) curve */
        const VW = 760, VH = 340, L = 60, R = VW - 20, T = 20, B = VH - 40, s = svg("svg", { class: "chart", viewBox: `0 0 ${VW} ${VH}` });
        const tMin = -20, tMax = 30, X = t => L + (t - tMin) / (tMax - tMin) * (R - L), pMax = 4500, Y = p => B - p / pMax * (B - T);
        const grid = svg("g.grid");
        [0, 1000, 2000, 3000, 4000].forEach(p => { grid.appendChild(svg("line", { x1: L, x2: R, y1: Y(p), y2: Y(p) })); s.appendChild(svg("text", { class: "gridlbl", x: L - 8, y: Y(p) + 4, "text-anchor": "end" }, p)); });
        for (let t = -20; t <= 30; t += 10) { grid.appendChild(svg("line", { x1: X(t), x2: X(t), y1: T, y2: B })); s.appendChild(svg("text", { class: "gridlbl", x: X(t), y: B + 16, "text-anchor": "middle" }, t)); }
        s.appendChild(grid);
        s.appendChild(svg("text", { x: 4, y: T - 6, style: "font-size:12px;fill:var(--ink3)" }, "p_S in Pa"));
        s.appendChild(svg("text", { x: (L + R) / 2, y: VH - 6, "text-anchor": "middle", style: "font-size:12px;fill:var(--ink3)" }, "Temperatur θ in °C"));
        let d = ""; for (let t = tMin; t <= tMax; t += 0.5) d += (t === tMin ? "M" : "L") + X(t).toFixed(1) + " " + Y(P.ps(t)).toFixed(1);
        s.appendChild(svg("path", { class: "psline", d }));
        // air state, dew point, surface
        const pAir = r.pAir;
        s.appendChild(svg("line", { x1: L, x2: R, y1: Y(pAir), y2: Y(pAir), stroke: "var(--p)", "stroke-width": 1.6, "stroke-dasharray": "6 4" }));
        s.appendChild(svg("text", { x: L + 6, y: Y(pAir) - 6, style: "font-size:12px;font-weight:600;fill:var(--p)" }, "p = φ·p_S(θ_i) = " + fmt(pAir, 0) + " Pa"));
        s.appendChild(svg("circle", { cx: X(FS.ti), cy: Y(pAir), r: 5, fill: "var(--p)" }));
        s.appendChild(svg("text", { x: X(FS.ti), y: Y(pAir) + 18, "text-anchor": "middle", style: "font-size:12px;font-weight:600" }, "Raumluft"));
        s.appendChild(svg("line", { x1: X(r.dew), x2: X(r.dew), y1: Y(pAir), y2: B, stroke: "var(--ink2)", "stroke-width": 1.2, "stroke-dasharray": "3 3" }));
        s.appendChild(svg("circle", { cx: X(r.dew), cy: Y(pAir), r: 5.5, fill: "var(--surface)", stroke: "var(--ps)", "stroke-width": 2.6 }));
        s.appendChild(svg("text", { x: X(r.dew) - 8, y: B - 8, "text-anchor": "end", style: "font-size:12px;font-weight:700;fill:var(--ps)" }, "Taupunkt " + fmt(r.dew, 1) + " °C"));
        const sx = X(Math.max(tMin, r.thSi)), colr = r.thSi <= r.dew ? "var(--bad)" : "var(--ok)";
        s.appendChild(svg("line", { x1: sx, x2: sx, y1: B, y2: Y(P.ps(Math.max(tMin, r.thSi))), stroke: colr, "stroke-width": 2.4 }));
        s.appendChild(svg("circle", { cx: sx, cy: Y(P.ps(Math.max(tMin, r.thSi))), r: 5, fill: colr }));
        s.appendChild(svg("text", { x: sx + 8, y: B - 10, style: `font-size:12px;font-weight:700;fill:${colr}` }, "θ_si " + fmt(r.thSi, 1) + " °C"));
        const card = h("div.card.pad", h("h3", "Sättigungsdruck & Taupunkt"), s,
          h("div.legend-row", h("span", h("i", { style: { background: "var(--ps)" } }), "p_S(θ) — Magnus, keine Gerade"), h("span", h("i", { style: { background: "var(--p)" } }), "Dampfdruck der Raumluft"), h("span", "Wo die Linie p die Kurve p_S trifft, liegt der Taupunkt")));
        main.appendChild(card);
        /* gauges */
        const gauge = (label, v, lo, hi, marks, fmtv) => {
          const g = svg("svg", { viewBox: "0 0 360 54", class: "chart" });
          g.appendChild(svg("rect", { x: 10, y: 22, width: 340, height: 10, rx: 5, fill: "var(--surface3)" }));
          marks.forEach(m => { const x = 10 + (m.at - lo) / (hi - lo) * 340; g.appendChild(svg("line", { x1: x, x2: x, y1: 14, y2: 40, stroke: m.c, "stroke-width": 2 })); g.appendChild(svg("text", { x, y: 52, "text-anchor": "middle", style: `font-size:11px;fill:${m.c}` }, m.t)); });
          const x = 10 + Math.max(0, Math.min(1, (v - lo) / (hi - lo))) * 340;
          g.appendChild(svg("circle", { cx: x, cy: 27, r: 8, fill: "var(--accent)", stroke: "var(--surface)", "stroke-width": 2 }));
          g.appendChild(svg("text", { x, y: 12, "text-anchor": "middle", style: "font-size:12px;font-weight:700;fill:var(--ink)" }, fmtv(v)));
          return h("div", h("div.label", label), g);
        };
        main.appendChild(h("div.card.pad", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "18px" } },
          gauge("φ an der Oberfläche", r.phiSi, 0, 1.2, [{ at: 0.8, c: "var(--warn)", t: "80 % Schimmel" }, { at: 1, c: "var(--bad)", t: "100 % Kondensat" }], v => fmt(v * 100, 0) + " %"),
          gauge("Temperaturfaktor f_Rsi", r.fRsi, 0.4, 1, [{ at: 0.69, c: "var(--warn)", t: "0,69 Kond." }, { at: 0.71, c: "var(--ok)", t: "0,71 Schimmel" }], v => fmt(v, 3))));
        main.appendChild(h("div.card.pad.flat",
          h("div.label", "Was wäre wenn?"),
          h("div.grid", { style: { gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", marginTop: "8px" } },
            h("div", h("div", "Größte zulässige Raumluftfeuchte (U = ", fmt(FS.U, 2), "):"), h("div.mono", { style: { fontSize: "17px", marginTop: "4px" } }, "φ_krit,Kondensat = " + fmt(Math.min(1, P.phiCritLecture(FS.ti, r.thSi)) * 100, 2) + " %"), h("div.mono.muted", "φ_krit,Schimmel (φ_si = 80 %) = " + fmt(Math.min(1, crit.mould) * 100, 1) + " %"), h("div.faint", { style: { fontSize: "12px", marginTop: "2px" } }, "Kondensat: Formelsammlung-Formel Θ_S = φ^(1/8)(110+θ_i)−110 (VO8-Beispiel U = 0,8 → 82,34 %). Mit Magnus exakt: " + fmt(Math.min(1, crit.cond) * 100, 1) + " %.")),
            h("div", h("div", "Größtes U, bei dem φ_si unter 80 % bleibt (bei ", fmt(FS.phii * 100, 0), " % r.F.):"), h("div.mono", { style: { fontSize: "17px", marginTop: "4px" } }, "U ≤ " + fmt(uM, 2) + " W/m²K"), h("div.mono.muted", "(Kondensat erst ab U > " + fmt(uC, 2) + ")"))),
          TP.texEl("\\theta_{si}=\\theta_i-U\\,R_{si}\\,(\\theta_i-\\theta_e),\\qquad \\Theta_S=\\varphi^{1/8}\\,(110+\\theta_i)-110", true)));
      };
      const wallBtn = h("button.btn.sm", { onclick: () => { FS.U = P.round(TP.wallStack().U, 3); FS.ti = TP.wall.cond.ti; FS.phii = TP.wall.cond.phii; FS.te = TP.wall.cond.te; FS.rsi = TP.wall.cond.rsi; el.replaceChildren(); TP.labs.feuchte.render(el); } }, "U von meinem Wandaufbau übernehmen");
      const side = h("div.side", h("div.card.pad", { style: { padding: "14px 16px" } }, h("div.label", { style: { marginBottom: "10px" } }, "Raum & Bauteil"),
        h("div.stack", { style: { gap: "12px" } },
          slider("Raumtemperatur θ_i", "°C", () => FS.ti, v => { FS.ti = v; draw(); }, 15, 26, 0.5),
          slider("Raumluftfeuchte φ_i", "%", () => FS.phii * 100, v => { FS.phii = v / 100; draw(); }, 20, 90, 1, 0),
          slider("Außentemperatur θ_e", "°C", () => FS.te, v => { FS.te = v; draw(); }, -20, 10, 0.5),
          slider("U-Wert des Bauteils", "W/m²K", () => FS.U, v => { FS.U = v; draw(); }, 0.1, 3, 0.01, 2),
          h("label.field", h("span", "R_si"), h("select", { onchange: e => { FS.rsi = +e.target.value; draw(); } }, [["0.13", "0,13 — ebenes Bauteil"], ["0.25", "0,25 — Ecke / Wärmebrücke"], ["0.35", "0,35 — Ecke, abwärts"]].map(([v, t]) => h("option", { value: v, selected: Math.abs(FS.rsi - +v) < 1e-9 }, t)))),
          wallBtn)),
        h("div.callout", h("b", "Exam: "), "“so gut wie bei jeder Prüfung” — solve for θ_si, φ, θ_S or U. Sehr gern: critical φ for a given U (here the sliders do the solving for you)."));
      out.appendChild(side); out.appendChild(main); el.appendChild(out); draw();
    },
  };

  /* ===================================================================================
     Lab: Wärmeeindringung — Kontakttemperatur (b), Diffusivität (a), Zeitkonstante (τ)
     =================================================================================== */
  const SKIN = { id: "haut", name: "Haut (Finger)", lam: 0.37, rho: 1000, c: 3500 };
  const KT = { m1: "haut", t1: 34, m2: "stahl", t2: 20, tauH: 40, gamma: 6, amp: 8, mean: 6 };
  const matOf = id => (id === "haut" ? SKIN : P.MAT[id]);
  TP.labs.kontakt = {
    render(el) {
      const out = h("div.lab"), main = h("div.main");
      const MS = [SKIN].concat(P.MATS.filter(m => m.kind !== "barrier" && m.kind !== "glass" || m.id === "glas"));
      const sel = (get, set) => h("select", { onchange: e => set(e.target.value) }, MS.map(m => h("option", { value: m.id, selected: m.id === get() }, m.name)));
      const draw = () => {
        TP.clear(main);
        /* A: contact temperature */
        const a = matOf(KT.m1), b = matOf(KT.m2), b1 = P.b(a.lam, a.rho, a.c), b2 = P.b(b.lam, b.rho, b.c), tc = P.contact(b1, KT.t1, b2, KT.t2);
        const A = h("div.card.pad", h("div.row.between", h("h3", "Kontakttemperatur"), h("span.faint", { style: { fontSize: "12.5px" } }, "θ_c = (b₁θ₁ + b₂θ₂) / (b₁ + b₂)")));
        const VW = 760, VH = 150, L = 40, R = VW - 40;
        const lo = Math.min(KT.t1, KT.t2, tc) - 3, hi = Math.max(KT.t1, KT.t2, tc) + 3, X = t => L + (t - lo) / (hi - lo) * (R - L);
        const s = svg("svg", { class: "chart", viewBox: `0 0 ${VW} ${VH}` });
        s.appendChild(svg("line", { x1: L, x2: R, y1: 80, y2: 80, stroke: "var(--ink3)", "stroke-width": 1.2 }));
        const tick = (t, label, col, up, bold) => { s.appendChild(svg("line", { x1: X(t), x2: X(t), y1: 80, y2: up ? 46 : 114, stroke: col, "stroke-width": bold ? 3 : 2 })); s.appendChild(svg("circle", { cx: X(t), cy: 80, r: bold ? 8 : 5, fill: col })); s.appendChild(svg("text", { x: X(t), y: up ? 38 : 130, "text-anchor": "middle", style: `font-size:${bold ? 14 : 12.5}px;font-weight:${bold ? 700 : 600};fill:${col}` }, label)); };
        tick(KT.t1, a.name + " " + fmt(KT.t1, 1) + " °C", "var(--ps)", true); tick(KT.t2, b.name + " " + fmt(KT.t2, 1) + " °C", "var(--p)", true); tick(tc, "θ_c = " + fmt(tc, 1) + " °C", "var(--ink)", false, true);
        A.appendChild(s);
        const share = b1 / (b1 + b2);
        A.appendChild(h("div.kpis", { style: { marginTop: "6px" } }, kpi("b₁ " + a.name, fmt(b1, 0), "Ws½/m²K"), kpi("b₂ " + b.name, fmt(b2, 0), "Ws½/m²K"), kpi("θ_c", fmt(tc, 1), "°C"),
          kpi("Es fühlt sich an wie", tc > 30 ? "warm" : tc > 25 ? "lauwarm" : "kalt", "", tc > 30 ? "ok" : tc > 25 ? "warn" : "bad")));
        A.appendChild(h("div.callout", { style: { marginTop: "10px" } }, h("b", "Warum? "), "The material with the larger b dominates the contact temperature: θ_c lies ", fmt(share * 100, 0), " % of the way from θ₂ toward θ₁ ", "(b₁ is ", fmt(b1 / b2, b1 / b2 > 10 ? 0 : 1), "× b₂). Both objects are physically at their own temperature — only the ", h("i", "contact"), " temperature differs. That is why metal feels colder than wood at the same temperature."));
        main.appendChild(A);
        /* B: diffusivity vs conductivity */
        const list = ["holz", "beton", "eps", "mw", "ziegel", "stahl", "kupfer"].map(id => { const m = P.MAT[id]; return { m, lam: m.lam, a: P.a(m.lam, m.rho, m.c), rc: m.rho * m.c, b: P.b(m.lam, m.rho, m.c) }; });
        const B = h("div.card.pad", h("div.row.between", h("h3", "λ ist nicht alles: Temperaturleitfähigkeit"), h("span.faint", { style: { fontSize: "12.5px" } }, "a = λ / (ρ·c)")));
        const bw = 740, bh = list.length * 34 + 26, bs = svg("svg", { class: "chart", viewBox: `0 0 ${bw} ${bh}` });
        const col = (x0, key, label, color, min, max, unit) => {
          const lg = v => Math.log10(v); const W = 200;
          bs.appendChild(svg("text", { x: x0, y: 14, style: "font-size:12px;font-weight:700;fill:var(--ink2)" }, label));
          list.forEach((r, i) => { const v = r[key], w = Math.max(3, (lg(v) - lg(min)) / (lg(max) - lg(min)) * W); bs.appendChild(svg("rect", { x: x0, y: 26 + i * 34, width: w, height: 18, rx: 3, fill: color })); bs.appendChild(svg("text", { x: x0 + w + 6, y: 26 + i * 34 + 13, style: "font-size:12px;font-family:var(--mono);fill:var(--ink)" }, (v < 0.01 ? v.toExponential(1).replace(".", ",") : fmt(v, v < 1 ? 3 : v < 100 ? 2 : 0)) + " " + unit)); });
        };
        list.forEach((r, i) => bs.appendChild(svg("text", { x: 0, y: 26 + i * 34 + 13, style: "font-size:13px;font-weight:600;fill:var(--ink)" }, r.m.name.replace(/ \(.*\)/, ""))));
        col(130, "lam", "Wärmeleitfähigkeit λ  (log)", "var(--lane-thermal)", 0.02, 500, "W/mK");
        col(430, "a", "Temperaturleitfähigkeit a  (log)", "var(--accent)", 1e-8, 2e-4, "m²/s");
        B.appendChild(bs);
        B.appendChild(h("div.callout.warn", h("b", "The counter-intuitive result: "), "EPS has the lowest λ but a larger a than concrete or timber — because ρ·c is tiny. Little heat flows (low λ), but there is hardly any material to heat up, so its temperature reacts quickly. (VO10 Mentimeter: “most answered incorrectly the first time”.)"));
        main.appendChild(B);
        /* C: Zeitkonstante */
        const C = h("div.card.pad", h("div.row.between", h("h3", "Zeitkonstante τ = C / H: Speichermasse dämpft"), h("span.faint", { style: { fontSize: "12.5px" } }, "θ_i + τ·dθ_i/dt = θ_e + γ·E_ST")));
        const VW2 = 760, VH2 = 270, L2 = 50, R2 = VW2 - 16, T2 = 16, B2 = VH2 - 34;
        const dt = 0.1, N = 72 / dt, tex = [], tin = [];
        let ti = KT.mean + KT.gamma * 0.5;
        for (let i = 0; i <= N; i++) {
          const t = i * dt, hr = t % 24;
          const te = KT.mean + KT.amp * Math.sin(2 * Math.PI * (t - 9) / 24);
          const E = hr > 6 && hr < 18 ? Math.sin(Math.PI * (hr - 6) / 12) : 0;
          const target = te + KT.gamma * E;
          ti += dt / KT.tauH * (target - ti);
          if (i % 5 === 0) { tex.push([t, te]); tin.push([t, ti]); }
        }
        const allv = tex.concat(tin).map(p => p[1]), ax = TP.niceAxis(Math.min(...allv) - 1, Math.max(...allv) + 1, 5);
        const X2 = t => L2 + t / 72 * (R2 - L2), Y2 = v => B2 - (v - ax.min) / (ax.max - ax.min) * (B2 - T2);
        const cs = svg("svg", { class: "chart", viewBox: `0 0 ${VW2} ${VH2}` }), gg = svg("g.grid");
        ax.ticks.forEach(t => { gg.appendChild(svg("line", { x1: L2, x2: R2, y1: Y2(t), y2: Y2(t) })); cs.appendChild(svg("text", { class: "gridlbl", x: L2 - 8, y: Y2(t) + 4, "text-anchor": "end" }, fmt(t, 0))); });
        for (let t = 0; t <= 72; t += 12) { gg.appendChild(svg("line", { x1: X2(t), x2: X2(t), y1: T2, y2: B2 })); cs.appendChild(svg("text", { class: "gridlbl", x: X2(t), y: B2 + 16, "text-anchor": "middle" }, t + " h")); }
        cs.appendChild(gg);
        const path = pts => pts.map((p, i) => (i ? "L" : "M") + X2(p[0]).toFixed(1) + " " + Y2(p[1]).toFixed(1)).join("");
        cs.appendChild(svg("path", { d: path(tex), fill: "none", stroke: "var(--p)", "stroke-width": 2, "stroke-dasharray": "5 4" }));
        cs.appendChild(svg("path", { d: path(tin), fill: "none", stroke: "var(--ps)", "stroke-width": 2.6 }));
        C.appendChild(cs);
        C.appendChild(h("div.legend-row", h("span", h("i", { style: { background: "var(--p)" } }), "Außentemperatur θ_e (Tagesgang)"), h("span", h("i", { style: { background: "var(--ps)" } }), "Raumtemperatur θ_i (freilaufend, mit Sonne)")));
        C.appendChild(h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "12px", marginTop: "10px" } },
          slider("Zeitkonstante τ", "h", () => KT.tauH, v => { KT.tauH = v; draw(); }, 1, 300, 1, 0),
          slider("Solargewinn-Faktor γ·E", "K", () => KT.gamma, v => { KT.gamma = v; draw(); }, 0, 15, 0.5),
          slider("Tagesamplitude außen", "K", () => KT.amp, v => { KT.amp = v; draw(); }, 0, 15, 0.5)));
        C.appendChild(h("div.faint", { style: { fontSize: "12.5px", marginTop: "6px" } }, "Small τ (light building): θ_i follows the weather closely. Large τ (heavy building): the swing is damped and delayed — the reason thermal mass helps in summer."));
        main.appendChild(C);
      };
      const side = h("div.side", h("div.card.pad", { style: { padding: "14px 16px" } }, h("div.label", { style: { marginBottom: "10px" } }, "Körper 1 und 2"),
        h("div.stack", { style: { gap: "12px" } },
          h("label.field", h("span", "Körper 1"), sel(() => KT.m1, v => { KT.m1 = v; draw(); })),
          numField("Temperatur θ₁", "°C", () => KT.t1, v => { KT.t1 = v; draw(); }, 0.5),
          h("label.field", h("span", "Körper 2"), sel(() => KT.m2, v => { KT.m2 = v; draw(); })),
          numField("Temperatur θ₂", "°C", () => KT.t2, v => { KT.t2 = v; draw(); }, 0.5),
          h("div.row", h("button.btn.sm", { onclick: () => { Object.assign(KT, { m1: "haut", t1: 34, m2: "eps", t2: 20 }); el.replaceChildren(); TP.labs.kontakt.render(el); } }, "Haut ↔ Polystyrol"), h("button.btn.sm", { onclick: () => { Object.assign(KT, { m1: "haut", t1: 34, m2: "kupfer", t2: 20 }); el.replaceChildren(); TP.labs.kontakt.render(el); } }, "Haut ↔ Kupfer")))),
        h("div.callout", h("b", "Formelsammlung: "), TP.texEl("b=\\sqrt{\\lambda\\,\\rho\\,c},\\quad a=\\frac{\\lambda}{\\rho\\,c},\\quad \\theta_c=\\frac{b_1\\theta_1+b_2\\theta_2}{b_1+b_2}")));
      out.appendChild(side); out.appendChild(main); el.appendChild(out); draw();
    },
  };

  /* ===================================================================================
     Lab: Operative Temperatur & adaptiver Komfort
     =================================================================================== */
  const OP = { tl: 19, surfs: [["Fenster", 4, 11], ["Außenwand", 20, 16], ["Innenwände (inkl. Tür)", 56, 22], ["Decke", 24, 19], ["Fußboden", 24, 23]], trm: 15, lim: 2.5, k: "vo6", mode: "op" };
  TP.labs.komfort = {
    render(el) {
      const out = h("div.lab"), main = h("div.main");
      const draw = () => {
        TP.clear(main);
        const At = OP.surfs.reduce((s, r) => s + r[1], 0), tr = OP.surfs.reduce((s, r) => s + r[1] * r[2], 0) / At, top = (OP.tl + tr) / 2;
        const K = OP.k === "vo6" ? [0.31, 17.8] : [0.33, 18.8];
        const tc = K[0] * OP.trm + K[1], lo = tc - OP.lim, hi = tc + OP.lim, inside = top >= lo && top <= hi;
        main.appendChild(h("div.kpis", kpi("Mittlere Strahlungstemp. θ̄_r", fmt(tr, 2), "°C"), kpi("Operative Temp. θ_op", fmt(top, 2), "°C"),
          kpi("Komforttemperatur (adaptiv)", fmt(tc, 1), "°C"), kpi("Akzeptanzband", fmt(lo, 1) + " – " + fmt(hi, 1), "°C", inside ? "ok" : "bad")));
        main.appendChild(h("div.callout" + (inside ? ".ok" : ".warn"), inside ? [h("b", "Im Komfortband. "), "θ_op liegt innerhalb ±", fmt(OP.lim, 1), " K um die adaptive Komforttemperatur (nur für natürlich belüftete Gebäude gültig)."] :
          [h("b", "Außerhalb des Bandes. "), "θ_op = ", fmt(top, 1), " °C ", top < lo ? "ist zu kalt" : "ist zu warm", " für T_rm = ", fmt(OP.trm, 0), " °C."]));
        /* room as a plan: surfaces with temperatures */
        const VW = 760, VH = 150, s = svg("svg", { class: "chart", viewBox: `0 0 ${VW} ${VH}` });
        const allT = OP.surfs.map(r => r[2]).concat([OP.tl]), t0 = Math.min(...allT) - 2, t1 = Math.max(...allT) + 2;
        const colorOf = t => { const f = (t - t0) / (t1 - t0); return `color-mix(in srgb, var(--ps) ${Math.round(f * 100)}%, var(--p))`; };
        let x = 14; const tot = VW - 28 - (OP.surfs.length - 1) * 6;
        OP.surfs.forEach(r => { const w = Math.max(34, r[1] / At * tot); s.appendChild(svg("rect", { x, y: 24, width: w, height: 70, rx: 6, fill: colorOf(r[2]), opacity: 0.88 })); s.appendChild(svg("text", { x: x + w / 2, y: 56, "text-anchor": "middle", style: "font-size:14px;font-weight:700;fill:#fff" }, fmt(r[2], 0) + " °C")); s.appendChild(svg("text", { x: x + w / 2, y: 76, "text-anchor": "middle", style: "font-size:11px;fill:#fff" }, r[1] + " m²")); s.appendChild(svg("text", { x: x + w / 2, y: 114, "text-anchor": "middle", style: "font-size:11.5px;fill:var(--ink2)" }, r[0].replace(/ \(.*\)/, ""))); x += w + 6; });
        s.appendChild(svg("text", { x: 14, y: 14, style: "font-size:11.5px;fill:var(--ink3)" }, "Flächen proportional zur Größe — Farbe = Oberflächentemperatur"));
        main.appendChild(h("div.card.pad", h("h3", "Raumumschließungsflächen"), s,
          TP.texEl("\\bar\\theta_r=\\frac{\\sum A_i\\,\\theta_{s,i}}{A_{ges}}=" + TP.txNum(tr, 2) + "\\,^\\circ\\mathrm{C},\\qquad \\theta_{op}\\approx\\frac{\\theta_L+\\bar\\theta_r}{2}=\\frac{" + TP.txNum(OP.tl, 1) + "+" + TP.txNum(tr, 2) + "}{2}=" + TP.txNum(top, 2) + "\\,^\\circ\\mathrm{C}", true)));
        /* adaptive chart */
        const W2 = 760, H2 = 300, L2 = 52, R2 = W2 - 16, T2 = 16, B2 = H2 - 36, cs = svg("svg", { class: "chart", viewBox: `0 0 ${W2} ${H2}` });
        const xr = [-10, 30], yr = [14, 34], X2 = v => L2 + (v - xr[0]) / (xr[1] - xr[0]) * (R2 - L2), Y2 = v => B2 - (v - yr[0]) / (yr[1] - yr[0]) * (B2 - T2);
        const gg = svg("g.grid");
        for (let v = 14; v <= 34; v += 4) { gg.appendChild(svg("line", { x1: L2, x2: R2, y1: Y2(v), y2: Y2(v) })); cs.appendChild(svg("text", { class: "gridlbl", x: L2 - 8, y: Y2(v) + 4, "text-anchor": "end" }, v)); }
        for (let v = -10; v <= 30; v += 10) { gg.appendChild(svg("line", { x1: X2(v), x2: X2(v), y1: T2, y2: B2 })); cs.appendChild(svg("text", { class: "gridlbl", x: X2(v), y: B2 + 16, "text-anchor": "middle" }, v)); }
        cs.appendChild(gg);
        const bandPath = "M" + [xr[0], xr[1]].map(v => X2(v) + " " + Y2(K[0] * v + K[1] + OP.lim)).join("L") + "L" + [xr[1], xr[0]].map(v => X2(v) + " " + Y2(K[0] * v + K[1] - OP.lim)).join("L") + "Z";
        cs.appendChild(svg("path", { d: bandPath, fill: "var(--ok-soft)", stroke: "var(--ok)", "stroke-width": 1 }));
        cs.appendChild(svg("path", { d: `M${X2(xr[0])} ${Y2(K[0] * xr[0] + K[1])}L${X2(xr[1])} ${Y2(K[0] * xr[1] + K[1])}`, stroke: "var(--ok)", "stroke-width": 2, fill: "none" }));
        cs.appendChild(svg("circle", { cx: X2(OP.trm), cy: Y2(Math.max(yr[0], Math.min(yr[1], top))), r: 7, fill: inside ? "var(--ok)" : "var(--bad)", stroke: "var(--surface)", "stroke-width": 2 }));
        cs.appendChild(svg("text", { x: X2(OP.trm) + 11, y: Y2(Math.max(yr[0], Math.min(yr[1], top))) + 4, style: "font-size:12px;font-weight:700;fill:var(--ink)" }, "θ_op " + fmt(top, 1)));
        cs.appendChild(svg("text", { x: 4, y: 12, style: "font-size:12px;fill:var(--ink3)" }, "θ_op in °C"));
        cs.appendChild(svg("text", { x: (L2 + R2) / 2, y: H2 - 4, "text-anchor": "middle", style: "font-size:12px;fill:var(--ink3)" }, "Mittlere Außentemperatur T_rm in °C"));
        main.appendChild(h("div.card.pad", h("div.row.between", h("h3", "Adaptives Komfortmodell"), h("span.faint", { style: { fontSize: "12.5px" } }, "T_komfort = " + fmt(K[0], 2) + " · T_rm + " + fmt(K[1], 1))), cs,
          h("div.callout", h("b", "Only for naturally ventilated buildings"), " — in air-conditioned buildings the classical PMV/PPD bands apply. Note: VO6 uses 0,31 / 17,8, VO12 uses 0,33 / 18,8 (a deliberate discrepancy in the course material; toggle on the left). T_lim is not in the lecture notes — ASHRAE 55: ±2,5 K (90 %), ±3,5 K (80 %).")));
      };
      const surfCtl = () => h("div.stack", { style: { gap: "6px" } }, OP.surfs.map((r, i) => h("div", { style: { display: "grid", gridTemplateColumns: "1fr 64px 64px", gap: "6px", alignItems: "center" } },
        h("span", { style: { fontSize: "13px" } }, r[0]),
        h("div.inwrap", h("input.num", { type: "number", value: r[1], min: 0, step: 1, style: { paddingRight: "26px" }, oninput: e => { const v = parseFloat(e.target.value); if (v >= 0) { r[1] = v; draw(); } } }), h("span.unit", "m²")),
        h("div.inwrap", h("input.num", { type: "number", value: r[2], step: 0.5, style: { paddingRight: "26px" }, oninput: e => { const v = parseFloat(e.target.value); if (isFinite(v)) { r[2] = v; draw(); } } }), h("span.unit", "°C")))));
      const side = h("div.side", h("div.card.pad", { style: { padding: "14px 16px" } }, h("div.label", { style: { marginBottom: "10px" } }, "Wohnzimmer (VO12-Beispiel)"),
        h("div.stack", { style: { gap: "12px" } }, surfCtl(), numField("Lufttemperatur θ_L", "°C", () => OP.tl, v => { OP.tl = v; draw(); }, 0.5))),
        h("div.card.pad", { style: { padding: "14px 16px" } }, h("div.label", { style: { marginBottom: "10px" } }, "Adaptiver Komfort"),
          h("div.stack", { style: { gap: "12px" } },
            slider("T_rm (Außen, gleitendes Mittel)", "°C", () => OP.trm, v => { OP.trm = v; draw(); }, -10, 30, 0.5),
            h("label.field", h("span", "Konstanten"), h("select", { onchange: e => { OP.k = e.target.value; draw(); } }, [["vo6", "VO6: 0,31·T_rm + 17,8"], ["vo12", "VO12: 0,33·T_rm + 18,8"]].map(([v, t]) => h("option", { value: v, selected: OP.k === v }, t)))),
            h("label.field", h("span", "Akzeptanzband"), h("select", { onchange: e => { OP.lim = +e.target.value; draw(); } }, [["2.5", "90 % zufrieden: ±2,5 K"], ["3.5", "80 % zufrieden: ±3,5 K"]].map(([v, t]) => h("option", { value: v, selected: OP.lim === +v }, t)))))));
      out.appendChild(side); out.appendChild(main); el.appendChild(out); draw();
    },
  };
})(window.TP);
