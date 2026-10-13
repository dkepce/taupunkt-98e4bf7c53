/* Bauphysik — shared drawing helpers: nice axes, material hatches */
(function (TP) {
  const { svg } = TP;

  /* "nice" axis: returns { min, max, step, ticks[] } covering [lo, hi] */
  TP.niceAxis = function (lo, hi, target) {
    target = target || 6;
    if (hi - lo < 1e-12) hi = lo + 1;
    const raw = (hi - lo) / target, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
    const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
    const min = Math.floor(lo / step + 1e-9) * step, max = Math.ceil(hi / step - 1e-9) * step, ticks = [];
    for (let v = min; v <= max + step / 2; v += step) ticks.push(+v.toFixed(10));
    return { min, max, step, ticks };
  };

  /* material colours + hatch patterns (one <defs> per svg; ids prefixed so several charts can coexist) */
  TP.KIND = {
    board: { fill: "#d9d3c3", dark: "#4a4636", name: "Platte" },
    plaster: { fill: "#e6d9c2", dark: "#5b4d36", name: "Putz" },
    masonry: { fill: "#d9a58c", dark: "#6b3c28", name: "Mauerwerk" },
    concrete: { fill: "#b4b8bd", dark: "#3d4248", name: "Beton" },
    insul: { fill: "#f1d878", dark: "#6e5a14", name: "Dämmung" },
    wood: { fill: "#d6ae7b", dark: "#6b4a22", name: "Holz" },
    barrier: { fill: "#5a6677", dark: "#e7eaef", name: "Dampfsperre" },
    glass: { fill: "#a9d5e8", dark: "#25566b", name: "Glas" },
    metal: { fill: "#9aa3ad", dark: "#2a3138", name: "Metall" },
  };
  TP.matDefs = function (pfx) {
    const d = svg("defs");
    const pat = (id, w, h, fill, content) => d.appendChild(svg("pattern", { id: pfx + id, width: w, height: h, patternUnits: "userSpaceOnUse" }, svg("rect", { width: w, height: h, fill }), content));
    const L = (x1, y1, x2, y2, c) => svg("path", { d: `M${x1} ${y1}L${x2} ${y2}`, stroke: c, "stroke-width": 1, "stroke-linecap": "square", fill: "none", opacity: 0.55 });
    const dot = (x, y, c) => svg("circle", { cx: x, cy: y, r: 0.9, fill: c, opacity: 0.6 });
    const K = TP.KIND;
    pat("board", 6, 6, K.board.fill, svg("g", L(0, 3, 6, 3, K.board.dark)));
    pat("plaster", 6, 6, K.plaster.fill, svg("g", dot(1.5, 1.5, K.plaster.dark), dot(4.5, 4.5, K.plaster.dark)));
    pat("masonry", 16, 8, K.masonry.fill, svg("g", L(0, 0, 16, 0, K.masonry.dark), L(0, 4, 16, 4, K.masonry.dark), L(8, 0, 8, 4, K.masonry.dark), L(0, 4, 0, 8, K.masonry.dark)));
    pat("concrete", 8, 8, K.concrete.fill, svg("g", dot(1, 1, K.concrete.dark), dot(5, 3, K.concrete.dark), dot(3, 6, K.concrete.dark), dot(7, 7, K.concrete.dark)));
    pat("insul", 10, 10, K.insul.fill, svg("path", { d: "M0 5 Q2.5 0 5 5 T10 5", stroke: K.insul.dark, "stroke-width": 1, fill: "none", opacity: 0.6 }));
    pat("wood", 8, 8, K.wood.fill, svg("g", L(0, 2, 8, 2, K.wood.dark), L(0, 6, 8, 6, K.wood.dark)));
    pat("barrier", 4, 4, K.barrier.fill, svg("g"));
    pat("glass", 8, 8, K.glass.fill, svg("g", L(0, 8, 8, 0, "#ffffff")));
    pat("metal", 5, 5, K.metal.fill, svg("g", L(0, 5, 5, 0, K.metal.dark)));
    return d;
  };
  TP.matPaint = (pfx, kind) => "url(#" + pfx + (TP.KIND[kind] ? kind : "board") + ")";
  TP.matColor = kind => (TP.KIND[kind] || TP.KIND.board).fill;

  /* tooltip helper inside an svg: returns { show(x, y, lines[]), hide() } */
  TP.svgTip = function (parent, W) {
    const g = svg("g.tip", { style: { display: "none", pointerEvents: "none" } });
    const bg = svg("rect", { rx: 5, opacity: 0.92 });
    g.appendChild(bg); parent.appendChild(g);
    return {
      show(x, y, lines) {
        TP.clear(g); g.appendChild(bg);
        const ts = lines.map((t, i) => g.appendChild(svg("text", { x: 8, y: 17 + i * 16 }, t)));
        g.style.display = "";
        const w = Math.max(...ts.map(t => t.getComputedTextLength ? t.getComputedTextLength() : 80)) + 16, hgt = 10 + lines.length * 16;
        bg.setAttribute("width", w); bg.setAttribute("height", hgt);
        const tx = x + 14 + w > W ? x - w - 14 : x + 14;
        g.setAttribute("transform", `translate(${tx},${Math.max(4, y - hgt / 2)})`);
      },
      hide() { g.style.display = "none"; },
    };
  };
})(window.TP);
