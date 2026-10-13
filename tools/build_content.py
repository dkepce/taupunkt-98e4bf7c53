#!/usr/bin/env python3
"""
Bauphysik content builder.

Reads Doruk's Bauphysik Obsidian vault (READ ONLY) and writes the JSON files the app loads from ../data/:
  cards.json     question/answer cards (official question catalogues + concept questions)
  formulas.json  the Formelsammlung, section by section, with the lecture each formula was used in
  symbols.json   the "Variablen & Aussprache" tables (symbol, pronunciation, meaning, unit)
  modules.json   the 13 Study Modules (checklist, exam risk, quick formulas)

Run:   python -X utf8 build_content.py
The vault is never modified. Re-run any time the vault changes.
"""
import json, re, hashlib, sys
from pathlib import Path

VAULT = Path(r"G:\My Drive\02 Education\01 Lectures\06 Bauphysik\BAUPHYSIK\Bauphysik")
OUT = Path(__file__).resolve().parent.parent / "data"
OUT.mkdir(exist_ok=True)

# which Study Module each lecture (VO) belongs to
VO2MOD = {2: 1, 3: 2, 4: 3, 10: 4, 8: 5, 11: 6, 7: 7, 9: 7, 5: 8, 6: 9, 12: 10, 14: 11, 13: 12, 15: 13}


def read(p):
    return Path(p).read_text(encoding="utf-8")


