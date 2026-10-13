/* Taupunkt — shell: header, tab routing, save-folder dialog, settings */
(function (TP) {
  const { h, svg } = TP;
  const ORDER = ["karte", "labor", "formeln", "ueben", "pruefung", "fortschritt"];
  const LABEL = { karte: "Karte", labor: "Labor", formeln: "Formeln", ueben: "Üben", pruefung: "Prüfung", fortschritt: "Fortschritt" };
  const ICON = {
    karte: '<circle cx="5" cy="6" r="2.2"/><circle cx="19" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M7 7l4 9M17 7l-4 9M7.2 6h9.6"/>',
    labor: '<path d="M9 3h6M10 3v6l-5.5 9.5A1.6 1.6 0 0 0 5.9 21h12.2a1.6 1.6 0 0 0 1.4-2.5L14 9V3"/><path d="M7.5 15h9"/>',
    formeln: '<path d="M18 5H7l6 7-6 7h11"/>',
    ueben: '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="M7 3h14v14"/><path d="M7 10h6M7 14h4"/>',
    pruefung: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
    fortschritt: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  };
  const ico = d => '<svg viewBox="0 0 24 24">' + d + "</svg>";
  let root, cur = "karte", args = {};

  TP.go = function (tab, a) {
    cur = ORDER.includes(tab) ? tab : "karte"; args = a || {};
    TP.S.ui.tab = cur; TP.saveSoon();
    location.hash = cur + (args.sub ? "/" + args.sub : "");
    TP.render();
    window.scrollTo(0, 0);
  };
  function readHash() {
    const m = /^#([a-z]+)(?:\/([\w-]+))?/.exec(location.hash);
    if (m && ORDER.includes(m[1])) { cur = m[1]; if (m[2]) args = { sub: m[2] }; }
    else cur = TP.S.ui.tab && ORDER.includes(TP.S.ui.tab) ? TP.S.ui.tab : "karte";
  }

  /* ---------- header ---------- */
  function header() {
    const due = TP.dueTotal();
    const days = TP.daysUntil(TP.S.examDate);
    const examChip = h("button.chip", { title: "Exam date: click to change", onclick: () => TP.go("fortschritt") },
      days == null ? "Prüfungsdatum setzen" : days > 0 ? "Prüfung in " + days + (days === 1 ? " Tag" : " Tagen") : days === 0 ? "Prüfung heute" : "Prüfung vorbei");
    if (days != null && days >= 0 && days <= 14) examChip.classList.add("warn");
    const F = TP.file;
    const fileLabel = { none: "Speicherort wählen", local: "Nur Browser", ok: "Gespeichert: " + F.name, saving: "Speichert …", needs: "Ordner erneut erlauben", error: "Speicherfehler" }[F.state] || "";
    const fileChip = h("button.chip" + (F.state === "ok" ? ".ok" : F.state === "needs" || F.state === "error" ? ".bad" : F.state === "none" ? ".warn" : ""), { onclick: openStorage, title: "Where your progress is saved" }, h("span.dot"), fileLabel);
    return h("header.hdr",
      h("a.brand", { href: "#karte", onclick: e => { e.preventDefault(); TP.go("karte"); } },
        svg("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round" },
          svg("path", { d: "M3 20h18M3 20V4" }), svg("path", { d: "M3 8c5 0 8 2 11 6s5 5 7 5", stroke: "var(--ps)" }), svg("path", { d: "M3 8c8 2 13 7 18 11", stroke: "var(--p)" }),
          svg("path", { d: "M12.5 9.2c0 0-1.7 2-1.7 3.2a1.7 1.7 0 0 0 3.4 0c0-1.2-1.7-3.2-1.7-3.2z", fill: "currentColor", stroke: "none" })),
        "Taupunkt", h("small", "Bauphysik")),
      h("nav.tabs", { role: "tablist" }, ORDER.map(id => h("button.tab", { role: "tab", "aria-selected": id === cur ? "true" : "false", onclick: () => TP.go(id) },
        h("span", { html: ico(ICON[id]) }), h("span", LABEL[id]), id === "ueben" && due ? h("span.badge", due > 99 ? "99+" : due) : null))),
      h("div.sp"),
      h("span.hide-lg", examChip), h("span.hide-md", fileChip),
      h("button.iconbtn", { title: "Theme", onclick: toggleTheme, html: ico('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>') }),
      h("button.iconbtn", { title: "Save location & backup", onclick: openStorage, html: ico('<path d="M5 3h11l4 4v14H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>') }));
  }
  TP.onFileState = () => { const old = TP.$(".hdr"); if (old) old.replaceWith(header()); };

  function toggleTheme() {
    const now = document.documentElement.dataset.theme;
    const dark = now === "dark" || (now === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
    TP.S.theme = dark ? "light" : "dark"; document.documentElement.dataset.theme = TP.S.theme === "light" ? "light" : "dark";
    TP.save(); TP.render();
  }

  /* ---------- storage dialog ---------- */
  function openStorage() {
    const F = TP.file;
    const dlg = h("dialog", { style: { border: "1px solid var(--line)", borderRadius: "12px", background: "var(--surface)", color: "var(--ink)", maxWidth: "520px", width: "92vw", padding: "0" } });
    const close = () => { dlg.close(); dlg.remove(); TP.render(); };
    const body = h("div.stack", { style: { padding: "20px 22px" } },
      h("h2", "Save location"),
      h("p.muted", "Your progress (cards, quiz, calculations, mock exams) is one small file: ", h("code", "Taupunkt.tpk"), ". You choose the folder, for example inside Google Drive so that PC and laptop share it."),
      F.ok ? h("div.callout" + (F.state === "ok" ? ".ok" : ""),
        F.state === "ok" ? ["Saving automatically to ", h("b", F.name + "/Taupunkt.tpk"), "."] :
          F.state === "needs" ? "The browser needs your permission again for the folder “" + F.name + "”." :
            F.state === "error" ? "Could not write the file: " + (F.msg || "unknown error") : "No folder chosen yet. Until then everything is kept in this browser only.") :
        h("div.callout.warn", "This browser cannot save to a folder. Use Backup/Restore below (Chrome, Edge or Brave can do it automatically)."),
      h("div.row",
        F.ok ? h("button.btn.primary", { onclick: async () => { await TP.chooseFolder(); close(); } }, F.dir ? "Choose another folder" : "Choose folder") : null,
        F.ok && F.dir && F.state === "needs" ? h("button.btn", { onclick: async () => { await TP.reconnect(); close(); } }, "Allow again") : null,
        F.dir ? h("button.btn.ghost", { onclick: async () => { await TP.forgetFolder(); close(); } }, "Stop saving to folder") : null),
      h("div.row", h("button.btn", { onclick: TP.exportFile }, "Download backup"), h("button.btn", { onclick: TP.importFile }, "Restore from backup")),
      h("hr", { style: { border: 0, borderTop: "1px solid var(--line)", width: "100%" } }),
      h("label.field", h("span", "Exam date"), h("input", { type: "date", value: TP.S.examDate, onchange: e => { TP.S.examDate = e.target.value; TP.save(); } })),
      h("div.row", { style: { justifyContent: "flex-end" } }, h("button.btn", { onclick: close }, "Close")));
    dlg.appendChild(body); document.body.appendChild(dlg); dlg.showModal();
    dlg.addEventListener("cancel", () => { dlg.remove(); TP.render(); });
  }
  TP.openStorage = openStorage;

  /* ---------- render ---------- */
  TP.render = function () {
    if (!root) return;
    TP.clear(root);
    root.appendChild(header());
    const main = h("main");
    root.appendChild(main);
    const t = TP.tabs[cur];
    if (!t) { main.appendChild(h("div.empty", "Tab not ready: " + cur)); return; }
    try { t.render(main, args); } catch (e) { console.error(e); main.appendChild(h("div.callout.bad", "Something went wrong in this tab: " + e.message)); }
  };

  async function boot() {
    root = document.getElementById("app");
    if (TP.S.theme && TP.S.theme !== "auto") document.documentElement.dataset.theme = TP.S.theme;
    readHash();
    root.appendChild(h("div.empty", "Lade …"));
    await TP.loadContent();
    TP.render();
    TP.initFile().then(() => TP.render());
    window.addEventListener("hashchange", () => { readHash(); TP.render(); });
    if ("serviceWorker" in navigator && location.protocol.startsWith("http") && location.hostname !== "localhost" || (location.hostname === "localhost" && location.search.includes("sw"))) {
      navigator.serviceWorker.register("sw.js").catch(() => { });
    }
  }
  document.addEventListener("DOMContentLoaded", boot);
})(window.TP);
