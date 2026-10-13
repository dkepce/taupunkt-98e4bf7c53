/* Bauphysik — Formeln: sidebar = view (Formelsammlung / Symbole / Tabellen) + sections; stage = search + cards.
   The exam sheet has no units and no variable names — "Prüfungsblatt-Modus" hides them so you can test yourself. */
(function (TP) {
  const { h } = TP;
  const U = TP.ui;
  const P = TP.phys;
  const st = { view: "formeln", q: "", sec: 0, blind: false, symSec: "" };
  const VO2MOD = { 2: 1, 3: 2, 4: 3, 10: 4, 8: 5, 11: 6, 7: 7, 9: 7, 5: 8, 6: 9, 12: 10, 14: 11, 13: 12, 15: 13 };

  TP.tabs.formeln = {
    render(main, args) {
      if (args && args.sub && ["formeln", "symbole", "tabellen"].includes(args.sub)) st.view = args.sub;
      if (TP.S.ui.fq != null) { st.q = TP.S.ui.fq; st.sec = 0; st.view = "formeln"; delete TP.S.ui.fq; }
      const secs = TP.content.formulas.filter(s => s.items.length);
      const symSecs = [...new Set(TP.content.symbols.map(s => s.section))];
      const items = [
        U.nav({ iconKey: "formeln", title: "Formelsammlung", sub: TP.content.formulas.reduce((n, s) => n + s.items.length, 0) + " Formeln, mit VO-Bezug", active: st.view === "formeln", onclick: () => { st.view = "formeln"; TP.render(); } }),
        U.nav({ iconKey: "symbole", title: "Symbole & Aussprache", sub: TP.content.symbols.length + " Symbole", active: st.view === "symbole", onclick: () => { st.view = "symbole"; TP.render(); } }),
        U.nav({ iconKey: "tabellen", title: "Tabellen", sub: "p_S, R_si/R_se, CO₂", active: st.view === "tabellen", onclick: () => { st.view = "tabellen"; TP.render(); } }),
      ];
      if (st.view === "formeln") {
        items.push(U.sbSep(), U.sbLabel("Abschnitt"), U.nav({ icon: "∗", title: "Alle", active: !st.sec, onclick: () => { st.sec = 0; TP.render(); } }));
        secs.forEach(s => items.push(U.nav({ icon: String(s.n), title: s.title.replace(/ \(.*\)/, ""), meta: s.items.length + "", active: st.sec === s.n, onclick: () => { st.sec = s.n; TP.render(); } })));
        items.push(U.sbSep(), h("label.row", { style: { gap: "8px", padding: "4px 10px", cursor: "pointer", alignItems: "flex-start" } }, h("input", { type: "checkbox", checked: st.blind, onchange: e => { st.blind = e.target.checked; TP.render(); }, style: { marginTop: "4px" } }), h("span", h("b", "Prüfungsblatt-Modus"), h("div.faint", { style: { fontSize: "12px" } }, "ohne Namen, VO und Einheiten — Klick deckt auf"))));
      } else if (st.view === "symbole") {
        items.push(U.sbSep(), U.sbLabel("Gruppe"), U.nav({ icon: "∗", title: "Alle", active: !st.symSec, onclick: () => { st.symSec = ""; TP.render(); } }));
        symSecs.forEach(s => items.push(U.nav({ icon: "·", title: s.replace(/ \(.*\)/, ""), meta: TP.content.symbols.filter(x => x.section === s).length + "", active: st.symSec === s, onclick: () => { st.symSec = s; TP.render(); } })));
      }
      const side = U.sidebar("Formeln", ...items);
      const { stage } = U.layout(main, { sidebar: side });
      ({ formeln: formulas, symbole: symbols, tabellen: tables })[st.view](stage, secs);
    },
  };

  function searchRow(placeholder, right) {
    const inp = h("input", { type: "search", placeholder, value: st.q, style: { maxWidth: "460px" }, oninput: e => { st.q = e.target.value; st.onq && st.onq(); } });
    return h("div.row", { style: { marginBottom: "16px" } }, inp, right || null);
  }

  function formulas(stage, secs) {
    stage.appendChild(U.pageHead("Formelsammlung", "The official sheet (SS2025). Each formula shows the lecture where it was drilled — click a VO tag to jump to that module."));
    stage.appendChild(searchRow("Suchen — z. B. U-Wert, Kondensat, ψ, Kontakttemperatur …"));
    const box = h("div"); stage.appendChild(box);
    const list = () => {
      TP.clear(box);
      const q = st.q.trim().toLowerCase();
      let any = false;
      secs.filter(s => !st.sec || s.n === st.sec).forEach(s => {
        const its = s.items.filter(it => !q || (it.label + " " + it.tex + " " + s.title).toLowerCase().includes(q));
        if (!its.length) return; any = true;
        box.appendChild(h("h3", { style: { margin: "22px 0 10px" } }, s.n + ". " + s.title));
        box.appendChild(h("div.fgrid", its.map(it => {
          const card = h("div.card.fcard2");
          const meta = h("div", { style: { display: st.blind ? "none" : "" } },
            it.label ? h("div", { style: { fontWeight: 600, fontSize: "14px" } }, it.label) : null,
            it.vo.length ? h("div.row", { style: { gap: "5px", marginTop: "4px" } }, it.vo.map(v => h("span.tag", { title: "Modul zu VO" + v + " öffnen", style: { cursor: "pointer" }, onclick: () => { const n = VO2MOD[v]; if (n) TP.go("lernen", { sub: "m" + n }); } }, "VO" + v))) : h("span.faint", { style: { fontSize: "12px" } }, "noch in keiner VO gerechnet"));
          card.appendChild(meta);
          card.appendChild(h("div.formula", { html: TP.tex(it.tex, true) }));
          if (st.blind) { card.style.cursor = "pointer"; card.title = "Klicken zum Aufdecken"; card.addEventListener("click", () => { meta.style.display = meta.style.display === "none" ? "" : "none"; }); }
          return card;
        })));
      });
      if (!any) box.appendChild(h("div.empty", "Nichts gefunden."));
    };
    st.onq = list; list();
  }

  function symbols(stage) {
    const all = TP.content.symbols;
    stage.appendChild(U.pageHead("Symbole & Aussprache", "Every symbol of the course, how to say it, what it means. Symbol collisions are an exam trap — the meaning follows from the context."));
    stage.appendChild(searchRow("Symbol, Bedeutung, Aussprache …"));
    stage.appendChild(h("div.callout", { style: { marginBottom: "14px" } }, h("b", "⚠ Kollisionen: "), "U = U-Wert oder potentielle Energie · C = Wärmekapazität oder Kompaktheit · h = Übergangskoeffizient, Enthalpie oder Sonnenhöhe · γ = Ausnutzungsgrad oder G/H …"));
    const box = h("div.card"); stage.appendChild(box);
    const list = () => {
      TP.clear(box);
      const q = st.q.trim().toLowerCase();
      const rows = all.filter(s => (!st.symSec || s.section === st.symSec) && (!q || (s.sym + " " + (s.name || "") + " " + (s.pron || "") + " " + (s.meaning || "") + " " + (s.unit || "")).toLowerCase().includes(q)));
      box.appendChild(h("div.sym-row", { style: { fontWeight: 650, color: "var(--ink3)", fontSize: "12px" } }, h("span", "Symbol"), h("span", "Aussprache"), h("span", "Bedeutung"), h("span", "Einheit")));
      rows.forEach(s => box.appendChild(h("div.sym-row",
        h("span", { style: { fontSize: "19px" }, html: TP.md(s.sym).replace(/<\/?p>/g, "") }),
        h("span.mono", { style: { fontSize: "12.5px" } }, (s.name ? s.name + " " : "") + (s.pron || "")),
        h("span", { style: { fontSize: "14px" }, html: TP.md(s.meaning || "").replace(/<\/?p>/g, "") }),
        h("span.mono.muted", { style: { fontSize: "12.5px" } }, s.unit || ""))));
      if (!rows.length) box.appendChild(h("div.empty", "Nichts gefunden."));
    };
    st.onq = list; list();
  }

  function tables(stage) {
    stage.appendChild(U.pageHead("Tabellen", "The reference values that come with the exam sheet, plus a Magnus lookup that also shows the interpolation."));
    const T = h("div.stack", { style: { gap: "16px" } });
    const out = h("div.mono", { style: { fontSize: "22px" } });
    const inp = h("input.num", { type: "number", step: 0.1, value: 17.4, oninput: calc });
    const hint = h("div.faint", { style: { fontSize: "12.5px" } });
    function calc() { const t = parseFloat(inp.value); if (!isFinite(t)) { out.textContent = "–"; return; } const lo = Math.floor(t * 10) / 10, hi = lo + 0.1; out.textContent = TP.fmt(P.ps(t), 0) + " Pa"; hint.textContent = "Tabelle: p_S(" + TP.fmt(lo, 1) + ") ≈ " + TP.fmt(P.ps(lo), 0) + " Pa, p_S(" + TP.fmt(hi, 1) + ") ≈ " + TP.fmt(P.ps(hi), 0) + " Pa → linear interpolieren: " + TP.fmt(P.ps(lo) + (t - lo) / 0.1 * (P.ps(hi) - P.ps(lo)), 0) + " Pa"; }
    T.appendChild(h("div.card.pad", h("h3", "Sättigungsdampfdruck p_S (Magnus-Formel)"),
      TP.texEl("p_S=a\\left(b+\\frac{\\vartheta}{100\\,^\\circ\\mathrm{C}}\\right)^n", true),
      h("table.data", { style: { maxWidth: "460px", margin: "4px 0 12px", minWidth: "300px" } }, h("thead", h("tr", ["", "0…30 °C", "−20…0 °C"].map(x => h("th", x)))), h("tbody", [["a [Pa]", "288,68", "4,689"], ["b", "1,098", "1,486"], ["n", "8,02", "12,30"]].map(r => h("tr", r.map(x => h("td", x)))))),
      h("div.row", { style: { alignItems: "flex-end" } }, h("label.field", { style: { width: "160px" } }, h("span", "Temperatur"), h("div.inwrap", inp, h("span.unit", "°C"))), h("div", h("div.label", "p_S"), out)), hint,
      h("div.callout", { style: { marginTop: "10px" } }, h("b", "Interpolieren, nie extrapolieren: "), "p_S(θ) is a power curve. Between two table entries 0,1 °C apart a straight line is accurate; far outside the table it is not.")));
    calc();
    const rows = []; for (let t = -20; t <= 30; t += 2) rows.push(t);
    T.appendChild(h("div.card.pad", h("h3", "p_S in Pa — Auszug (alle 2 K)"), h("div.tblscroll", h("table.data", h("thead", h("tr", ["θ [°C]"].concat(rows.map(t => String(t))).map((x, i) => h("th", { style: i ? "" : "text-align:left" }, x)))), h("tbody", h("tr", [h("td", "p_S")].concat(rows.map(t => h("td", TP.fmt(P.ps(t), 0)))))))), h("div.faint", { style: { fontSize: "12.5px", marginTop: "6px" } }, "The exam table has 0,1 K steps and differs from Magnus by at most ~0,3 %.")));
    T.appendChild(h("div.split.even",
      h("div.card.pad", h("h3", "Wärmeübergangswiderstände [m²K/W]"),
        h("div.tblscroll", h("table.data", { style: { marginTop: "8px" } }, h("thead", h("tr", ["", "horizontal", "aufwärts", "abwärts"].map(x => h("th", x)))),
          h("tbody", [["Energieberechnung R_si", "0,13", "0,10", "0,17"], ["Energieberechnung R_se", "0,04", "0,04", "0,04"], ["Wärmebrückenberechnung R_si", "0,25", "0,25", "0,35"], ["Wärmebrückenberechnung R_se", "0,04", "0,04", "0,04"]].map(r => h("tr", r.map(x => h("td", x))))))),
        h("div.faint", { style: { fontSize: "12.5px", marginTop: "6px" } }, "„Aufwärts“ = Wärmestrom nach oben (Flachdach: R_si 0,10). In a Hinterlüftung the calculation ends before the cavity, but R_se stays.")),
      h("div.card.pad", h("h3", "CO₂-Referenzwerte"), h("table.data", { style: { marginTop: "8px" } }, h("tbody", [["380–450 ppm", "Außenluft"], ["1000 ppm", "Maximalwert Wohnen"], ["1700 ppm", "Maximalwert Büroarbeit"], ["5000 ppm", "MAK (8 h)"], ["50 000 ppm", "Kopfschmerzen, Schwindel, Bewusstlosigkeit"]].map(r => h("tr", r.map((x, i) => h("td", i ? { style: { textAlign: "left", fontFamily: "var(--font)" } } : {}, x)))))))));
    stage.appendChild(T);
  }
})(window.TP);
