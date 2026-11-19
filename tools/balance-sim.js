#!/usr/bin/env node
/**
 * RuneDream balance simulator.
 *
 * Slices the pure game logic (DATA + STATE + DERIVED) straight out of ../index.html
 * and runs 10 player archetypes through 8-hour sessions, mirroring the game's
 * exact purchase / bind / boon / Ragnarök rules.
 *
 * Usage:  node tools/balance-sim.js [--hours 8]
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const HOURS = parseFloat((process.argv.includes("--hours") ? process.argv[process.argv.indexOf("--hours") + 1] : "8"), 10);

/* ---------------------------------------------------------------
 * 1. Extract the game's real logic from index.html
 * --------------------------------------------------------------- */
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const script = html.split("<script>")[1].split("</script>")[0];
const startMark = script.indexOf("const GROWTH");
const endMark = script.indexOf("/* ------------------------------------------------ PERSIST */");
if (startMark < 0 || endMark < 0 || endMark <= startMark) {
  console.error("Could not slice game logic out of index.html — markers moved?");
  process.exit(1);
}
const logic = script.slice(startMark, endMark);

// Expose everything the harness needs from the evaluated scope.
const factory = new Function(logic + "\n;return {" + [
  "RUNES", "BINDS", "BOONS", "AETTS", "GROWTH", "MS_THRESHOLDS", "RAGNA_THRESHOLD",
  "defaultState", "aettLevels", "aettUnlocked", "bindMult", "bindSum", "runeMultOf",
  "milestoneCount", "runeProd", "globalProdMult", "totalProd", "costDiscount",
  "runeCost", "bulkCost", "maxAffordable", "clickPower", "critChance",
  "offlineStats", "wyrdGain", "ragnaThreshold", "fmt",
].join(",") + ", getGameState(){return S}, setGameState(v){S=v}};");
const G = factory();
let S; // shared with the extracted game functions — always assign via resetState()
function resetState() { S = G.defaultState(); G.setGameState(S); }

/* ---------------------------------------------------------------
 * 2. Game actions, mirrored 1:1 from index.html (minus UI)
 * --------------------------------------------------------------- */
function earn(n) { S.essence += n; S.lifetime += n; S.cycle += n; }

const RUNE_LEVEL_CAP = 1000; // mirrors the game's cap; bots don't transcend
function buy(id, amount) { // amount: 1 | 10 | "max"
  const r = G.RUNES.find(x => x.id === id);
  if (!G.aettUnlocked(r.aett)) return 0;
  const lvl = S.runes[id] || 0;
  if (lvl >= RUNE_LEVEL_CAP) return 0;
  let n = amount === "max" ? G.maxAffordable(r) : amount;
  n = Math.min(n, RUNE_LEVEL_CAP - lvl);
  if (n <= 0) return 0;
  let cost = G.bulkCost(r, lvl, n);
  while (n > 1 && cost > S.essence) { n--; cost = G.bulkCost(r, lvl, n); }
  if (cost > S.essence || n <= 0) return 0;
  S.essence -= cost;
  S.runes[id] = lvl + n;
  if (!S.discovered.runes.includes(id)) S.discovered.runes.push(id);
  return n;
}

function bindReady(b) { return b.pair.every(id => (S.runes[id] || 0) >= 10); }
function unlockBind(id) {
  const b = G.BINDS.find(x => x.id === id);
  if (!b || S.binds.includes(id) || !bindReady(b) || S.essence < b.cost) return false;
  S.essence -= b.cost;
  S.binds.push(id);
  if (!S.discovered.binds.includes(id)) S.discovered.binds.push(id);
  return true;
}

function boonCost(b) { return Math.ceil(b.baseCost * Math.pow(b.growth, S.boons[b.id] || 0)); }
function buyBoon(id) {
  const b = G.BOONS.find(x => x.id === id);
  const rank = S.boons[id] || 0;
  if (b.max && rank >= b.max) return false;
  if (S.wyrd < boonCost(b)) return false;
  S.wyrd -= boonCost(b);
  S.boons[id] = rank + 1;
  return true;
}

