/* Taupunkt — shared layout pieces: sidebar + stage, navigation rows, progress rings */
(function (TP) {
  const { h, svg } = TP;
  TP.ui = TP.ui || {};
  const U = TP.ui;

  U.laneColor = lane => "var(" + TP.LANES[lane].css + ")";
  U.pad2 = n => String(n).padStart(2, "0");
  U.ico = d => '<svg viewBox="0 0 24 24">' + d + "</svg>";
  U.ICON = {
    heute: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    fortschritt: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    speicher: '<path d="M5 3h11l4 4v14H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>',
    karten: '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="M7 3h14v14"/>',
    quiz: '<path d="M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.2-1.5 2.4M12 18h.01"/><circle cx="12" cy="12" r="9"/>',
    rechnen: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h2M16 12h0M8 16h2M12 16h2M16 16h0"/>',
    glaser: '<path d="M4 20V4M4 20h16"/><path d="M4 8c6 0 9 3 12 8"/><path d="M4 8l12 12" opacity=".5"/>',
    uwert: '<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M9 5v14M13 5v14M17 5v14"/>',
    feuchte: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    kontakt: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/>',
    komfort: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    formeln: '<path d="M18 5H7l6 7-6 7h11"/>', symbole: '<path d="M5 20l7-16 7 16M8 14h8"/>', tabellen: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M9 4v16"/>',
    suche: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  };

  /* layout: optional sidebar + stage; returns { body, side, stage } */
  U.layout = function (root, opts) {
    opts = opts || {};
    const stage = h("div.stage" + (opts.narrow ? ".narrow" : ""));
    const side = opts.sidebar || null;
    const body = h("div.appbody" + (side ? "" : ".nosb") + (opts.wide ? ".wide" : ""), side, side && opts.narrow ? h("div", stage) : stage);
    root.appendChild(body);
    return { body, side, stage };
  };

  /* sidebar with a title; on narrow screens the body folds behind a button */
  U.sidebar = function (title, ...kids) {
    const aside = h("aside.sidebar");
    const body = h("div.sb-body", kids);
    const toggle = h("button.btn.sm.sb-toggle", { onclick: () => aside.classList.toggle("open") }, "Menü");
    aside.appendChild(h("div.sb-head", h("h2", title), toggle));
    aside.appendChild(body);
    aside.body = body;
    return aside;
  };
  U.sbLabel = t => h("div.sb-label", t);
  U.sbSep = () => h("div.sb-sep");

  /* navigation row: { icon (svg path key) | text, title, sub, meta, pill, active, onclick, color } */
  U.nav = function (o) {
    const ic = h("span.ic", o.iconKey ? { html: U.ico(U.ICON[o.iconKey]) } : null, o.iconKey ? null : o.icon);
    if (o.color) ic.style.color = o.color;
    return h("button.nav", { "aria-current": o.active ? "true" : "false", onclick: o.onclick, title: o.hint || "" },
      ic, h("span.tx", h("b", o.title), o.sub ? h("small", o.sub) : null),
      o.ring != null ? U.ring(o.ring, 26, o.color) : o.pill ? h("span.pill" + (o.warm ? ".warm" : ""), o.pill) : o.meta ? h("span.meta", o.meta) : h("span"));
  };

  /* progress ring 0..1 */
  U.ring = function (v, size, color, label) {
    size = size || 28;
    const r = size / 2 - 3, c = 2 * Math.PI * r, s = svg("svg", { class: "ring", width: size, height: size, viewBox: `0 0 ${size} ${size}` });
    s.appendChild(svg("circle", { class: "trk", cx: size / 2, cy: size / 2, r, fill: "none", "stroke-width": 3 }));
    s.appendChild(svg("circle", { cx: size / 2, cy: size / 2, r, fill: "none", stroke: color || "var(--accent)", "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": `${c * Math.max(0.001, Math.min(1, v))} ${c}`, transform: `rotate(-90 ${size / 2} ${size / 2})` }));
    if (label) s.appendChild(svg("text", { x: size / 2, y: size / 2 + size * 0.1, "text-anchor": "middle", style: `font-size:${size * 0.3}px` }, label));
    return s;
  };

  U.pageHead = (title, sub, right) => h("div.page-head", h("div", h("h1", title), sub ? h("p", sub) : null), right || null);
  U.kpi = (label, v, unit, cls) => h("div.kpi" + (cls ? "." + cls : ""), h("div.label", label), h("div.v", v, unit ? h("small", unit) : null));
})(window.TP);
