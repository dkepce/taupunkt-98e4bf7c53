/* Bauphysik — building-physics core. Pure functions, no DOM. Numbers follow the course (Formelsammlung SS2025). */
(function (root) {
  const TP = (root.TP = root.TP || {});
  const P = (TP.phys = {});

  /* ---------- materials: λ [W/mK], μ [-], ρ [kg/m³], c [J/kgK] ----------
     Values taken from the lecture/exam examples where they exist; otherwise typical catalogue values.
     kind drives the colour/hatch in drawings. wood = true marks timber (no condensate allowed). */
  const M = (id, name, lam, mu, rho, c, kind, extra) => Object.assign({ id, name, lam, mu, rho, c, kind }, extra || {});
  P.MATS = [
    M("gkb", "Gipskartonplatte", 0.24, 5, 900, 1000, "board"),
    M("iputz", "Innenputz (Kalk-Gips)", 0.5, 5, 1300, 1000, "plaster"),
    M("aputz", "Außenputz (Kalk-Zement)", 0.3, 5, 1800, 1000, "plaster"),
    M("putzsys", "Putzsystem (Kunstharz, dicht)", 1.5, 50, 1800, 1000, "plaster"),
    M("ziegel", "Mauerziegel (Hochlochziegel)", 0.7, 10, 1200, 1000, "masonry"),
    M("vollziegel", "Vollziegel", 0.9, 10, 1800, 900, "masonry"),
    M("beton", "Stahlbeton", 2.5, 250, 2400, 1000, "concrete"),
    M("betonn", "Beton (Normalbeton)", 2.0, 80, 2300, 1000, "concrete"),
    M("porenbeton", "Porenbeton", 0.11, 8, 400, 1000, "masonry"),
    M("eps", "Wärmedämmung EPS", 0.04, 20, 20, 1450, "insul"),
    M("xps", "Wärmedämmung XPS", 0.035, 100, 30, 1450, "insul"),
    M("mw", "Mineralwolle (Dämmstoff)", 0.04, 1, 40, 1030, "insul"),
    M("mwi", "Mineralwolle (Installationsebene)", 0.031, 1, 40, 1030, "insul"),
    M("wd", "Wärmedämmung (Hauptdämmung)", 0.05, 3, 100, 1000, "insul"),
    M("zellulose", "Zellulose-Dämmung", 0.04, 2, 50, 2000, "insul", { wood: false }),
    M("holzfaser", "Holzfaser-Dämmplatte", 0.04, 5, 160, 2100, "insul"),
    M("osb", "OSB-Platte", 0.17, 15, 650, 1700, "wood", { wood: true }),
    M("span", "Spanplatte", 0.13, 50, 650, 1700, "wood", { wood: true }),
    M("spanv100", "Spanplatte V100", 0.13, 100, 700, 1700, "wood", { wood: true }),
    M("holz", "Holz (Fichte)", 0.13, 40, 450, 1600, "wood", { wood: true }),
    M("putztr", "Putzträgerplatte", 0.08, 3, 300, 1000, "board"),
    M("dbremse", "Dampfbremse (s_d ≈ 5 m)", 0.2, 10000, 900, 1500, "barrier"),
    M("dsperre", "Dampfsperre (s_d ≈ 100 m)", 0.2, 200000, 900, 1500, "barrier"),
    M("glas", "Glas", 1.0, 1e9, 2500, 750, "glass"),
    M("stahl", "Stahl", 50, 1e9, 7800, 450, "metal"),
    M("kupfer", "Kupfer", 380, 1e9, 8900, 390, "metal"),
    M("kork", "Kork", 0.045, 8, 120, 1700, "insul"),
    M("teppich", "Teppich", 0.06, 5, 200, 1300, "plaster"),
    M("estrich", "Zementestrich", 1.4, 50, 2000, 1000, "concrete"),
  ];
  P.MAT = Object.fromEntries(P.MATS.map(m => [m.id, m]));
  P.barrierThickness = { dbremse: 0.0005, dsperre: 0.0005 };

  /* surface resistances (Energieberechnung): [aufwärts, horizontal, abwärts] */
  P.RSI = { horizontal: 0.13, up: 0.10, down: 0.17 };
  P.RSE = 0.04;

  /* ---------- saturation vapour pressure (Magnus, Formelsammlung §7) [Pa] ---------- */
  P.ps = function (t) {
    if (t >= 0) return 288.68 * Math.pow(1.098 + t / 100, 8.02);
    return 4.689 * Math.pow(1.486 + t / 100, 12.3);
  };
  /* Sättigungstemperatur / Taupunkttemperatur (Formelsammlung): Θ_S = φ^(1/8) (110+θ_L) − 110  (φ as fraction) */
  P.dewT = (phi, tL) => Math.pow(phi, 1 / 8) * (110 + tL) - 110;

  /* ---------- steady-state layer stack ----------
     layers: [{ id, d (m) }]   cond: { ti, te, rsi, rse }
     returns R per layer, RT, U, q, temperatures at every boundary:
       th[0] = θ_si (inner surface), th[k] = after layer k, th[n] = θ_se (outer surface)  */
  P.stack = function (layers, cond) {
    const rsi = cond.rsi != null ? cond.rsi : 0.13, rse = cond.rse != null ? cond.rse : 0.04;
    const rows = layers.map(l => {
      const m = P.MAT[l.id];
      const R = l.d / m.lam;
      return { id: l.id, name: m.name, d: l.d, lam: m.lam, mu: m.mu, R, sd: m.mu * l.d, kind: m.kind, wood: !!m.wood };
    });
    const sumR = rows.reduce((s, r) => s + r.R, 0);
    const RT = rsi + sumR + rse, U = 1 / RT, dT = cond.ti - cond.te, q = U * dT;
    const th = [cond.ti - q * rsi];
    rows.forEach(r => th.push(th[th.length - 1] - q * r.R));
    rows.forEach((r, i) => { r.thIn = th[i]; r.thOut = th[i + 1]; });
    return { rows, rsi, rse, sumR, RT, U, q, th, thSi: th[0], thSe: th[th.length - 1], dT };
  };

  /* ---------- Glaser method ----------
     cond: { ti, phii, te, phie, rsi, rse, dry:{ ti, phii, te, phie }, hTau=1440, hDry=2160 }
     x-axis = cumulative μ·d (s_d), y-axis = vapour pressure [Pa]. Diffusion transfer resistances at the surfaces are ignored (course convention).  */
  const DELTA = 1.5e6; // vapour diffusion constant used on the Formelsammlung (m_dot = Δp / (1.5e6 · s_d))
  P.DELTA = DELTA;

  function lowerHull(pts) {            // pts sorted by x; returns lower convex hull (taut rope under the saturation polygon)
    const h = [];
    for (const p of pts) {
      while (h.length >= 2) {
        const a = h[h.length - 2], b = h[h.length - 1];
        if ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) <= 0) h.pop(); else break;
      }
      h.push(p);
    }
    return h;
  }

  P.glaser = function (layers, cond) {
    const st = P.stack(layers, cond);
    const n = st.rows.length;
    const x = [0];
    st.rows.forEach(r => x.push(x[x.length - 1] + r.sd));
    const S = x[n];
    const pSat = st.th.map(P.ps);
    const pi = cond.phii * P.ps(cond.ti), pe = cond.phie * P.ps(cond.te);
    const pLin = x.map(xx => pi + (pe - pi) * (S ? xx / S : 0));
    const over = pLin.map((p, k) => p > pSat[k] + 1e-9);   // condensation at this boundary?
    const cond0 = over.some(Boolean);

    const out = { st, x, S, pSat, pLin, pi, pe, over, condensate: cond0, planes: [], hull: [], tau: null };
    out.dewAir = P.dewT(cond.phii, cond.ti);

    if (cond0) {
      // taut rope between (0, pi) and (S, pe), kept under the saturation polygon
      const pts = [{ x: 0, y: pi, k: -1 }];
      for (let k = 1; k < n; k++) pts.push({ x: x[k], y: pSat[k], k });
      pts.push({ x: S, y: pe, k: -2 });
      const hull = lowerHull(pts);
      out.hull = hull;
      const inner = hull.slice(1, -1);
      // Taupunkt = polygon vertex with the greatest perpendicular distance from the straight partial-pressure line
      const len = Math.hypot(S, pe - pi);
      let best = null;
      for (let k = 1; k < n; k++) {
        const below = (pi + (pe - pi) * x[k] / S) - pSat[k];            // Pa the saturation polygon lies under the straight p-line
        const normal = below * S / len;                                 // perpendicular distance (plot units)
        if (below > 1e-9 && (!best || normal > best.normal)) best = { k, x: x[k], ps: pSat[k], below, normal };
      }
      out.tau = best;
      // plane-by-plane balance along the hull (vertex k receives from the left edge, loses through the right edge)
      for (let j = 0; j < inner.length; j++) {
        const prev = hull[j], cur = hull[j + 1], next = hull[j + 2];
        const mIn = (prev.y - cur.y) / (DELTA * (cur.x - prev.x));
        const mOut = (cur.y - next.y) / (DELTA * (next.x - cur.x));
        out.planes.push({ k: cur.k, x: cur.x, ps: cur.y, sdE: cur.x - prev.x, sdA: next.x - cur.x, dpE: prev.y - cur.y, dpA: cur.y - next.y, mIn, mOut, mT: mIn - mOut, GK: (cond.hTau || 1440) * (mIn - mOut) });
      }
      out.GKall = out.planes.reduce((s, p) => s + p.GK, 0);          // full Seileck: every touching plane
      out.mT = out.planes.reduce((s, p) => s + p.mT, 0);
      // simple course form for the main Taupunkt (single plane): s_d,e / s_d,a measured to the Taupunkt, Δp to the straight ends
      if (best) {
        const sdE = best.x, sdA = S - best.x;
        out.main = { sdE, sdA, dpE: pi - best.ps, dpA: best.ps - pe, mE: (pi - best.ps) / (DELTA * sdE), mA: (best.ps - pe) / (DELTA * sdA) };
        out.main.mT = out.main.mE - out.main.mA;
        out.main.GK = (cond.hTau || 1440) * out.main.mT;
      }
      // drying period (summer): dry boundary conditions, saturation (100 %) at every condensation plane
      const d = cond.dry || { ti: 15, phii: 0.7, te: 15, phie: 0.7 };
      const stD = P.stack(layers, { ti: d.ti, te: d.te, rsi: st.rsi, rse: st.rse });
      const pDi = d.phii * P.ps(d.ti), pDe = d.phie * P.ps(d.te);
      out.dry = { cond: d, th: stD.th, pDi, pDe, planes: [] };
      for (const pl of out.planes) {
        const psD = P.ps(stD.th[pl.k]);
        const m1 = (psD - pDi) / (DELTA * pl.x), m2 = (psD - pDe) / (DELTA * (S - pl.x));
        out.dry.planes.push({ k: pl.k, x: pl.x, psD, dp1: psD - pDi, dp2: psD - pDe, m1, m2, mA: m1 + m2, GA: (cond.hDry || 2160) * (m1 + m2) });
      }
      out.GAall = out.dry.planes.reduce((s, p) => s + p.GA, 0);
      out.ratioAll = out.GKall > 1e-12 ? out.GAall / out.GKall : Infinity;
      // headline numbers = the lecture's method: ONE Taupunkt (greatest distance), as drilled in VO11/VO15 and asked in the exam
      if (best) {
        const dp = out.dry.planes.find(p => p.k === best.k);
        const psD = P.ps(stD.th[best.k]);
        out.mainDry = dp || { k: best.k, x: best.x, psD, dp1: psD - pDi, dp2: psD - pDe, m1: (psD - pDi) / (DELTA * best.x), m2: (psD - pDe) / (DELTA * (S - best.x)) };
        out.mainDry.mA = out.mainDry.m1 + out.mainDry.m2;
        out.mainDry.GA = (cond.hDry || 2160) * out.mainDry.mA;
        // one touching plane: both methods agree. Several planes: the full Seileck is the physically right balance, the single-Taupunkt shortcut underestimates
        if (out.planes.length === 1) { out.GK = out.main.GK; out.GA = out.mainDry.GA; } else { out.GK = out.GKall; out.GA = out.GAall; }
      } else { out.GK = out.GKall; out.GA = out.GAall; }
      out.ratio = out.GK > 1e-12 ? out.GA / out.GK : Infinity;
      out.dried = out.GA >= out.GK;
      out.woodHit = st.rows.some(r => r.wood);
    }
    // rule-of-thumb check (Faustregeln): insulation outside, vapour barrier inside
    if (n > 1) {
      let iDrop = 0, iSd = 0;
      st.rows.forEach((r, i) => { if (r.thIn - r.thOut > st.rows[iDrop].thIn - st.rows[iDrop].thOut) iDrop = i; if (r.sd > st.rows[iSd].sd) iSd = i; });
      out.rules = { dropLayer: iDrop, sdLayer: iSd, insulationOutside: iDrop >= iSd };
    }
    return out;
  };

  /* ---------- Oberflächenkondensat (VO8) ---------- */
  P.surface = function (ti, phii, te, U, rsi) {
    rsi = rsi == null ? 0.13 : rsi;
    const thSi = ti - U * rsi * (ti - te);
    const pAir = phii * P.ps(ti), psSi = P.ps(thSi), phiSi = pAir / psSi;
    return { thSi, pAir, psSi, phiSi, dew: P.dewT(phii, ti), fRsi: (thSi - te) / (ti - te) };
  };
  /* lecture method (VO8): set Θ_S = θ_si in  Θ_S = φ^(1/8)·(110+θ_i) − 110  and solve for φ  →  φ = ((θ_si+110)/(110+θ_i))^8 */
  P.phiCritLecture = (ti, thSi) => Math.pow((thSi + 110) / (110 + ti), 8);
  /* highest indoor humidity (fraction) at which the inner surface stays below a given φ_si limit (0.8 mould, 1.0 condensation) */
  P.phiCrit = (ti, te, U, rsi, limit) => {
    const thSi = ti - U * (rsi == null ? 0.13 : rsi) * (ti - te);
    return limit * P.ps(thSi) / P.ps(ti);
  };

  /* ---------- instationär (VO10) ---------- */
  P.b = (lam, rho, c) => Math.sqrt(lam * rho * c);
  P.a = (lam, rho, c) => lam / (rho * c);
  P.contact = (b1, t1, b2, t2) => (b1 * t1 + b2 * t2) / (b1 + b2);

  /* ---------- window & areas ---------- */
  P.Uw = (Ag, Ug, Af, Uf, lg, psi) => (Ag * Ug + Af * Uf + lg * psi) / (Ag + Af);

  /* ---------- helpers ---------- */
  P.round = (v, d) => { const f = Math.pow(10, d == null ? 2 : d); return Math.round(v * f) / f; };
  P.clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  if (typeof module !== "undefined") module.exports = TP;
})(typeof window !== "undefined" ? window : globalThis);
