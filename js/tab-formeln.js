/* Taupunkt — Formeln: the Formelsammlung, the symbols, the tables. The exam sheet has no units and no variable names — "Prüfungsblatt" mode hides them so you can test yourself. */
(function (TP) {
  const { h } = TP;
  const P = TP.phys;
  const st = { view: "formeln", q: "", sec: 0, blind: false, symq: "", symSec: "" };
  const VO2MOD = { 2: 1, 3: 2, 4: 3, 10: 4, 8: 5, 11: 6, 7: 7, 9: 7, 5: 8, 6: 9, 12: 10, 14: 11, 13: 12, 15: 13 };

  function formulas(el) {
    const secs = TP.content.formulas.filter(s => s.items.length);
    const draw = () => {
      TP.clear(el);
      el.appendChild(h("div.row", { style: { marginBottom: "14px" } },
        h("input", { type: "text", placeholder: "Suchen (z. B. U-Wert, Kondensat, ψ …)", value: st.q, style: { maxWidth: "320px" }, oninput: e => { st.q = e.target.value; list(); } }),
        h("select", { style: { width: "auto" }, onchange: e => { st.sec = +e.target.value; list(); } }, [h("option", { value: 0, selected: !st.sec }, "Alle Abschnitte")].concat(secs.map(s => h("option", { value: s.n, selected: st.sec === s.n }, s.n + ". " + s.title)))),
        h("label.row", { style: { gap: "6px", cursor: "pointer" } }, h("input", { type: "checkbox", checked: st.blind, onchange: e => { st.blind = e.target.checked; list(); } }), "Prüfungsblatt-Modus (ohne Namen, VO, Einheiten — klicken zum Aufdecken)")));
      const box = h("div"); el.appendChild(box);
      function list() {
        TP.clear(box);
        const q = st.q.trim().toLowerCase();
        secs.filter(s => !st.sec || s.n === st.sec).forEach(s => {
          const items = s.items.filter(it => !q || (it.label + " " + it.tex + " " + s.title).toLowerCase().includes(q));
          if (!items.length) return;
          box.appendChild(h("h3", { style: { margin: "20px 0 10px" } }, s.n + ". " + s.title));
          box.appendChild(h("div.fgrid", items.map(it => {
            const card = h("div.card.fcard2" + (st.blind ? ".blind" : ""));
            const meta = h("div", { style: { display: st.blind ? "none" : "" } },
              it.label ? h("div", { style: { fontWeight: 600, fontSize: "13.5px" } }, it.label) : null,
              it.vo.length ? h("div.row", { style: { gap: "5px", marginTop: "4px" } }, it.vo.map(v => h("span.tag", { title: "In VO" + v + " drilled", style: { cursor: "pointer" }, onclick: () => { TP.S.ui.focusMod = VO2MOD[v] || 0; TP.go("karte"); } }, "VO" + v))) : h("span.faint", { style: { fontSize: "12px" } }, "noch nicht in einer VO gerechnet"));
            card.appendChild(meta);
            card.appendChild(h("div.formula", { html: TP.tex(it.tex, true) }));
            if (st.blind) { card.style.cursor = "pointer"; card.title = "Klicken zum Aufdecken"; card.addEventListener("click", () => { meta.style.display = meta.style.display === "none" ? "" : "none"; }); }
            return card;
          })));
        });
        if (!box.children.length) box.appendChild(h("div.empty", "Nichts gefunden."));
      }
      list();
    };
    draw();
  }

  function symbols(el) {
    const all = TP.content.symbols, secs = [...new Set(all.map(s => s.section))];
    const draw = () => {
      TP.clear(el);
      el.appendChild(h("div.row", { style: { marginBottom: "14px" } },
        h("input", { type: "text", placeholder: "Symbol, Bedeutung, Aussprache …", value: st.symq, style: { maxWidth: "320px" }, oninput: e => { st.symq = e.target.value; list(); } }),
        h("select", { style: { width: "auto" }, onchange: e => { st.symSec = e.target.value; list(); } }, [h("option", { value: "" }, "Alle")].concat(secs.map(s => h("option", { value: s, selected: st.symSec === s }, s.replace(/ \(.*\)/, "")))))));
      el.appendChild(h("div.callout", { style: { marginBottom: "12px" } }, h("b", "⚠ Symbol collisions are an exam trap: "), "U = U-value or potential energy, C = heat capacity or compactness, h = heat-transfer coefficient, enthalpy or solar altitude, γ = utilisation factor or G/H … The meaning follows from the context."));
      const box = h("div.card"); el.appendChild(box);
      function list() {
        TP.clear(box);
        const q = st.symq.trim().toLowerCase();
        const rows = all.filter(s => (!st.symSec || s.section === st.symSec) && (!q || (s.sym + " " + (s.name || "") + " " + (s.pron || "") + " " + (s.meaning || "") + " " + (s.unit || "")).toLowerCase().includes(q)));
        box.appendChild(h("div.sym-row", { style: { fontWeight: 650, color: "var(--ink3)", fontSize: "11.5px", textTransform: "uppercase", letterSpacing: ".06em" } }, h("span", "Symbol"), h("span", "Aussprache"), h("span", "Bedeutung"), h("span", "Einheit")));
        rows.forEach(s => box.appendChild(h("div.sym-row",
          h("span", { style: { fontSize: "18px" }, html: TP.md(s.sym).replace(/<\/?p>/g, "") }),
          h("span.mono", { style: { fontSize: "12.5px" } }, (s.name ? s.name + " " : "") + (s.pron || "")),
          h("span", { style: { fontSize: "13.5px" }, html: TP.md(s.meaning || "").replace(/<\/?p>/g, "") }),
          h("span.mono.muted", { style: { fontSize: "12.5px" } }, s.unit || ""))));
        if (!rows.length) box.appendChild(h("div.empty", "Nichts gefunden."));
      }
      list();
    };
    draw();
  }

  function tables(el) {
    const T = h("div.stack", { style: { gap: "16px" } });
    /* Magnus lookup */
    const out = h("div.mono", { style: { fontSize: "22px" } });
    const inp = h("input.num", { type: "number", step: 0.1, value: 17.4, oninput: calc });
    function calc() { const t = parseFloat(inp.value); if (!isFinite(t)) { out.textContent = "–"; return; } const lo = Math.floor(t * 10) / 10, hi = lo + 0.1; out.textContent = TP.fmt(P.ps(t), 0) + " Pa"; hint.textContent = "Tabelle: p_S(" + TP.fmt(lo, 1) + ") ≈ " + TP.fmt(P.ps(lo), 0) + " Pa, p_S(" + TP.fmt(hi, 1) + ") ≈ " + TP.fmt(P.ps(hi), 0) + " Pa → linear interpolieren: " + TP.fmt(P.ps(lo) + (t - lo) / 0.1 * (P.ps(hi) - P.ps(lo)), 0) + " Pa"; }
    const hint = h("div.faint", { style: { fontSize: "12.5px" } });
    T.appendChild(h("div.card.pad", h("h3", "Sättigungsdampfdruck p_S (Magnus-Formel)"),
      TP.texEl("p_S=a\\left(b+\\frac{\\vartheta}{100\\,^\\circ\\mathrm{C}}\\right)^n", true),
      h("table.data", { style: { maxWidth: "460px", margin: "4px 0 12px" } }, h("thead", h("tr", ["", "0…30 °C", "−20…0 °C"].map(x => h("th", x)))), h("tbody", [["a [Pa]", "288,68", "4,689"], ["b", "1,098", "1,486"], ["n", "8,02", "12,30"]].map(r => h("tr", r.map(x => h("td", x)))))),
      h("div.row", { style: { alignItems: "flex-end" } }, h("label.field", { style: { width: "160px" } }, h("span", "Temperatur"), h("div.inwrap", inp, h("span.unit", "°C"))), h("div", h("div.label", "p_S"), out)), hint,
      h("div.callout", { style: { marginTop: "10px" } }, h("b", "Interpolieren, nie extrapolieren: "), "p_S(θ) is a power curve. Between two table entries 0,1 °C apart a straight line is accurate; far outside the table it is not.")));
    calc();
    /* table −20…30 */
    const rows = []; for (let t = -20; t <= 30; t += 2) rows.push(t);
    T.appendChild(h("div.card.pad", h("h3", "p_S in Pa — Auszug (alle 2 K)"), h("div.tblscroll", h("table.data", h("thead", h("tr", ["θ [°C]"].concat(rows.map(t => String(t))).map((x, i) => h("th", { style: i ? "" : "text-align:left" }, x)))), h("tbody", h("tr", [h("td", "p_S")].concat(rows.map(t => h("td", TP.fmt(P.ps(t), 0)))))))), h("div.faint", { style: { fontSize: "12.5px", marginTop: "6px" } }, "The exam table has 0,1 K steps and differs from Magnus by at most ~0,3 %.")));
    /* R_si / R_se */
    T.appendChild(h("div.card.pad", h("h3", "Wärmeübergangswiderstände [m²K/W]"),
      h("table.data", { style: { maxWidth: "620px" } }, h("thead", h("tr", ["", "horizontal", "aufwärts", "abwärts"].map(x => h("th", x)))),
        h("tbody", [["Energieberechnung R_si", "0,13", "0,10", "0,17"], ["Energieberechnung R_se", "0,04", "0,04", "0,04"], ["Wärmebrückenberechnung R_si", "0,25", "0,25", "0,35"], ["Wärmebrückenberechnung R_se", "0,04", "0,04", "0,04"]].map(r => h("tr", r.map(x => h("td", x)))))),
      h("div.faint", { style: { fontSize: "12.5px", marginTop: "6px" } }, "„Aufwärts“ = Wärmestrom nach oben (Flachdach: R_si 0,10). In a Hinterlüftung the calculation ends before the cavity, but R_se stays.")));
    /* CO2 */
    T.appendChild(h("div.card.pad", h("h3", "CO₂-Referenzwerte"), h("table.data", { style: { maxWidth: "560px" } }, h("tbody", [["380–450 ppm", "Außenluft"], ["1000 ppm", "Maximalwert Wohnen"], ["1700 ppm", "Maximalwert Büroarbeit"], ["5000 ppm", "MAK (8 h)"], ["50 000 ppm", "Kopfschmerzen, Schwindel, Bewusstlosigkeit"]].map(r => h("tr", r.map((x, i) => h("td", i ? { style: { textAlign: "left", fontFamily: "var(--font)" } } : {}, x))))))));
    el.appendChild(T);
  }

  TP.tabs.formeln = {
    render(main) {
      main.appendChild(h("div.page-head", h("div", h("h1", "Formeln"), h("p", "The official Formelsammlung (SS2025), each formula tagged with the lecture where it was drilled. The exam sheet gives no units and no variable names — switch on Prüfungsblatt-Modus to practise identifying what goes where."))));
      const VIEWS = [["formeln", "Formelsammlung"], ["symbole", "Symbole & Aussprache"], ["tabellen", "Tabellen"]];
      main.appendChild(h("div.row", { style: { marginBottom: "16px" } }, h("div.seg", VIEWS.map(([k, t]) => h("button", { "aria-pressed": st.view === k ? "true" : "false", onclick: () => { st.view = k; TP.render(); } }, t)))));
      const body = h("div"); main.appendChild(body);
      ({ formeln: formulas, symbole: symbols, tabellen: tables })[st.view](body);
    },
  };
})(window.TP);