function doRagnarok() {
  const gain = G.wyrdGain();
  if (gain <= 0) return 0;
  S.wyrd += gain;
  const keep = Math.min(S.boons.ravens || 0, S.binds.length);
  const pool = [...S.binds], kept = [];
  for (let i = 0; i < keep; i++) kept.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  S.essence = 0; S.cycle = 0;
  S.runes = { fehu: 1 }; // the game keeps a spark of Fehu through the burning
  S.binds = kept; S.age++;
  return gain;
}

/* marginal +1 level of a rune -> essence/sec gained (includes milestone jumps) */
function marginal(r) {
  const lvl = S.runes[r.id] || 0;
  if (lvl >= RUNE_LEVEL_CAP) return 0; // capped runes can't grow (transcend not simulated)
  const now = lvl ? G.runeProd(r) : 0;
  // mirror the game's milestone math: ×2 per named tier, then deepenings per +100
  const named = [10, 25, 50, 100].filter(t => lvl + 1 >= t).length;
  const deep = Math.max(0, Math.floor((lvl + 1) / 100) - 1);
  const after = r.prod * (lvl + 1) * Math.pow(2, named) * Math.pow(2, deep) * G.runeMultOf(r.id);
  return (after - now) * G.globalProdMult();
}
function bestROI() {
  let best = null, bestPay = Infinity;
  for (const r of G.RUNES) {
    if (!G.aettUnlocked(r.aett)) continue;
    const cost = G.bulkCost(r, S.runes[r.id] || 0, 1);
    const m = marginal(r);
    if (m <= 0) continue;
    const pay = cost / m;
    if (pay < bestPay) { bestPay = pay; best = r; }
  }
  return best;
}
function greedyBuy() { // affordable bind first (players grab the shiny), then cheapest new rune, then best ROI
  const bs = affordableBinds();
  if (bs.length) { unlockBind(bs[0].id); return 1; }
  for (const r of G.RUNES)
    if (G.aettUnlocked(r.aett) && !(S.runes[r.id] || 0) && S.essence >= G.bulkCost(r, 0, 1))
      return buy(r.id, 1);
  const b = bestROI();
  return b ? buy(b.id, 1) : 0;
}
function affordableBinds() {
  return G.BINDS.filter(b => !S.binds.includes(b.id) && bindReady(b) && S.essence >= b.cost)
                .sort((a, b) => a.cost - b.cost);
}

/* ---------------------------------------------------------------
 * 3. Player archetypes
 * --------------------------------------------------------------- */
const BOON_STANDARD = ["hlidskjalf", "mimir", "gungnir", "sleipnir", "ravens", "bifrost"];
const BOON_WYRD_RUSH = ["mimir", "hlidskjalf", "gungnir", "sleipnir", "ravens", "bifrost"];

