/* Taupunkt — Labor: the interactive labs */
(function (TP) {
  const { h } = TP;
  const ORDER = ["uwert", "glaser", "feuchte", "kontakt", "komfort"];
  TP.tabs.labor = {
    render(main, args) {
      let id = (args && args.sub && ORDER.includes(args.sub)) ? args.sub : (TP.S.ui.lab || "uwert");
      if (!ORDER.includes(id)) id = "uwert";
      TP.S.ui.lab = id;
      main.appendChild(h("div.page-head", h("div", h("h1", "Labor"), h("p", "Change something, watch the physics respond. Every lab uses the same formulas as the exam; the wall you build in Wandaufbau is the same wall that appears in the Glaser diagram."))));
      const tabs = h("div.sub-tabs", ORDER.map(k => h("button.sub-tab", { "aria-selected": k === id ? "true" : "false", onclick: () => { TP.S.ui.lab = k; TP.go("labor", { sub: k }); } }, h("b", TP.LABS[k].name), h("small", TP.LABS[k].sub))));
      main.appendChild(tabs);
      const body = h("div");
      main.appendChild(body);
      const lab = TP.labs[id];
      if (lab && lab.render) { try { lab.render(body); TP.logAct("labs", 0); } catch (e) { console.error(e); body.appendChild(h("div.callout.bad", "Lab error: " + e.message)); } }
      else body.appendChild(h("div.empty", "Dieses Labor kommt noch."));
    },
  };
})(window.TP);
