/* Bauphysik — module map, content loading, spaced repetition, mastery */
(function (TP) {
  /* The 13 Study Modules, in the order of the vault's "Study Modules" notes.
     lane = colour family, w = how much the exam cares (1–5, from the lecturer's own statements in the vault), deps = what it builds on. */
  TP.LANES = {
    thermal: { name: "Wärme & Bauteil", css: "--lane-thermal" },
    moisture: { name: "Feuchte", css: "--lane-moisture" },
    energy: { name: "Energie & Klima", css: "--lane-energy" },
    comfort: { name: "Komfort & Messen", css: "--lane-comfort" },
    eco: { name: "Sommer & Ökologie", css: "--lane-eco" },
    exam: { name: "Prüfung", css: "--lane-exam" },
  };
  TP.MODS = [
    { n: 1, short: "Grundlagen", sub: "Wärmetransport", lane: "thermal", deps: [], w: 3, vo: [2], labs: [] },
    { n: 2, short: "U-Wert", sub: "Homogene Bauteile", lane: "thermal", deps: [1], w: 5, vo: [3], labs: ["uwert"] },
    { n: 3, short: "Wärmebrücken", sub: "Dämmung & Masse", lane: "thermal", deps: [2], w: 4, vo: [4], labs: ["feuchte"] },
    { n: 4, short: "Instationär", sub: "Diffusivität", lane: "thermal", deps: [3], w: 3, vo: [10], labs: ["kontakt"] },
    { n: 5, short: "Feuchte", sub: "Mollier, µ-Wert", lane: "moisture", deps: [], w: 4, vo: [8], labs: ["feuchte"] },
    { n: 6, short: "Glaser", sub: "Tauwasserschutz", lane: "moisture", deps: [2, 5], w: 5, vo: [11], labs: ["glaser"] },
    { n: 7, short: "Energiebilanz", sub: "Heizwärmebedarf", lane: "energy", deps: [2, 3, 8], w: 4, vo: [7, 9], labs: ["energie"] },
    { n: 8, short: "Klima", sub: "Heizgradtage", lane: "energy", deps: [1], w: 2, vo: [5], labs: [] },
    { n: 9, short: "Komfort", sub: "PMV, operative T", lane: "comfort", deps: [8], w: 3, vo: [6, 12], labs: ["komfort"] },
    { n: 10, short: "Sensorik & IAQ", sub: "Indizes, CO₂", lane: "comfort", deps: [9], w: 3, vo: [12], labs: [] },
    { n: 11, short: "Sommer", sub: "Überwärmung", lane: "eco", deps: [3, 4], w: 3, vo: [14], labs: ["sonne"] },
    { n: 12, short: "Ökologie", sub: "OI3-Index", lane: "eco", deps: [], w: 3, vo: [13], labs: [] },
    { n: 13, short: "Prüfung", sub: "Format & Wiederholung", lane: "exam", deps: [6, 7, 10, 11, 12], w: 2, vo: [15], labs: [] },
  ];
  TP.mod = n => TP.MODS.find(m => m.n === n);
  TP.LABS = {
    uwert: { name: "Wandaufbau", sub: "U-Wert & Temperaturverlauf" },
    glaser: { name: "Glaser-Diagramm", sub: "Tauwasser im Bauteil" },
    feuchte: { name: "Taupunkt & Schimmel", sub: "Oberflächenkondensat, f_Rsi" },
    kontakt: { name: "Wärmeeindringung", sub: "Kontakttemperatur, Diffusivität" },
    komfort: { name: "Operative Temperatur", sub: "Strahlung, adaptiver Komfort" },
    energie: { name: "Energiebilanz", sub: "Verluste, Gewinne, η_h, Q_H" },
    sonne: { name: "Sonnenstand", sub: "Sonnenbahndiagramm, Ablesen" },
  };

  /* ---------- content (generated from the vault by tools/build_content.py) ---------- */
  TP.content = { cards: [], formulas: [], symbols: [], modules: [] };
  TP.loadContent = async function () {
    const get = async f => { const r = await fetch("data/" + f, { cache: "no-cache" }); if (!r.ok) throw new Error(f); return r.json(); };
    try {
      const [cards, formulas, symbols, modules] = await Promise.all([get("cards.json"), get("formulas.json"), get("symbols.json"), get("modules.json")]);
      Object.assign(TP.content, { cards, formulas, symbols, modules });
    } catch (e) { TP.content.error = e.message; }
  };
  TP.modContent = n => TP.content.modules.find(m => m.n === n);

  /* ---------- spaced repetition (SM-2, simplified; 4 buttons) ---------- */
  TP.srs = {
    state: id => TP.S.cards[id],
    isDue: id => { const s = TP.S.cards[id]; return !s || s.due <= TP.dayNum(); },
    step(old, g) {              // pure: next state for a grade g (0 Nochmal, 1 Schwer, 2 Gut, 3 Leicht)
      const today = TP.dayNum();
      const s = Object.assign({ ease: 2.5, ivl: 0, due: today, reps: 0, lapses: 0 }, old || {});
      if (g === 0) { s.lapses++; s.reps = 0; s.ivl = 0; s.due = today; s.ease = Math.max(1.3, s.ease - 0.2); }
      else {
        s.reps++;
        if (s.reps === 1) s.ivl = g === 3 ? 4 : 1;
        else if (s.reps === 2) s.ivl = g === 1 ? 3 : g === 3 ? 8 : 6;
        else s.ivl = Math.max(1, Math.round(s.ivl * s.ease * (g === 1 ? 0.8 : g === 3 ? 1.3 : 1)));
        s.ease = Math.min(3, Math.max(1.3, s.ease + (g === 3 ? 0.1 : g === 1 ? -0.15 : 0)));
        s.due = today + s.ivl;
      }
      s.last = today; s.lastGrade = g;
      return s;
    },
    preview: (id, g) => { const s = TP.srs.step(TP.S.cards[id], g); return g === 0 ? "gleich nochmal" : s.ivl === 1 ? "1 Tag" : s.ivl + " Tage"; },
    grade(id, g) {
      const fresh = !TP.S.cards[id];
      const s = TP.srs.step(TP.S.cards[id], g);
      TP.S.cards[id] = s; TP.logAct("cards"); if (fresh) TP.logAct("newcards"); TP.saveSoon();
      return s;
    },
    known: id => { const s = TP.S.cards[id]; return !!s && s.ivl >= 5; },
  };

  /* ---------- statistics per module ---------- */
  TP.stats = function (n) {
    const cards = TP.content.cards.filter(c => c.mod === n);
    const seen = cards.filter(c => TP.S.cards[c.id] && TP.S.cards[c.id].reps + TP.S.cards[c.id].lapses > 0).length;
    const known = cards.filter(c => TP.srs.known(c.id)).length;
    const due = cards.filter(c => TP.S.cards[c.id] && TP.S.cards[c.id].due <= TP.dayNum()).length;
    const fresh = cards.length - seen;
    const qs = (TP.MCQ || []).filter(q => q.mod === n);
    let qOk = 0, qN = 0, qSc = 0;
    qs.forEach(q => { const r = TP.S.quiz[q.id]; if (r && r.n) { qN += r.n; qOk += r.ok; qSc += r.ok / r.n; } });
    const gens = (TP.GENS || []).filter(g => g.mod === n);
    let cOk = 0, cN = 0, cSc = 0;
    gens.forEach(g => { const r = TP.S.calc[g.id]; if (r && r.n) { cN += r.n; cOk += r.ok; cSc += r.ok / r.n; } });
    const mc = TP.modContent(n);
    const items = mc ? mc.learn.reduce((s, g) => s + g.items.length, 0) : 0;
    let done = 0; for (let i = 0; i < items; i++) if (TP.S.checks["m" + n + ":" + i]) done++;
    const parts = [];
    if (cards.length) parts.push([0.4, (known + 0.4 * (seen - known)) / cards.length]);
    if (qs.length) parts.push([0.2, qSc / qs.length]);
    if (gens.length) parts.push([0.2, cSc / gens.length]);
    if (items) parts.push([0.2, done / items]);
    const wsum = parts.reduce((s, p) => s + p[0], 0);
    const mastery = wsum ? parts.reduce((s, p) => s + p[0] * p[1], 0) / wsum : 0;
    return { cards: cards.length, seen, known, due, fresh, qTotal: qs.length, qN, qOk, gTotal: gens.length, cN, cOk, items, done, mastery };
  };

  TP.overall = function () {
    let w = 0, s = 0;
    TP.MODS.forEach(m => { if (m.n === 13) return; w += m.w; s += m.w * TP.stats(m.n).mastery; });
    return w ? s / w : 0;
  };
  TP.dueTotal = () => TP.content.cards.filter(c => TP.S.cards[c.id] && TP.S.cards[c.id].due <= TP.dayNum()).length;
  TP.streak = function () {
    let n = 0, d = new Date();
    const has = dt => { const l = TP.S.log[TP.dayKey(dt)]; return l && Object.values(l).some(v => v > 0); };
    if (!has(d)) d.setDate(d.getDate() - 1);
    while (has(d)) { n++; d.setDate(d.getDate() - 1); }
    return n;
  };
})(window.TP);