const STRATEGIES = [
  { id: "idle_pure", name: "Pure Idler", desc: "taps just enough to carve Fehu, then never touches the stone; buys greedily every 5s",
    cps: () => ((S.essence < 15 && !S.runes.fehu) ? 1 : 0), cadence: 5, prestige: "standard",
    decide() { greedyBuy(); } },

  { id: "active_hardcore", name: "Hardcore Clicker", desc: "6 carves/sec all session; buys every 1s",
    cps: () => 6, cadence: 1, prestige: "standard",
    decide() { greedyBuy(); } },

  { id: "casual", name: "Casual", desc: "1.5 carves/sec for the first 10 min, then walks away; buys every 30s",
    cps: t => t < 600 ? 1.5 : 0, cadence: 30, prestige: "standard",
    decide() { greedyBuy(); } },

  { id: "roi_optimizer", name: "ROI Optimizer", desc: "2 carves/sec; always buys the shortest-payback upgrade (binds included)",
    cps: () => 2, cadence: 1, prestige: "standard",
    decide() {
      const bs = affordableBinds();
      if (bs.length) { unlockBind(bs[0].id); return; }
      const b = bestROI(); if (b) buy(b.id, 1);
    } },

  { id: "fehu_vertigo", name: "Fehu Vertigo", desc: "3 carves/sec; only ever levels Fehu (MAX); never prestiges",
    cps: () => 3, cadence: 2, prestige: "never",
    decide() { buy("fehu", "max"); } },

  { id: "bind_rusher", name: "Bind Collector", desc: "4 carves/sec; rushes pairs to Lv10, binds the moment it can",
    cps: () => 4, cadence: 1, prestige: "standard",
    decide() {
      const bs = affordableBinds();
      if (bs.length) { unlockBind(bs[0].id); return; }
      // steer toward the cheapest upcoming bind; once its pair is Lv10, SAVE for it
      const next = G.BINDS.filter(b => !S.binds.includes(b.id)).map(b => {
        const [x, y] = b.pair.map(id => G.RUNES.find(r => r.id === id));
        const lx = S.runes[x.id] || 0, ly = S.runes[y.id] || 0;
        return { b, need: Math.max(0, 10 - lx) + Math.max(0, 10 - ly), x, y, lx, ly };
      }).sort((a, b) => (a.b.cost - b.b.cost))[0];
      if (next && next.need > 0) {
        const target = next.lx <= next.ly ? next.x : next.y;
        if (G.aettUnlocked(target.aett)) { buy(target.id, 1); return; }
      }
      if (next && next.need === 0 && S.essence < next.b.cost) return; // hold essence for the bind
      greedyBuy();
    } },

  { id: "prestige_rush", name: "Prestige Speedrunner", desc: "5 carves/sec; burns the world the moment it can; Mímir first",
    cps: () => 5, cadence: 1, prestige: "asap", boons: BOON_WYRD_RUSH,
    decide() { greedyBuy(); } },

  { id: "hoarder", name: "Hoarder", desc: "1 carve/sec; only buys when essence ≥ 10× cost; best ROI",
    cps: () => 1, cadence: 5, prestige: "standard",
    decide() {
      const b = bestROI();
      if (!b) return;
      const lvl = S.runes[b.id] || 0;
      const cost = G.bulkCost(b, lvl, 1);
      if (S.essence >= cost * 10) buy(b.id, 10);
    } },

  { id: "max_buyer", name: "MAX Buyer", desc: "2 carves/sec; MAX-buys the single best ROI rune each decision (binds included)",
    cps: () => 2, cadence: 3, prestige: "standard",
    decide() {
      const bs = affordableBinds();
      if (bs.length) { unlockBind(bs[0].id); return; }
      const b = bestROI(); if (b) buy(b.id, "max");
    } },

  { id: "aett_rusher", name: "Aett Rusher", desc: "2 carves/sec; spreads levels to open gates fast, then top-loaded buying",
    cps: () => 2, cadence: 1, prestige: "standard",
    decide() {
      // keep buying the cheapest rune of the highest OPEN aett until gate met for the next
      for (let a = 3; a >= 1; a--) {
        if (!G.aettUnlocked(a)) continue;
        const runes = G.RUNES.filter(r => r.aett === a);
        const gate = G.AETTS[a] && G.AETTS[a].gate; // gate INTO a+1
        if (gate && a < 3) {
          const lvl = runes.reduce((s, r) => s + (S.runes[r.id] || 0), 0);
          if (lvl < gate.levels) {
            const cheapest = runes.reduce((p, r) =>
              G.bulkCost(r, S.runes[r.id] || 0, 1) < G.bulkCost(p, S.runes[p.id] || 0, 1) ? r : p);
            buy(cheapest.id, 1);
            return;
          }
        }
        const top = runes.reduce((p, r) => r.cost > p.cost ? r : p);
        buy(top.id, 1);
        return;
      }
    } },
];

/* ---------------------------------------------------------------
 * 4. Simulator
 * --------------------------------------------------------------- */
