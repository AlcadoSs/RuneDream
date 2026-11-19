# RuneDream balance sim — 2h sessions

Logic extracted live from `index.html` (24 runes, 12 binds, 6 boons).

| strategy | clicks | first rune | aett 2 | aett 3 | first bind | ragna ready | prestiges | deepest rune | peak rate/s | peak cycle | lifetime | stall% | avg gap |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pure Idler | 15 | 0m | — | — | — | 57m | 2 | Wunjo (8/24) | 7.74K/s | 2.20M | 3.20M | 78% | 106s |
| Hardcore Clicker | 43.2K | 0m | 1.5h | — | — | 33m | 3 | Wunjo (8/24) | 13.6K/s | 4.84M | 8.89M | 69% | 56s |
| Casual | 900 | 1m | — | — | — | 44m | 2 | Wunjo (8/24) | 7.74K/s | 2.20M | 3.23M | 61% | 97s |
| ROI Optimizer | 14.4K | 0m | 1.9h | — | — | 40m | 3 | Wunjo (8/24) | 13.6K/s | 4.84M | 8.05M | 72% | 67s |
| Fehu Vertigo | 21.6K | 0m | 23m | — | — | — | 0 | Fehu (1/24) | 69/s | 345K | 345K | 68% | 124s |
| Bind Collector | 28.8K | 1m | 1.7h | — | — | 36m | 3 | Wunjo (8/24) | 13.6K/s | 4.84M | 8.15M | 72% | 59s |
| Prestige Speedrunner | 36.0K | 0m | 1.6h | — | — | 34m | 3 | Wunjo (8/24) | 13.6K/s | 4.84M | 8.35M | 69% | 58s |
| Hoarder | 7.20K | 3m | — | — | — | 1.1h | 1 | Kenaz (6/24) | 2.01K/s | 1.00M | 1.64M | 90% | 600s |
| MAX Buyer | 14.4K | 0m | 32m | — | — | 40m | 3 | Wunjo (8/24) | 7.93K/s | 4.84M | 8.04M | 73% | 88s |
| Aett Rusher | 14.4K | 0m | 9m | — | — | — | 0 | Thurisaz (3/24) | 36/s | 274K | 274K | 92% | 180s |

## Production rate over time (essence/sec)

| strategy | 5m | 15m | 30m | 1h | 2h | 4h | 8h |
|---|---|---|---|---|---|---|---|
| Pure Idler | 0.1 | 3.6 | 80 | 0.2 | — | — | — |
| Hardcore Clicker | 18 | 80 | 1.42K | 1.84K | — | — | — |
| Casual | 4.4 | 18 | 337 | 5.7 | — | — | — |
| ROI Optimizer | 4.4 | 80 | 337 | 438 | — | — | — |
| Fehu Vertigo | 6.6 | 21 | 25 | 29 | — | — | — |
| Bind Collector | 4.4 | 80 | 1.42K | 1.84K | — | — | — |
| Prestige Speedrunner | 18 | 80 | 1.42K | 1.84K | — | — | — |
| Hoarder | 0.9 | 4.7 | 20 | 367 | — | — | — |
| MAX Buyer | 4.4 | 80 | 340 | 446 | — | — | — |
| Aett Rusher | 9.2 | 36 | 36 | 36 | — | — | — |

## Lifetime essence over time

| strategy | 5m | 15m | 30m | 1h | 2h | 4h | 8h |
|---|---|---|---|---|---|---|---|
| Pure Idler | 57 | 486 | 13.9K | 1.00M | — | — | — |
| Hardcore Clicker | 4.08K | 44.4K | 732K | 2.14M | — | — | — |
| Casual | 968 | 9.65K | 152K | 1.00M | — | — | — |
| ROI Optimizer | 1.33K | 16.1K | 220K | 1.12M | — | — | — |
| Fehu Vertigo | 2.14K | 14.5K | 39.6K | 97.6K | — | — | — |
| Bind Collector | 2.17K | 32.4K | 470K | 1.51M | — | — | — |
| Prestige Speedrunner | 3.21K | 39.1K | 614K | 1.86M | — | — | — |
| Hoarder | 437 | 3.05K | 19.5K | 434K | — | — | — |
| MAX Buyer | 1.32K | 16.2K | 223K | 1.13M | — | — | — |
| Aett Rusher | 1.89K | 21.4K | 57.6K | 130K | — | — | — |

## End state after 2h

| strategy | age | runes owned | total levels | binds found | wyrd held | boons |
|---|---|---|---|---|---|---|
| Pure Idler | 3 | 3/24 | 6 | 0/12 | 0 | hlid1, slei1 |
| Hardcore Clicker | 4 | 7/24 | 28 | 0/12 | 8 | hlid1, slei1 |
| Casual | 3 | 5/24 | 15 | 0/12 | 0 | hlid1, slei1 |
| ROI Optimizer | 4 | 4/24 | 7 | 0/12 | 8 | hlid1, slei1 |
| Fehu Vertigo | 1 | 1/24 | 58 | 0/12 | 0 | — |
| Bind Collector | 4 | 6/24 | 21 | 0/12 | 8 | hlid1, slei1 |
| Prestige Speedrunner | 4 | 7/24 | 24 | 0/12 | 8 | hlid1, slei1 |
| Hoarder | 2 | 6/24 | 37 | 0/12 | 0 | hlid1 |
| MAX Buyer | 4 | 3/24 | 6 | 0/12 | 8 | hlid1, slei1 |
| Aett Rusher | 1 | 3/24 | 40 | 0/12 | 0 | — |

## Archetypes

- **Pure Idler** — taps just enough to carve Fehu, then never touches the stone; buys greedily every 5s
- **Hardcore Clicker** — 6 carves/sec all session; buys every 1s
- **Casual** — 1.5 carves/sec for the first 10 min, then walks away; buys every 30s
- **ROI Optimizer** — 2 carves/sec; always buys the shortest-payback upgrade (binds included)
- **Fehu Vertigo** — 3 carves/sec; only ever levels Fehu (MAX); never prestiges
- **Bind Collector** — 4 carves/sec; rushes pairs to Lv10, binds the moment it can
- **Prestige Speedrunner** — 5 carves/sec; burns the world the moment it can; Mímir first
- **Hoarder** — 1 carve/sec; only buys when essence ≥ 10× cost; best ROI
- **MAX Buyer** — 2 carves/sec; MAX-buys the single best ROI rune each decision (binds included)
- **Aett Rusher** — 2 carves/sec; spreads levels to open gates fast, then top-loaded buying
