/* Bauphysik — Labor: lab list + controls in the sidebar, results (charts, numbers, explanation) in the wide stage */
(function (TP) {
  const { h } = TP;
  const U = TP.ui;
  const ORDER = ["uwert", "glaser", "feuchte", "kontakt", "komfort", "energie", "sonne"];
  const PRACTICE = {
    uwert: ["rechnen", "U-Wert-Aufgaben rechnen"], glaser: ["glaser", "Glaser-Training starten (7 Punkte)"], feuchte: ["rechnen", "Oberflächenkondensat & f_Rsi rechnen"],
    kontakt: ["rechnen", "Kontakttemperatur & Diffusivität rechnen"], komfort: ["rechnen", "Operative Temperatur rechnen"],
    energie: ["rechnen", "Heizwärmebedarf-Aufgaben rechnen"], sonne: ["rechnen", "Sonnenhöhe & Strahlung rechnen"],
  };
  TP.tabs.labor = {
    render(main, args) {
      let id = (args && args.sub && ORDER.includes(args.sub)) ? args.sub : (TP.S.ui.lab || "uwert");
      if (!ORDER.includes(id)) id = "uwert";
      TP.S.ui.lab = id;
      const list = ORDER.map(k => U.nav({ iconKey: k, title: TP.LABS[k].name, sub: TP.LABS[k].sub, active: k === id, onclick: () => { TP.S.ui.lab = k; TP.go("labor", { sub: k }); } }));
      const side = U.sidebar("Labor", ...list, U.sbSep(), U.sbLabel("Einstellungen dieses Labors"));
      const { stage } = U.layout(main, { sidebar: side, wide: true });
      const holder = h("div");
      const lab = TP.labs[id];
      try {
        lab.render(holder);
        const root = holder.firstChild, ctl = root.querySelector(".side"), out = root.querySelector(".main");
        ctl.style.cssText = "display:flex;flex-direction:column;gap:12px"; out.style.cssText = "display:flex;flex-direction:column;gap:16px;min-width:0";
        side.body.appendChild(ctl); stage.appendChild(out);
        const p = PRACTICE[id];
        stage.appendChild(h("div.card.pad.flat.row.between", h("span.muted", "Verstanden? Dann festigen:"), h("button.btn.primary", { onclick: () => TP.go("ueben", { sub: p[0] }) }, p[1])));
      } catch (e) { console.error(e); stage.appendChild(h("div.callout.bad", "Lab error: " + e.message)); }
    },
  };
})(window.TP);
