/* Bauphysik — multiple-choice bank in the exam's format (several options, any number can be right).
   "official": taken from the course's own example exam questions (VO13 "Kumulative Prüfungsbeispiele").
   Others are derived from statements the lecturer flagged ("beliebte Prüfungsfrage") and the course notes.
   Option: [text, shouldBeMarked, why]. For "nicht korrekt" questions, shouldBeMarked already means "is one of the wrong statements". */
(function (TP) {
  const Q = (id, mod, stem, opts, extra) => Object.assign({ id, mod, stem, kind: "multi", src: "abgeleitet", opts: opts.map(o => ({ t: o[0], ok: !!o[1], why: o[2] || "" })) }, extra || {});
  const OFF = { src: "offiziell" };
  TP.MCQ = [
    /* ---------- official example questions ---------- */
    Q("o1", 5, "Welche der nachstehenden Aussagen sind korrekt?", [
      ["Mittels beliebig angeordneter Integration von Wärmedämmung wird sowohl Oberflächenkondensat wie auch Kondensat im Bauteil verringert.", false, "Insulation placed on the inside can make condensation inside the component worse."],
      ["Es gibt einen eindeutigen Zusammenhang zwischen Wasserdampf-Sättigungsdampfdruck und Temperatur (bei gleichbleibendem atmosphärischem Druck).", true, "p_S depends on temperature alone."],
      ["Bei steigender Temperatur der Luft steigt die speicherbare Menge Wasserdampf linear an.", false, "It rises more than linearly (power function, Magnus formula)."],
      ["Lineares Interpolieren kann verwendet werden, um Sättigungsdampfdrücke zwischen zwei bekannten Werten zu ermitteln.", true, "Valid approximation between close table values (never extrapolate)."],
      ["Der µ-Wert besitzt die Einheit Meter.", false, "µ is dimensionless; only µ·d (s_d) has the unit metre."],
      ["Je höher der µ-Wert, desto besser lässt ein Material Wasserdampf durch.", false, "The higher µ, the worse the vapour passes."],
      ["Bei dampfdichten Schichten ist die geeignete Anordnung entsprechend der vorherrschenden Klimabedingungen von großer Bedeutung.", true, ""],
      ["Bei Steildächern kann fast immer auf eine Dampfbremse/-sperre verzichtet werden, da der Wasserdampf durch sehr offenporige Abdichtungen leicht weggeleitet wird.", false, "The water-draining layer of pitched roofs is mostly vapour-tight, so a vapour barrier is almost always needed."],
    ], OFF),
    Q("o2", 2, "Welche der nachstehenden Aussagen sind **nicht** korrekt?", [
      ["Die Wärmetransportmechanismen sind Wärmeleitung, Wärmekonvektion und Wärmestrahlung.", false, "Correct statement."],
      ["Die Wärmetransportmechanismen sind Wärmekonduktion, Wärmemitführung und radiativer Wärmetransport.", false, "Synonyms of the above — correct."],
      ["Alle Wärmetransportmechanismen benötigen ein Medium aus Materie.", true, "Radiation needs no medium."],
      ["Für Bauwerke spielt der Wärmeverlust durch konvektive Prozesse kaum eine Rolle.", true, "Every opened window exchanges heat by convection."],
      ["In der U-Wert-Berechnung spielen alle drei Wärmetransportmechanismen eine Rolle.", false, "Correct: surface transfer = convection + radiation, layers = conduction."],
      ["Die U-Wert-Berechnung ist eine 2-dimensionale Annäherung an die Realität.", true, "It is one-dimensional (one arrow of heat flow)."],
      ["Wärmedurchgang durch ein Bauteil setzt sich gemäß U-Wert-Berechnung aus Wärmeübergängen und Wärmedurchlass zusammen.", false, "Correct statement."],
      ["Je schwerer ein Material, desto schlechter leitet es in der Regel die Wärme.", true, "Usually the opposite: the lighter, the worse it conducts (insulation)."],
    ], OFF),
    Q("o3", 12, "Lesen Sie die Aussagen (i)–(vii). Welche Antwortoption ist richtig?\n\n(i) Schellenhuber stellt großzügiges Aufforsten als mögliche Klimawandelabschwächung in den Raum.\n(ii) Effizienz und Effektivität sind nur zwei Begriffe für dasselbe.\n(iii) Bei der starken Nachhaltigkeit sind die drei Säulen gleich berechtigt.\n(iv) Eine Stärke der Nachhaltigkeitsbegrifflichkeit ist ihre direkte Operationalisierbarkeit.\n(v) Die drei Säulen der Nachhaltigkeit sind ökologische, ökonomische und soziale Nachhaltigkeit.\n(vi) Ulrich Brand hat den Begriff des imperialen Lebensstils geprägt.\n(vii) Resilienz bedeutet, sich auf einen bestimmten Verbrauchswert freiwillig selbst zu beschränken.", [
      ["Keine Aussage stimmt.", false], ["Alle Aussagen stimmen.", false],
      ["Aussagen (i), (v) und (vi) sind korrekt.", true, "(ii) false · (iii) is weak sustainability · (iv) is a weakness · (vii) is sufficiency, not resilience."],
      ["Aussagen (i), (ii), (iii), (vi), (vii) sind korrekt.", false], ["Nur Aussage (iii) ist korrekt.", false], ["Aussagen (ii), (iv), (vi) sind korrekt.", false], ["Aussagen (ii), (iii), (v) sind korrekt.", false], ["Aussagen (i), (iv), (vi) sind korrekt.", false],
    ], Object.assign({ kind: "single" }, OFF)),
    Q("o6", 10, "Welche der folgenden Messinstrumente benötigen zum Betrieb elektrischen Strom?", [
      ["Psychrometer", false, "Two mercury thermometers, one wetted."], ["Kohlendioxid-Fühler", true, "Infrared spectroscopy needs a radiation source."], ["Haarhygrometer", false, "Mechanical expansion of hair."],
      ["Flügelradanemometer", false, "Wind drives the wheel mechanically."], ["Draht-Anemometer (Hitzdraht)", true, "The wire is electrically heated."], ["Bimetall-Thermometer", false, "Thermal expansion of two bonded metals."],
      ["Kapazitive Feuchtigkeitssensoren", true, "Electrical capacitance must be measured."], ["PTC-Thermometer", true, "Resistance measurement."],
    ], OFF),
    Q("o7", 10, "Welche der folgenden Indikatoren sind thermische Indizes für den Außenraum?", [
      ["Operative Temperatur", false, "Indoor quantity."], ["Temperature felt (Gefühlte Temperatur, GT)", true], ["Standard Effective Temperature (SET*)", true], ["Mittlere Strahlungstemperatur", false, "An input quantity, not an index of its own."],
      ["Entropie", false], ["Enthalpie", false], ["Physiologisch äquivalente Temperatur (PET)", true], ["Universal Thermal Climate Index (UTCI)", true],
    ], OFF),
    Q("o8", 5, "Welche physikalischen Gesetze werden in der allgemeinen Zustandsgleichung (pV = mRT) zusammengeführt?", [
      ["Stefan-Boltzmann", false], ["Wiedemann-Franz", false], ["Dalton", false, "Only partial pressures."], ["1. Fick'sches Gesetz", false], ["Boyle-Mariotte", true, "pV = const."], ["Gay-Lussac", true, "V₁/T₁ = V₂/T₂."], ["0. Hauptsatz der Thermodynamik", false], ["2. Hauptsatz der Thermodynamik", false],
    ], OFF),
    Q("o9", 9, "Welche der folgenden Merksätze stimmen **nicht**?", [
      ["Um Holz vor Verrotten zu schützen, sollte man es allseitig mit dampfsperrenden/-bremsenden Folien umschließen.", true, "“Willst du Holz zum Faulen bringen, musst du es zwischen Folien zwingen.”"],
      ["Je wärmer trockene Luft ist, desto mehr Wasserdampf kann gespeichert werden.", false, "True."],
      ["Temperaturasymmetrien von mehr als 5 K werden potenziell als unangenehm empfunden.", false, "True."],
      ["Bei einem PMV von 0 erreicht man 0 % Unzufriedene.", true, "At PMV = 0 at least 5 % PPD always remain."],
      ["Thermischer Komfort ist eine universelle Definition, die für alle Menschen gleichermaßen erfüllt werden kann.", true, "Individual differences always exist."],
      ["Die spezifische Wärmekapazität von Materialien ist direkt proportional zu deren Dichte.", true, "That holds (roughly) for thermal conductivity, not for c."],
      ["Im Dachausbau verfolgen Bauphysiker und Statiker immer das gleiche Ziel, möglichst leicht zu bauen.", true, "Building physics often wants thermal mass against overheating — a conflict of aims."],
      ["Zur Schimmelbildung kann es auch kommen, wenn über längere Zeit sehr hohe relative Luftfeuchten knapp unter der Sättigung an einer Oberfläche herrschen.", false, "True (f_Rsi thresholds 0,71 / 0,69)."],
    ], OFF),

    /* ---------- M01 Grundlagen ---------- */
    Q("m1a", 1, "Welche Aussagen zur Wärmestrahlung sind korrekt?", [
      ["Die spezifische Ausstrahlung eines schwarzen Körpers wächst mit T⁴ (Stefan-Boltzmann).", true],
      ["Emissionsgrad und Absorptionsgrad eines Körpers sind gleich (Kirchhoff).", true, "ε = α."],
      ["Wärmestrahlung benötigt ein Medium zur Ausbreitung.", false],
      ["Mit steigender Temperatur verschiebt sich das Strahlungsmaximum zu längeren Wellenlängen.", false, "Wien: λ_max = 2896·10⁻⁶ / T — shorter wavelengths when hotter."],
      ["Ein matt-schwarzer Behälter nimmt Strahlung am besten auf und gibt sie auch am besten wieder ab.", true],
    ]),
    Q("m1b", 1, "Welche Aussagen zu Zahlen, Einheiten und signifikanten Stellen sind korrekt?", [
      ["Die Zahl 17,061 hat 5 signifikante Stellen.", true],
      ["Das Produkt 11,6 × 6,55 ist auf 3 signifikante Stellen anzugeben.", true, "Limited by 11,6 (3 significant figures)."],
      ["Eine Temperaturdifferenz von 1 K entspricht 1 °C.", true, "Same step size, only the zero point differs."],
      ["Ein Ergebnis ohne Rechenweg wird in der Prüfung als „geraten“ gewertet.", true, "The lecturer's own words."],
      ["Das Fourier'sche Gesetz beschreibt den Wärmetransport durch Strahlung.", false, "It describes conduction."],
    ]),

    /* ---------- M02 U-Wert ---------- */
    Q("m2a", 2, "Wovon hängt der U-Wert eines Bauteils ab?", [
      ["Von Dicke und Wärmeleitfähigkeit der Schichten.", true], ["Von den Wärmeübergangswiderständen R_si und R_se.", true],
      ["Von der Fläche des Bauteils.", false, "U is normalised to 1 m²."], ["Von der tatsächlichen Temperaturdifferenz zwischen innen und außen.", false, "U is normalised to 1 K — ΔT only enters through q = U·A·Δθ."],
    ]),
    Q("m2b", 2, "Ist ein U-Wert von 10 W/m²K möglich? Welche Aussagen stimmen?", [
      ["Nein, selbst ohne Schichtwiderstand begrenzen R_si und R_se den U-Wert.", true],
      ["Bei horizontalem Wärmestrom beträgt der theoretische Höchstwert etwa 5,88 W/m²K.", true, "1/(0,13+0,04)."],
      ["Ja, bei sehr dünnen Bauteilen ist das möglich, da R_T gegen Null geht.", false],
      ["Bei abwärts gerichtetem Wärmestrom (R_si = 0,17) ist der Höchstwert kleiner als bei horizontalem.", true, "1/(0,17+0,04) = 4,76."],
    ]),
    Q("m2c", 2, "Welche Analogien zur Serien- und Parallelschaltung von Widerständen sind richtig?", [
      ["Die Schichten eines Bauteils (innen → außen) entsprechen einer Serienschaltung.", true], ["Wand, Fenster, Dach und Tür derselben Gebäudehülle entsprechen einer Parallelschaltung.", true, "The lecturer's headline answer."],
      ["Holzständer und Dämmung nebeneinander in einer Schicht entsprechen einer Serienschaltung.", false, "Side by side = parallel."], ["Der Wärmedurchlasswiderstand entspricht dem ohmschen Widerstand, ΔT der Spannung, Q̇ dem Strom.", true],
    ]),
    Q("m2d", 2, "Hinterlüftung und U-Wert: Welche Aussagen stimmen?", [
      ["Die U-Wert-Berechnung endet an der Hinterlüftung; Schichten dahinter (Fassadenbekleidung) werden nicht mehr berücksichtigt.", true], ["R_se wird trotzdem normal angesetzt.", true, "The ventilated cavity has its own air layer with R_se."],
      ["Die Fassadenbekleidung hinter der Hinterlüftung darf als Dämmung in die Summe der Widerstände eingehen.", false, "A common real-world mistake."], ["Eine schwach belüftete Luftschicht wird je nach Belüftung wie eine Luftschicht oder Dämmung gerechnet.", true],
    ]),
    Q("m2e", 2, "Der mittlere U-Wert sinkt von 0,489 auf 0,456 W/m²K. Welche Aussagen sind korrekt?", [
      ["Der neue Wert beträgt etwa 93 % des alten.", true], ["Die prozentuale Reduktion beträgt etwa 7 %.", true], ["„Neuer Wert in % des alten“ und „prozentuale Reduktion“ sind dieselbe Zahl.", false, "Flagged as a commonly confused pair."], ["Die Reduktion beträgt etwa 93 %.", false],
    ]),

    /* ---------- M03 Wärmebrücken ---------- */
    Q("m3a", 3, "Welche Aussagen zu Wärmebrücken-Begriffen sind korrekt?", [
      ["Der Begriff „Kältebrücke“ ist physikalisch falsch.", true, "The lecturer's favourite question."], ["Nach dem 2. Hauptsatz der Thermodynamik fließt Wärme von selbst immer von warm nach kalt.", true],
      ["Ein Gebäude kann „wärmebrückenfrei“ ausgeführt werden.", false, "Correct term: wärmebrückenminimiert."], ["Eine Wärmebrücke ist eine Stelle mit erhöhtem Wärmeverlust bzw. niedrigerer innerer Oberflächentemperatur.", true],
    ]),
    Q("m3b", 3, "Der Temperaturfaktor f_Rsi: Welche Aussagen sind korrekt?", [
      ["f_Rsi = (θ_si,min − θ_e) / (θ_i − θ_e).", true], ["f_Rsi ≥ 0,71 vermeidet Schimmelbildung.", true], ["Bei f_Rsi < 0,69 droht Oberflächenkondensat.", true, "Austrian thresholds 0,71 (mould) / 0,69 (condensation)."],
      ["Ein höherer f_Rsi-Wert bedeutet eine kältere innere Oberfläche.", false, "Higher f_Rsi = warmer surface = better."], ["Bei f_Rsi = 0,70 besteht Schimmelgefahr, aber noch kein Oberflächenkondensat.", true],
    ]),
    Q("m3c", 3, "Wärmebrücken-Kennwerte: Welche Aussagen stimmen?", [
      ["ψ = L₂D − Σ(U_i·l_i).", true], ["χ ist der Wärmebrückenverlustkoeffizient einer punktförmigen Wärmebrücke in W/K.", true], ["ψ hat die Einheit W/m²K.", false, "W/(m·K)."],
      ["Ein negatives ψ ist ein Dimensionierungsartefakt (Außenmaße) und wird in der Praxis auf 0 gesetzt.", true],
    ]),
    Q("m3d", 3, "Fenster-U-Wert: Welche Aussagen sind korrekt?", [
      ["U_w = (A_g·U_g + A_f·U_f + l_g·ψ_g) / (A_g + A_f).", true], ["Bei gleichen Materialien haben kleinere Fenster einen schlechteren U_w als größere.", true, "Larger frame share and edge length per area."],
      ["Das Prüfnormmaß für Fenster beträgt 1,23 m × 1,48 m.", true], ["ψ_g berücksichtigt den Glasrandverbund.", true],
      ["Der Rahmenanteil hat keinen Einfluss auf den U_w eines Fensters.", false, "U_f is usually much worse than U_g, so the frame share matters."],
    ]),

    /* ---------- M04 Instationär ---------- */
    Q("m4a", 4, "Instationäres Wärmeverhalten: Welche Aussagen stimmen?", [
      ["Polystyrol hat das niedrigste λ, reagiert aber auf Temperaturänderungen schneller als Beton.", true, "a = λ/(ρ·c): ρ·c is tiny."], ["Holz verändert seine Temperatur langsamer als Beton.", true],
      ["Ein niedriges λ bedeutet immer eine langsame Temperaturausbreitung.", false], ["Die Temperaturleitfähigkeit ist a = λ/(ρ·c).", true],
    ]),
    Q("m4b", 4, "Kontakttemperatur: Welche Aussagen sind korrekt?", [
      ["Metall fühlt sich kälter an als Holz, weil sein Wärmeeindringkoeffizient b viel größer ist.", true], ["Metall und Holz haben im Raum unterschiedliche Temperaturen, deshalb fühlt sich Metall kälter an.", false, "Same room temperature — the contact temperature differs."],
      ["θ_c = (b₁θ₁ + b₂θ₂)/(b₁ + b₂).", true], ["Die Kontakttemperatur liegt näher am Körper mit dem größeren b.", true],
    ]),
    Q("m4c", 4, "Stationär und instationär: Welche Aussagen stimmen?", [
      ["Im stationären Zustand ist die Temperaturdifferenz innen/außen zeitlich konstant.", true], ["Im stationären Zustand ist der Wärmestrom konstant.", true],
      ["Im instationären Zustand kann der Wärmestrom sogar sein Vorzeichen wechseln.", true], ["Im instationären Zustand ist der Wärmestrom konstant, nur die Temperaturen ändern sich.", false],
    ]),

    /* ---------- M05 Feuchte ---------- */
    Q("m5a", 5, "Feuchte Luft und Baustoffe: Welche Aussagen sind korrekt?", [
      ["Feuchte Luft ist leichter als trockene Luft.", true, "Water vapour displaces heavier N₂/O₂ molecules."], ["Der µ-Wert ist dimensionslos und bezieht sich auf ruhende Luft (µ_Luft = 1).", true],
      ["µ-Werte sind bei allen Materialien immer konstant.", false, "Some (e.g. beech) depend on temperature/humidity."], ["Der µ-Wert kann kleiner als 1 sein.", false],
    ]),
    Q("m5b", 5, "Oberflächenkondensat und Schimmel: Welche Aussagen sind korrekt?", [
      ["Auf einer nicht-hygroskopischen Oberfläche entsteht Kondensat, wenn θ_si ≤ Θ_S.", true], ["Schimmel braucht Feuchtigkeit, geeignete Temperatur, Nahrung, Sauerstoff, Untergrund und Zeit.", true],
      ["Schimmel kann sich erst bilden, wenn tatsächlich flüssiges Wasser an der Oberfläche steht.", false, "Long periods of very high humidity just below saturation are enough."], ["Eine Wärmebrücke mit niedriger Oberflächentemperatur erhöht das Risiko.", true],
    ]),

    /* ---------- M06 Glaser ---------- */
    Q("m6a", 6, "Glaser-Verfahren: Welche Aussagen sind korrekt?", [
      ["Die Dämmung soll so weit wie möglich außen liegen.", true], ["Dampfbremse/-sperre soll so weit wie möglich innen liegen.", true],
      ["Zwei Bauteile mit gleichem U-Wert und umgekehrter Schichtreihenfolge verhalten sich im Glaser-Diagramm gleich.", false, "U says nothing about component condensation — a favourite question."],
      ["Bei zwei Dämmschichten braucht man auch zwei Dampfsperren.", false, "One barrier on the warm side suffices (one dam upstream)."],
    ]),
    Q("m6b", 6, "Grenzen und Konventionen des Glaserverfahrens: Welche Aussagen stimmen?", [
      ["Das Verfahren berücksichtigt keine Wärmebrücken.", true], ["Speichereffekte und hygroskopische Pufferung werden nicht berücksichtigt.", true], ["Die Berechnung ist stationär (eindimensional).", true],
      ["Die Wahl von R_si (0,13 vs. 0,25) beeinflusst das Ergebnis nicht.", false, "It changes the surface temperatures."], ["Diffusionsübergangswiderstände an den Oberflächen werden im Kurs vernachlässigt.", true],
    ]),
    Q("m6c", 6, "Tau- und Trockenperiode: Welche Aussagen sind korrekt?", [
      ["Die Tauperiode dauert üblicherweise 1440 h (Winter).", true], ["Die Trockenperiode dauert üblicherweise 2160 h (Sommer).", true],
      ["G_A/G_K > 1 bedeutet vollständige Austrocknung innerhalb eines Jahres.", true], ["Holzbauteile dürfen Kondensat haben, wenn es im Sommer vollständig austrocknet.", false, "Wood must never show condensate — alternate wetting/drying destroys it."],
      ["In der Trockenperiode werden die Randbedingungen des Winters (z. B. −10 °C) verwendet.", false, "Own, deliberately unfavourable summer conditions (e.g. 15 °C / 70 %)."],
    ]),
    Q("m6d", 6, "Konstruktion des Glaserdiagramms (Bewertung): Welche Aussagen stimmen?", [
      ["Pro Achse darf nur ein Maßstab verwendet werden; ein Maßstabssprung führt zu 0 Punkten für die Zeichnung.", true], ["Der Partialdruckverlauf wird über zwei Punkte als Gerade gezeichnet.", true],
      ["Der Taupunkt ist der Punkt mit dem größten Normalabstand von der Partialdrucklinie.", true], ["Bei zwei Unterschneidungen zeichnet man trotzdem ein einzelnes Dreieck.", false, "A polygon through every undercut — the named mistake."],
      ["Die Trockenperiode kann weggelassen werden.", false, "Points are deducted."],
    ]),

    /* ---------- M07 Energiebilanz ---------- */
    Q("m7a", 7, "Welche Aussagen zum Energiebedarf und zur Gebäudeform sind korrekt?", [
      ["Eine größere charakteristische Länge l_c = V/A ist energetisch günstiger.", true], ["Die Kugel ist die kompakteste Form, danach der Würfel.", true],
      ["Ein Reihenhaus ist wegen der (adiabaten) Trennwände kompakter als ein freistehendes Haus gleicher Größe.", true], ["Heizlast wird mit der absolut tiefsten je gemessenen Außentemperatur gerechnet.", false, "A very cold but not extreme reference temperature (Vienna ≈ −20 °C)."],
    ]),
    Q("m7b", 7, "Heizwärmebilanz: Welche Aussagen stimmen?", [
      ["Lüftungsverluste können in gut gedämmten Gebäuden bis zu etwa 60 % der Gesamtverluste ausmachen.", true], ["Heizenergiebedarf = Heizwärmebedarf / Systemeffizienz.", true],
      ["Bei solaren Gewinnen mit mehreren Orientierungen summiert man zuerst alle Strahlungswerte und multipliziert dann mit der Gesamtfläche.", false, "Multiply each radiation value by its own orientation area first, then sum."], ["Primärenergiebedarf umfasst zusätzlich die Aufwände für Gewinnung, Umwandlung und Verteilung des Energieträgers.", true],
    ]),

    /* ---------- M08 Klima ---------- */
    Q("m8a", 8, "Klima und Heizgradtage: Welche Aussagen sind korrekt?", [
      ["Als Heizgrenze wird 12 °C verwendet, weil interne und solare Gewinne „gratis“ mitheizen.", true], ["HGT₂₀/₁₂ ist die Summe von (20 − θ_e) über alle Tage mit θ_e < 12 °C.", true],
      ["Die Heizgradtage-Zahl ist in der Regel kleiner als die Zahl der Heiztage.", false, "HGT is a weighted sum — in the thousands (Vienna ≈ 2800 Kd)."], ["Köppen-Geiger gliedert die Klimazonen in die Hauptgruppen A bis E.", true],
      ["Zu den Eingangsgrößen des UTCI zählen Lufttemperatur, mittlere Strahlungstemperatur, Windgeschwindigkeit und Wasserdampfdruck.", true],
    ]),

    /* ---------- M09 Komfort ---------- */
    Q("m9a", 9, "Operative Temperatur und adaptiver Komfort: Welche Aussagen stimmen?", [
      ["Die operative Temperatur lässt sich vereinfacht als Mittel aus Lufttemperatur und mittlerer Strahlungstemperatur ermitteln.", true], ["Das adaptive Komfortmodell gilt nur für natürlich belüftete Gebäude.", true],
      ["Das adaptive Komfortmodell gilt auch für vollklimatisierte Gebäude.", false], ["Je wärmer es außen ist, desto höhere Innentemperaturen werden im adaptiven Modell als komfortabel akzeptiert.", true],
    ]),
    Q("m9b", 9, "Thermischer Komfort: Welche Aussagen sind korrekt?", [
      ["Thermischer Komfort ist der Gemütszustand, der Zufriedenheit mit der thermischen Umgebung ausdrückt (ASHRAE 55 / ISO 7730).", true],
      ["Zu den umweltbedingten Einflussfaktoren zählen Lufttemperatur, Strahlungstemperatur, Luftgeschwindigkeit und Luftfeuchte.", true], ["Stoffwechselrate und Bekleidung sind individuelle Faktoren.", true],
      ["Die volle analytische PMV-Formel muss in der Prüfung gerechnet werden können.", false, "Explicitly excluded; only the concept and operative-temperature arithmetic."],
    ]),

    /* ---------- M10 Sensorik, IAQ ---------- */
    Q("m10a", 10, "Temperatursensoren: Welche Aussagen sind korrekt?", [
      ["Der Widerstand eines PTC steigt mit der Temperatur.", true], ["Der Widerstand eines NTC sinkt mit steigender Temperatur.", true], ["Im Gebäudebereich werden eher PTCs eingesetzt.", true],
      ["Reine Metalle verhalten sich nicht linear, PTC/NTC dagegen über den gesamten Temperaturbereich linear.", false, "Pure metals are linear; PTC/NTC only in a narrow range."],
    ]),
    Q("m10b", 10, "CO₂ und Raumluftqualität: Welche Aussagen stimmen?", [
      ["Die MIK ist deutlich niedriger als die MAK (etwa 1/20).", true], ["Als Maximalwert für Wohnräume gelten etwa 1000 ppm CO₂.", true], ["Außenluft enthält etwa 380–450 ppm CO₂.", true], ["Der MAK-Wert für CO₂ liegt bei etwa 1000 ppm.", false, "MAK (8 h) ≈ 5000 ppm."],
    ]),

    /* ---------- M11 Sommer ---------- */
    Q("m11a", 11, "Hitzedefinitionen: Welche Aussagen sind korrekt?", [
      ["Eine Tropennacht liegt vor, wenn die Nachttemperatur nicht unter 20 °C fällt.", true], ["Kysely-Tage: mindestens drei aufeinanderfolgende Tage mit Tageshöchstwert ≥ 30 °C, ohne dass die Temperatur unter 25 °C fällt.", true],
      ["Nach ÖKS gilt eine Hitzeperiode bei ≥ 3 Tagen mit 30 °C und Nächten nicht unter 18 °C.", true], ["Eine Tropennacht liegt bereits bei Tiefstwerten unter 10 °C vor.", false],
    ]),
    Q("m11b", 11, "Sommerlicher Wärmeschutz: Welche Aussagen stimmen?", [
      ["Thermische Speichermasse kann Überwärmung dämpfen.", true], ["Nach OIB-RL 6 ist θ_op ≤ ⅓·T_NAT,13 + 21,8 °C einzuhalten.", true],
      ["Bauphysiker und Statiker verfolgen im Dachausbau stets dasselbe Ziel (möglichst leicht).", false, "Conflict of aims: mass vs. light."], ["Außenliegende Verschattung ist wirksamer als innenliegende.", true],
    ]),

    /* ---------- M12 OI3 ---------- */
    Q("m12a", 12, "OI3-Index: Welche Aussagen sind korrekt?", [
      ["OI3_KON ist das arithmetische Mittel der drei Bewertungsfunktionen OI_PECnr, OI_GWP und OI_AP.", true], ["Einzelne Teilindikatoren (z. B. OI_AP) dürfen negative Werte annehmen.", true, "The guide explicitly allows negative partial points."],
      ["Der OI3_KON eines m² Bauteils hängt von der gesamten Wandfläche des Hauses ab.", false, "It refers to 1 m² of component."], ["GWP ist das Treibhauspotenzial, AP das Versauerungspotenzial.", true],
    ]),

    /* ---------- M13 Prüfungsformat ---------- */
    Q("m13a", 13, "Prüfungsformat: Welche Aussagen stimmen?", [
      ["Die Nettoarbeitszeit beträgt 2 Stunden (plus ca. 10 Minuten organisatorische Zeit).", true], ["Das Glaserdiagramm ist ein Pflichtbestandteil und macht rund 7 von etwa 30–31 Punkten aus.", true],
      ["Die Bestehensgrenze liegt bei 50 %.", true], ["Programmierbare, textspeichernde Taschenrechner sind unbeschränkt erlaubt.", false, "They will be reset by the invigilators."],
      ["Die Formelsammlung nennt zu jeder Formel Einheiten und Variablenbedeutung.", false, "Deliberately not — you must identify what goes where."],
    ]),
    Q("m13b", 13, "Rechenweg und Runden: Welche Aussagen sind korrekt?", [
      ["Ein Ergebnis ohne Rechenweg wird als geraten gewertet.", true], ["Man soll mit vollen Zwischenergebnissen rechnen und erst am Schluss runden.", true],
      ["Einheiten müssen am Ende des Ergebnisses unbedingt stehen.", true], ["Beim Glaserdiagramm ist zusätzlich ein separater Rechenweg auf einem Extrablatt zu liefern.", false, "Filling in the given Formblatt is enough."],
    ]),
  ];
  TP.mcq = id => TP.MCQ.find(q => q.id === id);
})(window.TP);
