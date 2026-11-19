# The Mysteries — full spoiler wiki

> ⚠️ **TOTAL SPOILERS.** This file documents every easter egg in RuneDream for
> developers. If this repo ever goes public and you want players to hunt, keep
> this file out (or move it to a private wiki). The README teases without spoiling.

All mystery state lives in the save and **survives Ragnarök** (secrets are memories).
The Codex tracks progress as **x/8 found** under "The Mysteries".

---

## The Eight Mysteries

| # | Secret | Trigger | Effect | Limits |
|---|--------|---------|--------|--------|
| 1 | **The Wanderer's Gift** | type `odin` anywhere | ravens gift essence = max(25, 3 min of production) | once per Age |
| 2 | **The Trickster's Toll** | type `loki` | steals 10% of essence, returns ×1.25 after 8 s | repeatable, 10 min cooldown |
| 3 | **The Wolf Stirs** | type `fenrir` | next 50 carves deal ×3 | once per Age (refreshes the 50) |
| 4 | **The Root-Drink** | type `yggdrasil` | ×2 essence for 60 s (timed buff) | once per Age |
| 5 | **The Nine Nights** | tap **Ansuz's glyph in the Codex** 9 times | permanent **+9 %** carve crit chance (cap raised 35 % → 44 %) | one-time ever; whisper-count toasts at 3 and 6 taps |
| 6 | **Muninn's Memory** | own **Huginn & Muninn** boon (any rank); Müninn visits every ~10–18 min | rune-pattern memory minigame: watch 4 glyphs flash, click them back. Reward: 2 min of production + ×3 carves for 60 s | repeatable; only fires when no overlay is open |
| 7 | **The Wild Hunt** | be playing during the **real-world midnight hour** (00:00–00:59 local) | ×3 essence for 60 s | once per calendar day |
| 8 | **The Blank Rune ᛬** | **(a)** rare 2 % roll on any *critical* carve at Age ≥ 5, or **(b)** type `nothing` at Age ≥ 3 | unlocks a hidden card in the Wyrd tab: pay **99 Wyrd** once → **×9 all essence, forever** | discovery one-time; purchase one-time |

### Rejected / reserved ideas

- Konami code — the typed-words system covers it with better flavor
- A true 25th *generator* row — too invasive for the Futhark UI; the ×9 Wyrd card is the same fantasy, cheaper to build
- **The ninth mystery** — deliberately left unmade. Nine is the sacred number; it should *hurt* a little that there are only eight.

---

## Norn whispers (hint pool)

One drifts in every **7–15 minutes** (purple italic toast), cycling in order.
Flavor lines and hints are interleaved so players can't tell which is which.

| Whisper | Points at |
|---|---|
| "A raven circles the stone… it has seen your future, and it approves." | flavor |
| "Nine nights. Nine roots. Nine words the god would not say." | Nine Nights |
| "A trickster's laugh echoes through the branches. Names are his favourite doors." | typed words / loki |
| "The old words still work, you know. The true names of the mighty." | typed words |
| "The wolf waits beneath the river, fetter in mouth. Say his name and see." | fenrir |
| "The tree that holds up the sky has a name — and the name opens roots." | yggdrasil |
| "One-eyed, the Wanderer watches. His ravens bring gifts to the curious." | odin |
| "There is a twenty-fifth rune. It has no name, and it is listening." | Blank Rune |
| "Midnight belongs to the Wild Hunt. Be carving when they ride." | Wild Hunt |
| "What the carver forgets, the raven remembers — if you keep the ravens." | Muninn's Memory (buy the ravens) |
| "Somewhere beneath the roots, a well murmurs to those who would pay the price." | flavor (Mímir's Well) |
| "The god won the runes by hanging from the tree. Nine touches for nine nights." | Nine Nights |

The word `nothing` is **never hinted** — it's the deep cut for players who stare at
the Blank Rune lore ("carves nothing… the nothing stares back") and try speaking it.

---

## Implementation reference

Everything is in `index.html`. Search for `MYSTERIES` (data block) and
`mystery machinery` (functions).

**State fields** (in `defaultState()`, merged into old saves automatically):

| Field | Meaning |
|---|---|
| `S.secrets` | `{ secretId: true }` once found — drives Codex x/8 |
| `S.buffs` | timed buffs `[{ type: "prod"\|"click", mult, until }]`, purged each tick |
| `S.wordAge` | typed words locked per Age: `word -> age last spoken` |
| `S.wordCd` | cooldown timestamps (loki only) |
| `S.fenrirCarves` | remaining ×3 carves from the wolf |
| `S.ansuzTaps` | Nine Nights tap progress |
| `S.nextWhisper` / `S.whisperIdx` | whisper scheduler |
| `S.nextMemory` | next Muninn's Memory visit |
| `S.lastWildHunt` | date string, Wild Hunt daily lock |

**Functions:** `castWord`, `mysteryKeystroke` (letter buffer, last 16 chars),
`discoverBlankRune`, `startMemoryGame`, `checkWildHunt(date)`, `markSecret`,
`addBuff`, `whisper`, `prodBuffMult`, `clickBuffMult`.

**Where effects integrate:**

- `globalProdMult()` — × blank rune (9) and × `prodBuffMult()`
- `clickPower()` — × `clickBuffMult()`
- `critChance()` — +0.09 with `nineNights`, cap 0.44
- `carve()` — consumes `fenrirCarves`, rolls blank-rune discovery on crits (Age ≥ 5, 2 %)
- `loop()` — whisper scheduler, memory trigger, `checkWildHunt()`, buff purge
- `buildCodex()` — Mysteries section + Ansuz tap handler
- `buildWyrd()` / `updateWyrd()` — hidden Blank Rune card + purchase

**Balance note:** the sim (`tools/balance-sim.js`) intentionally ignores mysteries —
they're player delight, not core economy. The only large lever is the Blank Rune's
×9, which costs 99 Wyrd and is endgame-only. If it ever skews long-run balance,
re-run the sim with a `blankrune: 1` forced boon to check.

---

*Updated 2026-11-19 — the runes remember.*