const DT = 0.25;            // production tick (sim seconds)
const CHECKPOINTS = [300, 900, 1800, 3600, 7200, 14400, 28800]; // 5m..8h

function simulate(strat) {
  resetState();
  const m = {
    clicks: 0, events: {}, timeline: {},
    prestiges: 0, wyrdSpent: 0,
    lastAction: 0, stall: 0, purchases: 0,
    bindsEver: new Set(), endLifetime: 0, endRate: 0, endWyrd: 0, ages: 1,
    deepest: 0, peakRate: 0, peakCycle: 0,
    lastReset: -3600, lastGain: 0,
  };
  const mark = (name, t) => { if (m.events[name] === undefined) m.events[name] = t; };
  let clickAcc = 0, sinceDecision = Infinity, t = 0;
  const total = HOURS * 3600;

  while (t < total) {
    // passive production
    const prod = G.totalProd();
    if (prod > 0) earn(prod * DT);
    if (prod > m.peakRate) m.peakRate = prod;
    if (S.cycle > m.peakCycle) m.peakCycle = S.cycle;
    for (const r of G.RUNES) if ((S.runes[r.id] || 0) > 0 && r.aett === 1) { /* noop */ }
    let di = -1; for (let i = 0; i < G.RUNES.length; i++) if (S.runes[G.RUNES[i].id]) di = i;
    if (di > m.deepest) m.deepest = di;

    // manual carves (expected value incl. crit)
    let cps = strat.cps(t);
    if ((S.boons.bifrost || 0) > 0) cps += S.boons.bifrost; // Bifröst auto-carve
    clickAcc += cps * DT;
    while (clickAcc >= 1) {
      m.clicks++;
      earn(G.clickPower() * (1 + G.critChance() * 9));
      clickAcc -= 1;
    }

    // strategy decisions
    sinceDecision += DT;
    if (sinceDecision >= strat.cadence) {
      sinceDecision = 0;
      const essenceBefore = S.essence + 0;
      const bindsBefore = S.binds.length;
      strat.decide();
      if (S.essence !== essenceBefore || S.binds.length !== bindsBefore) {
        m.purchases++;
        m.lastAction = t;
      }
      if (S.binds.length > bindsBefore) { m.bindsEver.add(S.binds[S.binds.length - 1]); mark("firstBind", t); }
    }

    // milestones / aett openings / prestige readiness
    for (const a of G.AETTS)
      if (a.gate && G.aettUnlocked(a.n)) mark("aett" + a.n, t);
    if (Object.keys(S.runes).length > 0) mark("firstRune", t);
    if (S.cycle >= G.ragnaThreshold()) mark("ragnaReady", t);

    // prestige policy: speedrunners burn at will; standard players only when worth it
    const gain = G.wyrdGain();
    const matureRun = t - m.lastReset >= 600 || gain >= 2.5 * Math.max(1, m.lastGain);
    const wantPrestige =
      (strat.prestige === "asap" && gain >= 1) ||
      (strat.prestige === "standard" && gain >= 8 && matureRun);
    if (wantPrestige) {
      doRagnarok();
      m.prestiges++;
      m.lastReset = t;
      m.lastGain = gain;
      mark("firstPrestige", t);
      // spend wyrd in defined order
      const order = strat.boons || BOON_STANDARD;
      for (const id of order) buyBoon(id);
    }

    // stall tracking: >60s without any purchase or progression event
    if (t - m.lastAction > 60) m.stall += DT;

    // timeline snapshots
    for (const cp of CHECKPOINTS) {
      if (!m.timeline[cp] && t + DT > cp) m.timeline[cp] = { rate: G.totalProd(), lifetime: S.lifetime };
    }

    t += DT;
  }

  m.endLifetime = S.lifetime;
  m.endRate = G.totalProd();
  m.endWyrd = S.wyrd;
  m.ages = S.age;
  m.runesOwned = Object.keys(S.runes).length;
  m.totalLevels = Object.values(S.runes).reduce((s, v) => s + v, 0);
  m.stallPct = Math.round(m.stall / total * 100);
  m.avgGap = m.purchases > 1 ? Math.round(total / m.purchases) : 0;
  m.bindsDiscovered = S.discovered.binds.length;
  m.boons = Object.entries(S.boons).map(([id, r]) => `${id.slice(0, 4)}${r}`).join(", ") || "—";
  return m;
}

