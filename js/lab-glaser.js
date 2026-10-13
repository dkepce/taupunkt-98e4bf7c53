/* Taupunkt — Glaser lab: the diagram, the Seileck, G_K / G_A, rules of thumb, goal check */
(function (TP) {
  const { h, svg } = TP;
  const P = TP.phys;
  let mode = "tau";               // "tau" (winter) | "dry" (summer)

  const tx = (v, d) => TP.fmt(v, d).replace(",", "{,}");
  const sci = (v) => { if (!isFinite(v) || v === 0) return "0"; const e = Math.floor(Math.log10(Math.abs(v))); return tx(v / Math.pow(10, e), 3) + "\\cdot10^{" + e + "}"; };
  TP.sciTex = sci; TP.txNum = tx;

  /* ---------- the diagram ---------- */
  function chart(g, cond, which) {
    const VW = 780, VH = 460, band = 16, T = 40, B = 318, xL = 74 + band, xR = VW - 26 - band;
    const s = svg("svg", { class: "chart", viewBox: `0 0 ${VW} ${VH}`, role: "img", "aria-label": "Glaser diagram" });
    const pfx = "g" + TP.uid() + "-";
    s.appendChild(TP.matDefs(pfx));
    const S = g.S, n = g.st.rows.length;
    const dry = which === "dry";
    const th = dry ? g.dry.th : g.st.th;
    const pSat = th.map(P.ps);
    const pa = dry ? g.dry.pDi : g.pi, pb = dry ? g.dry.pDe : g.pe;
    const airA = P.ps(dry ? g.dry.cond.ti : cond.ti), airB = P.ps(dry ? g.dry.cond.te : cond.te);
    const pMax = Math.max(pa, pb, airA, airB, ...pSat) * 1.07;
    const ya = TP.niceAxis(0, pMax, 6), xa = TP.niceAxis(0, S, 7);
    const X = v => xL + v / S * (xR - xL), Y = p => B - p / ya.max * (B - T);
    const grid = svg("g.grid");
    ya.ticks.forEach(t => { grid.appendChild(svg("line", { x1: xL - band, x2: xR + band, y1: Y(t), y2: Y(t) })); s.appendChild(svg("text", { class: "gridlbl", x: xL - band - 8, y: Y(t) + 4, "text-anchor": "end" }, TP.fmt(t, 0))); });
    xa.ticks.filter(t => t <= S + 1e-9).forEach(t => { grid.appendChild(svg("line", { x1: X(t), x2: X(t), y1: T, y2: B })); s.appendChild(svg("text", { class: "gridlbl", x: X(t), y: B + 60, "text-anchor": "middle" }, TP.fmt(t, xa.step < 1 ? 1 : 0))); });
    s.insertBefore(grid, s.children[1]);
    s.appendChild(svg("text", { x: 4, y: T - 18, style: "font-size:12px;fill:var(--ink3)" }, "Dampfdruck p, p_S in Pa"));
    // layer bands under the axis
    const by = B + 8, bh = 34;
    s.appendChild(svg("rect", { x: xL - band, y: by, width: band, height: bh, fill: "var(--surface3)", stroke: "var(--ink3)", "stroke-width": .8 }));
    s.appendChild(svg("rect", { x: xR, y: by, width: band, height: bh, fill: "var(--surface3)", stroke: "var(--ink3)", "stroke-width": .8 }));
    g.st.rows.forEach((r, i) => {
      const x1 = X(g.x[i]), x2 = X(g.x[i + 1]), w = Math.max(1.2, x2 - x1);
      s.appendChild(svg("rect", { x: x1, y: by, width: w, height: bh, fill: TP.matPaint(pfx, r.kind), stroke: "var(--ink3)", "stroke-width": .8 }));
      if (w > 15) s.appendChild(svg("text", { x: x1 + w / 2, y: by + bh / 2 + 4, "text-anchor": "middle", style: "font-weight:700;font-size:12px;fill:var(--ink);paint-order:stroke;stroke:var(--surface);stroke-width:3px" }, i + 1));
    });
    s.appendChild(svg("text", { x: (xL + xR) / 2, y: VH - 4, "text-anchor": "middle", style: "font-size:12px;fill:var(--ink3)" }, "µ · d  (äquivalente Luftschichtdicke s_d) in m — ein Maßstab, nicht gestaucht"));
    s.appendChild(svg("line", { x1: xL, x2: xR, y1: B, y2: B, class: "ax" }));
    s.appendChild(svg("line", { x1: xL, x2: xL, y1: T, y2: B, class: "ax" }));

    // saturation polygon p_S (starts/ends at the air values on the surface bands)
    const poly = [[xL - band, airA]].concat(th.map((t, k) => [X(g.x[k]), pSat[k]])).concat([[xR + band, airB]]);
    const psPath = poly.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + Y(p[1]).toFixed(1)).join("");
    // partial pressure line
    let pPts;
    if (!dry) pPts = [[X(0), pa], [X(S), pb]];
    else {
      pPts = [[X(0), pa]]; g.dry.planes.forEach(pl => pPts.push([X(pl.x), pl.psD])); pPts.push([X(S), pb]);
    }
    if (!dry && g.condensate) {
      // Seileck area: between the straight line and the taut rope
      const hp = g.hull.map(v => [X(v.x), Y(v.y)]);
      s.appendChild(svg("path", { class: "condzone", d: "M" + hp.map(p => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "L" + X(S) + " " + Y(pb) + "L" + X(0) + " " + Y(pa) + "Z" }));
      s.appendChild(svg("path", { class: "rope", d: "M" + hp.map(p => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") }));
    }
    s.appendChild(svg("path", { class: "psline", d: psPath }));
    s.appendChild(svg("path", { class: "pline", d: pPts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + Y(p[1]).toFixed(1)).join(""), style: dry ? "stroke-dasharray:7 4" : "" }));
    // end markers
    [[X(0), pa, "p_i"], [X(S), pb, "p_e"]].forEach(([x, p, lab], i) => {
      s.appendChild(svg("circle", { cx: x, cy: Y(p), r: 4.2, fill: "var(--p)" }));
      s.appendChild(svg("text", { x: x + (i ? -8 : 8), y: Y(p) - 9, "text-anchor": i ? "end" : "start", style: "font-weight:700;font-size:12px;fill:var(--p)" }, (dry ? lab + "' " : lab + " ") + TP.fmt(p, 0) + " Pa"));
    });
    // Taupunkt annotations
    if (g.condensate && g.tau) {
      const m = g.main, xT = X(m.sdE);
      if (!dry) {
        s.appendChild(svg("circle", { cx: xT, cy: Y(g.tau.ps), r: 6, fill: "var(--surface)", stroke: "var(--ps)", "stroke-width": 2.6 }));
        s.appendChild(svg("text", { x: xT, y: Y(g.tau.ps) + 22, "text-anchor": "middle", style: "font-weight:700;font-size:12px;fill:var(--ps)" }, "Taupunkt  p_S = " + TP.fmt(g.tau.ps, 0) + " Pa"));
        [[X(0), xT, "s_d,e", m.sdE], [xT, X(S), "s_d,a", m.sdA]].forEach(([a, b, lab, v]) => {
          const y = T - 6;
          s.appendChild(svg("path", { d: `M${a} ${y - 5}V${y + 5}M${a} ${y}H${b}M${b} ${y - 5}V${y + 5}`, stroke: "var(--ink2)", "stroke-width": 1.3, fill: "none" }));
          s.appendChild(svg("text", { x: (a + b) / 2, y: y - 8, "text-anchor": "middle", style: "font-size:12px;font-weight:600;fill:var(--ink)" }, lab + " = " + TP.fmt(v, 2) + " m"));
        });
        s.appendChild(svg("line", { x1: xT, x2: xT, y1: T, y2: Y(g.tau.ps), stroke: "var(--ink3)", "stroke-width": 1, "stroke-dasharray": "2 3" }));
      } else if (g.dry.planes.length) {
        g.dry.planes.forEach(pl => { s.appendChild(svg("circle", { cx: X(pl.x), cy: Y(pl.psD), r: 5.5, fill: "var(--surface)", stroke: "var(--ps)", "stroke-width": 2.4 })); });
        const pl = g.mainDry;
        s.appendChild(svg("text", { x: X(pl.x), y: Y(pl.psD) - 12, "text-anchor": "middle", style: "font-weight:700;font-size:12px;fill:var(--ps)" }, "Kondensatebene: 100 % → p_S = " + TP.fmt(pl.psD, 0) + " Pa"));
      }
    }
    // hover
    const cross = svg("line", { class: "cross", y1: T, y2: B, style: { display: "none" } }); s.appendChild(cross);
    const tip = TP.svgTip(s, VW);
    const hit = svg("rect", { x: xL, y: T, width: xR - xL, height: B - T, fill: "transparent" });
    const interp = (xs, ys, v) => { for (let i = 0; i < xs.length - 1; i++) if (v >= xs[i] && v <= xs[i + 1]) { const t = xs[i + 1] === xs[i] ? 0 : (v - xs[i]) / (xs[i + 1] - xs[i]); return ys[i] + t * (ys[i + 1] - ys[i]); } return ys[ys.length - 1]; };
    hit.addEventListener("mousemove", e => {
      const r = s.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * VW, v = Math.max(0, Math.min(S, (px - xL) / (xR - xL) * S));
      const pLine = interp(pPts.map(p => (p[0] - xL) / (xR - xL) * S), pPts.map(p => p[1]), v), ps = interp(g.x, pSat, v);
      cross.setAttribute("x1", px); cross.setAttribute("x2", px); cross.style.display = "";
      const lines = ["µ·d = " + TP.fmt(v, 2) + " m", "p   = " + TP.fmt(pLine, 0) + " Pa", "p_S = " + TP.fmt(ps, 0) + " Pa"];
      if (!dry) lines.push(pLine > ps + 0.5 ? "p > p_S → Kondensat" : "p < p_S → trocken");
      tip.show(px, Y(pLine), lines);
    });
    hit.addEventListener("mouseleave", () => { cross.style.display = "none"; tip.hide(); });
    s.appendChild(hit);
    return s;
  }

  TP.glaserChart = chart;

  /* ---------- result / Rechenweg ---------- */
  function result(g, cond) {
    const out = h("div.stack");
    const st = g.st;
    if (!g.condensate) {
      out.appendChild(h("div.callout.ok", h("b", "Kein Kondensat. "), "The partial-pressure line stays below the saturation polygon everywhere (p < p_S at every layer boundary). In the exam: draw both lines, state “kein Kondensat”, and you are done — no Tauperiode/Trockenperiode needed."));
      return out;
    }
    if (!g.tau) {
      out.appendChild(h("div.callout.bad", h("b", "Oberflächenkondensat. "), "p_i exceeds p_S already at a surface (θ_si or θ_se is below the dew point). No condensate inside the layers is computed — the surface itself is the problem. See the Taupunkt & Schimmel lab."));
      return out;
    }
    const m = g.main, d = g.mainDry, hT = cond.hTau || 1440, hD = cond.hDry || 2160;
    const multi = g.planes.length > 1;
    out.appendChild(h("div.card.pad.flat",
      h("div.label", "Tauperiode (Winter) — Kondensatmenge"),
      TP.texEl("\\dot m_T=\\frac{\\Delta p_e}{1{,}5\\cdot10^{6}\\, s_{d,e}}-\\frac{\\Delta p_a}{1{,}5\\cdot10^{6}\\, s_{d,a}}=\\frac{" + tx(m.dpE, 0) + "}{1{,}5\\cdot10^{6}\\cdot" + tx(m.sdE, 2) + "}-\\frac{" + tx(m.dpA, 0) + "}{1{,}5\\cdot10^{6}\\cdot" + tx(m.sdA, 2) + "}=" + sci(m.mT) + "\\ \\mathrm{kg/(m^2h)}", true),
      TP.texEl("G_K=" + hT + "\\cdot\\dot m_T=\\mathbf{" + tx(m.GK, 3) + "}\\ \\mathrm{kg/m^2}", true)));
    out.appendChild(h("div.card.pad.flat",
      h("div.label", "Trockenperiode (Sommer) — Austrocknung"),
      TP.texEl("\\dot m_A=\\frac{p_{S}-p_i'}{1{,}5\\cdot10^{6}\\, s_{d,e}}+\\frac{p_{S}-p_e'}{1{,}5\\cdot10^{6}\\, s_{d,a}}=\\frac{" + tx(d.dp1, 0) + "}{1{,}5\\cdot10^{6}\\cdot" + tx(m.sdE, 2) + "}+\\frac{" + tx(d.dp2, 0) + "}{1{,}5\\cdot10^{6}\\cdot" + tx(m.sdA, 2) + "}=" + sci(d.mA) + "\\ \\mathrm{kg/(m^2h)}", true),
      TP.texEl("G_A=" + hD + "\\cdot\\dot m_A=\\mathbf{" + tx(d.GA, 3) + "}\\ \\mathrm{kg/m^2}", true)));
    if (multi) {
      const t = h("table.data", h("thead", h("tr", ["Ebene (nach Schicht)", "µd [m]", "p_S [Pa]", "Δp_e", "s_d,e", "Δp_a", "s_d,a", "G_K [kg/m²]"].map(c => h("th", c)))));
      const tb = h("tbody");
      g.planes.forEach(p => tb.appendChild(h("tr", [p.k + " " + st.rows[p.k - 1].name, TP.fmt(p.x, 2), TP.fmt(p.ps, 0), TP.fmt(p.dpE, 0), TP.fmt(p.sdE, 2), TP.fmt(p.dpA, 0), TP.fmt(p.sdA, 2), TP.fmt(p.GK, 3)].map(c => h("td", c)))));
      t.appendChild(tb);
      out.appendChild(h("div.callout.warn", h("b", "Mehrere Unterschneidungen: "), "the taut rope (Seileck) touches the saturation polygon at ", g.planes.length, " planes — a polygon, not a triangle (marking only one Taupunkt is the named favourite mistake). The headline numbers above use the full balance: G_K = ", TP.fmt(g.GKall, 3), " kg/m², G_A = ", TP.fmt(g.GAall, 3), " kg/m². The lecture's single-Taupunkt shortcut (greatest distance, s_d,e = ", TP.fmt(m.sdE, 2), " m) would give G_K = ", TP.fmt(m.GK, 3), " kg/m²."));
      out.appendChild(h("div.tblscroll", t));
    }
    const ratio = g.ratio;
    let verdict, cls;
    if (g.woodHit) { verdict = "Holzbauteile dürfen auf keinen Fall Kondensat zeigen — selbst wenn es im Sommer austrocknet (wechselnde Befeuchtung zerstört Holz)."; cls = "bad"; }
    else if (g.dried) { verdict = "G_A/G_K = " + TP.fmt(ratio, 2) + " > 1: das Kondensat trocknet im Sommer vollständig aus. Für mineralische Bauteile (Beton, Ziegel) nach ÖNORM B 8110-2 zulässig."; cls = "warn"; }
    else { verdict = "G_A/G_K = " + TP.fmt(ratio, 2) + " < 1: das Kondensat trocknet nicht vollständig aus — es sammelt sich Jahr für Jahr an. Aufbau nicht zulässig."; cls = "bad"; }
    out.appendChild(h("div.callout." + cls, h("b", "Urteil: "), verdict));
    return out;
  }

  /* ---------- the lab ---------- */
  TP.labs.glaser = {
    render(el) {
      const out = h("div.lab"), main = h("div.main");
      let editor;
      const draw = () => {
        const W = TP.wall, c = W.cond;
        const g = P.glaser(W.layers, c);
        TP.clear(main);
        const goal = TP.wallPreset(W.preset) && TP.wallPreset(W.preset).goal;
        if (goal) {
          const r = TP.wallGoalOk();
          main.appendChild(h("div.goal" + (r.ok ? ".done" : ""),
            h("div", { style: { flex: 1 } }, h("div.label", r.ok ? "Aufgabe gelöst" : "Aufgabe"), h("div", goal.text), (!r.ok && !r.ordered) ? h("div", { style: { color: "var(--bad)", fontSize: "13px", marginTop: "2px" } }, "The original layer order was changed — the exam does not allow that.") : null),
            h("span.tag." + (r.okCond ? "ok" : "bad"), r.noCond ? "kein Kondensat" : r.dry ? (r.okCond ? "Kondensat trocknet aus" : "trocknet nicht aus") : "Kondensat"), h("span.tag." + (r.ordered ? "ok" : "bad"), r.ordered ? "Reihenfolge ok" : "Reihenfolge geändert")));
        }
        const kp = (label, v, unit, cls) => h("div.kpi" + (cls ? "." + cls : ""), h("div.label", label), h("div.v", v, unit ? h("small", unit) : null));
        main.appendChild(h("div.kpis",
          kp("U-Wert", TP.fmt(g.st.U, 3), "W/m²K"),
          kp("Σ s_d", TP.fmt(g.S, 2), "m"),
          kp("p_i / p_e", TP.fmt(g.pi, 0) + " / " + TP.fmt(g.pe, 0), "Pa"),
          kp("Kondensat", g.condensate ? "ja" : "nein", "", g.condensate ? "bad" : "ok"),
          g.condensate ? kp("G_K → G_A", TP.fmt(g.GK, 3) + " → " + TP.fmt(g.GA, 3), "kg/m²", g.woodHit || !g.dried ? "bad" : "warn") : null));
        const card = h("div.card.pad");
        card.appendChild(h("div.row.between", h("h3", "Glaser-Diagramm"),
          h("div.seg", h("button", { "aria-pressed": mode === "tau" ? "true" : "false", onclick: () => { mode = "tau"; draw(); } }, "Tauperiode (Winter)"), h("button", { "aria-pressed": mode === "dry" ? "true" : "false", onclick: () => { mode = "dry"; draw(); } }, "Trockenperiode (Sommer)"))));
        if (mode === "dry" && !g.dry) card.appendChild(h("div.callout", "No condensate in this wall — there is nothing to dry out. The Trockenperiode is only needed when the Tauperiode shows condensate."));
        card.appendChild(chart(g, c, mode === "dry" && g.dry ? "dry" : "tau"));
        card.appendChild(h("div.legend-row", { style: { marginTop: "6px" } },
          h("span", h("i", { style: { background: "var(--p)" } }), "Partialdruck p"), h("span", h("i", { style: { background: "var(--ps)" } }), "Sättigungsdruck p_S (Polygonzug)"),
          mode === "tau" ? h("span", h("i", { style: { background: "var(--ink)", height: "2px" } }), "Seileck") : null,
          mode === "tau" ? h("span", h("i", { style: { background: "var(--cond)", height: "10px", border: "1px solid var(--ps)" } }), "Kondensat-Dreieck / Vieleck") : null));
        /* left: the diagram; right: what it says (Rechenweg, verdict, rules of thumb) */
        const right = h("div.stack", { style: { gap: "16px" } }, result(g, c));
        if (g.rules) {
          const r = g.rules, rows = g.st.rows;
          right.appendChild(h("div.card.pad.flat", h("div.label", "Faustregeln (spart das Zeichnen)"),
            h("div.stack", { style: { marginTop: "6px", gap: "6px" } },
              h("div", h("span.tag." + (r.insulationOutside ? "ok" : "bad"), r.insulationOutside ? "✓" : "✗"), " Schicht mit dem größten Temperaturabfall (",
                h("b", (r.dropLayer + 1) + " " + rows[r.dropLayer].name), ") liegt ", r.insulationOutside ? "außen von" : "innen von", " der Schicht mit dem größten µ·d (", h("b", (r.sdLayer + 1) + " " + rows[r.sdLayer].name), ")."),
              h("div.muted", { style: { fontSize: "13px" } }, "Dämmung so weit wie möglich außen, Dampfbremse/-sperre so weit wie möglich innen — then vapour reaches the cold zone with the least remaining path."))));
        }
        main.appendChild(h("div.split", card, right));
        main.appendChild(h("div.split.even",
          h("details.acc", { open: true }, h("summary", "Formblatt mit Dampfdruck-Spalten"), h("div", TP.formblatt(g.st, c, g),
            h("div.faint", { style: { fontSize: "12.5px", marginTop: "8px" } }, "p_S wird hier mit der Magnus-Formel gerechnet; die Tabelle der Prüfung weicht um höchstens ~0,3 % ab. Rote Zeilen: p > p_S → Kondensat."))),
          h("details.acc", h("summary", "Die 7 Schritte der Konstruktion (VO15)"), h("div",
            h("ol.steps7", ["Achsenkreuz mit nur einem Maßstab pro Achse (Sprung im Maßstab = 0 Punkte).", "Schichten über ihre µ·d-Werte auf der x-Achse einzeichnen — inklusive R_si/R_se als schmale Bänder.", "Partialdruck: nur zwei Punkte (p_i, p_e), gerade Linie.", "Sättigungsdruck-Polygonzug: ein Punkt pro Schichtgrenze, aus den Schichttemperaturen.", "Taupunkt = Punkt mit dem größten Normalabstand zur Partialdrucklinie.", "Seileck: Seil an den Enden einhängen und straffziehen → Dreieck oder Vieleck (alle Unterschneidungen!).", "Trockenperiode nicht vergessen (eigene Randbedingungen, eigene Partialdrucklinie)."].map(t => h("li", t)))))));
      };
      editor = TP.wallEditor(draw);
      const dry = TP.wall.cond.dry;
      const num = (obj, key, label, unit, step, scale) => h("label.field", h("span", label), h("div.inwrap", h("input.num", { type: "number", step, value: +(obj[key] * (scale || 1)).toFixed(2), oninput: e => { const v = parseFloat(e.target.value); if (isFinite(v)) { obj[key] = v / (scale || 1); TP.wallChanged(); draw(); } } }), h("span.unit", unit)));
      const dryBox = h("div.card.pad", { style: { padding: "12px 14px" } }, h("div.label", { style: { marginBottom: "8px" } }, "Trockenperiode (Sommer)"),
        h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 10px" } },
          num(dry, "ti", "Innen θ", "°C", 0.5), num(dry, "phii", "Innen φ", "%", 1, 100), num(dry, "te", "Außen θ", "°C", 0.5), num(dry, "phie", "Außen φ", "%", 1, 100)),
        h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 10px", marginTop: "8px" } },
          h("label.field", h("span", "Tauperiode"), h("select", { onchange: e => { TP.wall.cond.hTau = +e.target.value; TP.wallChanged(); draw(); } }, [[1440, "1440 h (2 Monate)"], [2160, "2160 h (3 Monate)"]].map(([v, t]) => h("option", { value: v, selected: (TP.wall.cond.hTau || 1440) === v }, t)))),
          h("label.field", h("span", "Trockenperiode"), h("select", { onchange: e => { TP.wall.cond.hDry = +e.target.value; TP.wallChanged(); draw(); } }, [[2160, "2160 h (3 Monate)"]].map(([v, t]) => h("option", { value: v, selected: true }, t))))),
        h("div.faint", { style: { fontSize: "12px", marginTop: "6px" } }, "Deliberately pessimistic (cool, humid) on both sides — e.g. 15 °C / 70 %."));
      out.appendChild(h("div.side", editor, dryBox));
      out.appendChild(main);
      el.appendChild(out);
      draw();
    },
  };
})(window.TP);
