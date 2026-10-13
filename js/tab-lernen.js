/* Bauphysik — Lernen: the 13 modules as a learning path (left) and one module page (right).
   Reading order of the page: what is this and what does it build on → what to do next (practice shortcuts) → the content itself. */
(function (TP) {
  const { h } = TP;
  const U = TP.ui;

  function recommend() {
    let best = null;
    TP.MODS.forEach(m => {
      if (m.n === 13) return;
      const st = TP.stats(m.n), prereq = m.deps.length ? m.deps.reduce((s, d) => s + TP.stats(d).mastery, 0) / m.deps.length : 1;
      const score = m.w * (1 - st.mastery) * (0.35 + 0.65 * Math.min(1, prereq / 0.5));
      if (!best || score > best.score) best = { m, score };
    });
    return best ? best.m.n : 1;
  }
  TP.recommendModule = recommend;

  TP.tabs.lernen = {
    render(main, args) {
      const rec = recommend();
      let n = 0;
      const mm = args && /^m(\d+)$/.exec(args.sub || "");
      if (mm) n = +mm[1]; else n = TP.S.ui.focusMod || rec;
      if (!TP.mod(n)) n = rec;
      TP.S.ui.focusMod = n; TP.saveSoon();
      const m = TP.mod(n), mc = TP.modContent(n), st = TP.stats(n), col = U.laneColor(m.lane);
      const go = (nn) => { TP.S.ui.focusMod = nn; TP.go("lernen", { sub: "m" + nn }); };

      /* ---------- sidebar: the path ---------- */
      const items = [];
      let lastLane = "";
      TP.MODS.forEach(x => {
        if (x.lane !== lastLane) { lastLane = x.lane; items.push(U.sbLabel(TP.LANES[x.lane].name)); }
        const s = TP.stats(x.n);
        items.push(U.nav({ icon: U.pad2(x.n), color: U.laneColor(x.lane), title: x.short, sub: x.sub + (s.due ? " · " + s.due + " fällig" : ""), active: x.n === n, ring: x.n === rec && s.mastery < 0.05 ? null : s.mastery, pill: x.n === rec && s.mastery < 0.05 ? "Tipp" : null, warm: true, onclick: () => go(x.n) }));
      });
      const side = U.sidebar("Lernpfad", ...items);
      const { stage } = U.layout(main, { sidebar: side });

      /* ---------- header ---------- */
      const dependents = TP.MODS.filter(x => x.deps.includes(n));
      const chips = (label, list) => list.length ? [h("span", label), list.map(x => h("button", { onclick: () => go(x.n) }, "M" + U.pad2(x.n) + " " + x.short))] : [];
      const ringBox = h("div", { style: { textAlign: "center", flex: "none" } });
      const paintRing = () => { TP.clear(ringBox); const s = TP.stats(n); ringBox.appendChild(U.ring(s.mastery, 74, col, Math.round(s.mastery * 100) + "%")); ringBox.appendChild(h("div.faint", { style: { fontSize: "12px", marginTop: "2px" } }, "Beherrschung")); };
      paintRing();
      stage.appendChild(h("div.mhead",
        h("div",
          h("div.kick", { style: { color: col } }, TP.LANES[m.lane].name + " · " + m.vo.map(v => "VO" + v).join(" + ")),
          h("h1", { style: { margin: "2px 0 0" } }, mc ? mc.title : m.short),
          h("div.row", { style: { marginTop: "10px", gap: "14px" } }, h("span.row", { style: { gap: "8px" } }, h("span.muted", { style: { fontSize: "13px" } }, "Prüfungsgewicht"), h("span.weight", [1, 2, 3, 4, 5].map(i => h("i" + (i <= m.w ? ".on" : ""))))),
            m.n === 6 ? h("span.tag.hot", "7 von ~30 Punkten, in jeder Klausur") : null),
          h("div.rel", chips("baut auf:", m.deps.map(TP.mod)), dependents.length ? [h("span", { style: { marginLeft: "10px" } }, "führt zu:")].concat(dependents.map(x => h("button", { onclick: () => go(x.n) }, "M" + U.pad2(x.n) + " " + x.short))) : [])),
        ringBox));

      /* ---------- what to do (in this order) ---------- */
      const pct = (a, b) => b ? Math.min(100, Math.round(100 * a / b)) : 0;
      const stepDefs = [];
      stepDefs.push({ t: "Lernziele", sub: st.items ? st.done + " von " + st.items + " abgehakt" : "—", p: pct(st.done, st.items), done: st.items && st.done >= st.items * 0.8, act: () => { const g = TP.$("#goals"); if (g) g.scrollIntoView({ behavior: "smooth", block: "start" }); }, key: "goals" });
      const toUeben = sub => () => { TP.S.ui.thema = n; TP.go("ueben", { sub }); };
      stepDefs.push({ t: "Karten", sub: (st.due ? st.due + " fällig · " : "") + st.known + " / " + st.cards + " sicher", p: pct(st.known, st.cards), done: st.cards && st.known >= st.cards * 0.6, act: toUeben("karten") });
      if (st.gTotal) stepDefs.push({ t: "Rechnen", sub: st.gTotal + " Aufgabentypen" + (st.cN ? " · " + Math.round(100 * st.cOk / st.cN) + " % richtig" : ""), p: st.cN ? Math.round(100 * st.cOk / st.cN) : 0, done: st.cN >= 3 && st.cOk / st.cN >= 0.7, act: toUeben("rechnen") });
      if (st.qTotal) stepDefs.push({ t: "Quiz", sub: st.qTotal + " Prüfungsfragen" + (st.qN ? " · " + Math.round(100 * st.qOk / st.qN) + " % richtig" : ""), p: st.qN ? Math.round(100 * st.qOk / st.qN) : 0, done: st.qN >= 3 && st.qOk / st.qN >= 0.7, act: toUeben("quiz") });
      m.labs.forEach(l => stepDefs.push({ t: "Labor", sub: TP.LABS[l].name, p: 0, done: false, act: () => { TP.S.ui.lab = l; TP.go("labor", { sub: l }); }, lab: true }));
      const nextIdx = stepDefs.findIndex(s => !s.done && !s.lab);
      const stepsEl = h("div.steps", stepDefs.map((s, i) => h("button.step" + (s.done ? ".done" : "") + (i === nextIdx ? ".next" : ""), { onclick: s.act },
        h("span.n", (i + 1) + ""), h("b", s.t), h("small", s.sub), s.lab ? null : h("div.bar", h("i", { id: s.key === "goals" ? "bar-goals" : null, style: { width: s.p + "%", background: col } })), h("span.go", "→"))));
      stage.appendChild(stepsEl);

      /* ---------- content ---------- */
      const goalCard = h("div.card.pad", { id: "goals" });
      const goalProg = h("span.mono.muted", { style: { fontSize: "13px" } });
      const refreshGoals = () => { const s = TP.stats(n); goalProg.textContent = s.done + " / " + s.items; const b = TP.$("#bar-goals"); if (b) b.style.width = pct(s.done, s.items) + "%"; paintRing(); };
      goalCard.appendChild(h("div.row.between", h("h3", "Lernziele"), goalProg));
      if (mc && mc.learn.length) {
        let idx = 0;
        mc.learn.forEach(g => {
          if (g.h) goalCard.appendChild(h("div", { style: { fontWeight: 650, margin: "16px 0 0" }, html: TP.md(g.h).replace(/^<p>|<\/p>$/g, "") }));
          const cl = h("div.checklist");
          g.items.forEach(it => {
            const key = "m" + n + ":" + idx++;
            const lab = h("label" + (TP.S.checks[key] ? ".done" : ""),
              h("input", { type: "checkbox", checked: !!TP.S.checks[key], onchange: e => { if (e.target.checked) TP.S.checks[key] = true; else delete TP.S.checks[key]; TP.saveSoon(); lab.classList.toggle("done", e.target.checked); refreshGoals(); } }),
              h("span", { html: TP.md(it).replace(/^<p>|<\/p>$/g, "") }));
            cl.appendChild(lab);
          });
          goalCard.appendChild(cl);
        });
      } else goalCard.appendChild(h("p.muted", "Keine Lernziele hinterlegt."));
      refreshGoals();

      const hot = TP.content.cards.filter(c => c.mod === n && c.hot);
      const hotCard = hot.length ? h("div.card.pad", { style: { marginTop: "16px" } },
        h("div.row.between", h("h3", "Prüfungsfavoriten"), h("span.faint", { style: { fontSize: "12.5px" } }, hot.length + " Fragen, die der Lehrende selbst als beliebt markiert hat")),
        h("div", { style: { marginTop: "6px" } }, hot.map(c => h("details.qa", h("summary", c.q.replace(/\$[^$]*\$/g, "…").replace(/[*`]/g, "").slice(0, 170)), h("div", TP.mdEl(c.a)))))) : null;

      const right = h("div.stack", { style: { gap: "16px" } });
      if (mc && mc.risk) right.appendChild(h("div.callout.warn", { style: { padding: "14px 18px" } }, h("div.label", { style: { color: "var(--warn)", marginBottom: "4px" } }, "Prüfungsrisiko — das wird gefragt"), TP.mdEl(mc.risk)));
      if (mc && mc.formulas.length) right.appendChild(h("div.card.pad", h("h3", "Schnellformeln"),
        h("div.stack", { style: { marginTop: "8px", gap: "10px" } }, mc.formulas.map(f => h("div", h("div.muted", { style: { fontSize: "13px" } }, f[0]), h("div", { style: { fontSize: "1.08em", overflowX: "auto" }, html: TP.md(f[1].replace(/^\s*/, "")) }))))));
      const fs = [];
      TP.content.formulas.forEach(s => s.items.forEach(it => { if (it.vo.some(v => m.vo.includes(v))) fs.push(it); }));
      if (fs.length) right.appendChild(h("details.acc", h("summary", "Aus der Formelsammlung (" + fs.length + ")"), h("div.stack", { style: { gap: "10px" } }, fs.map(it => h("div", it.label ? h("div.muted", { style: { fontSize: "13px" } }, it.label) : null, h("div", { style: { overflowX: "auto" }, html: TP.tex(it.tex, true) }))),
        h("button.btn.sm", { onclick: () => TP.go("formeln") }, "Alle Formeln öffnen"))));
      stage.appendChild(h("div.split", h("div", goalCard, hotCard), right));
    },
  };
})(window.TP);
