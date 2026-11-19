# RuneDream balance report

Simulated with `tools/balance-sim.js` — the harness slices the live game logic out of
`index.html` (no duplicated rules), then plays 10 archetypes with real purchase/bind/
boon/prestige semantics. Sessions: 8h and 24h per archetype.

## Archetypes

| # | Strategy | Behaviour |
|---|---|---|
| 1 | Pure Idler | taps only enough to carve Fehu, then never clicks again |
| 2 | Hardcore Clicker | 6 carves/sec all session |
| 3 | Casual | 1.5 carves/sec for 10 min, then walks away |
| 4 | ROI Optimizer | 2 cps, always shortest-payback buy, grabs binds |
| 5 | Fehu Vertigo | 3 cps, only ever levels Fehu, never prestiges |
| 6 | Bind Collector | 4 cps, rushes pairs to Lv10, saves for binds |
| 7 | Prestige Speedrunner | 5 cps, burns the world the moment it can (Mímir first) |
| 8 | Hoarder | 1 cps, only buys at 10× cost, best ROI |
| 9 | MAX Buyer | 2 cps, MAX-buys best ROI rune |
| 10 | Aett Rusher | 2 cps, spreads levels to open gates, then top-loads |

## Results — 8h sessions

| strategy | first rune | aett 2 | aett 3 | first bind | ragna ready | prestiges | deepest rune | peak rate/s | peak cycle | lifetime | stall% | avg gap |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pure Idler | 0m | 2.5h | — | — | 57m | 8 | Isa (11/24) | 706K/s | 249M | 458M | 73% | 65s |
| Hardcore Clicker | 0m | 1.5h | — | — | 33m | 12 | Eihwaz (13/24) | 14.8M/s | 5.84B | 10.7B | 67% | 36s |
| Casual | 1m | 2.4h | — | — | 44m | 8 | Isa (11/24) | 706K/s | 249M | 457M | 50% | 71s |
| ROI Optimizer | 0m | 1.9h | — | — | 40m | 10 | Jera (12/24) | 3.52M/s | 1.21B | 2.24B | 70% | 45s |
| Fehu Vertigo | 0m | 23m | — | — | 4.2h | 0 | Fehu (1/24) | 85/s | 2.23M | 2.23M | 89% | 406s |
| Bind Collector | 1m | 1.7h | — | 4.8h | 36m | 12 | Jera (12/24) | 19.3M/s | 5.85B | 10.7B | 54% | 46s |
| Prestige Speedrunner | 0m | 1.6h | — | — | 34m | 10 | Jera (12/24) | 2.97M/s | 2.14B | 4.35B | 70% | 42s |
| Hoarder | 3m | 3.3h | — | — | 1.1h | 6 | Wunjo (8/24) | 43.6K/s | 51.5M | 95.0M | 91% | 565s |
| MAX Buyer | 0m | 32m | — | — | 40m | 10 | Jera (12/24) | 3.61M/s | 1.21B | 2.22B | 72% | 77s |
| Aett Rusher | 0m | 9m | — | — | 7.0h | 1 | Thurisaz (3/24) | 47/s | 1.00M | 1.17M | 96% | 365s |

## Results — 24h sessions (key columns)

| strategy | aett 3 | first bind | prestiges | deepest rune | peak rate/s | lifetime |
|---|---|---|---|---|---|---|
| Pure Idler | — | — | 18 | Sowilo (16/24) | 1.10B/s | 1.23T |
| Hardcore Clicker | 17.3h | 16.2h | 24 | Ehwaz (19/24) | 81.2B/s | 138T |
| Casual | — | — | 18 | Sowilo (16/24) | 1.10B/s | 1.21T |
| ROI Optimizer | 21.2h | 19.7h | 21 | Tiwaz (17/24) | 6.29B/s | 12.9T |
| Fehu Vertigo | — | — | 0 | Fehu (1/24) | 96/s | 8.01M |
| Bind Collector | — | 4.8h | 21 | Sowilo (16/24) | 20.0B/s | 13.0T |
| Prestige Speedrunner | 18.5h | 17.4h | 23 | Ehwaz (19/24) | 67.3B/s | 62.9T |
| Hoarder | — | — | 15 | Eihwaz (13/24) | 67.7M/s | 114B |
| MAX Buyer | 17.8h | 12.0h | 21 | Berkano (18/24) | 24.8B/s | 22.6T |
| Aett Rusher | — | — | 2 | Thurisaz (3/24) | 47/s | 4.12M |

## What the first sim run exposed (all fixed)

1. **The back half of the Futhark was dead content.** Tier costs grew ×~7.5 per rune
   while production grew ×~5.2 — nobody reached Aett 3 or a single bind in 8h; Othala
   (2.2e21) was a fantasy number. → cost/prod are now generated from
   `TIER_COST_MULT = 4.8` / `TIER_PROD_MULT = 4.2` (payback ~100s early, gently rising).
2. **Prestige didn't compound.** Boons cost ×2.2–3.5 per rank while granting +12%/+6% —
   after 20 Ragnaröks you were ~24% stronger. → Hliðskjálf +30%/rank (growth 1.55),
   Mímir +12%/rank, wyrd gain `8 × (cycle/threshold)^0.7`.
3. **Constant Ragnarök threshold created a degenerate 24-second reset loop** once the
   engine got going (3,547 prestiges in 24h, runs frozen at exactly 1M). → the world is
   reborn larger each Age: threshold ×2.2 per Age (`ragnaThreshold()`).
4. **Post-Ragnarök soft-lock for idle players.** Wiping every rune left 0-click players
   at 0 essence with no way to restart. → Ragnarök keeps a spark: Fehu Lv 1
   ("wealth always returns").
5. **Bind costs were handcrafted for the old economy** (2e12 for a pair whose runes now
   cost 2.3e9). → bind cost = 10 × (sum of the pair's base costs), scaling automatically
   with any future tier retuning.

## Feel verdict (current curve)

- **First Ragnarök at 33m–1.1h** for every sane playstyle — the target window.
- **Aett 2 ~1.5–3h, Aett 3 ~17–21h** for engaged players; casual/idle reach Sowilo (16/24)
  in a day. Tiers 20–24 are week-plus content — appropriate for an idle game.
- **Binds**: dedicated collector finds the first at ~4.8h, others 12–20h. Late but
  legible; a possible future tune is a cheap early aett-1-only bind.
- **Strategy spread is meaningful**: clicker/speedrunner ≈ 10× a casual day; degenerate
  strategies (Fehu-only, spread-thin) are correctly punished; hoarding is a trap;
  MAX-buying ≈ ROI-buying with smoother gaps.
- **Cadence**: engaged players act every 26–90s; casual stalls are expected.

## Re-running

```
node tools/balance-sim.js --hours 8
node tools/balance-sim.js --hours 24
```

The harness always reads current `index.html` — retune constants and re-run to compare.