/* ---------------------------------------------------------------
 * 5. Report
 * --------------------------------------------------------------- */
function hhmm(s) { return s === undefined ? "—" : (s >= 3600 ? (s / 3600).toFixed(1) + "h" : Math.round(s / 60) + "m"); }

const rows = [];
for (const strat of STRATEGIES) {
  const t0 = Date.now();
  const m = simulate(strat);
  m.ms = Date.now() - t0;
  rows.push({ strat, m });
}

let out = "";
out += `# RuneDream balance sim — ${HOURS}h sessions\n\n`;
out += `Logic extracted live from \`index.html\` (${G.RUNES.length} runes, ${G.BINDS.length} binds, ${G.BOONS.length} boons).\n\n`;

out += `| strategy | clicks | first rune | aett 2 | aett 3 | first bind | ragna ready | prestiges | deepest rune | peak rate/s | peak cycle | lifetime | stall% | avg gap |\n`;
out += `|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
for (const { strat, m } of rows) {
  const dr = m.deepest >= 0 ? `${G.RUNES[m.deepest].name} (${m.deepest + 1}/24)` : "—";
  out += `| ${strat.name} | ${G.fmt(m.clicks)} | ${hhmm(m.events.firstRune)} | ${hhmm(m.events.aett2)} | ${hhmm(m.events.aett3)} | ${hhmm(m.events.firstBind)} | ${hhmm(m.events.ragnaReady)} | ${m.prestiges} | ${dr} | ${G.fmt(m.peakRate)}/s | ${G.fmt(m.peakCycle)} | ${G.fmt(m.endLifetime)} | ${m.stallPct}% | ${m.avgGap}s |\n`;
}

out += `\n## Production rate over time (essence/sec)\n\n`;
out += `| strategy | 5m | 15m | 30m | 1h | 2h | 4h | 8h |\n|---|---|---|---|---|---|---|---|\n`;
for (const { strat, m } of rows) {
  out += `| ${strat.name} | ` + CHECKPOINTS.map(cp => {
    const p = m.timeline[cp];
    return p ? G.fmt(p.rate) : "—";
  }).join(" | ") + " |\n";
}

out += `\n## Lifetime essence over time\n\n`;
out += `| strategy | 5m | 15m | 30m | 1h | 2h | 4h | 8h |\n|---|---|---|---|---|---|---|---|\n`;
for (const { strat, m } of rows) {
  out += `| ${strat.name} | ` + CHECKPOINTS.map(cp => {
    const p = m.timeline[cp];
    return p ? G.fmt(p.lifetime) : "—";
  }).join(" | ") + " |\n";
}

out += `\n## End state after ${HOURS}h\n\n`;
out += `| strategy | age | runes owned | total levels | binds found | wyrd held | boons |\n|---|---|---|---|---|---|---|\n`;
for (const { strat, m } of rows) {
  out += `| ${strat.name} | ${m.ages} | ${m.runesOwned}/24 | ${m.totalLevels} | ${m.bindsDiscovered}/${G.BINDS.length} | ${G.fmt(m.endWyrd)} | ${m.boons} |\n`;
}

// strategy descriptions
out += `\n## Archetypes\n\n`;
for (const s of STRATEGIES) out += `- **${s.name}** — ${s.desc}\n`;

fs.writeFileSync(path.join(ROOT, "tools", "balance-report.md"), out);
console.log(out);
console.error(`\nsim wall-clock: ${rows.reduce((s, r) => s + r.m.ms, 0)}ms total`);
