/* Taupunkt — Glaser drill: a generated wall, you fill the Formblatt like in the exam, timed against the 15–20 minute target. 7 points. */
(function (TP) {
  const { h } = TP;
  const P = TP.phys;
  const D = {};
  TP.drills = TP.drills || {};

  const L = (id, mm) => ({ id, d: mm / 1000 });
  const TEMPLATES = [
    r => [L("iputz", 15), TP.pick([L("ziegel", 250), L("ziegel", 300), L("vollziegel", 380)], r), TP.pick([L("mw", 80), L("mw", 120), L("eps", 100), L("eps", 160), L("wd", 120)], r), L("aputz", 15)],
    r => [L("iputz", 15), TP.pick([L("mw", 60), L("mw", 80), L("mw", 100), L("eps", 80)], r), TP.pick([L("ziegel", 250), L("betonn", 200), L("vollziegel", 250)], r), L("aputz", 20)],
    r => [L("span", 19), TP.pick([L("eps", 80), L("eps", 100), L("eps", 140)], r), L("spanv100", 19)],
    r => [L("gkb", 12.5), L("zellulose", TP.pick([160, 200], r)), L("holzfaser", 60), L("aputz", 10)],
    r => [L("gkb", 12.5), L("mwi", 80), L("betonn", TP.pick([120, 150], r)), L("xps", 120), L("putzsys", 15)],
    r => [L("iputz", 15), L("dbremse", 0.5), L("mw", TP.pick([80, 100], r)), TP.pick([L("ziegel", 250), L("betonn", 200)], r), L("aputz", 20)],
  ];
  function makeTask(wantCond) {
    for (let tries = 0; tries < 200; tries++) {
      const r = Math.random, layers = TP.pick(TEMPLATES, r)(r).map(l => ({ id: l.id, d: l.d }));
      const cond = { ti: 20, phii: TP.pick([0.45, 0.5, 0.55, 0.6], r), te: TP.pick([-10, -12, -13, -5], r), phie: TP.pick([0.8, 0.82], r), rsi: 0.13, rse: 0.04, dry: { ti: 15, phii: 0.7, te: 15, phie: 0.7 }, hTau: 1440, hDry: 2160 };
      const g = P.glaser(layers, cond);
      if (g.over[0] || g.over[layers.length]) continue;
      if (g.condensate !== wantCond) continue;
      if (g.condensate && (g.planes.length !== 1 || !g.tau)) continue;
      return { layers, cond, g };
    }
    const layers = TEMPLATES[1](Math.random).map(l => ({ id: l.id, d: l.d })), cond = { ti: 20, phii: 0.5, te: -10, phie: 0.8, rsi: 0.13, rse: 0.04, dry: { ti: 15, phii: 0.7, te: 15, phie: 0.7 }, hTau: 1440, hDry: 2160 };
    return { layers, cond, g: P.glaser(layers, cond) };
  }

  /* answer fields: { id, value, tol (rel), abs } */
  function expected(t) {
    const g = t.g, st = g.st, n = st.rows.length, F = [];
    const fld = (id, value, tol, abs) => F.push({ id, value, tol: tol == null ? 0.015 : tol, abs: abs || 0 });
    fld("tsi", st.thSi, 0, 0.15); fld("pssi", g.pSat[0], 0.02);
    st.rows.forEach((r, i) => { fld("R" + i, r.R, 0.015, 0.0005); fld("t" + (i + 1), st.th[i + 1], 0, 0.2); fld("ps" + (i + 1), g.pSat[i + 1], 0.02); });
    fld("RT", st.RT, 0.012); fld("U", st.U, 0.012); fld("sd", g.S, 0.012); fld("pi", g.pi, 0.02); fld("pe", g.pe, 0.02);
    if (g.condensate) {
      const m = g.main;
      fld("sde", m.sdE, 0.015); fld("sda", m.sdA, 0.015); fld("dpe", m.dpE, 0.025); fld("dpa", m.dpA, 0.04, 8); fld("gk", g.GK, 0.06, 0.003); fld("ga", g.GA, 0.06, 0.005);
    }
    return F;
  }

  D.render = function (el, opts) {
    opts = opts || {};
    let t = null, t0 = 0, timerEl, checked = false, inputs = {}, tick = null, want = null, last = null;
    const stopTimer = () => { if (tick) { clearInterval(tick); tick = null; } };
    function fresh(wantCond) {
      stopTimer(); want = wantCond == null ? Math.random() < 0.6 : wantCond; t = makeTask(want); t0 = Date.now(); checked = false; inputs = {}; draw();
      if (opts.exam) return;
      tick = setInterval(() => { if (!document.body.contains(timerEl)) { stopTimer(); return; } const s = Math.floor((Date.now() - t0) / 1000); timerEl.textContent = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); timerEl.classList.toggle("low", s > 20 * 60); }, 1000);
    }
    function draw() {
      TP.clear(el);
      const g = t.g, st = g.st, c = t.cond, n = st.rows.length;
      const num = (id, w) => { const i = h("input.num", { type: "text", inputmode: "decimal", autocomplete: "off", style: { width: (w || 92) + "px" }, placeholder: "…" }); inputs[id] = i; return i; };
      const given = v => h("span.mono.muted", v);
      el.appendChild(h("div.row.between", { style: { marginBottom: "12px" } },
        h("div", h("h2", opts.exam ? "Teil C — Glaserdiagramm (7 Punkte)" : "Glaser-Training"), h("div.muted", { style: { fontSize: "13.5px" } }, opts.exam ? "Fill in the Formblatt. Ziel: 15–20 Minuten." : "Fill the Formblatt like in the exam. Target: 15–20 minutes for 7 points. Kein Rechenweg = „geraten“.")),
        opts.exam ? null : h("div.row", h("span.label", "Zeit"), h("span.timer", { id: "gtimer" }, "00:00"), h("button.btn.sm", { onclick: () => fresh(true) }, "Neu mit Kondensat"), h("button.btn.sm", { onclick: () => fresh(false) }, "Neu ohne Kondensat"))));
      timerEl = TP.$("#gtimer", el) || h("span");
      /* the task */
      el.appendChild(h("div.card.pad", { style: { marginBottom: "14px" } },
        h("div.label", "Angabe"),
        h("p", { style: { margin: "6px 0" } }, "Innen: θ_i = ", TP.fmt(c.ti, 1), " °C, φ_i = ", TP.fmt(c.phii * 100, 0), " %. Außen: θ_e = ", TP.fmt(c.te, 1), " °C, φ_e = ", TP.fmt(c.phie * 100, 0), " %. R_si = 0,13, R_se = 0,04 m²K/W. Trockenperiode: 15 °C / 70 % auf beiden Seiten. Tauperiode 1440 h, Trockenperiode 2160 h. Sättigungsdampfdruck: Magnus-Formel oder Tabelle (±2 % Toleranz)."),
        h("div.tblscroll", h("table.data", h("thead", h("tr", ["Schicht (innen → außen)", "d [m]", "λ [W/mK]", "µ [–]", "R [m²K/W]", "θ nach Schicht [°C]", "p_S [Pa]"].map(x => h("th", x)))),
          h("tbody",
            h("tr.air", h("td", "Innenluft"), h("td"), h("td"), h("td"), h("td"), h("td", given(TP.fmt(c.ti, 1))), h("td")),
            h("tr", h("td", "Übergang innen R_si"), h("td"), h("td"), h("td"), h("td", given("0,13")), h("td", num("tsi")), h("td", num("pssi"))),
            st.rows.map((r, i) => h("tr", h("td", (i + 1) + " " + r.name), h("td", given(TP.fmt(r.d, 4))), h("td", given(TP.fmt(r.lam, 3))), h("td", given(r.mu >= 1e6 ? "∞" : TP.fmt(r.mu, 0))), h("td", num("R" + i, 84)), h("td", num("t" + (i + 1))), h("td", num("ps" + (i + 1))))),
            h("tr.air", h("td", "Übergang außen R_se"), h("td"), h("td"), h("td"), h("td", given("0,04")), h("td", given(TP.fmt(c.te, 1))), h("td"))))),
        h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "10px", marginTop: "12px" } },
          [["RT", "R_T [m²K/W]"], ["U", "U [W/m²K]"], ["sd", "Σ µ·d [m]"], ["pi", "p_i [Pa]"], ["pe", "p_e [Pa]"]].map(([k, lab]) => h("label.field", h("span", lab), num(k, 120))))));
      /* condensate decision */
      const sel = h("select", { style: { width: "auto" } }, h("option", { value: "" }, "— wählen —"), h("option", { value: "1" }, "Ja, Kondensat"), h("option", { value: "0" }, "Nein, kein Kondensat"));
      inputs.cond = sel;
      const tauSel = h("select", { style: { width: "auto" } }, h("option", { value: "" }, "— wählen —"), st.rows.slice(0, -1).map((r, i) => h("option", { value: i + 1 }, "an der Grenze nach Schicht " + (i + 1) + " (" + r.name + ")")));
      inputs.tau = tauSel;
      const follow = h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "10px", marginTop: "10px" } },
        [["sde", "s_d,e [m]"], ["sda", "s_d,a [m]"], ["dpe", "Δp_e [Pa]"], ["dpa", "Δp_a [Pa]"], ["gk", "G_K [kg/m²]"], ["ga", "G_A [kg/m²]"]].map(([k, lab]) => h("label.field", h("span", lab), num(k, 120))));
      el.appendChild(h("div.card.pad", { style: { marginBottom: "14px" } }, h("div.label", "Befund"),
        h("div.row", { style: { margin: "8px 0" } }, h("span", "Entsteht Kondensat im Bauteil?"), sel),
        h("div", h("div.row", { style: { margin: "8px 0" } }, h("span", "Wenn ja: wo liegt der Taupunkt?"), tauSel),
          h("div.muted", { style: { fontSize: "13px" } }, "Wenn ja: Taupunkt = Punkt mit dem größten Normalabstand (eine Kondensatebene). If there is no condensate leave the following fields empty."), follow)));
      const fb = h("div.stack");
      const btn = h("button.btn.primary", { onclick: check }, "Prüfen und bewerten (7 Punkte)");
      if (!opts.exam) el.appendChild(h("div.row", { style: { justifyContent: "flex-end" } }, btn));
      el.appendChild(fb);
      api.submit = check;
      function check() {
        if (checked) return last; checked = true; stopTimer();
        const secs = Math.floor((Date.now() - t0) / 1000);
        const F = expected(t), g = t.g;
        let ok = 0, tot = 0;
        F.forEach(f => {
          const inp = inputs[f.id]; if (!inp) return; tot++;
          const res = TP.checkField(f, inp.value);
          if (res.ok) ok++;
          inp.classList.add(res.ok ? "good" : "badv"); inp.readOnly = true;
          if (!res.ok) inp.parentNode.appendChild(h("div.sol", "→ " + TP.fmt(f.value, Math.abs(f.value) >= 100 ? 0 : Math.abs(f.value) >= 1 ? 2 : 4)));
        });
        const wantC = g.condensate ? "1" : "0";
        tot++; const dec = inputs.cond.value === wantC; if (dec) ok++;
        if (g.condensate) { tot++; const tk = +inputs.tau.value === g.tau.k; if (tk) ok++; inputs.tau.style.borderColor = tk ? "var(--ok)" : "var(--bad)"; }
        inputs.cond.style.borderColor = dec ? "var(--ok)" : "var(--bad)";
        const score = ok / tot, pts = 7 * score;
        TP.S.drills.push({ date: TP.dayKey(), secs, pts: +pts.toFixed(2), cond: g.condensate }); TP.logAct("glaser"); TP.saveSoon();
        const mm = Math.floor(secs / 60), ss = String(secs % 60).padStart(2, "0");
        fb.appendChild(h("div.callout." + (score > 0.85 ? "ok" : score > 0.55 ? "warn" : "bad"),
          h("b", TP.fmt(pts, 1) + " von 7 Punkten"), " — " + ok + " von " + tot + " Eintragungen richtig, Zeit " + mm + ":" + ss + (secs <= 20 * 60 ? " (im Zielfenster)" : " (über 20 Minuten: noch mehr üben)"), "."));
        fb.appendChild(h("div.callout", g.condensate ? [h("b", "Befund: "), "p > p_S an der Grenze nach Schicht " + g.tau.k + " (" + st.rows[g.tau.k - 1].name + "): Taupunkt s_d,e = " + TP.fmt(g.main.sdE, 2) + " m. G_K = " + TP.fmt(g.GK, 3) + " kg/m², G_A = " + TP.fmt(g.GA, 3) + " kg/m² → " + (g.dried ? "trocknet vollständig aus." : "trocknet NICHT vollständig aus.") + (g.woodHit ? " Holzbauteile dürfen kein Kondensat zeigen." : "")] : [h("b", "Befund: "), "p < p_S überall — kein Kondensat. Tau-/Trockenperiode entfallen."]));
        const card = h("div.card.pad", h("h3", "So sieht das Diagramm aus"), TP.glaserChart(g, t.cond, "tau"));
        fb.appendChild(card);
        if (!opts.exam) fb.appendChild(h("div.row", { style: { justifyContent: "flex-end" } }, h("button.btn.primary", { onclick: () => fresh() }, "Nächste Aufgabe")));
        btn.disabled = true;
        last = { pts, ok, tot, secs, condensate: g.condensate };
        if (opts.onGraded) opts.onGraded(last);
        if (!opts.exam) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return last;
      }
    }
    const api = { submit: () => last, result: () => last, graded: () => checked };
    fresh(opts.wantCond);
    return api;
  };
  D._test = { makeTask, expected };       // exposed for the self-tests only
  TP.drills.glaser = D;
})(window.TP);
