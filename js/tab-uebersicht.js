/* Taupunkt — Übersicht: Heute (what to do now), Fortschritt (where you stand), Speicher & Einstellungen (save folder, backup, exam date, theme) */
(function (TP) {
  const { h, svg } = TP;
  const U = TP.ui;
  const VIEWS = [["heute", "Heute", "Dein Plan und was als Nächstes ansteht"], ["fortschritt", "Fortschritt", "Stand pro Modul, Schwachstellen, Verlauf"], ["speicher", "Speicher & Einstellungen", "Speicherort, Backup, Prüfungsdatum"]];

  const pct = (a, b) => b ? Math.max(0, Math.min(100, Math.round(100 * a / b))) : 0;
  const todayLog = () => TP.S.log[TP.dayKey()] || {};
  const daysSince = iso => { if (!iso) return null; const d = new Date(iso + "T00:00:00"); return isNaN(d) ? null : TP.dayNum() - TP.dayNum(d); };

  TP.tabs.uebersicht = {
    render(main, args) {
      const view = VIEWS.some(v => v[0] === (args && args.sub)) ? args.sub : "heute";
      const days = TP.daysUntil(TP.S.examDate);
      const side = U.sidebar("Übersicht",
        ...VIEWS.map(([k, t, s]) => U.nav({ iconKey: k, title: t, sub: s, active: k === view, onclick: () => TP.go("uebersicht", { sub: k }) })),
        U.sbSep(),
        h("div", { style: { padding: "6px 10px", display: "flex", gap: "12px", alignItems: "center" } }, U.ring(TP.overall(), 46, "var(--accent)", Math.round(TP.overall() * 100) + "%"),
          h("div", h("div", { style: { fontWeight: 650 } }, days == null ? "Prüfungsdatum fehlt" : days > 0 ? "Prüfung in " + days + " Tagen" : days === 0 ? "Prüfung heute" : "Prüfung vorbei"), h("div.faint", { style: { fontSize: "12.5px" } }, "Beherrschung gesamt"))));
      const { stage } = U.layout(main, { sidebar: side });
      ({ heute, fortschritt, speicher })[view](stage, days);
    },
  };

  /* ===================================================================== Heute */
  function heute(stage, days) {
    const L = todayLog(), due = TP.dueTotal(), seenAny = Object.keys(TP.S.cards).length > 0;
    const unseen = TP.content.cards.filter(c => !TP.S.cards[c.id]).length;
    const newTarget = days != null && days > 3 ? Math.max(5, Math.min(30, Math.ceil(unseen / (days - 3)))) : 10;
    const drillAgo = TP.S.drills.length ? daysSince(TP.S.drills[TP.S.drills.length - 1].date) : null;
    const examAgo = TP.S.exams.length ? daysSince(TP.S.exams[TP.S.exams.length - 1].date) : null;
    const dateStr = new Date().toLocaleDateString("de-AT", { weekday: "long", day: "numeric", month: "long" });
    const F = TP.file;

    stage.appendChild(h("div.page-head.hello", h("div", h("div.faint", { style: { fontSize: "13.5px" } }, dateStr), h("h1", "Heute"),
      h("p", days != null && days >= 0 ? "Noch " + days + " Tage bis zur Prüfung. Arbeite den Plan von oben nach unten ab — jeder Punkt ist klein." : "Setze dein Prüfungsdatum, dann rechnet die App dir eine Tagesdosis aus.")),
      h("div.row", h("span.chip", TP.streak() + " Tage in Folge"), h("span.chip", (L.cards || 0) + (L.quiz || 0) + (L.calc || 0) + " Übungen heute"))));

    /* first run */
    const needDate = !TP.S.examDate, needFolder = F.ok && F.state === "none";
    if (needDate || needFolder) {
      stage.appendChild(h("div.setup", { style: { marginBottom: "18px" } }, h("div", { style: { fontWeight: 650, marginBottom: "8px" } }, "Zum Einrichten"),
        h("div.row", { style: { gap: "22px" } },
          needDate ? h("div.row", h("span", "Prüfungsdatum:"), h("input", { type: "date", style: { width: "165px" }, onchange: e => { TP.S.examDate = e.target.value; TP.save(); TP.render(); } })) : null,
          needFolder ? h("div.row", h("span", "Speicherort für deinen Fortschritt:"), h("button.btn.sm.primary", { onclick: async () => { await TP.chooseFolder(); TP.render(); } }, "Ordner wählen")) : null)));
    }

    /* plan */
    const tasks = [];
    if (seenAny || due > 0) tasks.push({ t: "Fällige Karten wiederholen", s: due ? due + " Karten warten auf dich" : "Nichts fällig — alles wiederholt", p: due ? 0 : 100, done: due === 0, btn: "Wiederholen", act: () => { TP.S.ui.thema = 0; TP.go("ueben", { sub: "karten" }); } });
    tasks.push({ t: "Neue Karten lernen", s: (L.newcards || 0) + " von " + newTarget + " neuen Karten heute" + (unseen ? " · " + unseen + " noch ungesehen" : ""), p: pct(L.newcards || 0, newTarget), done: (L.newcards || 0) >= newTarget || unseen === 0, btn: "Lernen", act: () => { TP.S.ui.thema = 0; TP.go("ueben", { sub: "karten" }); } });
    tasks.push({ t: "Rechnen", s: (L.calc || 0) + " von 5 Aufgaben — jede mit Formel, Einsetzen, Ergebnis + Einheit", p: pct(L.calc || 0, 5), done: (L.calc || 0) >= 5, btn: "Rechnen", act: () => { TP.S.ui.thema = 0; TP.go("ueben", { sub: "rechnen" }); } });
    tasks.push({ t: "Quiz im Prüfungsformat", s: (L.quiz || 0) + " von 10 Fragen", p: pct(L.quiz || 0, 10), done: (L.quiz || 0) >= 10, btn: "Quiz", act: () => { TP.S.ui.thema = 0; TP.go("ueben", { sub: "quiz" }); } });
    tasks.push({ t: "Glaser-Training", s: L.glaser ? "Heute erledigt" : drillAgo == null ? "Noch nie — der größte Einzelposten der Klausur (7 von ~30 Punkten)" : "Zuletzt vor " + drillAgo + (drillAgo === 1 ? " Tag" : " Tagen") + " · alle 2 Tage empfohlen", p: L.glaser || (drillAgo != null && drillAgo < 2) ? 100 : 0, done: !!L.glaser || (drillAgo != null && drillAgo < 2), btn: "Üben", act: () => TP.go("ueben", { sub: "glaser" }) });
    tasks.push({ t: "Probeklausur", s: examAgo == null ? "Noch keine — einmal pro Woche ist ideal" : "Letzte vor " + examAgo + (examAgo === 1 ? " Tag" : " Tagen") + " · wöchentlich empfohlen", p: examAgo != null && examAgo < 7 ? 100 : 0, done: examAgo != null && examAgo < 7, btn: "Starten", act: () => TP.go("pruefung"), opt: true });
    const nDone = tasks.filter(t => t.done).length;
    const firstTodo = tasks.findIndex(t => !t.done);
    const plan = h("div.card.pad", h("div.row.between", h("h2", "Dein Plan für heute"), h("span.muted", nDone + " von " + tasks.length + " erledigt")),
      h("div.plan", { style: { marginTop: "6px" } }, tasks.map((t, i) => h("div.task" + (t.done ? ".done" : ".todo"),
        h("div.chk", "✓"), h("div", h("h4", t.t, t.opt ? h("span.faint", { style: { fontWeight: 400, marginLeft: "8px", fontSize: "12.5px" } }, "optional") : null), h("div.sub", t.s), t.p > 0 && t.p < 100 ? h("div.bar", h("i", { style: { width: t.p + "%" } })) : null),
        h("button.btn" + (i === firstTodo ? ".primary" : "") + (t.done ? ".ghost" : ""), { onclick: t.act }, t.done ? "Nochmal" : t.btn)))));

    /* right column */
    const rec = TP.recommendModule(), focus = TP.S.ui.focusMod && TP.mod(TP.S.ui.focusMod) ? TP.S.ui.focusMod : rec, fm = TP.mod(focus), fst = TP.stats(focus);
    const recM = TP.mod(rec);
    const right = h("div.stack", { style: { gap: "16px" } },
      h("div.card.pad", h("div.label", "Weiter bei"),
        h("div.row", { style: { gap: "14px", margin: "8px 0 12px", flexWrap: "nowrap" } }, U.ring(fst.mastery, 54, U.laneColor(fm.lane), Math.round(fst.mastery * 100) + "%"),
          h("div", h("div", { style: { fontWeight: 700, fontSize: "16px" } }, "M" + U.pad2(focus) + " " + fm.short), h("div.faint", fm.sub + " · " + (fst.due ? fst.due + " Karten fällig" : fst.known + " / " + fst.cards + " Karten sicher")))),
        h("button.btn.primary", { onclick: () => TP.go("lernen", { sub: "m" + focus }) }, "Zum Modul")),
      rec !== focus ? h("div.card.pad", h("div.label", "Empfohlen als Nächstes"),
        h("div", { style: { margin: "6px 0 10px" } }, h("b", "M" + U.pad2(rec) + " " + recM.short), h("span.muted", " — hohes Prüfungsgewicht, noch viel offen")),
        h("button.btn", { onclick: () => TP.go("lernen", { sub: "m" + rec }) }, "Öffnen")) : null,
      h("div.callout", h("b", "Die drei Hebel der Klausur: "), "Glaser-Diagramm (7 von ~30 Punkten), Wärmebrücken-Begriffe („Kältebrücke“, „wärmebrückenfrei“) und die U-Wert-Formelkette mit f_Rsi."));
    stage.appendChild(h("div.split", plan, right));

    /* modules */
    stage.appendChild(h("h3", { style: { margin: "26px 0 10px" } }, "Alle Module"));
    stage.appendChild(h("div.mtiles", TP.MODS.map(m => { const s = TP.stats(m.n); return h("button.mtile", { onclick: () => TP.go("lernen", { sub: "m" + m.n }) },
      h("span.stripe", { style: { background: U.laneColor(m.lane) } }), h("span", h("b", "M" + U.pad2(m.n) + " " + m.short), h("small", m.sub + (s.due ? " · " + s.due + " fällig" : ""))), U.ring(s.mastery, 32, U.laneColor(m.lane), "")); })));
  }

  /* ===================================================================== Fortschritt */
  function heat() {
    const days = 17 * 7, end = new Date(), cells = [];
    const first = new Date(end); first.setDate(end.getDate() - days + 1); const off = (first.getDay() + 6) % 7; first.setDate(first.getDate() - off);
    for (let i = 0; i < days + off; i++) {
      const d = new Date(first); d.setDate(first.getDate() + i);
      if (d > end) { cells.push(h("i", { style: { visibility: "hidden" } })); continue; }
      const l = TP.S.log[TP.dayKey(d)] || {}, n = (l.cards || 0) + (l.quiz || 0) * 2 + (l.calc || 0) * 3 + (l.glaser || 0) * 10 + (l.exam || 0) * 20;
      cells.push(h("i", { "data-l": n === 0 ? 0 : n < 10 ? 1 : n < 30 ? 2 : n < 60 ? 3 : 4, title: TP.dayKey(d) + ": " + (l.cards || 0) + " Karten, " + (l.quiz || 0) + " Quiz, " + (l.calc || 0) + " Rechnen" }));
    }
    return h("div.heat", cells);
  }
  function spark(vals, w, hgt, color, maxV) {
    const s = svg("svg", { viewBox: `0 0 ${w} ${hgt}`, style: `width:100%;max-width:${w}px;height:auto` });
    if (!vals.length) return s;
    const mx = maxV != null ? maxV : Math.max(...vals), X = i => 6 + (vals.length === 1 ? (w - 12) / 2 : i / (vals.length - 1) * (w - 12)), Y = v => hgt - 6 - v / (mx || 1) * (hgt - 12);
    s.appendChild(svg("path", { d: vals.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)).join(""), fill: "none", stroke: color, "stroke-width": 2 }));
    vals.forEach((v, i) => s.appendChild(svg("circle", { cx: X(i), cy: Y(v), r: 3, fill: color })));
    return s;
  }
  function fortschritt(stage, days) {
    const unseen = TP.content.cards.filter(c => !TP.S.cards[c.id]).length, due = TP.dueTotal(), known = TP.content.cards.filter(c => TP.srs.known(c.id)).length;
    stage.appendChild(U.pageHead("Fortschritt", "Where you stand, per module, and what a sensible daily dose looks like."));
    stage.appendChild(h("div.kpis", { style: { marginBottom: "18px" } },
      U.kpi("Beherrschung gesamt", Math.round(TP.overall() * 100) + " %", ""), U.kpi("Prüfung", days == null ? "—" : days >= 0 ? days + " Tage" : "vorbei", "", days != null && days >= 0 && days <= 14 ? "warn" : ""),
      U.kpi("Karten sicher", known + " / " + TP.content.cards.length, ""), U.kpi("Heute fällig", due, "Karten"), U.kpi("Serie", TP.streak(), "Tage"), U.kpi("Probeklausuren", TP.S.exams.length, TP.S.exams.length ? "zuletzt " + TP.fmt(TP.S.exams[TP.S.exams.length - 1].pts, 1) + " / 30" : "")));
    if (days != null && days > 0) {
      const perDay = Math.ceil(unseen / Math.max(1, days - 3));
      stage.appendChild(h("div.callout", { style: { marginBottom: "18px" } }, h("b", "Tagesdosis: "), unseen ? ["noch ", h("b", unseen), " Karten ungesehen → rund ", h("b", perDay + " neue Karten pro Tag"), " plus die fälligen Wiederholungen; die letzten 3 Tage nur wiederholen."] : "Alle Karten wurden mindestens einmal gesehen — jetzt zählt die Wiederholung."));
    }
    const card = h("div.card.pad", h("div.row.between", h("h3", "Module"), h("span.faint", { style: { fontSize: "12.5px" } }, "Klick öffnet das Modul")));
    TP.MODS.forEach(m => { const s = TP.stats(m.n); card.appendChild(h("div.mrow", { onclick: () => TP.go("lernen", { sub: "m" + m.n }) },
      h("span.lanedot", { style: { background: U.laneColor(m.lane), margin: 0, width: "12px", height: "12px" } }),
      h("div", h("div", { style: { fontWeight: 600 } }, "M" + U.pad2(m.n) + " " + m.short), h("div.faint", { style: { fontSize: "12px" } }, m.sub)),
      h("div.bar", h("i", { style: { width: Math.round(s.mastery * 100) + "%", background: U.laneColor(m.lane) } })), h("span.mono", Math.round(s.mastery * 100) + " %"),
      h("span.faint.mono", { style: { fontSize: "12px" } }, s.known + "/" + s.cards + " Karten" + (s.qN ? " · Quiz " + Math.round(100 * s.qOk / s.qN) + "%" : "") + (s.cN ? " · Rechnen " + Math.round(100 * s.cOk / s.cN) + "%" : "")))); });
    stage.appendChild(card);
    const weakQ = TP.MCQ.map(q => ({ q, r: TP.S.quiz[q.id] })).filter(x => x.r && x.r.n && x.r.ok / x.r.n < 0.7).sort((a, b) => a.r.ok / a.r.n - b.r.ok / b.r.n).slice(0, 5);
    const weakC = TP.GENS.map(g => ({ g, r: TP.S.calc[g.id] })).filter(x => x.r && x.r.n && x.r.ok / x.r.n < 0.7).sort((a, b) => a.r.ok / a.r.n - b.r.ok / b.r.n).slice(0, 5);
    const hard = TP.content.cards.map(c => ({ c, s: TP.S.cards[c.id] })).filter(x => x.s && x.s.lapses >= 2).sort((a, b) => b.s.lapses - a.s.lapses).slice(0, 5);
    const none = () => h("p.muted", "Nichts Auffälliges — oder noch nicht genug geübt.");
    stage.appendChild(h("div.cols3", { style: { margin: "18px 0" } },
      h("div.card.pad", h("h3", "Schwache Rechenaufgaben"), weakC.length ? h("div.stack", { style: { marginTop: "8px", gap: "6px" } }, weakC.map(x => h("div.row.between", h("span", x.g.title), h("span.mono.muted", Math.round(100 * x.r.ok / x.r.n) + " % · " + x.r.n + "×")))) : none()),
      h("div.card.pad", h("h3", "Schwache Quiz-Fragen"), weakQ.length ? h("div.stack", { style: { marginTop: "8px", gap: "6px" } }, weakQ.map(x => h("div", { style: { fontSize: "13.5px" } }, h("span.tag", "M" + U.pad2(x.q.mod)), " ", x.q.stem.split("\n")[0].replace(/\*\*/g, "").slice(0, 90)))) : none()),
      h("div.card.pad", h("h3", "Karten, die immer wieder fallen"), hard.length ? h("div.stack", { style: { marginTop: "8px", gap: "6px" } }, hard.map(x => h("div", { style: { fontSize: "13.5px" } }, h("span.tag", x.s.lapses + "×"), " ", x.c.q.replace(/\$[^$]*\$/g, "…").slice(0, 80)))) : none())));
    const ex = TP.S.exams, dr = TP.S.drills;
    stage.appendChild(h("div.split.even", { style: { marginBottom: "18px" } },
      h("div.card.pad", h("div.row.between", h("h3", "Probeklausuren"), h("span.faint", { style: { fontSize: "12.5px" } }, "Bestehensgrenze 15 / 30")), ex.length ? [spark(ex.map(e => e.pts), 460, 90, "var(--accent)", 30), h("div.faint", { style: { fontSize: "12.5px" } }, ex.map(e => TP.fmt(e.pts, 1)).join(" → "))] : h("p.muted", "Noch keine abgeschlossene Probeklausur.")),
      h("div.card.pad", h("div.row.between", h("h3", "Glaser-Training"), h("span.faint", { style: { fontSize: "12.5px" } }, "Punkte (von 7)")), dr.length ? [spark(dr.map(e => e.pts), 460, 90, "var(--ps)", 7), h("div.faint", { style: { fontSize: "12.5px" } }, dr.slice(-8).map(e => TP.fmt(e.pts, 1) + " P / " + Math.round(e.secs / 60) + " min").join("  ·  "))] : h("p.muted", "Noch keine Glaser-Übung. 15–20 Minuten sind das Ziel."))));
    stage.appendChild(h("div.card.pad", h("h3", "Aktivität (17 Wochen)"), h("div", { style: { margin: "10px 0", overflowX: "auto" } }, heat()), h("div.faint", { style: { fontSize: "12.5px" } }, "Karten = 1 · Quiz = 2 · Rechnen = 3 · Glaser = 10 · Probeklausur = 20 Punkte pro Tag")));
  }

  /* ===================================================================== Speicher & Einstellungen */
  function speicher(stage) {
    const F = TP.file;
    stage.appendChild(U.pageHead("Speicher & Einstellungen", "Your progress is one small file in a folder you choose — so it survives, and PC and laptop can share it through Google Drive."));
    const state = F.state === "ok" ? ["ok", ["Dein Fortschritt wird automatisch gespeichert in ", h("b", F.name + "/Taupunkt.tpk"), "."]] :
      F.state === "needs" ? ["warn", "Der Browser braucht deine Erlaubnis erneut für den Ordner „" + F.name + "“ (einmal klicken)."] :
        F.state === "error" ? ["bad", "Die Datei konnte nicht geschrieben werden: " + (F.msg || "unbekannter Fehler")] :
          F.ok ? ["warn", "Noch kein Ordner gewählt. Bis dahin liegt alles nur in diesem Browser."] : ["warn", "Dieser Browser kann nicht in einen Ordner speichern. Nutze das Backup unten (Brave, Chrome oder Edge können es automatisch)."];
    const cardSave = h("div.card.pad", h("h3", "Speicherort"), h("div.callout." + state[0], { style: { margin: "10px 0" } }, state[1]),
      h("div.row", F.ok ? h("button.btn.primary", { onclick: async () => { await TP.chooseFolder(); TP.render(); } }, F.dir ? "Anderen Ordner wählen" : "Ordner wählen") : null,
        F.ok && F.dir && F.state === "needs" ? h("button.btn", { onclick: async () => { await TP.reconnect(); TP.render(); } }, "Erneut erlauben") : null,
        F.dir ? h("button.btn.ghost", { onclick: async () => { await TP.forgetFolder(); TP.render(); } }, "Nicht mehr in den Ordner speichern") : null),
      h("p.faint", { style: { fontSize: "12.5px", marginTop: "10px" } }, "Close the app on one computer before using it on the other."));
    const cardDate = h("div.card.pad", h("h3", "Prüfungsdatum"), h("p.muted", { style: { margin: "6px 0 10px" } }, "Für den Countdown und die Tagesdosis."), h("input", { type: "date", value: TP.S.examDate, style: { maxWidth: "200px" }, onchange: e => { TP.S.examDate = e.target.value; TP.save(); TP.render(); } }));
    const cardTheme = h("div.card.pad", h("h3", "Darstellung"), h("div.seg", { style: { marginTop: "10px" } }, [["auto", "Automatisch"], ["light", "Hell"], ["dark", "Dunkel"]].map(([v, t]) => h("button", { "aria-pressed": (TP.S.theme || "auto") === v ? "true" : "false", onclick: () => { TP.setTheme(v); TP.render(); } }, t))));
    const cardBackup = h("div.card.pad", h("h3", "Backup"), h("p.muted", { style: { margin: "6px 0 10px" } }, "Eine Kopie als Datei herunterladen oder zurückspielen."), h("div.row", h("button.btn", { onclick: TP.exportFile }, "Backup herunterladen"), h("button.btn", { onclick: TP.importFile }, "Backup einspielen")));
    const keys = [["Strg + K", "Alles durchsuchen (Karten, Formeln, Module)"], ["Alt + 1 … 6", "Zwischen den Reitern wechseln"], ["Leertaste", "Karte: Antwort zeigen / mit „Gut“ bewerten"], ["1 2 3 4", "Karte: Nochmal / Schwer / Gut / Leicht"]];
    const cardKeys = h("div.card.pad", h("h3", "Tastenkürzel"), h("div.stack", { style: { marginTop: "10px", gap: "8px" } }, keys.map(([k, t]) => h("div.row.between", h("span", t), h("kbd", k)))));
    const cardReset = h("div.card.pad", h("h3", "Zurücksetzen"), h("p.muted", { style: { margin: "6px 0 10px" } }, "Löscht Karten-, Quiz-, Rechen- und Prüfungsfortschritt (Datum und Darstellung bleiben)."), h("button.btn.bad", { onclick: () => { if (confirm("ALLEN Fortschritt löschen? Das kann nicht rückgängig gemacht werden.\n\nTipp: lade vorher ein Backup herunter.")) TP.resetAll(); } }, "Fortschritt löschen"));
    stage.appendChild(h("div.split.even", { style: { gap: "16px" } }, h("div.stack", { style: { gap: "16px" } }, cardSave, cardDate, cardTheme), h("div.stack", { style: { gap: "16px" } }, cardBackup, cardKeys, cardReset)));
  }
})(window.TP);
