# Taupunkt — Bauphysik exam trainer

A web app (plain HTML/CSS/JS, no build step, installable as a PWA) to prepare for the **Bauphysik** exam (TU Wien, Ulrich Pont, LVA 259.606). It turns the Obsidian vault in
`G:\My Drive\02 Education\01 Lectures\06 Bauphysik\BAUPHYSIK\Bauphysik` into something you can *do*: explore, simulate, drill and take mock exams.

> **Live:** https://dkepce.github.io/taupunkt-98e4bf7c53/ — a public but unguessable link (repo `dkepce/taupunkt-98e4bf7c53`, `noindex`). Open it in Brave/Chrome and use the browser's *Install* button to get it as a PC app. `data/` holds the course's question catalogues and formula sheet; Doruk decided he does not mind that being public.

## Start it

Double-click **`Start Taupunkt.bat`** in the folder above (or run `python tools/serve.py` inside `app/`), then open http://localhost:8130.
It must run through this little server (not by double-clicking `index.html`), because the browser blocks loading the data files from `file://`.
Use Brave / Chrome / Edge: they can save into a folder you choose (File System Access API).

## How it is organised

Top bar = six tabs (Alt+1…6). Almost every tab has a **left sidebar** for context (modules, labs, topics, sections) and a wide work area. **Ctrl+K** searches all cards, formulas, symbols and modules.

| Tab | What it does |
|---|---|
| **Übersicht** | *Heute*: a daily plan (due cards, new cards, 5 calculations, 10 quiz questions, Glaser every 2 days, a weekly mock exam) with one primary button, exam countdown, "continue where you stopped", all 13 modules as small progress tiles, first-run set-up. *Fortschritt*: mastery per module, daily dose, weak spots, history, heat map. *Speicher & Einstellungen*: save folder, backup, exam date, theme, shortcuts, reset. |
| **Lernen** | The learning path (13 modules, grouped, with progress rings). One module page: title, exam weight, "builds on / leads to", five practice shortcuts in a sensible order (goals → cards → calculations → quiz → lab), tick-off learning goals, the lecturer's favourite questions with answers, the exam-risk note and the formulas. |
| **Labor** | Sidebar: the five labs and the controls of the current one. Wide area: charts and the explanation. *Wandaufbau* (U-value, temperature profile, Formblatt), *Glaser-Diagramm* (Seileck, Taupunkt, G_K/G_A, goals), *Taupunkt & Schimmel*, *Wärmeeindringung*, *Operative Temperatur*. Each lab ends with a link to the matching practice. |
| **Üben** | Sidebar: Karten / Quiz / Rechnen / Glaser-Training and a topic filter (one module or all). Centre: one focused activity — 506 spaced-repetition cards (keyboard: Space, 1–4), 39 exam-format multiple-choice questions with three scoring regimes, 23 calculation types with random numbers, the timed Glaser drill. |
| **Prüfung** | Mock exam (10 MC + 4 calculations + Glaser, 30 P, 120 min, 50 % to pass). While running, the sidebar is the exam navigator: timer, numbered questions (answered / flagged "⚑ später" for the two-pass tactic), hand-in; after hand-in the numbers turn green/red. |
| **Formeln** | Sidebar: Formelsammlung (by section) / Symbole & Aussprache / Tabellen. *Prüfungsblatt-Modus* hides names, VO and units like the real sheet. |

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
    ui.js          layout pieces: sidebar + stage, navigation rows, progress rings
    charts.js  lab-wall.js  lab-glaser.js  lab-extra.js  glaser-drill.js  tab-uebersicht.js  tab-lernen.js  tab-labor.js  tab-ueben.js  tab-pruefung.js  tab-formeln.js  app.js
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
