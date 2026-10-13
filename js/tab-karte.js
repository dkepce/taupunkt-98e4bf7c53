/* Taupunkt — Karte: the course as a dependency map; click a module for goals, exam risk, formulas, practice shortcuts */
(function (TP) {
  const { h, svg } = TP;
  const POS = { 1: [0, 0], 2: [1, 0], 3: [2, 0], 4: [3, 0], 5: [1, 1], 6: [2, 1], 8: [0, 2], 7: [3, 2], 9: [1, 3], 10: [2, 3], 11: [4, 1], 12: [4, 3], 13: [5, 2] };
  const NW = 160, NH = 78, DX = 202, DY = 116, PADX = 16, PADY = 16;
  const nodeXY = n => ({ x: PADX + POS[n][0] * DX, y: PADY + POS[n][1] * DY });
  let sel = 0;

  function recommend() {
    let best = null;
    TP.MODS.forEach(m => {
      if (m.n === 13) return;
      const st = TP.stats(m.n);
      const prereq = m.deps.length ? m.deps.reduce((s, d) => s + TP.stats(d).mastery, 0) / m.deps.length : 1;
      const score = m.w * (1 - st.mastery) * (0.35 + 0.65 * Math.min(1, prereq / 0.5));
      if (!best || score > best.score) best = { m, score, st };
    });
    return best;
  }

  function mapSvg(onPick) {
    const W = PADX * 2 + POS[13][0] * DX + NW, Hh = PADY * 2 + 4 * DY + NH;
    const s = svg("svg", { viewBox: `0 0 ${W} ${Hh}`, role: "img", "aria-label": "Course map" });
    const edges = svg("g"), nodes = svg("g");
    const eMap = [];
    TP.MODS.forEach(m => m.deps.forEach(d => {
      const a = nodeXY(d), b = nodeXY(m.n);
      const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x, y2 = b.y + NH / 2;
      let p;
      if (POS[d][0] === POS[m.n][0]) { // same column: vertical link
        const down = POS[m.n][1] > POS[d][1];
        p = `M${a.x + NW / 2} ${down ? a.y + NH : a.y}L${b.x + NW / 2} ${down ? b.y : b.y + NH}`;
      } else { const cx = (x1 + x2) / 2; p = `M${x1} ${y1}C${cx} ${y1} ${cx} ${y2} ${x2} ${y2}`; }
      const e = svg("path", { class: "edge", d: p });
      edges.appendChild(e); eMap.push({ e, from: d, to: m.n });
    }));
    TP.MODS.forEach(m => {
      const { x, y } = nodeXY(m.n), st = TP.stats(m.n), c = `var(${TP.LANES[m.lane].css})`;
      const g = svg("g", { class: "node" + (m.n === sel ? " sel" : ""), transform: `translate(${x},${y})`, tabindex: 0, role: "button", "aria-label": "M" + m.n + " " + m.short });
      g.appendChild(svg("rect", { class: "box", width: NW, height: NH, rx: 11 }));
      g.appendChild(svg("rect", { x: 0, y: 0, width: 6, height: NH, rx: 3, fill: c }));
      g.appendChild(svg("text", { class: "nn", x: 18, y: 21 }, "M" + String(m.n).padStart(2, "0")));
      g.appendChild(svg("text", { class: "tt", x: 18, y: 43 }, m.short));
      g.appendChild(svg("text", { class: "ss", x: 18, y: 60 }, m.sub));
      g.appendChild(svg("rect", { x: 18, y: NH - 9, width: NW - 32, height: 4, rx: 2, fill: "var(--surface3)" }));
      g.appendChild(svg("rect", { x: 18, y: NH - 9, width: Math.max(0, (NW - 32) * st.mastery), height: 4, rx: 2, fill: c }));
      for (let i = 0; i < m.w; i++) g.appendChild(svg("circle", { cx: NW - 14 - i * 10, cy: 16, r: 3.4, fill: "var(--warn)" }));
      if (st.due) { g.appendChild(svg("circle", { cx: NW - 4, cy: 2, r: 11, fill: "var(--accent)" })); g.appendChild(svg("text", { x: NW - 4, y: 6, "text-anchor": "middle", style: "fill:var(--accent-ink);font-size:12px;font-weight:700" }, st.due > 99 ? "99" : st.due)); }
      const pick = () => onPick(m.n);
      g.addEventListener("click", pick);
      g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
      g.addEventListener("mouseenter", () => eMap.forEach(o => o.e.classList.toggle("on", o.from === m.n || o.to === m.n)));
      g.addEventListener("mouseleave", () => eMap.forEach(o => o.e.classList.remove("on")));
      nodes.appendChild(g);
    });
    s.appendChild(edges); s.appendChild(nodes);
    return s;
  }

  function panel(n) {
    const m = TP.mod(n), mc = TP.modContent(n), st = TP.stats(n), c = `var(${TP.LANES[m.lane].css})`;
    const bar = (label, a, b, txt) => h("div", { style: { marginBottom: "8px" } },
      h("div.row.between", { style: { fontSize: "12.5px", color: "var(--ink2)" } }, h("span", label), h("span.mono", txt)),
      h("div.bar", h("i", { style: { width: (b ? Math.min(100, 100 * a / b) : 0) + "%", background: c } })));
    const go = (tab, sub, extra) => () => { TP.S.ui.focusMod = n; TP.go(tab, Object.assign({ sub }, extra)); };
    const out = h("div.card.panel");
    out.appendChild(h("div.sect",
      h("div.label", { style: { color: c } }, TP.LANES[m.lane].name + " · " + m.vo.map(v => "VO" + v).join(" + ")),
      h("h2", { style: { marginTop: "4px" } }, mc ? mc.title : m.short),
      h("div.row", { style: { marginTop: "8px" } },
        h("span.muted", { style: { fontSize: "13px" } }, "Prüfungsgewicht"), h("span.weight", [1, 2, 3, 4, 5].map(i => h("i" + (i <= m.w ? ".on" : "")))),
        h("span.chip", "Beherrschung " + Math.round(st.mastery * 100) + " %"))));
    out.appendChild(h("div.sect",
      bar("Karten sicher", st.known, st.cards, st.known + " / " + st.cards),
      st.qTotal ? bar("Quiz-Fragen", st.qOk, Math.max(st.qN, 1), st.qN ? Math.round(100 * st.qOk / st.qN) + " % richtig" : "noch offen") : null,
      st.gTotal ? bar("Rechenaufgaben", st.cOk, Math.max(st.cN, 1), st.cN ? Math.round(100 * st.cOk / st.cN) + " % richtig" : "noch offen") : null,
      st.items ? bar("Lernziele", st.done, st.items, st.done + " / " + st.items) : null,
      h("div.row", { style: { marginTop: "10px" } },
        h("button.btn.primary.sm", { onclick: go("ueben", "karten", { mod: n }) }, "Karten" + (st.due ? " (" + st.due + " fällig)" : "")),
        st.qTotal ? h("button.btn.sm", { onclick: go("ueben", "quiz") }, "Quiz") : null,
        st.gTotal ? h("button.btn.sm", { onclick: go("ueben", "rechnen") }, "Rechnen") : null,
        m.labs.map(l => h("button.btn.sm", { onclick: () => { TP.S.ui.lab = l; TP.go("labor", { sub: l }); } }, "Labor: " + TP.LABS[l].name)))));
    if (mc && mc.risk) out.appendChild(h("div.sect", h("div.label", "Prüfungsrisiko"), h("div", { style: { marginTop: "6px" } }, TP.mdEl(mc.risk))));
    if (mc && mc.learn.length) {
      let idx = 0;
      const list = h("div");
      mc.learn.forEach(g => {
        if (g.h) list.appendChild(h("div", { style: { fontWeight: 650, fontSize: "13.5px", margin: "10px 0 2px" }, html: TP.md(g.h).replace(/^<p>|<\/p>$/g, "") }));
        const cl = h("div.checklist");
        g.items.forEach(it => {
          const key = "m" + n + ":" + idx++;
          const cb = h("input", { type: "checkbox", checked: !!TP.S.checks[key], onchange: e => { if (e.target.checked) TP.S.checks[key] = true; else delete TP.S.checks[key]; TP.saveSoon(); lab.classList.toggle("done", e.target.checked); refresh(); } });
          const lab = h("label" + (TP.S.checks[key] ? ".done" : ""), cb, h("span", { html: TP.md(it).replace(/^<p>|<\/p>$/g, "") }));
          cl.appendChild(lab);
        });
        list.appendChild(cl);
      });
      out.appendChild(h("div.sect", h("div.label", "Lernziele — abhaken"), list));
    }
    if (mc && mc.formulas.length) {
      out.appendChild(h("div.sect", h("div.label", "Schnellformeln"),
        h("div.stack", { style: { marginTop: "6px", gap: "6px" } }, mc.formulas.map(f => h("div", { style: { fontSize: "13.5px" } }, h("div.muted", f[0]), h("div", { html: TP.md(f[1].replace(/^\s*/, "")) }))))));
    }
    return out;
  }
  let refresh = () => { };

  TP.tabs.karte = {
    render(main) {
      if (!sel) sel = TP.S.ui.focusMod || (recommend() || { m: { n: 6 } }).m.n;
      const rec = recommend();
      main.appendChild(h("div.page-head",
        h("div", h("h1", "Karte"), h("p", "The course as a map: each box is one of the 13 Study Modules, linked by what builds on what. Dots show how much the exam cares; the bar shows how well you know it.")),
        h("div.row", h("span.chip", "Gesamt " + Math.round(TP.overall() * 100) + " %"), h("span.chip", TP.dueTotal() + " Karten fällig"), TP.streak() ? h("span.chip", TP.streak() + " Tage in Folge") : null)));
      const wrap = h("div.karte");
      const left = h("div.stack");
      if (rec && rec.score > 0.2) {
        left.appendChild(h("div.card.flat.pad.row.between",
          h("div", h("div.label", "Empfohlen als Nächstes"), h("div", { style: { fontWeight: 650, marginTop: "2px" } }, "M" + String(rec.m.n).padStart(2, "0") + " " + rec.m.short + " — ", h("span.muted", { style: { fontWeight: 400 } }, "hohes Prüfungsgewicht, noch viel offen"))),
          h("button.btn.primary.sm", { onclick: () => { sel = rec.m.n; TP.render(); } }, "Öffnen")));
      }
      const box = h("div.card.mapbox");
      box.appendChild(mapSvg(n => { sel = n; TP.S.ui.focusMod = n; TP.render(); }));
      box.appendChild(h("div.legend", Object.entries(TP.LANES).map(([k, v]) => h("span", h("span.lanedot", { style: { background: `var(${v.css})` } }), v.name)), h("span", h("span.weight", h("i.on")), " Prüfungsgewicht")));
      left.appendChild(box);
      left.appendChild(h("div.callout", h("b", "Three levers the lecturer named: "), "Glaser diagram (7 of ~30 points, on every exam), Wärmebrücken terminology (“Kältebrücke” / “wärmebrückenfrei”), and the U-value chain with f_Rsi."));
      wrap.appendChild(left);
      const side = h("div"); side.appendChild(panel(sel)); wrap.appendChild(side);
      refresh = () => { const old = TP.$(".panel", side); old.replaceWith(panel(sel)); const lm = TP.$(".mapbox svg", left); lm.replaceWith(mapSvg(n => { sel = n; TP.S.ui.focusMod = n; TP.render(); })); };
      main.appendChild(wrap);
    },
  };
})(window.TP);
