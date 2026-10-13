/* Bauphysik — shell: header, tab routing, keyboard shortcuts, global search */
(function (TP) {
  const { h, svg } = TP;
  const ORDER = ["uebersicht", "lernen", "labor", "ueben", "pruefung", "formeln"];
  const LABEL = { uebersicht: "Übersicht", lernen: "Lernen", labor: "Labor", ueben: "Üben", pruefung: "Prüfung", formeln: "Formeln" };
  const ICON = {
    uebersicht: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="14" width="8" height="7" rx="1.5"/>',
    lernen: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    labor: '<path d="M9 3h6M10 3v6l-5.5 9.5A1.6 1.6 0 0 0 5.9 21h12.2a1.6 1.6 0 0 0 1.4-2.5L14 9V3"/><path d="M7.5 15h9"/>',
    ueben: '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="M7 3h14v14"/><path d="M7 10h6M7 14h4"/>',
    pruefung: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
    formeln: '<path d="M18 5H7l6 7-6 7h11"/>',
  };
  const OLD = { karte: "lernen", fortschritt: "uebersicht" };
  let root, cur = "uebersicht", args = {};

  TP.go = function (tab, a) {
    tab = OLD[tab] || tab;
    cur = ORDER.includes(tab) ? tab : "uebersicht"; args = a || {};
    TP.S.ui.tab = cur; TP.saveSoon();
    const next = "#" + cur + (args.sub ? "/" + args.sub : "");
    if (location.hash !== next) { history.replaceState(null, "", next); }
    TP.render();
    window.scrollTo(0, 0);
  };
  function readHash() {
    const m = /^#([a-z]+)(?:\/([\w-]+))?/.exec(location.hash);
    const t = m && (OLD[m[1]] || m[1]);
    if (m && ORDER.includes(t)) { cur = t; args = m[2] ? { sub: m[2] } : {}; }
    else { const s = OLD[TP.S.ui.tab] || TP.S.ui.tab; cur = ORDER.includes(s) ? s : "uebersicht"; args = {}; }
  }

  /* ---------- header ---------- */
  function header() {
    const due = TP.dueTotal(), days = TP.daysUntil(TP.S.examDate), F = TP.file;
    const examChip = h("button.chip", { title: "Prüfungsdatum ändern", onclick: () => TP.go("uebersicht", { sub: "speicher" }) },
      days == null ? "Prüfungsdatum setzen" : days > 0 ? "Prüfung in " + days + (days === 1 ? " Tag" : " Tagen") : days === 0 ? "Prüfung heute" : "Prüfung vorbei");
    if (days != null && days >= 0 && days <= 14) examChip.classList.add("warn");
    const fileLabel = { none: "Speicherort wählen", local: "Nur im Browser", ok: "Gespeichert: " + F.name, saving: "Speichert …", needs: "Ordner erneut erlauben", error: "Speicherfehler" }[F.state] || "";
    const fileChip = h("button.chip" + (F.state === "ok" ? ".ok" : F.state === "needs" || F.state === "error" ? ".bad" : F.state === "none" ? ".warn" : ""), { onclick: () => TP.go("uebersicht", { sub: "speicher" }), title: "Wo dein Fortschritt gespeichert wird" }, h("span.dot"), fileLabel);
    return h("header.hdr",
      h("a.brand", { href: "#uebersicht", onclick: e => { e.preventDefault(); TP.go("uebersicht"); } },
        svg("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round" },
          svg("path", { d: "M3 20h18M3 20V4" }), svg("path", { d: "M3 8c5 0 8 2 11 6s5 5 7 5", stroke: "#ff8a50" }), svg("path", { d: "M3 8c8 2 13 7 18 11", stroke: "#6aa5f5" }),
          svg("path", { d: "M12.5 9.2c0 0-1.7 2-1.7 3.2a1.7 1.7 0 0 0 3.4 0c0-1.2-1.7-3.2-1.7-3.2z", fill: "currentColor", stroke: "none" })),
        "Bauphysik", h("small", "Prüfungstrainer")),
      h("nav.tabs", { role: "tablist" }, ORDER.map((id, i) => h("button.tab", { role: "tab", title: "Alt+" + (i + 1), "aria-selected": id === cur ? "true" : "false", onclick: () => TP.go(id) },
        h("span", { html: '<svg viewBox="0 0 24 24">' + ICON[id] + "</svg>" }), h("span", LABEL[id]), id === "ueben" && due ? h("span.badge", due > 99 ? "99+" : due) : null))),
      h("div.sp"),
      h("button.searchbtn", { onclick: TP.openSearch, title: "Karten, Formeln und Module durchsuchen (Strg+K)" }, h("span", { html: '<svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' }), h("span.stxt", "Alles durchsuchen …"), h("kbd", "Strg K")),
      h("span.hide-lg", examChip), h("span.hide-md", fileChip),
      h("button.iconbtn", { title: "Hell / Dunkel", onclick: toggleTheme, html: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>' }));
  }
  TP.onFileState = () => { const old = TP.$(".hdr"); if (old) old.replaceWith(header()); if (cur === "uebersicht" && args.sub === "speicher") TP.render(); };

  TP.setTheme = function (t) { TP.S.theme = t; document.documentElement.dataset.theme = t; TP.save(); };
  function toggleTheme() {
    const now = document.documentElement.dataset.theme;
    const dark = now === "dark" || (now === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
    TP.setTheme(dark ? "light" : "dark"); TP.render();
  }
  TP.openStorage = () => TP.go("uebersicht", { sub: "speicher" });

  /* ---------- render ---------- */
  TP.render = function () {
    if (!root) return;
    TP.clear(root);
    root.appendChild(header());
    const main = h("main");
    root.appendChild(main);
    const t = TP.tabs[cur];
    if (!t) { main.appendChild(h("div.empty", "Tab fehlt: " + cur)); return; }
    try { t.render(main, args); } catch (e) { console.error(e); main.appendChild(h("div.stage", h("div.callout.bad", "Something went wrong in this tab: " + e.message))); }
  };

  /* ---------- global search (Ctrl+K) ---------- */
  TP.openSearch = function () {
    if (TP.$("dialog.search")) return;
    const dlg = h("dialog.search");
    const input = h("input", { type: "search", placeholder: "Suchen: Kältebrücke, U-Wert, Glaser, µ-Wert, ψ …", autocomplete: "off" });
    const out = h("div.sres");
    const close = () => { dlg.close(); dlg.remove(); };
    const strip = s => String(s).replace(/\$[^$]*\$/g, "…").replace(/[*`]/g, "");
    const draw = () => {
      TP.clear(out); const q = input.value.trim().toLowerCase();
      if (q.length < 2) { out.appendChild(h("div.empty", { style: { padding: "26px" } }, "Zwei Buchstaben genügen. Gesucht wird in 506 Karten, 94 Formeln, 146 Symbolen und allen Modulen.")); return; }
      const has = s => String(s || "").toLowerCase().includes(q);
      const mods = TP.MODS.filter(m => has(m.short + " " + m.sub) || has((TP.modContent(m.n) || {}).title)).slice(0, 5);
      const cards = TP.content.cards.filter(c => has(c.q) || has(c.a)).sort((a, b) => (has(b.q) ? 1 : 0) - (has(a.q) ? 1 : 0)).slice(0, 8);
      const forms = [];
      TP.content.formulas.forEach(s => s.items.forEach(it => { if (has(it.label) || has(s.title) || has(it.tex)) forms.push([s, it]); }));
      const syms = TP.content.symbols.filter(s => has(s.meaning) || has(s.name) || has(s.pron)).slice(0, 4);
      const grp = t => out.appendChild(h("div.grp", t));
      if (mods.length) { grp("Module"); mods.forEach(m => out.appendChild(h("button.it", { onclick: () => { close(); TP.S.ui.focusMod = m.n; TP.go("lernen", { sub: "m" + m.n }); } }, h("b", "M" + TP.ui.pad2(m.n) + " " + m.short), h("small", m.sub)))); }
      if (cards.length) { grp("Karten"); cards.forEach(c => { const d = h("details.qa", h("summary", strip(c.q).slice(0, 150)), h("div", TP.mdEl(c.a))); out.appendChild(h("div", { style: { padding: "0 10px" } }, d)); }); }
      if (forms.length) { grp("Formeln (" + forms.length + ")"); forms.slice(0, 6).forEach(([s, it]) => out.appendChild(h("button.it", { onclick: () => { close(); TP.S.ui.fq = it.label || ""; TP.go("formeln", { sub: "formeln" }); } }, h("small", (it.label || s.title)), h("span", { html: TP.tex(it.tex, false) })))); }
      if (syms.length) { grp("Symbole"); syms.forEach(s => out.appendChild(h("div.it", h("span", { html: TP.md(s.sym).replace(/<\/?p>/g, "") }), " — ", h("span", { html: TP.md(s.meaning || "").replace(/<\/?p>/g, "").slice(0, 160) })))); }
      if (!out.children.length) out.appendChild(h("div.empty", { style: { padding: "26px" } }, "Nichts gefunden."));
    };
    input.addEventListener("input", TP.debounce(draw, 120));
    dlg.addEventListener("cancel", () => dlg.remove());
    dlg.addEventListener("click", e => { if (e.target === dlg) close(); });
    dlg.append(input, out); document.body.appendChild(dlg); dlg.showModal(); draw(); input.focus();
  };

  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); TP.openSearch(); return; }
    if (e.altKey && /^[1-6]$/.test(e.key)) { e.preventDefault(); TP.go(ORDER[+e.key - 1]); }
  });

  async function boot() {
    root = document.getElementById("app");
    if (TP.S.theme && TP.S.theme !== "auto") document.documentElement.dataset.theme = TP.S.theme;
    readHash();
    root.appendChild(h("div.empty", "Lade …"));
    await TP.loadContent();
    TP.render();
    TP.initFile().then(() => TP.render());
    window.addEventListener("hashchange", () => { readHash(); TP.render(); });
    if ("serviceWorker" in navigator && location.protocol.startsWith("http") && (location.hostname !== "localhost" || location.search.includes("sw"))) {
      navigator.serviceWorker.register("sw.js").catch(() => { });
    }
  }
  document.addEventListener("DOMContentLoaded", boot);
})(window.TP);
