/* Taupunkt — small helpers: element builder, number formatting, math + mini-markdown rendering */
(function (root) {
  const TP = (root.TP = root.TP || {});
  TP.tabs = TP.tabs || {};

  /* ---------- element builder: h("div.card#x", {onclick}, child, ...) ---------- */
  const NS = "http://www.w3.org/2000/svg";
  function apply(el, attrs, isSvg) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") el.setAttribute("class", Array.isArray(v) ? v.filter(Boolean).join(" ") : v);
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (!isSvg && (k === "value" || k === "checked" || k === "disabled" || k === "selected")) el[k] = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
  }
  function kids(el, list) {
    for (const c of list) {
      if (c == null || c === false) continue;
      if (Array.isArray(c)) kids(el, c);
      else el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
    }
  }
  TP.h = function (tag, attrs, ...ch) {
    if (attrs && (attrs.nodeType || typeof attrs !== "object" || Array.isArray(attrs))) { ch.unshift(attrs); attrs = null; }
    const m = /^([a-z0-9]+)((?:[.#][\w-]+)*)$/i.exec(tag) || [0, tag, ""];
    const el = document.createElement(m[1]);
    (m[2].match(/[.#][\w-]+/g) || []).forEach(t => { if (t[0] === ".") el.classList.add(t.slice(1)); else el.id = t.slice(1); });
    if (attrs) apply(el, attrs, false);
    kids(el, ch);
    return el;
  };
  TP.svg = function (tag, attrs, ...ch) {
    if (attrs && (attrs.nodeType || typeof attrs !== "object" || Array.isArray(attrs))) { ch.unshift(attrs); attrs = null; }
    const m = /^([a-z0-9]+)((?:[.#][\w-]+)*)$/i.exec(tag) || [0, tag, ""];     // "g.grid" → <g class="grid">
    const el = document.createElementNS(NS, m[1]);
    (m[2].match(/[.#][\w-]+/g) || []).forEach(t => { if (t[0] === ".") el.classList.add(t.slice(1)); else el.id = t.slice(1); });
    if (attrs) apply(el, attrs, true);
    kids(el, ch);
    return el;
  };
  TP.$ = (s, r) => (r || document).querySelector(s);
  TP.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  TP.clear = el => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
  TP.esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  TP.uid = () => Math.random().toString(36).slice(2, 10);
  TP.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  TP.shuffle = (a, rnd) => { a = a.slice(); const r = rnd || Math.random; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  TP.pick = (a, rnd) => a[Math.floor((rnd || Math.random)() * a.length)];
  TP.rint = (lo, hi, rnd) => lo + Math.floor((rnd || Math.random)() * (hi - lo + 1));
  TP.rstep = (lo, hi, step, rnd) => { const n = Math.round((hi - lo) / step); return +(lo + Math.floor((rnd || Math.random)() * (n + 1)) * step).toFixed(6); };

  /* ---------- numbers (German decimal comma, as on the exam sheet) ---------- */
  TP.fmt = function (v, d) {
    if (v == null || !isFinite(v)) return "–";
    if (d == null) { const a = Math.abs(v); d = a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 2 : a >= 1 ? 3 : a >= 0.1 ? 3 : 4; }
    return (+v).toFixed(d).replace(".", ",").replace(/^-0(,0*)?$/, "0$1");
  };
  TP.num = s => { const v = parseFloat(String(s).trim().replace(/\s/g, "").replace(",", ".")); return isNaN(v) ? NaN : v; };
  TP.sig = (v, n) => { if (!isFinite(v) || v === 0) return "0"; const d = Math.max(0, n - 1 - Math.floor(Math.log10(Math.abs(v)))); return TP.fmt(v, Math.min(d, 8)); };

  /* ---------- dates (local days) ---------- */
  TP.dayNum = (d) => { d = d || new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };
  TP.dayKey = (d) => { d = d || new Date(); const p = n => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); };
  TP.daysUntil = (iso) => { if (!iso) return null; const t = new Date(iso + "T00:00:00"); return isNaN(t) ? null : TP.dayNum(t) - TP.dayNum(); };

  /* ---------- math ---------- */
  TP.tex = function (s, display) {
    try {
      if (root.katex) return root.katex.renderToString(s, { displayMode: !!display, throwOnError: false, strict: "ignore", trust: false, output: "html" });
    } catch (e) { /* fall through */ }
    return '<code class="texfb">' + TP.esc(s) + "</code>";
  };
  TP.texEl = (s, display) => TP.h(display ? "div.mathblock" : "span.mathinline", { html: TP.tex(s, display) });

  /* ---------- mini markdown (bold, italic, code, lists, pipe tables, $math$) → safe HTML ---------- */
  TP.md = function (src) {
    if (!src) return "";
    const maths = [];
    let t = String(src);
    t = t.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => { maths.push(TP.tex(m.trim(), true)); return "\n\n\u0001" + (maths.length - 1) + "\u0001\n\n"; });
    t = t.replace(/\$([^$\n]+?)\$/g, (_, m) => { maths.push(TP.tex(m, false)); return "\u0001" + (maths.length - 1) + "\u0001"; });
    const inline = s => TP.esc(s)
      .replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=$|[\s).,;:!?])/g, "$1<em>$2</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
    const blocks = t.split(/\n{2,}/);
    const out = [];
    for (let b of blocks) {
      b = b.replace(/\s+$/, "");
      if (!b.trim()) continue;
      const lines = b.split("\n");
      if (/^\u0001\d+\u0001$/.test(b.trim())) { out.push('<div class="mathblock">' + b.trim() + "</div>"); continue; }
      if (lines.every(l => /^\s*\|/.test(l))) {
        const rows = lines.filter(l => !/^\s*\|[\s:|-]+\|?\s*$/.test(l)).map(l => l.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim()));
        const head = rows.shift() || [];
        out.push('<div class="tblwrap"><table class="mdtable"><thead><tr>' + head.map(c => "<th>" + inline(c) + "</th>").join("") + "</tr></thead><tbody>" +
          rows.map(r => "<tr>" + r.map(c => "<td>" + inline(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>");
        continue;
      }
      if (lines.every(l => /^\s*([-*•]|\d+[.)])\s+/.test(l) || /^\s{2,}\S/.test(l))) {
        const ordered = /^\s*\d+[.)]/.test(lines[0]);
        out.push((ordered ? "<ol>" : "<ul>") + lines.map(l => "<li>" + inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, "")) + "</li>").join("") + (ordered ? "</ol>" : "</ul>"));
        continue;
      }
      // paragraph with possibly mixed list lines
      let html = "", inList = false;
      for (const l of lines) {
        const li = /^\s*([-*•]|\d+[.)])\s+(.*)$/.exec(l);
        if (li) { if (!inList) { html += "<ul>"; inList = true; } html += "<li>" + inline(li[2]) + "</li>"; }
        else { if (inList) { html += "</ul>"; inList = false; } html += inline(l) + "<br>"; }
      }
      if (inList) html += "</ul>";
      out.push("<p>" + html.replace(/<br>$/, "") + "</p>");
    }
    return out.join("").replace(/\u0001(\d+)\u0001/g, (_, i) => maths[+i]);
  };
  TP.mdEl = (s, cls) => TP.h("div.md" + (cls ? "." + cls : ""), { html: TP.md(s) });

  /* ---------- toast ---------- */
  let toastT;
  TP.toast = function (msg) {
    let el = document.getElementById("toast");
    if (!el) { el = TP.h("div#toast", { role: "status", "aria-live": "polite" }); document.body.appendChild(el); }
    el.textContent = msg; el.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 3200);
  };

  /* ---------- deterministic random (for repeatable drills) ---------- */
  TP.rng = function (seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };

  if (typeof module !== "undefined") module.exports = TP;
})(typeof window !== "undefined" ? window : globalThis);
