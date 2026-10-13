/* Taupunkt — Prüfung: a mock exam in the real format. MC (multi-select) + Rechenbeispiele + Pflicht-Glaserdiagramm (7 of ~30 points), 2 h, 50 % to pass. */
(function (TP) {
  const { h } = TP;
  const X = { phase: "start", regime: "partial", minutes: 120, sections: null, t0: 0, timer: null, result: null };

  function weightedPick(items, k, wOf) {
    const pool = items.slice(), out = [];
    while (out.length < k && pool.length) {
      const ws = pool.map(wOf), tot = ws.reduce((a, b) => a + b, 0); let r = Math.random() * tot, i = 0;
      while (i < pool.length - 1 && (r -= ws[i]) > 0) i++;
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }
  function build() {
    const mw = n => { const m = TP.mod(n); return m ? m.w : 2; };
    const unmastered = q => { const r = TP.S.quiz[q.id]; return r && r.n ? 1.6 - r.ok / r.n : 1.3; };
    const qs = weightedPick(TP.MCQ.filter(q => q.mod !== 13 || Math.random() < 0.5), 10, q => mw(q.mod) * unmastered(q) * (q.src === "offiziell" ? 1.3 : 1));
    // calculations: four different types from different modules, heavier modules more likely; never the Glaser-formula task twice
    const gens = []; const used = new Set();
    weightedPick(TP.GENS, TP.GENS.length, g => mw(g.mod)).forEach(g => { if (gens.length < 4 && !used.has(g.mod)) { used.add(g.mod); gens.push(g); } });
    const tasks = gens.map(g => TP.makeTask(g));
    return { qs, tasks, pts: { mc: 10, calc: [3, 3, 3, 4], glaser: 7 } };
  }

  TP.tabs.pruefung = {
    render(main) {
      if (X.timer) { clearInterval(X.timer); X.timer = null; }
      main.appendChild(h("div.page-head", h("div", h("h1", "Prüfung"), h("p", "A mock exam in the real format: about 10 multi-select theory questions, four Rechenbeispiele and the mandatory Glaser diagram (7 of ~30 points). 50 % to pass. Work with the Formelsammlung open in another tab — no other notes."))));
      const body = h("div"); main.appendChild(body);
      ({ start, run, done })[X.phase](body);
    },
  };

  function start(el) {
    const hist = TP.S.exams;
    el.appendChild(h("div.grid", { style: { gridTemplateColumns: "minmax(0,1fr) 360px", alignItems: "start" } },
      h("div.card.pad",
        h("h2", "Probeklausur starten"),
        h("div.kpis", { style: { margin: "14px 0" } }, [["Teil A", "10 MC-Fragen", "10 Punkte"], ["Teil B", "4 Rechenbeispiele", "13 Punkte"], ["Teil C", "Glaserdiagramm", "7 Punkte"]].map(([a, b, c]) => h("div.kpi", h("div.label", a), h("div", { style: { fontWeight: 650, margin: "3px 0" } }, b), h("div.muted", c)))),
        h("div.row", { style: { gap: "18px", alignItems: "flex-end" } },
          h("label.field", { style: { width: "220px" } }, h("span", "Zeit"), h("select", { onchange: e => { X.minutes = +e.target.value; } }, [[120, "120 Minuten (echt)"], [90, "90 Minuten (straffer)"], [0, "ohne Zeitlimit"]].map(([v, t]) => h("option", { value: v, selected: X.minutes === v }, t)))),
          h("label.field", { style: { width: "240px" } }, h("span", "MC-Bewertung"), h("select", { onchange: e => { X.regime = e.target.value; } }, [["partial", "Teilpunkte je Option"], ["all", "Alles oder nichts"], ["neg", "Mit Abzug"]].map(([v, t]) => h("option", { value: v, selected: X.regime === v }, t))))),
        h("div.callout", { style: { margin: "14px 0" } }, h("b", "Tactics from the vault: "), "two passes through the MC block (answer the sure ones first, ~60–90 s each), then Rechenbeispiele, then Glaser (15–20 min). Always write formula → substitute → result with unit; round only at the end."),
        h("button.btn.primary", { onclick: () => { X.sections = build(); X.phase = "run"; X.t0 = Date.now(); X.result = null; TP.render(); } }, "Los geht's — Uhr startet")),
      h("div.card.pad", h("h3", "Bisherige Probeklausuren"), hist.length ? h("div.stack", { style: { marginTop: "10px", gap: "8px" } }, hist.slice().reverse().slice(0, 8).map(e => h("div.row.between", { style: { padding: "6px 0", borderBottom: "1px solid var(--line2)" } }, h("span", e.date), h("span.mono", TP.fmt(e.pts, 1) + " / " + e.max), h("span.tag." + (e.pts / e.max >= 0.5 ? "ok" : "bad"), e.pts / e.max >= 0.5 ? "bestanden" : "nicht bestanden")))) : h("p.muted", "Noch keine. Doruk, the first one is for finding out where you are — not for the grade."))));
  }

  function run(el) {
    const S = X.sections, views = { mc: S.qs.map(q => TP.ui.mcq(q)), calc: S.tasks.map(t => TP.ui.calc(t)) };
    const clock = h("span.timer", "00:00");
    const bar = h("div.card", { style: { position: "sticky", top: "calc(var(--hdr) + 8px)", zIndex: 20, padding: "10px 16px", display: "flex", gap: "16px", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" } },
      h("div.row", h("span.label", X.minutes ? "Verbleibend" : "Zeit"), clock), h("span.muted", { style: { fontSize: "13px" } }, "Teil A · Teil B · Teil C"),
      h("button.btn.primary", { onclick: () => submit(false) }, "Prüfung abgeben"));
    el.appendChild(bar);
    const upd = () => {
      if (!document.body.contains(clock)) { clearInterval(X.timer); X.timer = null; return; }
      const el_s = Math.floor((Date.now() - X.t0) / 1000), s = X.minutes ? X.minutes * 60 - el_s : el_s, a = Math.abs(s);
      clock.textContent = (s < 0 ? "−" : "") + String(Math.floor(a / 60)).padStart(2, "0") + ":" + String(a % 60).padStart(2, "0");
      clock.classList.toggle("low", X.minutes && s < 10 * 60);
      if (X.minutes && s === 0) TP.toast("Zeit abgelaufen — please hand in (extra time is not counted in the exam).");
    };
    upd(); X.timer = setInterval(upd, 1000);
    /* Teil A */
    el.appendChild(h("h2", { style: { margin: "6px 0 12px" } }, "Teil A — Multiple Choice"));
    S.qs.forEach((q, i) => el.appendChild(h("div.card.pad", { style: { marginBottom: "12px" } }, h("div.row.between", { style: { marginBottom: "8px" } }, h("span.label", "Frage " + (i + 1)), h("span.tag", "1 Punkt")), views.mc[i].el)));
    /* Teil B */
    el.appendChild(h("h2", { style: { margin: "26px 0 12px" } }, "Teil B — Rechenbeispiele"));
    S.tasks.forEach((t, i) => el.appendChild(h("div.card.pad", { style: { marginBottom: "12px" } }, h("div.row.between", { style: { marginBottom: "8px" } }, h("span.label", "Aufgabe " + (i + 1) + " · " + t.title), h("span.tag", S.pts.calc[i] + " Punkte")), views.calc[i].el)));
    /* Teil C */
    el.appendChild(h("div.card.pad", { style: { margin: "26px 0 12px" } }));
    const gHost = el.lastChild, gApi = TP.drills.glaser.render(gHost, { exam: true, wantCond: true });
    function submit(auto) {
      if (!auto && !confirm("Prüfung jetzt abgeben?")) return;
      clearInterval(X.timer); X.timer = null;
      const secs = Math.floor((Date.now() - X.t0) / 1000);
      let mc = 0; const miss = {};
      const mcRes = views.mc.map((v, i) => { const g = v.grade(X.regime); v.reveal(); mc += g.score; const q = S.qs[i]; const rec = TP.S.quiz[q.id] || { n: 0, ok: 0 }; rec.n++; rec.ok += g.partial; rec.last = TP.dayNum(); TP.S.quiz[q.id] = rec; if (!g.perfect) miss[q.mod] = (miss[q.mod] || 0) + (1 - g.partial); return g; });
      let calc = 0;
      const calcRes = views.calc.map((v, i) => { const g = v.grade(); v.reveal(); calc += g.score * S.pts.calc[i]; const t = S.tasks[i]; const rec = TP.S.calc[t.gen] || { n: 0, ok: 0 }; rec.n++; rec.ok += g.score; rec.last = TP.dayNum(); TP.S.calc[t.gen] = rec; if (g.score < 1) miss[t.mod] = (miss[t.mod] || 0) + (1 - g.score) * 1.5; return g; });
      const gr = gApi.submit() || { pts: 0, ok: 0, tot: 1 };
      if (gr.pts < 6) miss[6] = (miss[6] || 0) + (7 - gr.pts) / 2;
      const pts = mc + calc + gr.pts, max = 30;
      const rec = { date: TP.dayKey(), secs, regime: X.regime, mc: +mc.toFixed(2), calc: +calc.toFixed(2), glaser: +gr.pts.toFixed(2), pts: +pts.toFixed(2), max, miss };
      TP.S.exams.push(rec); TP.logAct("exam"); TP.save();
      X.result = rec; X.phase = "done";
      bar.replaceWith(resultCard(rec, true));         // stay on the page: the marked answers and worked solutions are below for review
      endRow.remove();
      window.scrollTo(0, 0);
    }
    const endRow = h("div.row", { style: { justifyContent: "flex-end", margin: "20px 0" } }, h("button.btn.primary", { onclick: () => submit(false) }, "Prüfung abgeben"));
    el.appendChild(endRow);
  }

  function done(el) {
    const r = X.result; if (!r) { X.phase = "start"; TP.render(); return; }
    el.appendChild(resultCard(r, false));
    el.appendChild(h("p.muted", { style: { marginTop: "14px", maxWidth: "820px" } }, "Tip: the worked solutions of the exam are only visible right after handing in. Use Üben → Rechnen / Quiz / Glaser-Training to redo the topics above."));
  }

  function resultCard(r, withReview) {
    const pass = r.pts / r.max >= 0.5, weak = Object.entries(r.miss).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const mm = Math.floor(r.secs / 60);
    return (h("div.card.pad", { style: { maxWidth: "820px", marginBottom: "18px" } },
      h("div.label", "Ergebnis Probeklausur"),
      h("h1", { style: { margin: "6px 0 14px" } }, TP.fmt(r.pts, 1) + " von " + r.max + " Punkten"),
      h("div.callout." + (pass ? "ok" : "bad"), pass ? h("b", "Bestanden (≥ 50 %). ") : h("b", "Unter 50 %. "), pass ? "The lecturer's advice: aim for Gut/Sehr gut, not for 50 % — there is no buffer if something goes wrong." : "Not a verdict on December — this is exactly what a mock exam is for."),
      h("div.kpis", { style: { margin: "14px 0" } }, h("div.kpi", h("div.label", "Teil A (MC)"), h("div.v", TP.fmt(r.mc, 1), h("small", "/ 10"))), h("div.kpi", h("div.label", "Teil B (Rechnen)"), h("div.v", TP.fmt(r.calc, 1), h("small", "/ 13"))), h("div.kpi", h("div.label", "Teil C (Glaser)"), h("div.v", TP.fmt(r.glaser, 1), h("small", "/ 7"))), h("div.kpi", h("div.label", "Zeit"), h("div.v", mm, h("small", "min")))),
      weak.length ? h("div", h("div.label", "Hier sind Punkte liegen geblieben"), h("div.row", { style: { marginTop: "8px" } }, weak.map(([n]) => { const m = TP.mod(+n); return h("button.btn.sm", { onclick: () => { TP.S.ui.focusMod = +n; TP.go("karte"); } }, "M" + String(n).padStart(2, "0") + " " + (m ? m.short : "")); }))) : null,
      withReview ? h("p.muted", { style: { marginTop: "12px" } }, "Scroll down: every answer is marked and the worked solutions are open — now go through the mistakes.") : null,
      h("div.row", { style: { marginTop: "16px" } }, h("button.btn.primary", { onclick: () => { X.phase = "start"; TP.render(); } }, "Neue Probeklausur"), h("button.btn", { onclick: () => TP.go("fortschritt") }, "Zum Fortschritt"))));
  }
})(window.TP);
