/* Taupunkt — Fortschritt: where you stand, what to do each day until the exam, weak spots, history */
(function (TP) {
  const { h, svg } = TP;

  function heat() {
    const days = 17 * 7, end = new Date(), cells = [];
    // align the first column to Monday
    const first = new Date(end); first.setDate(end.getDate() - days + 1); const off = (first.getDay() + 6) % 7; first.setDate(first.getDate() - off);
    const total = days + off;
    for (let i = 0; i < total; i++) {
      const d = new Date(first); d.setDate(first.getDate() + i);
      if (d > end) { cells.push(h("i", { style: { visibility: "hidden" } })); continue; }
      const l = TP.S.log[TP.dayKey(d)] || {}, n = (l.cards || 0) + (l.quiz || 0) * 2 + (l.calc || 0) * 3 + (l.glaser || 0) * 10 + (l.exam || 0) * 20;
      const lvl = n === 0 ? 0 : n < 10 ? 1 : n < 30 ? 2 : n < 60 ? 3 : 4;
      cells.push(h("i", { "data-l": lvl, title: TP.dayKey(d) + ": " + (l.cards || 0) + " Karten, " + (l.quiz || 0) + " Quiz, " + (l.calc || 0) + " Rechnen" + (l.glaser ? ", " + l.glaser + " Glaser" : "") }));
    }
    return h("div.heat", cells);
  }

  function spark(vals, w, hgt, color, maxV, minV) {
    const s = svg("svg", { viewBox: `0 0 ${w} ${hgt}`, style: `width:100%;max-width:${w}px;height:auto` });
    if (vals.length < 1) return s;
    const mx = maxV != null ? maxV : Math.max(...vals), mn = minV != null ? minV : 0;
    const X = i => 6 + (vals.length === 1 ? (w - 12) / 2 : i / (vals.length - 1) * (w - 12)), Y = v => hgt - 6 - (v - mn) / ((mx - mn) || 1) * (hgt - 12);
    s.appendChild(svg("path", { d: vals.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)).join(""), fill: "none", stroke: color, "stroke-width": 2 }));
    vals.forEach((v, i) => s.appendChild(svg("circle", { cx: X(i), cy: Y(v), r: 3, fill: color })));
    return s;
  }

  TP.tabs.fortschritt = {
    render(main) {
      const days = TP.daysUntil(TP.S.examDate), overall = TP.overall();
      const unseen = TP.content.cards.filter(c => !TP.S.cards[c.id]).length, due = TP.dueTotal();
      main.appendChild(h("div.page-head",
        h("div", h("h1", "Fortschritt"), h("p", "Where you stand, per module, and what a sensible daily dose looks like until the exam.")),
        h("label.field", { style: { width: "190px" } }, h("span", "Prüfungsdatum"), h("input", { type: "date", value: TP.S.examDate, onchange: e => { TP.S.examDate = e.target.value; TP.save(); TP.render(); } }))));
      /* headline stats */
      const stat = (label, v, sub, cls) => h("div.kpi" + (cls ? "." + cls : ""), h("div.label", label), h("div.v", v), sub ? h("div.faint", { style: { fontSize: "12.5px" } }, sub) : null);
      const knownAll = TP.content.cards.filter(c => TP.srs.known(c.id)).length;
      main.appendChild(h("div.stat-grid", { style: { marginBottom: "16px" } },
        stat("Beherrschung gesamt", Math.round(overall * 100) + " %", "gewichtet nach Prüfungsgewicht"),
        stat("Prüfung", days == null ? "—" : days >= 0 ? days + " Tage" : "vorbei", days == null ? "Datum oben setzen" : TP.S.examDate, days != null && days >= 0 && days <= 14 ? "warn" : ""),
        stat("Karten sicher", knownAll + " / " + TP.content.cards.length, due + " heute fällig"),
        stat("Serie", TP.streak() + " Tage", "mind. eine Übung pro Tag"),
        stat("Probeklausuren", TP.S.exams.length, TP.S.exams.length ? "zuletzt " + TP.fmt(TP.S.exams[TP.S.exams.length - 1].pts, 1) + " / 30" : "noch keine")));
      /* daily plan */
      if (days != null && days > 0) {
        const perDay = Math.ceil(unseen / Math.max(1, days - 3));
        main.appendChild(h("div.card.pad", { style: { marginBottom: "16px" } }, h("div.label", "Tagesdosis bis zur Prüfung"),
          h("div", { style: { margin: "6px 0", fontSize: "15.5px" } }, "Bis zum ", TP.S.examDate, " bleiben ", h("b", days + " Tage"), ". ", unseen ? ["Noch ", h("b", unseen), " Karten haben Sie nie gesehen → rund ", h("b", perDay + " neue Karten pro Tag"), " (plus die fälligen Wiederholungen), und die letzten 3 Tage nur wiederholen."] : "Alle Karten wurden mindestens einmal gesehen — jetzt zählt die Wiederholung."),
          h("div.row", { style: { gap: "8px" } }, h("span.chip", "1 Glaser-Training alle 2 Tage"), h("span.chip", "1 Probeklausur pro Woche"), h("span.chip", "Rechnen: 5 Aufgaben/Tag"))));
      }
      /* modules */
      const rows = TP.MODS.map(m => ({ m, s: TP.stats(m.n) }));
      const card = h("div.card.pad", { style: { marginBottom: "16px" } }, h("div.row.between", h("h3", "Module"), h("span.faint", { style: { fontSize: "12.5px" } }, "Klick → Karte")));
      rows.forEach(({ m, s }) => card.appendChild(h("div.mrow", { onclick: () => { TP.S.ui.focusMod = m.n; TP.go("karte"); } },
        h("span.lanedot", { style: { background: `var(${TP.LANES[m.lane].css})`, margin: 0, width: "12px", height: "12px" } }),
        h("div", h("div", { style: { fontWeight: 600 } }, "M" + String(m.n).padStart(2, "0") + " " + m.short), h("div.faint", { style: { fontSize: "12px" } }, m.sub)),
        h("div.bar", h("i", { style: { width: Math.round(s.mastery * 100) + "%", background: `var(${TP.LANES[m.lane].css})` } })),
        h("span.mono", Math.round(s.mastery * 100) + " %"),
        h("span.faint.mono", { style: { fontSize: "12px" } }, s.known + "/" + s.cards + " Karten" + (s.qN ? " · Quiz " + Math.round(100 * s.qOk / s.qN) + "%" : "") + (s.cN ? " · Rechnen " + Math.round(100 * s.cOk / s.cN) + "%" : "")))));
      main.appendChild(card);
      /* weak spots */
      const weakQ = TP.MCQ.map(q => ({ q, r: TP.S.quiz[q.id] })).filter(x => x.r && x.r.n && x.r.ok / x.r.n < 0.7).sort((a, b) => a.r.ok / a.r.n - b.r.ok / b.r.n).slice(0, 5);
      const weakC = TP.GENS.map(g => ({ g, r: TP.S.calc[g.id] })).filter(x => x.r && x.r.n && x.r.ok / x.r.n < 0.7).sort((a, b) => a.r.ok / a.r.n - b.r.ok / b.r.n).slice(0, 5);
      const cardsHard = TP.content.cards.map(c => ({ c, s: TP.S.cards[c.id] })).filter(x => x.s && x.s.lapses >= 2).sort((a, b) => b.s.lapses - a.s.lapses).slice(0, 5);
      main.appendChild(h("div.grid", { style: { gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", marginBottom: "16px" } },
        h("div.card.pad", h("h3", "Schwache Rechenaufgaben"), weakC.length ? h("div.stack", { style: { marginTop: "8px", gap: "6px" } }, weakC.map(x => h("div.row.between", h("span", x.g.title), h("span.mono.muted", Math.round(100 * x.r.ok / x.r.n) + " % · " + x.r.n + "×")))) : h("p.muted", "Nichts Auffälliges — oder noch nicht genug geübt.")),
        h("div.card.pad", h("h3", "Schwache Quiz-Fragen"), weakQ.length ? h("div.stack", { style: { marginTop: "8px", gap: "6px" } }, weakQ.map(x => h("div", { style: { fontSize: "13.5px" } }, h("span.tag", "M" + String(x.q.mod).padStart(2, "0")), " ", x.q.stem.split("\n")[0].replace(/\*\*/g, "").slice(0, 90)))) : h("p.muted", "Nichts Auffälliges — oder noch nicht genug geübt.")),
        h("div.card.pad", h("h3", "Karten, die immer wieder fallen"), cardsHard.length ? h("div.stack", { style: { marginTop: "8px", gap: "6px" } }, cardsHard.map(x => h("div", { style: { fontSize: "13.5px" } }, h("span.tag", x.s.lapses + "×"), " ", x.c.q.replace(/\$[^$]*\$/g, "…").slice(0, 80)))) : h("p.muted", "Noch keine „Leech“-Karten."))));
      /* history */
      const ex = TP.S.exams, dr = TP.S.drills;
      main.appendChild(h("div.grid", { style: { gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", marginBottom: "16px" } },
        h("div.card.pad", h("div.row.between", h("h3", "Probeklausuren"), h("span.faint", { style: { fontSize: "12.5px" } }, "Bestehensgrenze 15 / 30")), ex.length ? [spark(ex.map(e => e.pts), 380, 90, "var(--accent)", 30, 0), h("div.faint", { style: { fontSize: "12.5px" } }, ex.map(e => TP.fmt(e.pts, 1)).join(" → "))] : h("p.muted", "Noch keine abgeschlossene Probeklausur.")),
        h("div.card.pad", h("div.row.between", h("h3", "Glaser-Training"), h("span.faint", { style: { fontSize: "12.5px" } }, "Punkte (von 7) und Zeit")), dr.length ? [spark(dr.map(e => e.pts), 380, 90, "var(--ps)", 7, 0), h("div.faint", { style: { fontSize: "12.5px" } }, dr.slice(-8).map(e => TP.fmt(e.pts, 1) + " P / " + Math.round(e.secs / 60) + " min").join("  ·  "))] : h("p.muted", "Noch keine Glaser-Übung. 15–20 Minuten sind das Ziel."))));
      main.appendChild(h("div.card.pad", h("h3", "Aktivität (17 Wochen)"), h("div", { style: { margin: "10px 0", overflowX: "auto" } }, heat()), h("div.faint", { style: { fontSize: "12.5px" } }, "Karten = 1 · Quiz = 2 · Rechnen = 3 · Glaser = 10 · Probeklausur = 20 Punkte pro Tag")));
      main.appendChild(h("div.row", { style: { marginTop: "16px" } }, h("button.btn", { onclick: TP.openStorage }, "Speicherort & Backup"), h("button.btn.ghost", { onclick: () => { if (confirm("Delete ALL progress (cards, quiz, calculations, exams)? This cannot be undone.\n\nTip: download a backup first.")) TP.resetAll(); } }, "Fortschritt zurücksetzen")));
    },
  };
})(window.TP);
