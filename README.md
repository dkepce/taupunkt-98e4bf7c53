# Taupunkt — Bauphysik exam trainer

A web app (plain HTML/CSS/JS, no build step, installable as a PWA) to prepare for the **Bauphysik** exam (TU Wien, Ulrich Pont, LVA 259.606). It turns the Obsidian vault in
`G:\My Drive\02 Education\01 Lectures\06 Bauphysik\BAUPHYSIK\Bauphysik` into something you can *do*: explore, simulate, drill and take mock exams.

> **Live:** https://dkepce.github.io/taupunkt-98e4bf7c53/ — a public but unguessable link (repo `dkepce/taupunkt-98e4bf7c53`, `noindex`). Open it in Brave/Chrome and use the browser's *Install* button to get it as a PC app. `data/` holds the course's question catalogues and formula sheet; Doruk decided he does not mind that being public.

## Start it

Double-click **`Start Taupunkt.bat`** in the folder above (or run `python tools/serve.py` inside `app/`), then open http://localhost:8130.
It must run through this little server (not by double-clicking `index.html`), because the browser blocks loading the data files from `file://`.
Use Brave / Chrome / Edge: they can save into a folder you choose (File System Access API).

## The six tabs

| Tab | What it does |
|---|---|
| **Karte** | The 13 Study Modules as a dependency map (dots = exam weight, bar = your mastery, badge = cards due). Click a module: exam risk, tick-off learning goals, quick formulas, shortcuts to cards / quiz / calculations / lab. "Empfohlen als Nächstes" picks the best next module (exam weight × what is still open × prerequisites). |
| **Labor** | Interactive physics. *Wandaufbau*: build a wall layer by layer (drag to reorder), live U-value, temperature profile with hover, exam-style Formblatt. *Glaser-Diagramm*: the same wall as a Glaser diagram — saturation polygon, partial-pressure line, Seileck, Taupunkt, G_K / G_A, Tauperiode and Trockenperiode, rule-of-thumb check, and "Aufgaben" (e.g. make the Innendämmung condensate-free without changing the layer order). *Taupunkt & Schimmel*: dew point, φ at the surface, f_Rsi, critical humidity, largest allowable U. *Wärmeeindringung*: contact temperature, diffusivity vs. conductivity, time constant τ (thermal mass damps the daily swing). *Operative Temperatur*: mean radiant temperature, θ_op, adaptive comfort band. |
| **Formeln** | The whole Formelsammlung (94 formulas, each tagged with the lecture that drilled it). *Prüfungsblatt-Modus* hides names/VO/units like the real exam sheet. Symbols & pronunciation, plus tables (Magnus p_S lookup with interpolation, R_si/R_se, CO₂). |
| **Üben** | **Karten**: 506 cards from the official question catalogues (VO4, 8, 11–14) and the concept-question files, spaced repetition (Nochmal / Schwer / Gut / Leicht). **Quiz**: 39 multi-select questions in the exam's format (7 are the course's own example questions), three scoring regimes. **Rechnen**: 23 generated calculation types with random numbers and worked solutions. **Glaser-Training**: a generated wall, you fill the Formblatt, timed against the 15–20 min target, 7 points. |
| **Prüfung** | A mock exam: 10 MC (10 P) + 4 Rechenbeispiele (13 P) + Glaser (7 P) = 30 P, 120 min, 50 % to pass. Answers are marked and worked solutions shown after hand-in; weak modules are listed. |
| **Fortschritt** | Mastery per module, exam countdown and a daily dose (new cards per day), weak calculation types / quiz questions / "leech" cards, mock-exam and Glaser history, 17-week activity heat map. |

## Where your progress is saved

One small file, **`Taupunkt.tpk`**, in a folder *you* choose (header → "Speicherort wählen"; e.g. inside Google Drive so PC and laptop share it).
It is also kept in the browser's storage. "Download backup / Restore" is in the same dialog. Close the app on one machine before using the other.

## Files

```
app/
  index.html  manifest.webmanifest  sw.js  icons/
  css/style.css
  js/
    util.js        small helpers, math + markdown rendering
    store.js       progress data, saving into your folder
    physics.js     the building-physics core (U-value, Magnus p_S, Glaser incl. Seileck and G_K/G_A, ...). Pure functions, no screen code.
    data.js        module map, spaced repetition, mastery
    mcq.js         the multiple-choice bank        gens.js   the calculation generators
    charts.js  lab-wall.js  lab-glaser.js  lab-extra.js  tab-*.js  glaser-drill.js  app.js
  data/            cards.json formulas.json symbols.json modules.json   (generated from the vault)
  vendor/katex/    KaTeX 0.16.22 (MIT) — formula rendering, bundled so it works offline
  tools/
    build_content.py   re-reads the vault and rewrites data/*.json   (python -X utf8 tools/build_content.py)
    serve.py           the local server       make_icons.py   draws the app icons
```

To update the content after you change the vault: run `python -X utf8 tools/build_content.py` (the vault is only read, never changed).

## How much to trust the numbers

`physics.js` was checked against the vault's worked examples: Fall 1 (θ_si 18,745 / 15,007 / −9,614 °C), VO15 Fall 2a (U = 0,337, G_K = 0,2686 vs. 0,2697 kg/m² in the lecture, G_A = 0,638, G_A/G_K = 2,37), the June 2024 exam wall (U = 0,1185, Σµd = 82,32, θ = 6,96 °C), and the VO8 surface-condensation example (82,34 %).
Differences to the exam sheet: p_S comes from the Magnus formula, the exam table differs by ≤ ~0,3 % (answers are accepted within 1,5–2 %). With several condensation planes the app uses the full Seileck balance (physically right); the lecture's single-Taupunkt shortcut is shown next to it.

Not in the vault (so flagged in the app): the exact multiple-choice scoring rule of the exam; T_lim of the adaptive model (ASHRAE 55 values used).

## Ideas for later

Mollier h,x-diagram lab · sun-path / shading lab (VO14) · PMV calculator · Heizwärmebedarf balance lab (Q_H with η) · more MC questions (write them into `js/mcq.js`) · photos/scans of own notes.
