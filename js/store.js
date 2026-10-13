/* Taupunkt — progress data and saving.
   Everything you do (cards, quiz, calculations, ticks, exam results) is one small JSON object.
   It is always kept in the browser (localStorage). In addition you can pick a folder (File System Access API):
   Taupunkt then writes Taupunkt.tpk into it after every change, so the progress lives where YOU choose (e.g. Google Drive). */
(function (TP) {
  const KEY = "taupunkt.v1";
  const DEFAULT = () => ({
    v: 1, examDate: "", theme: "auto",
    cards: {},        // card id -> { ease, ivl, due, reps, lapses, last }
    quiz: {},         // question id -> { n, ok, last }
    calc: {},         // generator id -> { n, ok, last }
    checks: {},       // "m6:2" -> true
    log: {},          // "2026-10-13" -> { cards, quiz, calc, glaser, labs }
    exams: [],        // finished mock exams
    drills: [],       // finished Glaser drills
    ui: { tab: "karte", lab: "uwert", uebenMode: "karten", focusMod: 0 },
  });

  function load() {
    try { const j = JSON.parse(localStorage.getItem(KEY)); if (j && j.v) return Object.assign(DEFAULT(), j); } catch (e) { }
    return DEFAULT();
  }
  TP.S = load();
  let savedAt = 0; try { savedAt = +localStorage.getItem(KEY + ".at") || 0; } catch (e) { }
  let lastSer = JSON.stringify(TP.S);

  TP.payload = () => ({ app: "taupunkt", version: 1, saved: new Date(savedAt || Date.now()).toISOString(), data: TP.S });
  function persistLocal() { try { localStorage.setItem(KEY, JSON.stringify(TP.S)); localStorage.setItem(KEY + ".at", String(savedAt)); } catch (e) { TP.toast("Browser storage is full. Please choose a save folder."); } }
  TP.save = function () {
    const ser = JSON.stringify(TP.S);
    if (ser === lastSer) return;
    lastSer = ser; savedAt = Date.now(); persistLocal(); TP.scheduleFileWrite();
  };
  TP.saveSoon = TP.debounce(() => TP.save(), 400);

  /* start over (keeps the exam date and theme) */
  TP.resetAll = function () {
    const keep = { examDate: TP.S.examDate, theme: TP.S.theme };
    TP.S = Object.assign(DEFAULT(), keep); lastSer = ""; TP.save();
    if (TP.render) TP.render();
  };

  /* activity log */
  TP.logAct = function (kind, n) {
    const k = TP.dayKey(), d = (TP.S.log[k] = TP.S.log[k] || {});
    d[kind] = (d[kind] || 0) + (n == null ? 1 : n);
    TP.saveSoon();
  };

  /* ---------- IndexedDB: remembers the chosen folder ---------- */
  function idb() { return new Promise((res, rej) => { const r = indexedDB.open("taupunkt", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  async function idbGet(k) { try { const db = await idb(); return await new Promise((res, rej) => { const q = db.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); } catch (e) { return null; } }
  async function idbSet(k, v) { try { const db = await idb(); await new Promise((res, rej) => { const t = db.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); return true; } catch (e) { return false; } }

  /* ---------- Taupunkt.tpk in a folder the user picks ---------- */
  const FILE = "Taupunkt.tpk";
  const F = (TP.file = { ok: !!window.showDirectoryPicker, dir: null, state: window.showDirectoryPicker ? "none" : "local", name: "", timer: null });
  TP.onFileState = () => { };
  function setState(s) { F.state = s; TP.onFileState(); }
  async function perm(h, ask) {
    if (!h.queryPermission) return true;
    const o = { mode: "readwrite" };
    if ((await h.queryPermission(o)) === "granted") return true;
    return !!ask && (await h.requestPermission(o)) === "granted";
  }
  TP.scheduleFileWrite = function () { if (!F.dir) return; clearTimeout(F.timer); F.timer = setTimeout(() => writeFile(false), 700); };
  async function writeFile(ask) {
    if (!F.dir) return false; clearTimeout(F.timer); F.timer = null;
    try {
      if (!(await perm(F.dir, ask))) { setState("needs"); return false; }
      setState("saving");
      const fh = await F.dir.getFileHandle(FILE, { create: true });
      const w = await fh.createWritable(); await w.write(JSON.stringify(TP.payload())); await w.close();
      setState("ok"); return true;
    } catch (e) { F.msg = e.message; setState("error"); return false; }
  }
  TP.writeFileNow = () => writeFile(true);
  async function readFile(dir) { const fh = await dir.getFileHandle(FILE); return JSON.parse(await (await fh.getFile()).text()); }
  function check(j) { if (!j || j.app !== "taupunkt" || !j.data) throw new Error("not a Taupunkt file"); return j; }
  TP.applyPayload = function (j) {
    check(j);
    TP.S = Object.assign(DEFAULT(), j.data);
    savedAt = j.saved ? Date.parse(j.saved) || Date.now() : Date.now();
    lastSer = JSON.stringify(TP.S); persistLocal();
    if (TP.render) TP.render();
  };
  async function syncFromFile() {
    try {
      const j = check(await readFile(F.dir)), fsaved = Date.parse(j.saved) || 0;
      if (fsaved > savedAt + 1000) TP.applyPayload(j); else if (savedAt > fsaved + 1000) await writeFile(false);
      setState("ok");
    } catch (e) { if (e.name === "NotFoundError") await writeFile(false); else setState("error"); }
  }
  TP.hasProgress = () => Object.keys(TP.S.cards).length + Object.keys(TP.S.quiz).length + Object.keys(TP.S.calc).length + TP.S.exams.length > 0;
  TP.chooseFolder = async function () {
    try {
      const dir = await showDirectoryPicker({ id: "taupunkt", mode: "readwrite" });
      let existing = null; try { existing = check(await readFile(dir)); } catch (e) { }
      if (existing && TP.hasProgress() && !confirm("This folder already contains a Taupunkt.tpk.\n\nOpen it? The progress on screen now will be replaced.\n(Cancel = keep what you have and pick another folder.)")) return;
      F.dir = dir; F.name = dir.name; await idbSet("dir", dir);
      if (existing) TP.applyPayload(existing); else await writeFile(true);
      setState("ok");
      TP.toast("Done: progress now saves itself into " + dir.name + "/" + FILE);
    } catch (e) { if (e.name !== "AbortError") TP.toast("That did not work: " + e.message); }
  };
  TP.reconnect = async function () {
    if (!F.dir) return false;
    try { if (await perm(F.dir, true)) { await syncFromFile(); return F.state === "ok"; } } catch (e) { }
    setState("needs"); return false;
  };
  TP.forgetFolder = async function () { F.dir = null; F.name = ""; await idbSet("dir", null); setState(F.ok ? "none" : "local"); };
  TP.initFile = async function () {
    if (!F.ok) return;
    const dir = await idbGet("dir");
    if (!dir) return;
    F.dir = dir; F.name = dir.name;
    try { if ((await perm(dir, false))) await syncFromFile(); else setState("needs"); } catch (e) { setState("needs"); }
  };

  /* backup / restore as a download / upload, for browsers without folder access */
  TP.exportFile = function () {
    const blob = new Blob([JSON.stringify(TP.payload(), null, 1)], { type: "application/json" });
    const a = TP.h("a", { href: URL.createObjectURL(blob), download: "Taupunkt-" + TP.dayKey() + ".tpk" }); document.body.appendChild(a); a.click(); a.remove();
  };
  TP.importFile = function () {
    const inp = TP.h("input", { type: "file", accept: ".tpk,application/json" });
    inp.onchange = async () => { try { TP.applyPayload(JSON.parse(await inp.files[0].text())); TP.toast("Progress restored."); } catch (e) { TP.toast("That is not a Taupunkt file."); } };
    inp.click();
  };
  window.addEventListener("beforeunload", () => { try { TP.save(); } catch (e) { } });
})(window.TP);
