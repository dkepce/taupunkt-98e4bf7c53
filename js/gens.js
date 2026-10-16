/* Bauphysik — calculation generators.
   Every generator makes a fresh exam-style task from a seed: prompt (German, like the exam), answer fields with tolerances, worked solution (English). */
(function (TP) {
  const P = TP.phys;
  const f = TP.fmt, n = (v, d) => TP.fmt(v, d).replace(",", "{,}");
  const pick = TP.pick, rstep = TP.rstep;

  /* answer field: value, tolerance (relative, default 1.5 %), optional absolute tolerance */
  const F = (key, label, unit, value, tol, abs, dec) => ({ key, label, unit, value, tol: tol == null ? 0.015 : tol, abs: abs || 0, dec });
  TP.checkField = function (fld, text) {
    const v = TP.num(text);
    if (isNaN(v)) return { ok: false, val: NaN, empty: !String(text).trim() };
    return { ok: Math.abs(v - fld.value) <= Math.max(fld.tol * Math.abs(fld.value), fld.abs), val: v };
  };

  const tbl = (head, rows) => "| " + head.join(" | ") + " |\n|" + head.map(() => "---").join("|") + "|\n" + rows.map(r => "| " + r.join(" | ") + " |").join("\n");
  const MATN = id => P.MAT[id].name;

  /* random wall from sensible layers */
  function randWall(r) {
    const core = pick([["ziegel", [250, 300, 380]], ["vollziegel", [250, 380]], ["porenbeton", [300, 365]], ["betonn", [200, 250]]], r);
    const L = [];
    L.push({ id: pick(["iputz", "gkb"], r), d: pick([0.015, 0.02], r) });
    L.push({ id: core[0], d: pick(core[1], r) / 1000 });
    if (r() < 0.8) L.push({ id: pick(["eps", "mw", "xps", "wd"], r), d: pick([0.06, 0.08, 0.1, 0.12, 0.14, 0.16, 0.2], r) });
    L.push({ id: "aputz", d: pick([0.015, 0.02], r) });
    return L;
  }
  const wallTable = L => tbl(["Schicht (innen → außen)", "d [cm]", "λ [W/mK]"], L.map(l => [MATN(l.id), f(l.d * 100, 1), f(P.MAT[l.id].lam, 3)]));

  const G = [];
  const add = (id, mod, title, make) => G.push({ id, mod, title, make });

  /* ---- M02 ---- */
  add("u-schichten", 2, "U-Wert eines Wandaufbaus", r => {
    const L = randWall(r), ti = pick([20, 21, 22], r), te = pick([-10, -12, -13, -5], r), st = P.stack(L, { ti, te, rsi: 0.13, rse: 0.04 });
    const lines = st.rows.map((x, i) => "$R_{" + (i + 1) + "}=" + n(x.d, 3) + "/" + n(x.lam, 3) + "=" + n(x.R, 4) + "$").join(", ");
    return { prompt: "Gegeben ist der folgende Wandaufbau (R_si = 0,13, R_se = 0,04 m²K/W; θ_i = " + ti + " °C, θ_e = " + te + " °C).\n\n" + wallTable(L) + "\n\nBerechnen Sie den Wärmedurchgangswiderstand R_T, den U-Wert und die Wärmestromdichte q̇.",
      fields: [F("rt", "R_T", "m²K/W", st.RT), F("u", "U", "W/m²K", st.U), F("q", "q̇", "W/m²", st.q)],
      steps: "Layer resistances: " + lines + ".\n\n$$R_T=R_{si}+\\sum R+R_{se}=0{,}13+" + n(st.sumR, 4) + "+0{,}04=" + n(st.RT, 3) + "\\ \\mathrm{m^2K/W}$$\n$$U=\\frac{1}{R_T}=" + n(st.U, 3) + "\\ \\mathrm{W/m^2K}, \\qquad \\dot q=U\\,(\\theta_i-\\theta_e)=" + n(st.U, 3) + "\\cdot" + n(ti - te, 0) + "=" + n(st.q, 2) + "\\ \\mathrm{W/m^2}$$" };
  });
  add("schichttemp", 2, "Schichttemperaturen", r => {
    const L = randWall(r), ti = pick([20, 22], r), te = pick([-10, -12, -15], r), st = P.stack(L, { ti, te, rsi: 0.13, rse: 0.04 });
    const k = TP.rint(1, L.length - 1, r);
    return { prompt: "Wandaufbau wie unten (R_si = 0,13, R_se = 0,04 m²K/W; θ_i = " + ti + " °C, θ_e = " + te + " °C).\n\n" + wallTable(L) + "\n\nWie hoch ist die innere Oberflächentemperatur θ_si, und welche Temperatur herrscht an der Grenze nach Schicht " + k + " (" + MATN(L[k - 1].id) + ")?",
      fields: [F("tsi", "θ_si", "°C", st.thSi, 0, 0.12), F("tk", "θ nach Schicht " + k, "°C", st.th[k], 0, 0.15)],
      steps: "$$U=" + n(st.U, 4) + ",\\quad \\dot q=" + n(st.q, 3) + "\\ \\mathrm{W/m^2}$$\n$$\\theta_{si}=\\theta_i-\\dot q\\,R_{si}=" + n(ti, 1) + "-" + n(st.q, 3) + "\\cdot0{,}13=" + n(st.thSi, 2) + "\\,^\\circ\\mathrm{C}$$\nThen subtract $\\dot q\\cdot R$ layer by layer: $\\theta_n=\\theta_{n-1}-\\dot q\\,R_n$ → after layer " + k + ": **" + f(st.th[k], 2) + " °C**." };
  });
  add("sanierung", 2, "Sanierung: neuer U-Wert / Dämmstärke / λ", r => {
    const variant = pick(["fwd", "d", "lam"], r), Ua = pick([0.55, 0.66, 0.76, 0.8, 1.0, 1.35, 1.6], r);
    if (variant === "fwd") {
      const d = pick([8, 10, 12, 14, 16, 20], r), lam = pick([0.031, 0.035, 0.04, 0.042, 0.06], r), Un = 1 / (1 / Ua + d / 100 / lam);
      return { prompt: "Ein Bestandsbauteil hat U_alt = " + f(Ua, 2) + " W/m²K. Es wird zusätzlich mit " + d + " cm Wärmedämmung (λ = " + f(lam, 3) + " W/mK) gedämmt. Wie groß ist der neue U-Wert?", fields: [F("u", "U_neu", "W/m²K", Un)],
        steps: "$$R_{alt}=\\frac{1}{U_{alt}}=" + n(1 / Ua, 3) + ",\\quad R_{WD}=\\frac{d}{\\lambda}=" + n(d / 100 / lam, 3) + "\\quad\\Rightarrow\\quad U_{neu}=\\frac{1}{R_{alt}+R_{WD}}=" + n(Un, 3) + "\\ \\mathrm{W/m^2K}$$" };
    }
    if (variant === "d") {
      const lam = pick([0.031, 0.035, 0.04, 0.06], r), Un = pick([0.2, 0.22, 0.25, 0.3, 0.35], r), d = (1 / Un - 1 / Ua) * lam * 100;
      return { prompt: "U_alt = " + f(Ua, 2) + " W/m²K. Welche Dämmstärke (λ = " + f(lam, 3) + " W/mK) ist nötig, um U_neu = " + f(Un, 2) + " W/m²K zu erreichen? (in cm)", fields: [F("d", "d", "cm", d)],
        steps: "$$d=\\lambda\\left(\\frac{1}{U_{neu}}-\\frac{1}{U_{alt}}\\right)=" + n(lam, 3) + "\\left(" + n(1 / Un, 3) + "-" + n(1 / Ua, 3) + "\\right)=" + n(d / 100, 4) + "\\ \\mathrm{m}=" + n(d, 1) + "\\ \\mathrm{cm}$$" };
    }
    const d = pick([10, 12, 16], r), Un = pick([0.2, 0.25, 0.3, 0.35], r), lam = (d / 100) / (1 / Un - 1 / Ua);
    if (!(lam > 0)) return G[2].make(r);
    return { prompt: "U_alt = " + f(Ua, 2) + " W/m²K; nach dem Aufbringen von " + d + " cm Dämmstoff gilt U_neu = " + f(Un, 2) + " W/m²K. Welche Wärmeleitfähigkeit λ hat der Dämmstoff?", fields: [F("lam", "λ", "W/mK", lam)],
      steps: "$$\\lambda=\\frac{d}{R_{neu}-R_{alt}}=\\frac{" + n(d / 100, 2) + "}{" + n(1 / Un, 3) + "-" + n(1 / Ua, 3) + "}=" + n(lam, 4) + "\\ \\mathrm{W/mK}$$" };
  });
  add("u-grenze", 2, "Theoretischer Maximal-U-Wert", r => {
    const [rsi, dir] = pick([[0.13, "horizontal"], [0.10, "aufwärts"], [0.17, "abwärts"]], r), umax = 1 / (rsi + 0.04);
    return { prompt: "Ist ein U-Wert von 10 W/m²K möglich? Berechnen Sie den größtmöglichen U-Wert eines (beliebig dünnen) Bauteils bei " + dir + " gerichtetem Wärmestrom (R_si = " + f(rsi, 2) + ", R_se = 0,04 m²K/W).", fields: [F("u", "U_max", "W/m²K", umax)],
      steps: "Even with zero layer resistance the surfaces limit the heat flow: $$U_{max}=\\frac{1}{R_{si}+R_{se}}=\\frac{1}{" + n(rsi, 2) + "+0{,}04}=" + n(umax, 3) + "\\ \\mathrm{W/m^2K}$$ So 10 W/m²K is not possible (lecturer's favourite trap)." };
  });
  add("um-wand", 2, "Flächengewichteter mittlerer U-Wert", r => {
    const w = pick([5, 6, 8], r), hgt = 3, A = w * hgt, nW = TP.rint(1, 2, r), aW = pick([1.5, 2, 3], r), aD = pick([0, 2], r), Uw = pick([0.2, 0.25, 0.35], r), Uf = pick([1.1, 1.3, 1.4], r), Ud = 1.7;
    const Aw = A - nW * aW - aD, Am = (Aw * Uw + nW * aW * Uf + aD * Ud) / A;
    return { prompt: "Ein Wandelement " + w + " m × " + hgt + " m enthält " + nW + " Fenster zu je " + f(aW, 1) + " m² (U = " + f(Uf, 2) + " W/m²K)" + (aD ? " und eine Tür mit " + aD + " m² (U = 1,70 W/m²K)" : "") + ". Die Wand hat U = " + f(Uw, 2) + " W/m²K. Berechnen Sie den mittleren U-Wert U_m und den Leitwert H_T des Elements.",
      fields: [F("um", "U_m", "W/m²K", Am), F("ht", "H_T", "W/K", Am * A)],
      steps: "$$A_{Wand}=" + n(A, 1) + "-" + n(nW * aW + aD, 1) + "=" + n(Aw, 1) + "\\ \\mathrm{m^2}$$\n$$U_m=\\frac{\\sum A_iU_i}{\\sum A_i}=\\frac{" + n(Aw, 1) + "\\cdot" + n(Uw, 2) + "+" + n(nW * aW, 1) + "\\cdot" + n(Uf, 2) + (aD ? "+" + n(aD, 1) + "\\cdot1{,}7" : "") + "}{" + n(A, 1) + "}=" + n(Am, 3) + "\\ \\mathrm{W/m^2K},\\qquad H_T=U_mA=" + n(Am * A, 2) + "\\ \\mathrm{W/K}$$" };
  });

  /* ---- M03 ---- */
  add("fenster-uw", 3, "Fenster-U-Wert U_w", r => {
    const w = pick([1.2, 1.5, 1.8], r), hgt = pick([1.2, 1.5, 2.0], r), b = pick([0.1, 0.12, 0.13, 0.15], r), Ug = pick([0.6, 0.7, 1.0, 1.1], r), Uf = pick([1.0, 1.3, 1.6], r), psi = pick([0.03, 0.04, 0.06, 0.08], r);
    const Ag = (w - 2 * b) * (hgt - 2 * b), Af = w * hgt - Ag, lg = 2 * (w - 2 * b) + 2 * (hgt - 2 * b), Uw = P.Uw(Ag, Ug, Af, Uf, lg, psi);
    return { prompt: "Fenster " + f(w, 2) + " m × " + f(hgt, 2) + " m, Rahmenbreite " + f(b * 100, 0) + " cm rundum. U_g = " + f(Ug, 2) + ", U_f = " + f(Uf, 2) + " W/m²K, ψ_g = " + f(psi, 2) + " W/mK. Berechnen Sie U_w.",
      fields: [F("ag", "A_g", "m²", Ag), F("uw", "U_w", "W/m²K", Uw)],
      steps: "$$A_g=(" + n(w, 2) + "-2\\cdot" + n(b, 2) + ")(" + n(hgt, 2) + "-2\\cdot" + n(b, 2) + ")=" + n(Ag, 3) + ",\\quad A_f=" + n(w * hgt, 3) + "-" + n(Ag, 3) + "=" + n(Af, 3) + ",\\quad l_g=" + n(lg, 2) + "\\ \\mathrm{m}$$\n$$U_w=\\frac{A_gU_g+A_fU_f+l_g\\psi_g}{A_g+A_f}=\\frac{" + n(Ag * Ug, 3) + "+" + n(Af * Uf, 3) + "+" + n(lg * psi, 3) + "}{" + n(w * hgt, 3) + "}=" + n(Uw, 3) + "\\ \\mathrm{W/m^2K}$$" };
  });
  add("frsi", 3, "Temperaturfaktor f_Rsi", r => {
    const ti = 20, te = pick([-10, -12, -13, -5], r), thsi = rstep(10, 18.5, 0.1, r), fr = (thsi - te) / (ti - te);
    if (r() < 0.5) return { prompt: "Raumtemperatur " + ti + " °C, Außentemperatur " + te + " °C. An einer Wärmebrücke wird eine minimale Oberflächentemperatur von " + f(thsi, 1) + " °C berechnet. Wie groß ist f_Rsi? Besteht Schimmelgefahr (Grenzwert 0,71) oder Kondensatgefahr (0,69)?",
      fields: [F("f", "f_Rsi", "–", fr, 0, 0.004)], steps: "$$f_{Rsi}=\\frac{\\theta_{si,min}-\\theta_e}{\\theta_i-\\theta_e}=\\frac{" + n(thsi, 1) + "-(" + n(te, 0) + ")}{" + n(ti, 0) + "-(" + n(te, 0) + ")}=" + n(fr, 3) + "$$\n" + (fr >= 0.71 ? "f_Rsi ≥ 0,71 → no mould risk." : fr >= 0.69 ? "0,69 ≤ f_Rsi < 0,71 → no condensation, but mould risk." : "f_Rsi < 0,69 → condensation and mould risk.") };
    const need = te + 0.71 * (ti - te);
    return { prompt: "Raumtemperatur " + ti + " °C, Außentemperatur " + te + " °C. Wie hoch muss die niedrigste Oberflächentemperatur θ_si,min mindestens sein, damit f_Rsi ≥ 0,71 (Schimmel) erfüllt ist?", fields: [F("t", "θ_si,min", "°C", need, 0, 0.1)],
      steps: "$$\\theta_{si,min}=\\theta_e+f_{Rsi}\\,(\\theta_i-\\theta_e)=" + n(te, 0) + "+0{,}71\\cdot" + n(ti - te, 0) + "=" + n(need, 2) + "\\,^\\circ\\mathrm{C}$$" };
  });
  add("psi-wert", 3, "Wärmebrücke: L₂D und ψ", r => {
    const dT = pick([20, 25, 30], r), U1 = pick([0.2, 0.25, 0.35], r), l1 = pick([1.2, 1.5, 2.0], r), U2 = pick([0.2, 0.3, 0.8], r), l2 = pick([0.8, 1.0, 1.5], r), psi = pick([-0.05, 0.05, 0.1, 0.15, 0.3], r);
    const L2D = U1 * l1 + U2 * l2 + psi, Q = L2D * dT;
    return { prompt: "Eine zweidimensionale Berechnung einer Gebäudeecke ergibt einen Wärmestrom von " + f(Q, 2) + " W je Meter bei Δθ = " + dT + " K. Die angrenzenden Regelbauteile haben U₁ = " + f(U1, 2) + " W/m²K auf l₁ = " + f(l1, 1) + " m und U₂ = " + f(U2, 2) + " W/m²K auf l₂ = " + f(l2, 1) + " m. Berechnen Sie L₂D und den Wärmebrückenverlustkoeffizienten ψ.",
      fields: [F("l2d", "L₂D", "W/mK", L2D, 0.02, 0.003), F("psi", "ψ", "W/mK", psi, 0.1, 0.012)],
      steps: "$$L_{2D}=\\frac{\\dot Q}{\\theta_i-\\theta_e}=\\frac{" + n(Q, 2) + "}{" + n(dT, 0) + "}=" + n(L2D, 3) + "\\ \\mathrm{W/mK},\\qquad \\psi=L_{2D}-\\sum U_il_i=" + n(L2D, 3) + "-(" + n(U1 * l1, 3) + "+" + n(U2 * l2, 3) + ")=" + n(psi, 3) + "\\ \\mathrm{W/mK}$$" + (psi < 0 ? "\nA negative ψ is a dimensioning artifact (outer-dimension convention) — in practice set to 0." : "") };
  });

  /* ---- M04 ---- */
  const SOL = ["holz", "beton", "eps", "stahl", "kupfer", "kork", "glas", "ziegel", "mw", "teppich"];
  add("kontakt", 4, "Kontakttemperatur", r => {
    const id = pick(SOL, r), m = P.MAT[id], bh = 1000, th = pick([33, 34, 35], r), tb = pick([18, 20, 22], r), b = P.b(m.lam, m.rho, m.c), tc = P.contact(bh, th, b, tb);
    return { prompt: "Eine Hand (b = 1000 Ws½/m²K, " + th + " °C) berührt " + m.name + " (λ = " + f(m.lam, 3) + " W/mK, ρ = " + f(m.rho, 0) + " kg/m³, c = " + f(m.c, 0) + " J/kgK) mit " + tb + " °C. Berechnen Sie den Wärmeeindringkoeffizienten b des Materials und die Kontakttemperatur θ_c.",
      fields: [F("b", "b", "Ws½/(m²K)", b), F("tc", "θ_c", "°C", tc, 0, 0.15)],
      steps: "$$b=\\sqrt{\\lambda\\rho c}=\\sqrt{" + n(m.lam, 3) + "\\cdot" + n(m.rho, 0) + "\\cdot" + n(m.c, 0) + "}=" + n(b, 0) + "$$\n$$\\theta_c=\\frac{b_1\\theta_1+b_2\\theta_2}{b_1+b_2}=\\frac{1000\\cdot" + n(th, 0) + "+" + n(b, 0) + "\\cdot" + n(tb, 0) + "}{1000+" + n(b, 0) + "}=" + n(tc, 2) + "\\,^\\circ\\mathrm{C}$$" };
  });
  add("diffusivitaet", 4, "Temperaturleitfähigkeit a", r => {
    const [i1, i2] = TP.shuffle(["holz", "beton", "eps", "stahl", "mw", "ziegel"], r).slice(0, 2), m1 = P.MAT[i1], m2 = P.MAT[i2], a1 = P.a(m1.lam, m1.rho, m1.c), a2 = P.a(m2.lam, m2.rho, m2.c);
    const row = m => [m.name, f(m.lam, 3), f(m.rho, 0), f(m.c, 0)];
    return { prompt: "Berechnen Sie die Temperaturleitfähigkeit a = λ/(ρ·c) der beiden Materialien (Ergebnis in 10⁻⁶ m²/s). Welches Material reagiert schneller auf eine Temperaturänderung?\n\n" + tbl(["Material", "λ [W/mK]", "ρ [kg/m³]", "c [J/kgK]"], [row(m1), row(m2)]),
      fields: [F("a1", "a (" + m1.name + ")", "10⁻⁶ m²/s", a1 * 1e6), F("a2", "a (" + m2.name + ")", "10⁻⁶ m²/s", a2 * 1e6)],
      steps: "$$a_1=\\frac{" + n(m1.lam, 3) + "}{" + n(m1.rho, 0) + "\\cdot" + n(m1.c, 0) + "}=" + n(a1 * 1e6, 3) + "\\cdot10^{-6},\\qquad a_2=\\frac{" + n(m2.lam, 3) + "}{" + n(m2.rho, 0) + "\\cdot" + n(m2.c, 0) + "}=" + n(a2 * 1e6, 3) + "\\cdot10^{-6}\\ \\mathrm{m^2/s}$$\n**" + (a1 > a2 ? m1.name : m2.name) + "** reacts faster (larger a) — a low λ alone does not mean a slow response (low ρ·c!)." };
  });

  /* ---- M05 ---- */
  add("oberflaeche", 5, "Oberflächenkondensat: θ_si und φ_krit", r => {
    const U = pick([0.5, 0.6, 0.8, 1.0, 1.2, 1.5], r), ti = pick([20, 22], r), te = pick([-10, -12, -15], r), thsi = ti - U * 0.13 * (ti - te), phi = P.phiCritLecture(ti, thsi);
    return { prompt: "Ein Bauteil hat U = " + f(U, 2) + " W/m²K (R_si = 0,13 m²K/W), innen " + ti + " °C, außen " + te + " °C. Bei welcher relativen Luftfeuchtigkeit beginnt auf der nicht-hygroskopischen Oberfläche Kondensat? (Θ_S = φ^(1/8)·(110+θ_i) − 110)",
      fields: [F("tsi", "θ_si", "°C", thsi, 0, 0.1), F("phi", "φ_krit", "%", phi * 100, 0.012)],
      steps: "$$\\theta_{si}=\\theta_i-U\\,R_{si}(\\theta_i-\\theta_e)=" + n(ti, 0) + "-" + n(U, 2) + "\\cdot0{,}13\\cdot" + n(ti - te, 0) + "=" + n(thsi, 2) + "\\,^\\circ\\mathrm{C}$$\nSet $\\Theta_S=\\theta_{si}$ and solve for φ: $$\\varphi=\\left(\\frac{\\theta_{si}+110}{110+\\theta_i}\\right)^8=\\left(\\frac{" + n(thsi + 110, 2) + "}{" + n(110 + ti, 0) + "}\\right)^8=" + n(phi, 4) + "\\ \\Rightarrow\\ " + n(phi * 100, 2) + "\\,\\%$$" };
  });
  add("taupunkt", 5, "Taupunkt & Dampfdruck der Raumluft", r => {
    const t = pick([20, 21, 22, 24, 26, 28], r), phi = pick([0.4, 0.5, 0.55, 0.6, 0.65, 0.75], r), ts = P.dewT(phi, t), p = phi * P.ps(t);
    return { prompt: "Raumluft mit " + t + " °C und " + f(phi * 100, 0) + " % relativer Feuchte. Berechnen Sie die Taupunkttemperatur Θ_S (Formelsammlung) und den Wasserdampfpartialdruck p (p_S aus Magnus-Formel oder Tabelle).",
      fields: [F("ts", "Θ_S", "°C", ts, 0, 0.2), F("p", "p", "Pa", p, 0.02)],
      steps: "$$\\Theta_S=\\varphi^{1/8}(110+\\theta_L)-110=" + n(phi, 2) + "^{1/8}\\cdot" + n(110 + t, 0) + "-110=" + n(ts, 2) + "\\,^\\circ\\mathrm{C}$$\n$$p=\\varphi\\,p_S(\\theta_L)=" + n(phi, 2) + "\\cdot" + n(P.ps(t), 0) + "=" + n(p, 0) + "\\ \\mathrm{Pa}$$" };
  });
  add("sd-wert", 5, "s_d-Wert eines Aufbaus", r => {
    const L = randWall(r), tot = L.reduce((s, l) => s + l.d * P.MAT[l.id].mu, 0);
    return { prompt: "Berechnen Sie die diffusionsäquivalente Luftschichtdicke s_d = µ·d für jede Schicht und die Summe Σ s_d.\n\n" + tbl(["Schicht", "d [cm]", "µ [–]"], L.map(l => [MATN(l.id), f(l.d * 100, 1), f(P.MAT[l.id].mu, 0)])),
      fields: [F("sd", "Σ s_d", "m", tot)], steps: "$$s_{d}=\\mu\\cdot d:\\ " + L.map((l, i) => n(P.MAT[l.id].mu, 0) + "\\cdot" + n(l.d, 3) + "=" + n(l.d * P.MAT[l.id].mu, 3)).join(",\\ ") + "\\ \\Rightarrow\\ \\sum s_d=" + n(tot, 3) + "\\ \\mathrm{m}$$" };
  });

  /* ---- M06 ---- */
  add("kondensat", 6, "Tauwassermenge G_K und Austrocknung G_A", r => {
    const sde = rstep(1.5, 3.5, 0.05, r), sda = rstep(1.0, 2.5, 0.05, r), pi = pick([1170, 1287, 1350, 1450], r), pe = pick([208, 230, 260], r), pst = rstep(250, 600, 10, r);
    const pdS = pick([1228, 1402, 1706], r), phid = pick([0.7, 0.8], r), D = P.DELTA;
    const mT = (pi - pst) / (D * sde) - (pst - pe) / (D * sda), GK = 1440 * mT, mA = (pdS - phid * pdS) / (D * sde) + (pdS - phid * pdS) / (D * sda), GA = 2160 * mA;
    return { prompt: "Im Glaserdiagramm wurde der Taupunkt bestimmt: s_d,e = " + f(sde, 2) + " m (Eingang bis Taupunkt), s_d,a = " + f(sda, 2) + " m (Taupunkt bis Ausgang). Tauperiode (1440 h): p_i = " + pi + " Pa, p_S(Taupunkt) = " + f(pst, 0) + " Pa, p_e = " + pe + " Pa. Trockenperiode (2160 h, beidseitig gleiche Bedingungen): p_S(Taupunkt) = " + pdS + " Pa, beide Oberflächen " + f(phid * 100, 0) + " % r.F. Berechnen Sie ṁ_T (in 10⁻⁴ kg/m²h), G_K, G_A und prüfen Sie die vollständige Austrocknung (G_A/G_K).",
      fields: [F("mt", "ṁ_T", "10⁻⁴ kg/m²h", mT * 1e4, 0.02), F("gk", "G_K", "kg/m²", GK, 0.02), F("ga", "G_A", "kg/m²", GA, 0.02), F("ratio", "G_A / G_K", "–", GA / GK, 0.03)],
      steps: "$$\\dot m_T=\\frac{" + n(pi - pst, 0) + "}{1{,}5\\cdot10^6\\cdot" + n(sde, 2) + "}-\\frac{" + n(pst - pe, 0) + "}{1{,}5\\cdot10^6\\cdot" + n(sda, 2) + "}=" + n(mT * 1e4, 3) + "\\cdot10^{-4},\\qquad G_K=1440\\,\\dot m_T=" + n(GK, 3) + "\\ \\mathrm{kg/m^2}$$\n$$\\dot m_A=\\frac{" + n(pdS - phid * pdS, 0) + "}{1{,}5\\cdot10^6\\cdot" + n(sde, 2) + "}+\\frac{" + n(pdS - phid * pdS, 0) + "}{1{,}5\\cdot10^6\\cdot" + n(sda, 2) + "}=" + n(mA * 1e4, 3) + "\\cdot10^{-4},\\qquad G_A=2160\\,\\dot m_A=" + n(GA, 3) + "\\ \\mathrm{kg/m^2}$$\n$$\\frac{G_A}{G_K}=" + n(GA / GK, 2) + (GA > GK ? "\\ >1\\ \\Rightarrow\\ \\text{vollständige Austrocknung}" : "\\ <1\\ \\Rightarrow\\ \\text{keine vollständige Austrocknung}") + "$$" };
  });

  /* ---- M07 / M08 ---- */
  add("hgt", 8, "Heizgradtage HGT 20/12", r => {
    const N = 8, ts = []; for (let i = 0; i < N; i++) ts.push(rstep(2, 17, 1, r));
    const ht = ts.filter(t => t < 12), hgt = ht.reduce((s, t) => s + (20 - t), 0);
    return { prompt: "Mittlere Tagestemperaturen (°C) von " + N + " Tagen im Herbst: " + ts.join(", ") + ". Wie viele Heiztage (θ_e < 12 °C) gibt es, und wie groß sind die Heizgradtage HGT₂₀/₁₂?", fields: [F("ht", "Heiztage HT", "Tage", ht.length, 0, 0.01), F("hgt", "HGT₂₀/₁₂", "Kd", hgt, 0, 0.01)],
      steps: "Only days with $\\bar\\theta_e<12$ °C count (the 12 °C Heizgrenze accounts for free solar/internal gains). Contributions $(20-\\bar\\theta_e)$: " + ht.map(t => 20 - t).join(" + ") + " = **" + hgt + " Kd** over **" + ht.length + "** days." };
  });
  add("lueftung", 7, "Lüftungswärmeverlust", r => {
    const a = pick([4, 5, 6], r), b = pick([4, 5, 6], r), hgt = pick([2.5, 3], r), nL = pick([0.4, 0.5, 0.6, 0.8], r), ti = 22, te = pick([-1.1, -5, -10], r), V = a * b * hgt, HV = 0.34 * nL * V, Phi = HV * (ti - te);
    return { prompt: "Raum " + a + " m × " + b + " m × " + f(hgt, 1) + " m, Luftwechsel n = " + f(nL, 1) + " h⁻¹, θ_i = " + ti + " °C, θ_e = " + f(te, 1) + " °C (ρ_a·c_a vereinfacht: H_V = 0,34·n·V). Berechnen Sie H_V und den Lüftungswärmestrom Φ_V.",
      fields: [F("hv", "H_V", "W/K", HV), F("phi", "Φ_V", "W", Phi)], steps: "$$V=" + n(V, 1) + "\\ \\mathrm{m^3},\\quad H_V=0{,}34\\,n\\,V=0{,}34\\cdot" + n(nL, 1) + "\\cdot" + n(V, 1) + "=" + n(HV, 1) + "\\ \\mathrm{W/K},\\quad \\Phi_V=H_V(\\theta_i-\\theta_e)=" + n(HV, 1) + "\\cdot" + n(ti - te, 1) + "=" + n(Phi, 0) + "\\ \\mathrm{W}$$" };
  });
  add("kompakt", 7, "Kompaktheit l_c = V/A", r => {
    const a = pick([6, 8, 10, 12], r), b = pick([6, 8, 10], r), c = pick([3, 6, 9], r), V = a * b * c, A = 2 * (a * b + a * c + b * c), lc = V / A, cube = Math.cbrt(V) / 6;
    return { prompt: "Ein quaderförmiges Gebäude misst " + a + " m × " + b + " m × " + c + " m (beheiztes Volumen = gesamte Kubatur, Hüllfläche = alle sechs Seiten). Berechnen Sie die Hüllfläche A, die charakteristische Länge l_c = V/A und vergleichen Sie mit einem Würfel gleichen Volumens (l_c = a/6).",
      fields: [F("a", "A", "m²", A), F("lc", "l_c", "m", lc), F("lcc", "l_c Würfel", "m", cube)],
      steps: "$$A=2(ab+ac+bc)=" + n(A, 0) + "\\ \\mathrm{m^2},\\quad l_c=\\frac{V}{A}=\\frac{" + n(V, 0) + "}{" + n(A, 0) + "}=" + n(lc, 3) + "\\ \\mathrm{m};\\qquad \\text{Würfel: } a=" + n(Math.cbrt(V), 2) + "\\ \\mathrm{m},\\ l_c=a/6=" + n(cube, 3) + "\\ \\mathrm{m}$$\nHigher l_c = more compact = lower envelope area per volume = energetically better." };
  });
  add("transmission", 7, "Transmissionswärmeverlust Φ_T", r => {
    const w = pick([6, 8, 10], r), hgt = 3, A = w * hgt, aF = pick([6, 8, 10], r), Uw = pick([0.2, 0.25, 0.35], r), Uf = pick([0.9, 1.1, 1.4], r), ti = 22, te = pick([-1.1, -5, -10], r);
    const HT = (A - aF) * Uw + aF * Uf, Phi = HT * (ti - te);
    return { prompt: "Wandelement " + w + " m × " + hgt + " m mit einem Fenster von " + aF + " m². U_Wand = " + f(Uw, 2) + ", U_Fenster = " + f(Uf, 2) + " W/m²K; θ_i = " + ti + " °C, θ_e = " + f(te, 1) + " °C. Berechnen Sie H_T und Φ_T.",
      fields: [F("ht", "H_T", "W/K", HT), F("phi", "Φ_T", "W", Phi)], steps: "$$H_T=\\sum A_iU_i=" + n(A - aF, 0) + "\\cdot" + n(Uw, 2) + "+" + n(aF, 0) + "\\cdot" + n(Uf, 2) + "=" + n(HT, 2) + "\\ \\mathrm{W/K},\\qquad \\Phi_T=H_T\\,\\Delta\\theta=" + n(HT, 2) + "\\cdot" + n(ti - te, 1) + "=" + n(Phi, 0) + "\\ \\mathrm{W}$$" };
  });

  /* ---- M07 chain: interne Gewinne → Ausnutzungsgrad → Heizwärmebedarf (VO7 Übung 5–7) ---- */
  add("interne", 7, "Interne Gewinne Φ_I (Büro)", r => {
    const np = pick([1, 2, 3], r), pp = pick([80, 100, 120], r), hp = pick([6, 8, 10], r), nc = pick([1, 2, 3], r), pc = pick([100, 150, 200], r), pd = pick([80, 100, 150], r), hd = pick([1, 2], r);
    const a = pick([4, 5, 6], r), b = pick([5, 6, 8], r), q = pick([5, 6, 8], r), A = a * b;
    const PP = np * pp * hp / 24, PA = nc * pc * hp / 24 + pd * hd / 24, PL = q * A, Phi = PP + PA + PL;
    return { prompt: "Büroraum " + a + " m × " + b + " m. " + np + " Person(en) à " + pp + " W, " + hp + " h/Tag anwesend. " + nc + " PC(s) à " + pc + " W, " + hp + " h/Tag in Betrieb. 1 Drucker à " + pd + " W, " + hd + " h/Tag. Beleuchtung " + q + " W/m² (läuft durchgehend, wie im Beispiel der VO). Berechnen Sie die mittleren internen Gewinne Φ_I (Mittelung über 24 h).",
      fields: [F("pp", "P_Personen", "W", PP), F("pa", "P_Geräte", "W", PA), F("pl", "P_Licht", "W", PL), F("phi", "Φ_I", "W", Phi)],
      steps: "$$P_P=\\frac{" + np + "\\cdot" + pp + "\\cdot" + hp + "}{24}=" + n(PP, 1) + ",\\quad P_A=\\frac{" + nc + "\\cdot" + pc + "\\cdot" + hp + "}{24}+\\frac{" + pd + "\\cdot" + hd + "}{24}=" + n(PA, 1) + ",\\quad P_L=" + q + "\\cdot" + A + "=" + n(PL, 0) + "$$\n$$\\Phi_I=P_P+P_A+P_L=" + n(Phi, 1) + "\\ \\mathrm{W}$$\nPersons and devices are averaged over 24 h (hours ÷ 24); the lighting runs at full power all day in the lecture example." };
  });
  add("ausnutz", 7, "Ausnutzungsgrad η_h (τ, a, γ)", r => {
    const HT = pick([8, 10, 12.6, 15, 20, 25], r), HV = pick([10, 15, 20, 25], r), dT = pick([15, 20, 23], r), C = pick([2, 3.16, 4, 6, 10], r);
    const PT = HT * dT, PV = HV * dT; let PS, PI, g;
    do { PS = rstep(100, 1500, 25, r); PI = rstep(100, 500, 10, r); g = (PS + PI) / (PT + PV); } while (Math.abs(g - 1) < 0.12 || g > 3.2);
    const tau = C * 1e6 / (HT + HV) / 3600, a = 1 + tau / 16, eta = (1 - Math.pow(g, a)) / (1 - Math.pow(g, a + 1));
    return { prompt: "Raum mit H_T = " + f(HT, 1) + " W/K, H_V = " + f(HV, 1) + " W/K, Δθ = θ_i − θ_e = " + dT + " K, Wärmekapazität C = " + f(C, 2) + " MJ/K. Solare Gewinne Φ_S = " + PS + " W, interne Gewinne Φ_I = " + PI + " W. Berechnen Sie die Zeitkonstante τ, den Parameter a (a₀ = 1, τ₀ = 16 h), das Gewinn/Verlust-Verhältnis γ_h und den Ausnutzungsgrad η_h.",
      fields: [F("tau", "τ", "h", tau), F("a", "a", "–", a), F("g", "γ_h", "–", g), F("eta", "η_h", "–", eta, 0.025, 0.01)],
      steps: "$$\\Phi_T+\\Phi_V=(" + n(HT, 1) + "+" + n(HV, 1) + ")\\cdot" + dT + "=" + n(PT + PV, 0) + "\\ \\mathrm{W}$$\n$$\\tau=\\frac{C}{H_T+H_V}=\\frac{" + n(C, 2) + "\\cdot10^6}{" + n(HT + HV, 1) + "}=" + n(tau * 3600, 0) + "\\ \\mathrm{s}=" + n(tau, 1) + "\\ \\mathrm{h},\\qquad a=1+\\frac{\\tau}{16}=" + n(a, 2) + "$$\n$$\\gamma_h=\\frac{\\Phi_S+\\Phi_I}{\\Phi_T+\\Phi_V}=\\frac{" + (PS + PI) + "}{" + n(PT + PV, 0) + "}=" + n(g, 2) + ",\\qquad \\eta_h=\\frac{1-\\gamma^{a}}{1-\\gamma^{a+1}}=" + n(eta, 3) + "$$\nExam tip: keep full intermediate values in the calculator; γ^a is very sensitive to rounding." };
  });
  add("energiekz", 7, "Heizwärmebedarf Q_H & Energiekennzahl", r => {
    const PT = rstep(150, 350, 10, r), PV = rstep(100, 300, 10, r), eta = rstep(0.35, 0.9, 0.05, r), PI = rstep(100, 400, 10, r), AE = pick([20, 30, 40, 60], r);
    const mo = pick([["Januar", 31], ["Februar", 28], ["März", 31], ["April", 30], ["Oktober", 31], ["November", 30], ["Dezember", 31]], r);
    const gain = Math.round((PT + PV) * rstep(0.3, 0.95, 0.05, r) / eta / 10) * 10, PS = Math.max(50, gain - PI);
    const br = PT + PV - eta * (PS + PI), dt = mo[1] * 86400, QH = br * dt / 1e6, kwh = QH / 3.6;
    return { prompt: "Raum mit A_E = " + AE + " m². Φ_T = " + PT + " W, Φ_V = " + PV + " W, Φ_S = " + PS + " W, Φ_I = " + PI + " W, Ausnutzungsgrad η_h = " + f(eta, 2) + ". Berechnen Sie den Heizwärmebedarf für den Monat " + mo[0] + " (" + mo[1] + " Tage) in MJ sowie die Energiekennzahl in kWh/m².",
      fields: [F("br", "Klammer [Φ_T+Φ_V−η(Φ_S+Φ_I)]", "W", br, 0.015, 0.5), F("qh", "Q_H", "MJ", QH, 0.02, 0.1), F("ekz", "Q_H / A_E", "kWh/m²", kwh / AE, 0.02, 0.01)],
      steps: "$$Q_H=\\left[\\Phi_T+\\Phi_V-\\eta_h(\\Phi_S+\\Phi_I)\\right]\\Delta t=\\left[" + (PT + PV) + "-" + n(eta, 2) + "\\cdot" + (PS + PI) + "\\right]\\cdot(" + mo[1] + "\\cdot24\\cdot3600)$$\n$$=" + n(br, 1) + "\\ \\mathrm{W}\\cdot" + n(dt, 0) + "\\ \\mathrm{s}=" + n(QH, 1) + "\\ \\mathrm{MJ}=" + n(kwh, 1) + "\\ \\mathrm{kWh},\\qquad \\frac{Q_H}{A_E}=" + n(kwh / AE, 2) + "\\ \\mathrm{kWh/m^2}$$\n1 kWh = 3,6 MJ. Only the **losses** count fully; gains are weighted with η_h. If the bracket were negative, Q_H = 0 (no heating needed)." };
  });
  add("solar-wien", 7, "Solare Gewinne: Fenster & Jahressumme", r => {
    const o = pick([["Süd", 356], ["Ost", 210], ["West", 210], ["Nord", 150]], r), A = pick([3, 4, 6, 8, 10], r), fr = pick([0.1, 0.15, 0.2, 0.25, 0.3], r), g = pick([0.5, 0.55, 0.6, 0.65], r);
    const Phi = A * (1 - fr) * g * o[1];
    return { prompt: "Ein " + o[0] + "-orientiertes, " + A + " m² großes Fenster in einer vertikalen Wand am Standort Wien. Rahmenanteil " + Math.round(fr * 100) + " %, g = " + f(g, 2) + ". Strahlungssummen Wien (kWh/m²a): Süd 356, Ost/West 210, Nord 150, horizontal 368. Berechnen Sie den solaren Wärmegewinn Φ_S (Jahressumme).",
      fields: [F("phi", "Φ_S", "kWh/a", Phi)], steps: "$$\\Phi_S=A\\,F_r\\,g\\,E_{" + o[0][0] + "}=" + A + "\\cdot(1-" + n(fr, 2) + ")\\cdot" + n(g, 2) + "\\cdot" + o[1] + "=" + n(Phi, 0) + "\\ \\mathrm{kWh/a}$$\nF_r = 1 − Rahmenanteil (the glazed share). Pick the radiation sum of the window's orientation." };
  });

  /* ---- M11 Sonne: Sonnenstand & Strahlungskomponenten (VO14) ---- */
  add("sonnenhoehe", 11, "Sonnenhöhe zu Mittag & Schattenlänge", r => {
    const L = pick([["Wien", 48.2], ["Innsbruck", 47.3], ["Graz", 47.1], ["Berlin", 52.5], ["Rom", 41.9]], r), D = pick([["Sommersonnenwende (21. Juni)", 23.45], ["Tag-und-Nacht-Gleiche (21. März / 23. Sept.)", 0], ["Wintersonnenwende (21. Dezember)", -23.45]], r), Hh = pick([6, 9, 12, 15], r);
    const h = 90 - L[1] + D[1], s = Hh / Math.tan(h * Math.PI / 180);
    return { prompt: "Standort " + L[0] + " (φ = " + f(L[1], 1) + "° N). Wie hoch steht die Sonne zu Mittag (12 h Sonnenzeit) am Tag der " + D[0] + " (Deklination δ = " + f(D[1], 2) + "°)? Wie lang ist dann der Schatten eines " + Hh + " m hohen Gebäudes?",
      fields: [F("h", "h_max", "°", h, 0, 0.35), F("s", "Schattenlänge", "m", s, 0.02, 0.1)],
      steps: "$$h_{max}=90^\\circ-\\varphi+\\delta=90-" + n(L[1], 1) + (D[1] < 0 ? "-" : "+") + n(Math.abs(D[1]), 2) + "=" + n(h, 1) + "^\\circ$$\n$$s=\\frac{H}{\\tan h}=\\frac{" + Hh + "}{\\tan " + n(h, 1) + "^\\circ}=" + n(s, 1) + "\\ \\mathrm{m}$$\nThe lecture's Vienna values (≈63° summer, ≈40° equinox, ≈17° winter) are read off a sun-path chart and are rounded — the formula gives slightly different numbers, so a tolerance of 2–3° is normal when reading." };
  });
  add("globalstr", 11, "Direkt-, Diffus- & Globalstrahlung", r => {
    const hh = pick([15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65], r), ctx = pick([["Sommer", "Stadt", 6], ["Sommer", "Land", 4], ["Winter", "Stadt", 4], ["Winter", "Land", 2]], r);
    const E0 = 1390, top = E0 * Math.sin(hh * Math.PI / 180), ES = Math.round(top * (0.85 - 0.06 * ctx[2]) * (0.75 + 0.25 * Math.min(1, hh / 60)) / 10) * 10;
    const EH = (top - ES) / 3, Eg = ES + EH;
    return { prompt: "Sonnenhöhe h = " + hh + "°, E₀ = 1390 W/m². Standort: " + ctx[1] + ", " + ctx[0] + ", Meereshöhe. Aus dem Diagramm für die Direktstrahlung wird E_S,H = " + ES + " W/m² abgelesen. Bestimmen Sie den Trübungsfaktor T, die Diffusstrahlung E_H und die Globalstrahlung E_Glob (jeweils auf die Horizontale).",
      fields: [F("t", "T", "–", ctx[2], 0, 0.01), F("eh", "E_H", "W/m²", EH, 0.02, 2), F("eg", "E_Glob", "W/m²", Eg, 0.015, 2)],
      steps: "Trübungsfaktor (Stadt/Land × Sommer/Winter): Sommer 6 / 4, Winter 4 / 2 → **T = " + ctx[2] + "** (p/p₀ = 1 at sea level).\n$$E_H=\\tfrac13\\left[E_0\\sin h-E_{S,H}\\right]=\\tfrac13\\left[1390\\cdot\\sin" + hh + "^\\circ-" + ES + "\\right]=\\tfrac13\\left[" + n(top, 0) + "-" + ES + "\\right]=" + n(EH, 0) + "\\ \\mathrm{W/m^2}$$\n$$E_{Glob}=E_{S,H}+E_H=" + ES + "+" + n(EH, 0) + "=" + n(Eg, 0) + "\\ \\mathrm{W/m^2}$$\nThe lecturer does this by head: sin 60° ≈ 0,87 → 1390·0,87 ≈ 1200 → minus 600 → ÷ 3 ≈ 200 → global ≈ 800." };
  });

  /* ---- M09 ---- */
  add("operativ", 9, "Operative Temperatur", r => {
    const S = [["Fenster", pick([2, 4, 6], r), rstep(8, 14, 1, r)], ["Außenwand", pick([14, 20, 24], r), rstep(14, 17, 1, r)], ["Innenwände", pick([40, 56], r), rstep(20, 22, 1, r)], ["Decke", pick([20, 24], r), rstep(18, 20, 1, r)], ["Fußboden", pick([20, 24], r), rstep(20, 24, 1, r)]];
    const At = S.reduce((s, x) => s + x[1], 0), tr = S.reduce((s, x) => s + x[1] * x[2], 0) / At, tl = pick([19, 20, 21, 22], r), top = (tl + tr) / 2;
    return { prompt: "Ein Raum hat die folgenden Umschließungsflächen. Die Lufttemperatur beträgt " + tl + " °C. Berechnen Sie die mittlere Strahlungstemperatur θ̄_r und die operative Temperatur θ_op.\n\n" + tbl(["Fläche", "A [m²]", "θ_s [°C]"], S.map(x => [x[0], f(x[1], 0), f(x[2], 0)])),
      fields: [F("tr", "θ̄_r", "°C", tr, 0, 0.1), F("top", "θ_op", "°C", top, 0, 0.1)],
      steps: "$$\\bar\\theta_r=\\frac{\\sum A_i\\theta_{s,i}}{\\sum A_i}=\\frac{" + S.map(x => x[1] + "\\cdot" + x[2]).join("+") + "}{" + At + "}=" + n(tr, 2) + "\\,^\\circ\\mathrm{C},\\qquad \\theta_{op}\\approx\\frac{\\theta_L+\\bar\\theta_r}{2}=" + n(top, 2) + "\\,^\\circ\\mathrm{C}$$" };
  });
  add("adaptiv", 9, "Adaptiver Komfort", r => {
    const trm = rstep(5, 25, 1, r), tc = 0.31 * trm + 17.8;
    return { prompt: "Natürlich belüftetes Gebäude, gleitendes Mittel der Außentemperatur T_rm = " + f(trm, 0) + " °C. Berechnen Sie die adaptive Komforttemperatur nach VO6 (T = 0,31·T_rm + 17,8). Gilt das Modell auch für ein klimatisiertes Gebäude?",
      fields: [F("tc", "T_komfort", "°C", tc, 0, 0.1)], steps: "$$T_{comfort}=0{,}31\\cdot" + n(trm, 0) + "+17{,}8=" + n(tc, 2) + "\\,^\\circ\\mathrm{C}$$\nNo: the adaptive model is valid **only for naturally ventilated** buildings; HVAC buildings use the classical PMV/PPD bands." };
  });

  /* ---- M11 / M12 ---- */
  add("sommer", 11, "Grenzwert sommerlicher Wärmeschutz", r => {
    const t = rstep(12, 24, 0.5, r), lim = t / 3 + 21.8;
    return { prompt: "Sommerlicher Wärmeschutz nach OIB-RL 6 (ÖNORM B 8110-3, Nachweis 4.9.1a): Die mittlere Außentemperatur der letzten 13 Tage beträgt T_NAT,13 = " + f(t, 1) + " °C. Wie hoch darf die operative Temperatur im Raum höchstens sein?",
      fields: [F("lim", "θ_op,max", "°C", lim, 0, 0.1)], steps: "$$\\theta_{op}\\le\\frac13T_{NAT,13}+21{,}8=\\frac13\\cdot" + n(t, 1) + "+21{,}8=" + n(lim, 2) + "\\,^\\circ\\mathrm{C}$$" };
  });
  add("solar", 11, "Solare Gewinne durch ein Fenster", r => {
    const A = rstep(2, 8, 0.5, r), Fr = pick([0.65, 0.7, 0.75], r), g = pick([0.5, 0.55, 0.6, 0.65], r), E = pick([100, 150, 250, 400, 600], r), Phi = A * Fr * g * E, gw = 0.9 * g;
    return { prompt: "Ein Fenster mit " + f(A, 1) + " m² Rohbaufläche, Rahmenanteil-Faktor F_r = " + f(Fr, 2) + " und g = " + f(g, 2) + " wird von E = " + E + " W/m² getroffen. Berechnen Sie den solaren Wärmestrom Φ_S und den wirksamen g-Wert g_w ≈ 0,9·g (vereinfachtes Jahresverfahren).",
      fields: [F("phi", "Φ_S", "W", Phi), F("gw", "g_w", "–", gw, 0.02)], steps: "$$\\Phi_S=A\\,F_r\\,g\\,E=" + n(A, 1) + "\\cdot" + n(Fr, 2) + "\\cdot" + n(g, 2) + "\\cdot" + n(E, 0) + "=" + n(Phi, 0) + "\\ \\mathrm{W},\\qquad g_w\\approx0{,}9\\,g=" + n(gw, 3) + "$$\nExam warning: multiply each radiation value by its orientation's area first, **then** sum." };
  });
  add("oi3", 12, "OI3 eines Bauteils", r => {
    const rho = pick([1800, 2000, 2400, 2500], r), d = pick([0.02, 0.025, 0.1, 0.25], r), gwp = pick([0.09, 0.115, 0.155, 0.2], r), ap = pick([0.0002, 0.0003, 0.000359, 0.0005], r), pec = pick([0.68, 0.9, 1.36, 1.8], r);
    const m = rho * d, G = m * gwp, A = m * ap, E = m * pec, oG = (G + 50) / 2, oA = 400 * (A - 0.21), oE = (E - 500) / 10 * 1, oK = (oG + oA + oE) / 3;
    return { prompt: "Eine Schicht (d = " + f(d * 100, 1) + " cm, ρ = " + rho + " kg/m³) hat die Kennwerte GWP = " + gwp + " kg CO₂-Äqu./kg, AP = " + String(ap).replace(".", ",") + " kg SO₂-Äqu./kg und PECnr = " + f(pec, 2) + " MJ/kg. Berechnen Sie die flächenbezogene Masse, die drei Rohgrößen je m² und OI_GWP, OI_AP, OI_PECnr sowie OI3_KON (OI_GWP = ½(x+50), OI_AP = 400(x−0,21), OI_PECnr = (x−500)/10).",
      fields: [F("oig", "OI_GWP", "–", oG, 0.015, 0.05), F("oia", "OI_AP", "–", oA, 0.02, 0.3), F("oie", "OI_PECnr", "–", oE, 0.02, 0.1), F("oik", "OI3_KON", "–", oK, 0.02, 0.15)],
      steps: "$$m''=\\rho d=" + n(m, 1) + "\\ \\mathrm{kg/m^2},\\quad GWP=" + n(G, 2) + ",\\ AP=" + n(A, 5) + ",\\ PEC_{nr}=" + n(E, 1) + "$$\n$$OI_{GWP}=\\tfrac12(" + n(G, 2) + "+50)=" + n(oG, 2) + ",\\quad OI_{AP}=400(" + n(A, 5) + "-0{,}21)=" + n(oA, 2) + ",\\quad OI_{PEC}=\\tfrac1{10}(" + n(E, 1) + "-500)=" + n(oE, 2) + "$$\n$$OI3_{KON}=\\tfrac13(OI_{GWP}+OI_{AP}+OI_{PEC})=" + n(oK, 2) + "$$" };
  });

  TP.GENS = G;
  TP.gen = id => G.find(g => g.id === id);
  /* make a task from a generator with a reproducible seed */
  TP.makeTask = function (g, seed) { seed = seed || (Math.random() * 4294967295) >>> 0; const t = g.make(TP.rng(seed)); t.seed = seed; t.gen = g.id; t.title = g.title; t.mod = g.mod; return t; };
})(window.TP);