# ---------- markdown cleaning ----------
WIKI = re.compile(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")


def wiki_sub(m):
    if m.group(2):
        return m.group(2)
    t = m.group(1).split("#")[0].split("/")[-1]
    return t


def clean(text):
    text = WIKI.sub(wiki_sub, text)
    out = []
    for ln in text.split("\n"):
        s = ln
        if s.startswith(">"):
            s = re.sub(r"^(>\s?)+", "", s)
            if re.match(r"\[![\w-]+\][+-]?\s*", s):
                s = re.sub(r"^\[![\w-]+\][+-]?\s*", "**", s)
                s = s.rstrip()
                s = s + "**" if len(s) > 2 else ""
        if re.match(r"^#frage|^#bauphysik", s.strip()):
            continue
        out.append(s)
    t = "\n".join(out)
    t = re.sub(r"\n{3,}", "\n\n", t).strip()
    t = re.sub(r"^\*\*\*\*$", "", t, flags=re.M)
    return t


def cid(*parts):
    return hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()[:10]


def norm(q):
    return re.sub(r"\W+", "", q.lower())[:90]


HOT = re.compile(r"Prüfung|Prufung|favou?rite|Lieblings|beliebt|exam", re.I)

# ---------- cards ----------
cards, seen = [], set()


def add_card(q, a, vo, src, kind):
    q = clean(q).strip()
    a = clean(a).strip()
    if not q or not a:
        return
    k = norm(q)
    if k in seen:
        return
    seen.add(k)
    cards.append({"id": cid(q), "q": q, "a": a, "mod": VO2MOD.get(vo, 0), "vo": vo, "src": src, "kind": kind,
                  "hot": bool(HOT.search(a)) or "lecturer-flagged" in src})


def vo_of(name):
    m = re.search(r"VO\s?(\d+)", name)
    return int(m.group(1)) if m else 0


# 1) concept questions in "VOn - Fragen/F*.md". The files use four layouts:
#    (A) "## Frage" + body   (B) "**Frage:** ..." + "**Antwort:** ..."   (C) "**Q1. Frage?**" + body   (D) "### Frage" + "**Antwort**: ..."
P_FRAGE = re.compile(r"^\*\*Frage:\*\*\s*(.+)$")
P_Q = re.compile(r"^\*\*Q\d+\.\s*(.+?)\*\*\s*$")
P_HEAD = re.compile(r"^(#{2,3})\s+(.+)$")


def concept_blocks(txt):
    """yield (question, answer-lines) for every question-like block in a file"""
    cur, body = None, []
    for ln in txt.split("\n"):
        mq, mf, mh = P_Q.match(ln), P_FRAGE.match(ln), P_HEAD.match(ln)
        if mq or mf or mh or ln.strip() == "---":
            if cur is not None:
                yield cur, body
            cur, body = None, []
            if mq:
                cur = mq.group(1)
            elif mf:
                cur = mf.group(1)
            elif mh:
                cur = mh.group(2)
            continue
        if cur is not None:
            body.append(ln)
    if cur is not None:
        yield cur, body


for f in sorted(VAULT.glob("VO* - Fragen/F*.md")):
    if "Rechenbeispiel" in f.name or "Prüfungsbeispiel" in f.name or "Übungsbeispiele" in f.name:
        continue
    vo = vo_of(f.parent.name)
    mod = VO2MOD.get(vo, 0)
    if vo == 12 and "Komfort" in f.name:
        mod = 9
    for q, body in concept_blocks(read(f)):
        b = "\n".join(body).strip()
        if "#frage/rechenbeispiel" in b:
            continue
        b = re.sub(r"^#frage[^\n]*\n?", "", b, flags=re.M).strip()
        b = re.sub(r"^\*\*Antwort:?\*\*:?\s*", "", b)
        q = q.strip().strip("*").strip()
        if len(b) < 25 or b.startswith("|") or re.search(r"^(Up|Prev|Next):", b, re.M) and len(b) < 80:
            continue
        before = len(cards)
        add_card(q, b, vo, f.stem, "concept")
        if len(cards) > before:
            cards[-1]["mod"] = mod

# 2) official catalogues "99 Offizieller Fragenkatalog" — table rows | # | Frage | Antwort |
for f in sorted(VAULT.glob("VO* - Fragen/99 Offizieller*.md")):
    fvo = vo_of(f.parent.name)
    cur_vo = fvo
    for ln in read(f).split("\n"):
        if ln.startswith("## "):
            cur_vo = fvo
        m = re.search(r"VO(\d+)\s*(?:Note|F\d)", ln)
        if m and not ln.startswith("|"):
            cur_vo = int(m.group(1))
        if not ln.startswith("|"):
            continue
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        if len(cells) < 3 or not re.match(r"^\d+([–\-,]\s?\d+)*$", cells[0].replace(" ", "")):
            continue
        q, a = cells[1], "|".join(cells[2:])
        if q.lower() in ("frage", "frage (gekürzt)"):
            continue
        add_card(q, a, cur_vo, f.parent.name.split(" - ")[0] + " Katalog #" + cells[0], "catalog")
        if cards and cards[-1]["q"] == clean(q):
            if cur_vo == 12 and re.search(r"Komfort|PMV|operativ", q, re.I):
                cards[-1]["mod"] = 9

(OUT / "cards.json").write_text(json.dumps(cards, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print("cards:", len(cards), "| concept", sum(c["kind"] == "concept" for c in cards), "| catalog", sum(c["kind"] == "catalog" for c in cards))

# ---------- formulas ----------
txt = read(VAULT / "Formelsammlung (Gesamtes Semester).md")
secs, cur = [], None
pending, last_was_pin, label = [], False, ""
lines = txt.split("\n")
i = 0
while i < len(lines):
    ln = lines[i]
    sraw = re.sub(r"^(>\s?)+", "", ln).rstrip()
    mh = re.match(r"^## (\d+)\.\s*(.+)", ln)
    if mh:
        cur = {"n": int(mh.group(1)), "title": mh.group(2).strip(), "items": []}
        secs.append(cur)
        pending, last_was_pin, label = [], False, ""
        i += 1
        continue
    if cur is None:
        i += 1
        continue
    if "📍" in sraw:
        vos = sorted({int(x) for x in re.findall(r"VO(\d+)", sraw)})
        for f in pending:
            f["vo"] = sorted(set(f["vo"]) | set(vos))
        last_was_pin = True
        i += 1
        continue
    mb = re.match(r"^\*\*(.+?)\*\*:?$", sraw.strip())
    mc = re.match(r"^\[![\w-]+\]\s*(.+)$", sraw.strip())
    if mb:
        label = re.sub(r"\s*\(.*?\)\s*$", "", mb.group(1)).strip(": ")
    elif mc:
        label = mc.group(1).strip()
    if sraw.strip().startswith("$$"):
        buf = sraw.strip()
        if not (len(buf) > 4 and buf.endswith("$$")):
            j = i + 1
            while j < len(lines):
                nxt = re.sub(r"^(>\s?)+", "", lines[j]).rstrip()
                buf += "\n" + nxt
                if nxt.strip().endswith("$$"):
                    break
                j += 1
            i = j
        tex = buf.strip()[2:-2].strip()
        if last_was_pin:
            pending, last_was_pin = [], False
        item = {"tex": tex, "label": label, "vo": []}
        cur["items"].append(item)
        pending.append(item)
        label = ""
    i += 1

(OUT / "formulas.json").write_text(json.dumps(secs, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print("formula sections:", len(secs), "| formulas", sum(len(s["items"]) for s in secs))

# ---------- symbols ----------
txt = read(VAULT / "Variablen & Aussprache.md")
symbols, section, header = [], "", []
for ln in txt.split("\n"):
    if ln.startswith("## "):
        section = ln[3:].strip()
        header = []
        continue
    if not ln.startswith("|"):
        continue
    cells = [c.strip() for c in ln.strip().strip("|").split("|")]
    if all(re.match(r"^:?-+:?$", c) for c in cells):
        continue
    if not cells[0].startswith("$") and not header:
        header = [c.lower() for c in cells]
        continue
    if not cells[0].startswith("$") and "symbol" in cells[0].lower():
        header = [c.lower() for c in cells]
        continue
    if not header or len(cells) != len(header):
        continue
    rec = {"section": section}
    for h, c in zip(header, cells):
        if h.startswith("symbol"):
            rec["sym"] = c
        elif h.startswith("aussprache"):
            rec["pron"] = clean(c)
        elif h.startswith("bedeutung"):
            rec["meaning"] = clean(c)
        elif h.startswith("einheit"):
            rec["unit"] = clean(c)
        elif h.startswith("name"):
            rec["name"] = clean(c)
    if rec.get("sym"):
        symbols.append(rec)
(OUT / "symbols.json").write_text(json.dumps(symbols, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print("symbols:", len(symbols))

# ---------- modules ----------
modules = []
for f in sorted((VAULT / "Study Modules").glob("M[0-9][0-9]*.md")):
    t = read(f)
    n = int(f.name[1:3])
    title = re.search(r"^# M\d+\s*[—-]\s*(.+)$", t, re.M)
    vos = re.search(r"source_vo:\s*\[(.*?)\]", t)
    learn, group = [], None
    sec = ""
    risk, formulas = [], []
    for ln in t.split("\n"):
        if ln.startswith("## "):
            sec = ln[3:].strip().lower()
            continue
        if sec.startswith("what to learn"):
            mb = re.match(r"^\*\*(.+?)\*\*\s*$", ln.strip())
            if mb:
                group = {"h": clean(mb.group(1)), "items": []}
                learn.append(group)
            mi = re.match(r"^- \[[ x]\]\s*(.+)$", ln)
            if mi:
                if group is None:
                    group = {"h": "", "items": []}
                    learn.append(group)
                group["items"].append(clean(mi.group(1)))
        elif sec.startswith("exam risk"):
            if ln.strip():
                risk.append(ln)
        elif sec.startswith("quick formula"):
            if ln.startswith("|") and not re.match(r"^\|\s*-", ln) and "Concept" not in ln and "Formula" not in ln:
                cells = [c.strip() for c in ln.strip().strip("|").split("|")]
                if len(cells) >= 2:
                    formulas.append([clean(cells[0]), cells[1]])
    modules.append({
        "n": n,
        "title": title.group(1).strip() if title else f.stem,
        "vos": [int(x) for x in re.findall(r"\d+", vos.group(1))] if vos else [],
        "learn": [g for g in learn if g["items"]],
        "risk": clean("\n".join(risk)),
        "formulas": formulas,
    })
(OUT / "modules.json").write_text(json.dumps(modules, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print("modules:", len(modules), "| checklist items", sum(len(g["items"]) for m in modules for g in m["learn"]))
