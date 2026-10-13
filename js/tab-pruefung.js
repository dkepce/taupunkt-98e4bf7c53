/* Bauphysik — Prüfung: a mock exam in the real format. MC (multi-select) + Rechenbeispiele + Pflicht-Glaserdiagramm (7 of ~30 points), 2 h, 50 % to pass.
   While running, the sidebar is the exam navigator: timer, numbered questions (answered / flagged), hand-in. */
(function (TP) {
  const { h } = TP;
  const U = TP.ui;
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
    const gens = [], used = new Set();
    weightedPick(TP.GENS, TP.GENS.length, g => mw(g.mod)).forEach(g => { if (gens.length < 4 && !used.has(g.mod)) { used.add(g.mod); gens.push(g); } });
    return { qs, tasks: gens.map(g => TP.makeTask(g)), pts: { mc: 10, calc: [3, 3, 3, 4], glaser: 7 } };
  }

  TP.tabs.pruefung = {
    render(main) {
      if (X.timer) { clearInterval(X.timer); X.timer = null; }
      ({ start, run, done })[X.phase](main);
    },
  };

  /* ------------------------------------------------------------ start */
  function start(main) {
    const { stage } = U.layout(main, { narrow: true });
    const hist = TP.S.exams;
    stage.appendChild(U.pageHead("Prüfung", "A mock exam in the real format. Work with the Formelsammlung open in another tab — no other notes. Allow 2 hours without interruption."));
    stage.appendChild(h("div.card.pad", { style: { marginBottom: "16px" } },
      h("h2", "Probeklausur starten"),
      h("div.kpis", { style: { margin: "14px 0" } }, [["Teil A", "10 MC-Fragen", "10 Punkte"], ["Teil B", "4 Rechenbeispiele", "13 Punkte"], ["Teil C", "Glaserdiagramm", "7 Punkte"], ["Bestehen", "ab 50 %", "15 von 30"]].map(([a, b, c]) => h("div.kpi", h("div.label", a), h("div", { style: { fontWeight: 650, margin: "3px 0" } }, b), h("div.muted", c)))),
      h("div.row", { style: { gap: "18px", alignItems: "flex-end" } },
        h("label.field", { style: { width: "220px" } }, h("span", "Zeit"), h("select", { onchange: e => { X.minutes = +e.target.value; } }, [[120, "120 Minuten (echt)"], [90, "90 Minuten (straffer)"], [0, "ohne Zeitlimit"]].map(([v, t]) => h("option", { value: v, selected: X.minutes === v }, t)))),
        h("label.field", { style: { width: "240px" } }, h("span", "MC-Bewertung"), h("select", { onchange: e => { X.regime = e.target.value; } }, [["partial", "Teilpunkte je Option"], ["all", "Alles oder nichts"], ["neg", "Mit Abzug"]].map(([v, t]) => h("option", { value: v, selected: X.regime === v }, t))))),
      h("div.callout", { style: { margin: "14px 0" } }, h("b", "Taktik aus deinem Vault: "), "MC in zwei Durchgängen (Sicheres zuerst, ~60–90 s pro Frage — mit ⚑ markierst du Unsicheres für später), dann die Rechenbeispiele, dann das Glaserdiagramm (15–20 min). Immer: Formel → einsetzen → Ergebnis mit Einheit; erst am Schluss runden."),
      h("button.btn.primary.lg", { onclick: () => { X.sections = build(); X.phase = "run"; X.t0 = Date.now(); X.result = null; TP.render(); } }, "Los geht's — die Uhr startet")));
    stage.appendChild(h("div.card.pad", h("h3", "Bisherige Probeklausuren"), hist.length ? h("div.stack", { style: { marginTop: "10px", gap: "8px" } }, hist.slice().reverse().slice(0, 8).map(e => h("div.row.between", { style: { padding: "6px 0", borderBottom: "1px solid var(--line2)" } }, h("span", e.date), h("span.mono", TP.fmt(e.pts, 1) + " / " + e.max), h("span.tag." + (e.pts / e.max >= 0.5 ? "ok" : "bad"), e.pts / e.max >= 0.5 ? "bestanden" : "nicht bestanden")))) : h("p.muted", "Noch keine. Die erste ist dafür da, deinen Stand zu erfahren — nicht für die Note.")));
  }

  /* ------------------------------------------------------------ run (sidebar = navigator) */
  function run(main) {
    const S = X.sections, views = { mc: S.qs.map(q => U.mcq(q)), calc: S.tasks.map(t => U.calc(t)) };
    const cards = [], navBtns = [], flags = {};
    let graded = false, gApi = null, gHost = null;
    const clock = h("div.timer", { style: { fontSize: "30px" } }, "00:00");
    const counter = h("div.muted", { style: { fontSize: "13px" } });
    const isAnswered = key => key[0] === "m" ? views.mc[+key.slice(1)].answered() : key[0] === "c" ? views.calc[+key.slice(1)].anyInput() : !!(gHost && [...gHost.querySelectorAll("input.num")].some(i => i.value.trim()));
    const refreshNav = () => {
      let n = 0;
      navBtns.forEach(([key, b]) => { const a = isAnswered(key); if (a) n++; if (!graded) { b.classList.toggle("ans", a); b.classList.toggle("flag", !!flags[key]); } });
      counter.textContent = n + " von " + navBtns.length + " Teilen bearbeitet" + (Object.values(flags).some(Boolean) ? " · " + Object.values(flags).filter(Boolean).length + " markiert" : "");
    };
    const jump = key => { const c = cards.find(x => x[0] === key); if (c) c[1].scrollIntoView({ behavior: "smooth", block: "start" }); };
    const navBtn = (key, label) => { const b = h("button", { onclick: () => jump(key), title: "Zu Frage springen" }, label); navBtns.push([key, b]); return b; };
    const submitBtn = h("button.btn.primary.lg", { style: { width: "100%" }, onclick: () => submit(false) }, "Prüfung abgeben");
    const side = U.sidebar("Prüfung",
      h("div.card.pad", { style: { padding: "12px 14px", marginBottom: "6px" } }, h("div.label", X.minutes ? "Verbleibend" : "Zeit"), clock, counter),
      U.sbLabel("Teil A · Multiple Choice (10 P)"), h("div.qnav", S.qs.map((q, i) => navBtn("m" + i, String(i + 1)))),
      U.sbLabel("Teil B · Rechnen (13 P)"), h("div.qnav", S.tasks.map((t, i) => navBtn("c" + i, "B" + (i + 1)))),
      U.sbLabel("Teil C · Glaser (7 P)"), h("div.qnav", navBtn("g", "C")),
      U.sbSep(), submitBtn,
      h("div.faint", { style: { fontSize: "12px", padding: "8px 6px" } }, "Blaue Felder: bearbeitet. Punkt = für später markiert (⚑ an der Frage)."));
    const { stage } = U.layout(main, { sidebar: side });
    stage.addEventListener("input", refreshNav); stage.addEventListener("change", refreshNav);

    const upd = () => {
      if (!document.body.contains(clock)) { clearInterval(X.timer); X.timer = null; return; }
      if (graded) return;
      const el_s = Math.floor((Date.now() - X.t0) / 1000), s = X.minutes ? X.minutes * 60 - el_s : el_s, a = Math.abs(s);
      clock.textContent = (s < 0 ? "−" : "") + String(Math.floor(a / 60)).padStart(2, "0") + ":" + String(a % 60).padStart(2, "0");
      clock.classList.toggle("low", !!X.minutes && s < 10 * 60);
      if (X.minutes && s === 0) TP.toast("Zeit abgelaufen — in der echten Prüfung zählt Zusatzzeit nicht. Bitte abgeben.");
    };
    upd(); X.timer = setInterval(upd, 1000);

    const flagBtn = key => { const b = h("button.btn.ghost.sm", { title: "Für später markieren", onclick: () => { flags[key] = !flags[key]; b.textContent = flags[key] ? "⚑ markiert" : "⚑ später"; refreshNav(); } }, "⚑ später"); return b; };
    const card = (key, title, tag, body, withFlag) => { const c = h("div.card.pad", { style: { marginBottom: "14px", scrollMarginTop: "80px" } }, h("div.row.between", { style: { marginBottom: "8px" } }, h("span.label", title), h("div.row", { style: { gap: "6px" } }, h("span.tag", tag), withFlag ? flagBtn(key) : null)), body); cards.push([key, c]); return c; };
    stage.appendChild(h("h2", { style: { margin: "0 0 12px" } }, "Teil A — Multiple Choice"));
    S.qs.forEach((q, i) => stage.appendChild(card("m" + i, "Frage " + (i + 1), "1 Punkt", views.mc[i].el, true)));
    stage.appendChild(h("h2", { style: { margin: "26px 0 12px" } }, "Teil B — Rechenbeispiele"));
    S.tasks.forEach((t, i) => stage.appendChild(card("c" + i, "Aufgabe " + (i + 1) + " · " + t.title, S.pts.calc[i] + " Punkte", views.calc[i].el, true)));
    gHost = h("div.card.pad", { style: { margin: "26px 0 12px", scrollMarginTop: "80px" } }); cards.push(["g", gHost]);
    stage.appendChild(gHost);
    gApi = TP.drills.glaser.render(gHost, { exam: true, wantCond: true });

    function submit(auto) {
      if (graded) return;
      if (!auto && !confirm("Prüfung jetzt abgeben?")) return;
      graded = true; clearInterval(X.timer); X.timer = null;
      const secs = Math.floor((Date.now() - X.t0) / 1000);
      let mc = 0; const miss = {};
      views.mc.forEach((v, i) => { const g = v.grade(X.regime); v.reveal(); mc += g.score; const q = S.qs[i]; const rec = TP.S.quiz[q.id] || { n: 0, ok: 0 }; rec.n++; rec.ok += g.partial; rec.last = TP.dayNum(); TP.S.quiz[q.id] = rec; if (!g.perfect) miss[q.mod] = (miss[q.mod] || 0) + (1 - g.partial); navBtns.find(b => b[0] === "m" + i)[1].className = g.perfect ? "okc" : "badc"; });
      let calc = 0;
      views.calc.forEach((v, i) => { const g = v.grade(); v.reveal(); calc += g.score * S.pts.calc[i]; const t = S.tasks[i]; const rec = TP.S.calc[t.gen] || { n: 0, ok: 0 }; rec.n++; rec.ok += g.score; rec.last = TP.dayNum(); TP.S.calc[t.gen] = rec; if (g.score < 1) miss[t.mod] = (miss[t.mod] || 0) + (1 - g.score) * 1.5; navBtns.find(b => b[0] === "c" + i)[1].className = g.score === 1 ? "okc" : "badc"; });
      const gr = gApi.submit() || { pts: 0, ok: 0, tot: 1 };
      navBtns.find(b => b[0] === "g")[1].className = gr.pts >= 6 ? "okc" : "badc";
      if (gr.pts < 6) miss[6] = (miss[6] || 0) + (7 - gr.pts) / 2;
      const pts = mc + calc + gr.pts, max = 30;
      const rec = { date: TP.dayKey(), secs, regime: X.regime, mc: +mc.toFixed(2), calc: +calc.toFixed(2), glaser: +gr.pts.toFixed(2), pts: +pts.toFixed(2), max, miss };
      TP.S.exams.push(rec); TP.logAct("exam"); TP.save();
      X.result = rec; X.phase = "done";
      clock.textContent = TP.fmt(pts, 1) + " / " + max; clock.classList.remove("low");
      submitBtn.replaceWith(h("button.btn.lg", { style: { width: "100%" }, onclick: () => { X.phase = "start"; TP.render(); } }, "Neue Probeklausur"));
      stage.insertBefore(resultCard(rec, true), stage.firstChild);
      window.scrollTo(0, 0);
    }
    refreshNav();
  }

  /* ------------------------------------------------------------ done (after leaving the page and coming back) */
  function done(main) {
    const r = X.result; if (!r) { X.phase = "start"; TP.render(); return; }
    const { stage } = U.layout(main, { narrow: true });
    stage.appendChild(resultCard(r, false));
    stage.appendChild(h("p.muted", "Tip: the worked solutions of the exam are only visible right after handing in. Use Üben → Rechnen / Quiz / Glaser-Training to redo the topics above."));
  }

  function resultCard(r, withReview) {
    const pass = r.pts / r.max >= 0.5, weak = Object.entries(r.miss).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return h("div.card.pad", { style: { marginBottom: "18px" } },
      h("div.label", "Ergebnis Probeklausur"),
      h("h1", { style: { margin: "6px 0 14px" } }, TP.fmt(r.pts, 1) + " von " + r.max + " Punkten"),
      h("div.callout." + (pass ? "ok" : "bad"), pass ? h("b", "Bestanden (≥ 50 %). ") : h("b", "Unter 50 %. "), pass ? "The lecturer's advice: aim for Gut/Sehr gut, not for 50 % — there is no buffer if something goes wrong." : "Not a verdict on December — this is exactly what a mock exam is for."),
      h("div.kpis", { style: { margin: "14px 0" } }, h("div.kpi", h("div.label", "Teil A (MC)"), h("div.v", TP.fmt(r.mc, 1), h("small", "/ 10"))), h("div.kpi", h("div.label", "Teil B (Rechnen)"), h("div.v", TP.fmt(r.calc, 1), h("small", "/ 13"))), h("div.kpi", h("div.label", "Teil C (Glaser)"), h("div.v", TP.fmt(r.glaser, 1), h("small", "/ 7"))), h("div.kpi", h("div.label", "Zeit"), h("div.v", Math.floor(r.secs / 60), h("small", "min")))),
      weak.length ? h("div", h("div.label", "Hier sind Punkte liegen geblieben — zum Modul:"), h("div.row", { style: { marginTop: "8px" } }, weak.map(([n]) => { const m = TP.mod(+n); return h("button.btn.sm", { onclick: () => { TP.S.ui.focusMod = +n; TP.go("lernen", { sub: "m" + n }); } }, "M" + U.pad2(+n) + " " + (m ? m.short : "")); }))) : null,
      withReview ? h("p.muted", { style: { marginTop: "12px" } }, "Unten ist jede Antwort markiert und der Rechenweg aufgeklappt. Die Zahlen links im Navigator zeigen grün (richtig) und rot (Fehler) — klick zum Springen.") : null,
      h("div.row", { style: { marginTop: "16px" } }, h("button.btn.primary", { onclick: () => { X.phase = "start"; TP.render(); } }, "Neue Probeklausur"), h("button.btn", { onclick: () => TP.go("uebersicht", { sub: "fortschritt" }) }, "Zum Fortschritt")));
  }
})(window.TP);
