/* Taupunkt — Üben: sidebar = what (Karten / Quiz / Rechnen / Glaser) + topic filter; centre = one focused activity.
   Reusable pieces (multiple-choice and calculation widgets) live in TP.ui and are also used by the mock exam. */
(function (TP) {
  const { h } = TP;
  const U = TP.ui;
  TP.drills = TP.drills || {};

  /* =========================================================================================
     reusable: multiple-choice question
     ========================================================================================= */
  U.mcq = function (q) {
    const single = q.kind === "single", name = "q" + TP.uid();
    const rows = q.opts.map(op => {
      const inp = h("input", { type: single ? "radio" : "checkbox", name });
      const why = h("div.why", { style: { display: "none" } }, op.why || "");
      const row = h("label.opt", inp, h("div", { style: { flex: 1 } }, TP.mdEl(op.t), why));
      return { op, inp, row, why };
    });
    const root = h("div.stack", { style: { gap: "12px" } },
      h("div", { style: { fontWeight: 600, fontSize: "16px" } }, TP.mdEl(q.stem)),
      h("div.faint", { style: { fontSize: "12.5px" } }, single ? "Genau eine Antwort ist richtig." : "Mehrere Aussagen können richtig sein (1 bis n−1) — beurteile jede einzeln."),
      h("div.stack", { style: { gap: "8px" } }, rows.map(r => r.row)));
    return {
      el: root,
      answered: () => rows.some(r => r.inp.checked),
      grade(regime) {
        const n = rows.length, nTrue = rows.filter(r => r.op.ok).length;
        let good = 0, tp = 0, fp = 0;
        rows.forEach(r => { if (r.inp.checked === r.op.ok) good++; if (r.inp.checked && r.op.ok) tp++; if (r.inp.checked && !r.op.ok) fp++; });
        const perfect = good === n, blank = !rows.some(r => r.inp.checked);   // an unanswered question earns nothing in any regime
        let score = perfect ? 1 : 0;
        if (!single && regime === "partial") score = blank ? 0 : good / n;
        if (!single && regime === "neg") score = Math.max(0, (tp - fp) / nTrue);
        return { score, perfect, good, n, partial: blank ? 0 : good / n };
      },
      reveal() {
        rows.forEach(r => {
          r.inp.disabled = true;
          const marked = r.inp.checked;
          r.row.classList.remove("right", "wrong", "missed");
          if (marked && r.op.ok) r.row.classList.add("right"); else if (marked && !r.op.ok) r.row.classList.add("wrong"); else if (!marked && r.op.ok) r.row.classList.add("missed");
          r.why.style.display = r.op.why ? "" : "none";
          if (r.op.why) r.why.textContent = (r.op.ok ? "✓ " : "✗ ") + r.op.why;
        });
      },
    };
  };
  TP.ui.mcq = U.mcq;

  /* =========================================================================================
     reusable: calculation task
     ========================================================================================= */
  U.calc = function (task) {
    const inputs = task.fields.map(fl => h("input.num", { type: "text", inputmode: "decimal", autocomplete: "off", placeholder: "…", "aria-label": fl.key }));
    const sols = task.fields.map(() => h("div.sol"));
    const stepsBox = h("div", { style: { display: "none" } });
    const root = h("div.stack", { style: { gap: "14px" } },
      h("div", TP.mdEl(task.prompt)),
      h("div.ans-grid", task.fields.map((fl, i) => h("label.ans", h("span.label", fl.label), h("div.inwrap", inputs[i], h("span.unit", fl.unit)), sols[i]))),
      h("div.faint", { style: { fontSize: "12.5px" } }, "Dezimalkomma oder -punkt, Ergebnis mit Einheit — in der Prüfung zählt der Rechenweg. Toleranz: rund 1,5 %."),
      stepsBox);
    return {
      el: root,
      anyInput: () => inputs.some(i => i.value.trim()),
      grade() {
        const per = task.fields.map((fl, i) => TP.checkField(fl, inputs[i].value));
        const ok = per.filter(p => p.ok).length;
        return { per, ok, n: task.fields.length, score: ok / task.fields.length };
      },
      reveal() {
        const per = task.fields.map((fl, i) => TP.checkField(fl, inputs[i].value));
        task.fields.forEach((fl, i) => {
          inputs[i].classList.remove("good", "badv"); inputs[i].readOnly = true;
          inputs[i].classList.add(per[i].ok ? "good" : "badv");
          sols[i].textContent = (per[i].ok ? "✓ " : "Lösung: ") + TP.fmt(fl.value, fl.dec != null ? fl.dec : Math.abs(fl.value) >= 100 ? 1 : Math.abs(fl.value) >= 1 ? 3 : 4) + " " + fl.unit;
        });
        stepsBox.style.display = ""; TP.clear(stepsBox);
        stepsBox.appendChild(h("details.acc", { open: true }, h("summary", "Rechenweg"), h("div", TP.mdEl(task.steps))));
      },
    };
  };
  TP.ui.calc = U.calc;

  /* =========================================================================================
     the tab
     ========================================================================================= */
  const MODES = [["karten", "Karten", "karten"], ["quiz", "Quiz", "quiz"], ["rechnen", "Rechnen", "rechnen"], ["glaser", "Glaser-Training", "glaser"]];
  const CS = { mod: -1, hot: false, queue: null, i: 0, shown: false, session: { n: 0, again: 0 }, newLimit: 15 };
  const QS = { mod: -1, official: false, regime: "partial", list: null, i: 0, res: [], done: false };
  const RS = { gen: "*", mod: -1, task: null, checked: false };
  let kb = null;
  TP._ueben = { CS, QS, RS };

  TP.tabs.ueben = {
    render(main, args) {
      if (kb) { document.removeEventListener("keydown", kb); kb = null; }
      const mode = (args && args.sub && MODES.some(m => m[0] === args.sub)) ? args.sub : (TP.S.ui.uebenMode || "karten");
      TP.S.ui.uebenMode = mode;
      const thema = TP.S.ui.thema || 0;
      if (CS.mod !== thema) { CS.mod = thema; CS.queue = null; }
      if (QS.mod !== thema) { QS.mod = thema; QS.list = null; QS.done = false; }
      if (RS.mod !== thema) { RS.mod = thema; RS.task = null; RS.gen = "*"; }
      const rerender = () => TP.go("ueben", { sub: mode });

      /* sidebar */
      const due = TP.dueTotal(), fresh = TP.content.cards.filter(c => !TP.S.cards[c.id]).length;
      const modeItems = MODES.map(([k, t, ic]) => U.nav({ iconKey: ic, title: t, active: k === mode, onclick: () => { TP.S.ui.uebenMode = k; TP.go("ueben", { sub: k }); },
        sub: k === "karten" ? due + " fällig · " + fresh + " neu" : k === "quiz" ? TP.MCQ.length + " Fragen im Prüfungsformat" : k === "rechnen" ? TP.GENS.length + " Aufgabentypen, ∞ Zahlen" : "15–20 min · 7 Punkte" }));
      const parts = [...modeItems];
      if (mode !== "glaser") {
        parts.push(U.sbSep(), U.sbLabel("Thema"));
        parts.push(U.nav({ icon: "∗", title: "Alle Module", active: !thema, meta: mode === "karten" ? due + "" : "", onclick: () => { TP.S.ui.thema = 0; rerender(); } }));
        TP.MODS.forEach(m => {
          const s = TP.stats(m.n), cnt = mode === "karten" ? (s.due || "") : mode === "quiz" ? (s.qTotal || "—") : (s.gTotal || "—");
          parts.push(U.nav({ icon: U.pad2(m.n), color: U.laneColor(m.lane), title: m.short, active: thema === m.n, meta: cnt + "", onclick: () => { TP.S.ui.thema = m.n; rerender(); } }));
        });
        if (mode === "karten") parts.push(U.sbSep(), h("label.row", { style: { gap: "8px", padding: "4px 10px", cursor: "pointer" } }, h("input", { type: "checkbox", checked: CS.hot, onchange: e => { CS.hot = e.target.checked; CS.queue = null; rerender(); } }), "nur Prüfungsfavoriten"));
      }
      const side = U.sidebar("Üben", ...parts);
      const { stage } = U.layout(main, { sidebar: side, narrow: mode !== "glaser" });
      const body = h("div"); stage.appendChild(body);
      ({ karten: cardsView, quiz: quizView, rechnen: calcView, glaser: glaserView })[mode](body, thema);
    },
  };

  const themaLabel = thema => thema ? "M" + U.pad2(thema) + " " + TP.mod(thema).short : "Alle Module";

  /* ---------- Karten ---------- */
  function buildQueue() {
    const today = TP.dayNum();
    const all = TP.content.cards.filter(c => (!CS.mod || c.mod === CS.mod) && (!CS.hot || c.hot));
    const due = all.filter(c => TP.S.cards[c.id] && TP.S.cards[c.id].due <= today).sort((a, b) => TP.S.cards[a.id].due - TP.S.cards[b.id].due);
    const fresh = TP.shuffle(all.filter(c => !TP.S.cards[c.id])).sort((a, b) => (b.hot ? 1 : 0) - (a.hot ? 1 : 0)).slice(0, CS.newLimit);
    CS.queue = TP.shuffle(due).concat(fresh); CS.i = 0; CS.shown = false; CS.session = { n: 0, again: 0 };
    CS.counts = { due: due.length, fresh: fresh.length, total: all.length, known: all.filter(c => TP.srs.known(c.id)).length };
  }
  function cardsView(el, thema) {
    if (!CS.queue || (CS.counts && CS.counts.total === 0 && TP.content.cards.length)) buildQueue();
    const draw = () => {
      TP.clear(el);
      el.appendChild(h("div.row.between", { style: { marginBottom: "14px" } }, h("div", h("h2", "Karten"), h("div.faint", { style: { fontSize: "13px" } }, themaLabel(thema) + (CS.hot ? " · Prüfungsfavoriten" : ""))),
        h("div.row", h("span.chip", CS.counts.due + " fällig"), h("span.chip", CS.counts.fresh + " neu"), h("span.chip", CS.counts.known + " / " + CS.counts.total + " sicher"))));
      const c = CS.queue[CS.i];
      if (!c) {
        el.appendChild(h("div.card.pad", { style: { textAlign: "center", padding: "46px 24px" } },
          h("h2", CS.session.n ? "Sitzung geschafft" : "Nichts fällig"),
          h("p.muted", { style: { margin: "8px 0 18px" } }, CS.session.n ? CS.session.n + " Karten bewertet, " + CS.session.again + "× „Nochmal“. Wiederholungen kommen automatisch zurück." : "Hier ist nichts fällig. Lerne weitere neue Karten oder komm morgen wieder."),
          h("div.row", { style: { justifyContent: "center" } }, h("button.btn.primary", { onclick: () => { buildQueue(); draw(); } }, "Weitere neue Karten"), h("button.btn", { onclick: () => TP.go("uebersicht") }, "Zurück zur Übersicht"))));
        return;
      }
      const m = TP.mod(c.mod);
      const card = h("div.card.fcard");
      card.appendChild(h("div.row.between", h("span.label", { style: { color: m ? U.laneColor(m.lane) : "" } }, m ? "M" + U.pad2(m.n) + " " + m.short : "—"), h("div.row", { style: { gap: "6px" } }, c.hot ? h("span.tag.hot", "Prüfungsfavorit") : null, h("span.tag", c.src))));
      card.appendChild(h("div.q", TP.mdEl(c.q)));
      if (CS.shown) card.appendChild(h("div.a", TP.mdEl(c.a)));
      const wrap = h("div.deck", h("div.progress", h("i", { style: { width: (100 * CS.i / CS.queue.length) + "%" } })), card);
      if (!CS.shown) wrap.appendChild(h("div.row", { style: { justifyContent: "center", marginTop: "14px" } }, h("button.btn.primary.lg", { onclick: show }, "Antwort zeigen")));
      else wrap.appendChild(h("div.grades", { style: { marginTop: "14px" } }, [["Nochmal", 0], ["Schwer", 1], ["Gut", 2], ["Leicht", 3]].map(([t, g]) => h("button.btn" + (g === 0 ? ".bad" : g === 2 ? ".primary" : ""), { onclick: () => grade(g) }, t, h("small", TP.srs.preview(c.id, g))))));
      wrap.appendChild(h("div.hints", h("span", h("kbd", "Leertaste"), " ", CS.shown ? "= Gut" : "Antwort zeigen"), CS.shown ? h("span", h("kbd", "1"), " ", h("kbd", "2"), " ", h("kbd", "3"), " ", h("kbd", "4"), " bewerten") : null, h("span", (CS.i + 1) + " / " + CS.queue.length)));
      el.appendChild(wrap);
    };
    const show = () => { CS.shown = true; draw(); };
    const grade = g => {
      const c = CS.queue[CS.i]; if (!c) return;
      TP.srs.grade(c.id, g); CS.session.n++;
      if (g === 0) { CS.session.again++; CS.queue.push(c); }
      CS.i++; CS.shown = false; draw();
    };
    kb = e => {
      if (e.target.matches("input,select,textarea") || e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.code === "Space") { e.preventDefault(); if (!CS.shown) show(); else grade(2); }
      else if (CS.shown && "1234".includes(e.key)) grade(+e.key - 1);
    };
    document.addEventListener("keydown", kb);
    draw();
  }

  /* ---------- Quiz ---------- */
  const REGIMES = [["partial", "Teilpunkte je Option"], ["all", "Alles oder nichts"], ["neg", "Mit Abzug"]];
  function quizView(el, thema) {
    const draw = () => {
      TP.clear(el);
      if (!QS.list) { startScreen(); return; }
      if (QS.done) { summary(); return; }
      question();
    };
    function pool() { return TP.MCQ.filter(q => (!QS.mod || q.mod === QS.mod) && (!QS.official || q.src === "offiziell")); }
    function startScreen() {
      const n = pool().length;
      el.appendChild(h("div.card.pad",
        h("h2", "Multiple-Choice im Prüfungsformat"), h("div.faint", { style: { fontSize: "13px", margin: "2px 0 10px" } }, themaLabel(thema)),
        h("p.muted", "Up to ~10 theory questions with 4–8 statements each, anywhere from 1 to n−1 correct. Judge every statement on its own — don't hunt for “the” answer."),
        h("label.row", { style: { gap: "8px", cursor: "pointer", margin: "8px 0" } }, h("input", { type: "checkbox", checked: QS.official, onchange: e => { QS.official = e.target.checked; draw(); } }), "nur die offiziellen Prüfungsbeispiele des Kurses"),
        h("div.field", { style: { margin: "12px 0" } }, h("span", "Bewertung (die genaue Regel der Prüfung ist offen — frag im Forum oder in der TutorInnenstunde)"),
          h("div.seg", REGIMES.map(([k, t]) => h("button", { "aria-pressed": QS.regime === k ? "true" : "false", onclick: e => { QS.regime = k; TP.$$(".seg button", e.target.parentNode).forEach(b => b.setAttribute("aria-pressed", b === e.target ? "true" : "false")); } }, t)))),
        h("div.callout", "From the official examples: multi-select questions give partial points per option; the single-choice type gives only 0 or 1."),
        h("div.row", { style: { marginTop: "16px" } }, n ? h("button.btn.primary.lg", { onclick: () => { QS.list = TP.shuffle(pool()); QS.i = 0; QS.res = []; QS.done = false; draw(); } }, "Starten (" + n + " Fragen)") : h("span.muted", "Für dieses Thema gibt es noch keine Quiz-Fragen — wähle „Alle Module“."))));
    }
    function question() {
      const q = QS.list[QS.i], view = U.mcq(q);
      let checked = false;
      const m = TP.mod(q.mod);
      const btn = h("button.btn.primary", { onclick: () => {
        if (!checked) {
          if (!view.answered()) { TP.toast("Mark at least one statement."); return; }
          checked = true;
          const g = view.grade(QS.regime); view.reveal(); QS.res.push({ q, g });
          const rec = TP.S.quiz[q.id] || { n: 0, ok: 0 }; rec.n++; rec.ok += g.partial; rec.last = TP.dayNum(); TP.S.quiz[q.id] = rec; TP.logAct("quiz"); TP.saveSoon();
          fb.appendChild(h("div.callout." + (g.perfect ? "ok" : g.score > 0.5 ? "warn" : "bad"), h("b", g.perfect ? "Alles richtig. " : g.good + " von " + g.n + " Aussagen richtig beurteilt. "), "Punkte (" + REGIMES.find(r => r[0] === QS.regime)[1] + "): ", TP.fmt(g.score, 2), " / 1"));
          btn.textContent = QS.i + 1 < QS.list.length ? "Nächste Frage" : "Ergebnis";
        } else { QS.i++; if (QS.i >= QS.list.length) QS.done = true; draw(); }
      } }, "Prüfen");
      const fb = h("div");
      el.appendChild(h("div.deck", { style: { maxWidth: "none" } },
        h("div.progress", h("i", { style: { width: (100 * QS.i / QS.list.length) + "%" } })),
        h("div.card.pad", h("div.row.between", { style: { marginBottom: "10px" } }, h("span.label", { style: { color: m ? U.laneColor(m.lane) : "" } }, m ? "M" + U.pad2(m.n) + " " + m.short : ""), h("div.row", { style: { gap: "6px" } }, q.src === "offiziell" ? h("span.tag.hot", "offizielles Beispiel") : null, h("span.tag", (QS.i + 1) + " / " + QS.list.length))), view.el),
        fb, h("div.row", { style: { justifyContent: "flex-end", marginTop: "12px" } }, h("button.btn.ghost", { onclick: () => { QS.list = null; draw(); } }, "Abbrechen"), btn)));
    }
    function summary() {
      const tot = QS.res.reduce((s, r) => s + r.g.score, 0), perfect = QS.res.filter(r => r.g.perfect).length;
      el.appendChild(h("div.card.pad", h("h2", "Ergebnis"),
        h("div.kpis", { style: { margin: "12px 0" } }, h("div.kpi", h("div.label", "Punkte"), h("div.v", TP.fmt(tot, 1), h("small", "/ " + QS.res.length))), h("div.kpi", h("div.label", "ganz richtig"), h("div.v", perfect, h("small", "/ " + QS.res.length)))),
        h("div.stack", { style: { gap: "6px" } }, QS.res.filter(r => !r.g.perfect).map(r => h("div.callout.warn", h("b", "M" + U.pad2(r.q.mod) + " · "), r.q.stem.split("\n")[0].replace(/\*\*/g, "")))),
        h("div.row", { style: { marginTop: "14px" } }, h("button.btn.primary", { onclick: () => { QS.list = null; QS.done = false; draw(); } }, "Neue Runde"))));
    }
    draw();
  }

  /* ---------- Rechnen ---------- */
  function calcView(el, thema) {
    const gens = () => TP.GENS.filter(g => !RS.mod || g.mod === RS.mod);
    const newTask = () => { const l = gens(); const g = RS.gen === "*" ? TP.pick(l.length ? l : TP.GENS) : TP.gen(RS.gen); RS.task = TP.makeTask(g || TP.pick(TP.GENS)); RS.checked = false; };
    if (!RS.task) newTask();
    const draw = () => {
      TP.clear(el);
      const t = RS.task, m = TP.mod(t.mod), view = U.calc(t);
      el.appendChild(h("div.row.between", { style: { marginBottom: "14px" } }, h("div", h("h2", "Rechnen"), h("div.faint", { style: { fontSize: "13px" } }, themaLabel(thema) + " · " + gens().length + " Aufgabentypen, jede Aufgabe mit neuen Zahlen")),
        h("select", { style: { width: "auto", maxWidth: "320px" }, onchange: e => { RS.gen = e.target.value; newTask(); draw(); } }, [h("option", { value: "*", selected: RS.gen === "*" }, "Zufällige Aufgabe")].concat(gens().map(g => h("option", { value: g.id, selected: RS.gen === g.id }, g.title))))));
      const fb = h("div");
      const btn = h("button.btn.primary", { onclick: () => {
        if (!RS.checked) {
          if (!view.anyInput()) { TP.toast("Enter at least one result — or use “Lösung zeigen”."); return; }
          RS.checked = true; const g = view.grade(); view.reveal();
          const rec = TP.S.calc[t.gen] || { n: 0, ok: 0 }; rec.n++; rec.ok += g.score; rec.last = TP.dayNum(); TP.S.calc[t.gen] = rec; TP.logAct("calc"); TP.saveSoon();
          fb.appendChild(h("div.callout." + (g.score === 1 ? "ok" : g.score > 0 ? "warn" : "bad"), h("b", g.score === 1 ? "Richtig. " : g.ok + " von " + g.n + " richtig. "), g.score === 1 ? "Exam reminder: write formula → substitute → result with unit." : "Check the worked solution below."));
          btn.textContent = "Nächste Aufgabe"; skip.style.display = "none";
        } else { newTask(); draw(); }
      } }, "Prüfen");
      const skip = h("button.btn.ghost", { onclick: () => { RS.checked = true; view.reveal(); const rec = TP.S.calc[t.gen] || { n: 0, ok: 0 }; rec.n++; rec.last = TP.dayNum(); TP.S.calc[t.gen] = rec; TP.saveSoon(); btn.textContent = "Nächste Aufgabe"; skip.style.display = "none"; } }, "Lösung zeigen");
      el.appendChild(h("div.card.pad", h("div.row.between", { style: { marginBottom: "10px" } }, h("span.label", { style: { color: m ? U.laneColor(m.lane) : "" } }, m ? "M" + U.pad2(m.n) + " · " + t.title : t.title), h("span.tag", "Zufallszahlen")), view.el, fb,
        h("div.row", { style: { justifyContent: "flex-end", marginTop: "14px" } }, skip, btn)));
    };
    draw();
  }

  /* ---------- Glaser-Training ---------- */
  function glaserView(el) {
    if (TP.drills.glaser) TP.drills.glaser.render(el); else el.appendChild(h("div.empty", "Glaser-Training lädt …"));
  }
})(window.TP);
