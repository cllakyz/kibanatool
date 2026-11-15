# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root.
- **ADRs in the Obsidian second brain**, not `docs/adr/`: `/Users/celal.akyuz/Documents/spine-os/second-brain/genel/kibanatool/02-Decisions/`. Start at `ADR-Index.md` and read the `accepted` ADRs that touch the area you're about to work in. The vault is written in Turkish. If it contradicts the repo (code, `CLAUDE.md`, constitution), the repo wins.

If `GLOSSARY.md` doesn't exist, **proceed silently**. Don't flag its absence or suggest creating it upfront. `/domain-modeling` creates it when terms are actually settled.

## File structure

```
kibanatool/                          (repo)
├── GLOSSARY.md
└── src/

second-brain/genel/kibanatool/       (Obsidian vault)
└── 02-Decisions/
    ├── ADR-Index.md
    ├── ADR-0001-wxt-react-typescript-mv3.md
    └── …
```

## Recording ADRs

Never create `docs/adr/`. A new ADR, including one from `/domain-modeling`, goes into the vault by the flow in `.agents/rules/obsidian-second-brain.md`:
- take the next 4-digit number from `ADR-Index.md`
- use the `tpl-adr.md` template and write it in Turkish
- add it to both indexes and to the day's log

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an accepted ADR, say so explicitly instead of quietly overriding it:

> _Contradicts ADR-0003 (optional host permissions, runtime registration), but worth reopening because…_

Then follow the vault rule's conflict guard: don't change code until the user decides whether the old ADR is superseded or this is an exception.
