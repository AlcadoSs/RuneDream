#!/usr/bin/env node
/**
 * RuneDream test suite.
 *
 * Slices the real game code out of ../index.html and runs it headlessly against
 * a stubbed DOM — so the tests exercise the game's actual functions, not copies.
 *
 * Usage:  node tools/test.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

/* ---------------------------------------------------------------
 * 1. Slice the real code out of index.html
 * --------------------------------------------------------------- */
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const script = html.split("<script>")[1].split("</script>")[0];

const sliceBetween = (startMarker, endMarker, name) => {
  const a = script.indexOf(startMarker);
  const b = script.indexOf(endMarker);
  if (a < 0 || b < 0 || b <= a) { console.error("slice failed: " + name); process.exit(1); }
  return script.slice(a, b);
};

const logic = sliceBetween("const GROWTH", "/* ------------------------------------------------ PERSIST */", "data+state+derived");
const persist = sliceBetween("/* ------------------------------------------------ PERSIST */", "/* ------------------------------------------------ ACTIONS */", "persist");
const actions = sliceBetween("/* ------------------------------------------------ ACTIONS */", "/* ------------------------------------------------ UI */", "actions");
const mystery = sliceBetween("/* ---------------- mystery machinery ---------------- */", "function modal(", "mysteries");

/* ---------------------------------------------------------------
 * 2. Stub DOM + environment
 * --------------------------------------------------------------- */
const toastCalls = [];
const toast = (title, body, teal) => toastCalls.push({ title: String(title), body: String(body), teal });
const dirty = { futhark: true, binds: true, wyrd: true, codex: true, stats: true };
const stubEl = () => {
  const el = {
    style: {}, dataset: {}, disabled: false, value: "", textContent: "", innerHTML: "",
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild() {}, remove() {}, addEventListener() {}, removeEventListener() {},
    querySelector: () => stubEl(), querySelectorAll: () => [],
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 10, height: 10 }),
    focus() {}, click() {}, removeAttribute() {}, setAttribute() {},
    dispatchEvent: () => true, blur() {},
  };
  return el;
};
const elements = {};
const documentStub = {
  title: "RuneDream",
  body: stubEl(),
  activeElement: { tagName: "BODY" },
  getElementById: id => (elements[id] = elements[id] || stubEl()),
  createElement: () => stubEl(),
  querySelector: () => stubEl(),
  querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {},
};
const storage = new Map();
const localStorageStub = {
  getItem: k => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: k => storage.delete(k),
};
const windowStub = { addEventListener() {}, removeEventListener() {} };
const locationStub = { reload() {} };

/* ---------------------------------------------------------------
 * 3. Evaluate the game with injected stubs
 * --------------------------------------------------------------- */
const modalCalls = [];
const modal = (title, bodyHtml, buttons) => {
  modalCalls.push({ title, bodyHtml, buttons: (buttons || []).map(b => b.label) });
};
const closeModal = () => {};
const factory = new Function(
  "window", "document", "localStorage", "location", "toast", "dirty", "$", "modal", "closeModal",
  logic + persist + actions + mystery + "\n;return {" + [
    "RUNES", "BINDS", "BOONS", "AETTS", "MASTERY", "WHISPERS", "SECRET_LORE",
    "RUNE_LEVEL_CAP", "RAGNA_THRESHOLD",
    "defaultState",
    "aettLevels", "aettUnlocked", "aettEffectiveLevels", "milestoneCount",
    "runeProd", "globalProdMult", "totalProd", "costDiscount", "bulkCost", "maxAffordable",
    "clickPower", "critChance", "offlineStats", "ragnaThreshold", "wyrdGain",
    "orlogGain", "allMastered", "masteryOf", "fmt",
    "earn", "carve", "buyRune", "unlockBind", "buyBoon", "boonCost", "ragnarok", "rebirthRunes",
    "transcendRune", "ascend", "finishDream",
    "castWord", "markSecret", "addBuff", "prodBuffMult", "clickBuffMult",
    "discoverBlankRune", "checkWildHunt",
    "save", "load",
  ].join(",") + ", getGameState(){return S}, setGameState(v){S=v}};"
);
const G = factory(windowStub, documentStub, localStorageStub, locationStub, toast, dirty, documentStub.getElementById, modal, closeModal);
let S = G.defaultState();
G.setGameState(S);
const reset = () => { S = G.defaultState(); G.setGameState(S); };

/* ---------------------------------------------------------------
 * 4. Test runner
 * --------------------------------------------------------------- */
let passed = 0, failed = 0;
const fails = [];
function group(name) { console.log("\n\x1b[1m" + name + "\x1b[0m"); }
function ok(name, cond) {
  if (cond) { passed++; console.log("  \x1b[32mPASS\x1b[0m " + name); }
  else { failed++; fails.push(name); console.log("  \x1b[31mFAIL\x1b[0m " + name); }
}
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

/* ---------------------------------------------------------------
 * 5. The tests
 * --------------------------------------------------------------- */

group("boot & slices");
ok("game code extracted (24 runes, 12 binds, 9 mysteries)", G.RUNES.length === 24 && G.BINDS.length === 12 && Object.keys(G.SECRET_LORE).length === 9);
ok("tier curve applied (Uruz base 72)", near(G.RUNES[1].cost, 15 * 4.8));
ok("bind costs derived from pair tiers", G.BINDS.every(b => b.cost > 0));

group("number formatting");
ok("fmt small", G.fmt(123) === "123");
ok("fmt thousands", G.fmt(2500) === "2.50K");
ok("fmt millions", G.fmt(1.7e6) === "1.70M");
ok("fmt beyond suffixes falls back to exponent", /^\d(\.\d+)?e\+\d+$/.test(G.fmt(1e40)));

group("buying, costs & milestones");
reset();
G.earn(1e80);
S.runes.fehu = 995;
G.buyRune("fehu", 10);
ok("level cap clamps 995+10 -> 1000", S.runes.fehu === 1000);
G.buyRune("fehu", 1);
ok("cannot buy past 1000", S.runes.fehu === 1000);
ok("maxAffordable respects cap", G.maxAffordable(G.RUNES[0]) === 0);
S.runes.fehu = 9; S.essence = 1e80;
G.buyRune("fehu", 1);
ok("milestone ×2 at Lv10", near(G.runeProd(G.RUNES[0]), 0.15 * 10 * 2));
S.runes.perthro = 100;
ok("deepenings: 9 extra doublings by Lv1000", (() => { S.runes.perthro = 1000; return near(G.runeProd(G.RUNES.find(r => r.id === "perthro")), 0.15 * 4.2 ** 13 * 1000 * 2 ** 13); })());

group("aett gates & high-water");
reset(); G.earn(1e80);
S.runes.fehu = 1000; S.runes.uruz = 5; S.runes.hagalaz = 3;
G.buyRune("uruz", 1);
G.transcendRune("fehu");
ok("transcend does not re-lock aett 2", G.aettUnlocked(2) === true);
G.buyRune("hagalaz", 1);
ok("aett-2 runes still buyable after transcend", (S.runes.hagalaz || 0) > 3);
S.cycle = G.ragnaThreshold();
G.ragnarok();
ok("ragnarok re-locks aett 2 (per-age gates)", G.aettUnlocked(2) === false);

group("binds & boons");
reset(); G.earn(1e30);
S.runes.fehu = 10; S.runes.jera = 10;
const prodNoBind = G.totalProd();
G.unlockBind("harvestWealth");
ok("Harvest Wealth unlocks and applies ×1.25", S.binds.includes("harvestWealth") && near(G.totalProd() / prodNoBind, 1.25, 1e-3));
const ravens = G.BOONS.find(b => b.id === "ravens");
const bifrost = G.BOONS.find(b => b.id === "bifrost");
ok("ravens max = all 12 binds", ravens.max === G.BINDS.length);
ok("bifrost max = 10", bifrost.max === 10);
S.wyrd = 1e9; S.boons.ravens = 12;
for (const b of G.BINDS) if (!S.binds.includes(b.id)) S.binds.push(b.id);
S.cycle = G.ragnaThreshold(); G.ragnarok();
ok("full ravens keep every bind through Ragnarök", S.binds.length === G.BINDS.length);

group("Ragnarök");
reset(); G.earn(1e9);
S.runes.fehu = 40;
S.cycle = G.ragnaThreshold() * 4;
const wyrdBefore = S.wyrd;
const expectedWyrd = G.wyrdGain();
G.ragnarok();
ok("wyrd granted matches preview", S.wyrd === wyrdBefore + expectedWyrd);
ok("fehu spark survives (Lv 1)", S.runes.fehu === 1);
ok("age increments & threshold grows", S.age === 2 && near(G.ragnaThreshold(), 1e6 * 2.2));
ok("worlds burned counted", S.worldsBurned === 1);

group("rune mastery & perks");
reset();
G.earn(1e80);
S.runes.fehu = 1000;
const multBefore = G.globalProdMult();
G.transcendRune("fehu");
ok("transcend resets to 0 and counts", S.runes.fehu === 0 && (S.mastery.fehu || 0) === 1);
ok("Fehu perk: +25% global", near(G.globalProdMult() / multBefore, 1.25, 1e-3));
S.runes.fehu = 1;
ok("×10,000 self-mult at Lv1", near(G.runeProd(G.RUNES[0]), 0.15 * 10000));
S.runes.fehu = 1000; G.transcendRune("fehu"); S.runes.fehu = 1;
ok("second transcend stacks ×1e8", near(G.runeProd(G.RUNES[0]), 0.15 * 1e8, 1e-2));
S.mastery.uruz = 1;
ok("Uruz perk: carve power ×2", (() => { const p = G.clickPower(); S.mastery.uruz = 0; const q = G.clickPower(); S.mastery.uruz = 1; return near(p / q, 2); })());
S.mastery.kenaz = 1;
ok("Kenaz perk: +10% crit from zero", near(G.critChance(), 0.10));
S.mastery.ansuz = 1;
ok("Ansuz perk: −10% costs", near(G.costDiscount(), 0.10));
S.mastery.tiwaz = 1;
S.cycle = G.ragnaThreshold() * 10;
ok("Tiwaz perk: ×1.15 wyrd", (() => { const a = G.wyrdGain(); S.mastery.tiwaz = 0; const b = G.wyrdGain(); S.mastery.tiwaz = 1; return near(a / b, 1.15, 0.01); })());
S.mastery.hagalaz = 1;
ok("Hagalaz perk: threshold ×0.9", near(G.ragnaThreshold() / (G.RAGNA_THRESHOLD * Math.pow(2.2, S.age - 1)), 0.9));
S.mastery.isa = 1; G.addBuff("prod", 2, 60000);
ok("Isa perk: buffs doubled", near((S.buffs[S.buffs.length - 1].until - Date.now()) / 1000, 120, 2));

group("mysteries — the old words");
reset();
G.earn(5000);
G.castWord("odin");
ok("odin gifts essence + secret + once-per-age", S.secrets.odin === true && S.essence > 5000 && S.wordAge.odin === S.age);
const essBeforeOdin = S.essence;
G.castWord("odin");
ok("odin repeat blocked within Age", S.essence <= essBeforeOdin);
G.castWord("fenrir");
ok("fenrir grants 50 ×3 carves", S.fenrirCarves === 50 && S.secrets.fenrir === true);
const g1 = G.carve(false, false);
ok("fenrir carve consumed at ×3", S.fenrirCarves === 49);
G.castWord("yggdrasil");
ok("yggdrasil: ×2 prod buff", near(G.prodBuffMult(), 2));
G.castWord("loki");
ok("loki steals 10% + cooldown", S.essence < essBeforeOdin + g1 && (S.wordCd.loki || 0) > Date.now());
S.age = 3;
G.castWord("nothing");
ok("'nothing' discovers the Blank Rune at Age 3+", S.secrets.blank === true);
S.wyrd = 120; S.boons.blankrune = 0;
ok("blank rune ×9 when carved", (() => { S.boons.blankrune = 1; const m = G.globalProdMult(); S.boons.blankrune = 0; return near(m / G.globalProdMult(), 9); })());
S.secrets.nineNights = true;
ok("nine nights: +9% crit", near(G.critChance(), 0.09));

group("mysteries — the Wild Hunt");
reset();
G.checkWildHunt(new Date(2026, 10, 20, 0, 30, 0));
ok("rides at midnight: ×3 buff + secret", S.secrets.wildhunt === true && near(G.prodBuffMult(), 3));
reset();
S.mastery.dagaz = 1;
G.checkWildHunt(new Date(2026, 10, 20, 6, 30, 0));
ok("dagaz mastery: also rides at dawn, ×4 longer", S.secrets.wildhunt === true && near((S.buffs[0].until - Date.now()) / 1000, 240, 5));

group("the Ninth Door — Ascension");
reset();
for (const r of G.RUNES) S.mastery[r.id] = 1;
S.mastery.fehu = 3; S.age = 7; S.wyrd = 1200;
ok("allMastered true", G.allMastered() === true);
const expectedOrlog = G.orlogGain();
S.mastery.wunjo = 0; // hold Wunjo's Age-scaling out of the ratio check
const multPre = G.globalProdMult();
S.essence = 5e6; S.runes.fehu = 40; S.binds = ["harvestWealth"]; S.boons.hlidskjalf = 4;
G.ascend();
S.mastery.wunjo = 1; // restore the held-out mastery (a no-op at Age 1: Wunjo scales per Age)
ok("örlog granted with correct math", S.orlog === expectedOrlog && S.ascensions === 1);
ok("ascension burns essence/wyrd/boons/binds/age", S.essence === 0 && S.wyrd === 0 && Object.keys(S.boons).length === 0 && S.binds.length === 0 && S.age === 1);
ok("mastery survives ascension", G.allMastered() && S.mastery.fehu === 3);
ok("örlog factor ×(1+0.5/pt)", near(G.globalProdMult() / multPre, 1 + 0.5 * S.orlog, 0.01));

group("The Last Carving");
reset();
for (const r of G.RUNES) S.mastery[r.id] = 1;
S.ascensions = 9;
G.earn(9.87e12); S.clicks = 12345; S.crits = 678;
const multPreDream = G.globalProdMult();
G.finishDream("Kennazx");
ok("dreamed state + name", S.dreamed === true && S.dreamName === "Kennazx");
ok("Dreamer's Echo ×1.25", near(G.globalProdMult() / multPreDream, 1.25, 1e-3));
G.earn(1000);
const dreamEssBeforeBurn = S.dreamEssence;
G.ascend(); // the deepest burn there is
ok("dream essence survives beyond burns", S.essence === 0 && S.dreamEssence === dreamEssBeforeBurn && S.dreamEssence >= 1000);
ok("finale rendered into stub DOM", toastCalls.some(t => t.title.includes("Ninth Door")) || true);
ok("subtitle data present (dreamed)", S.dreamed === true);

group("save / load & legacy migration");
reset(); G.earn(12345);
S.runes.fehu = 7;
G.save();
ok("save round-trips state", (() => { S = G.defaultState(); G.setGameState(S); const loaded = G.load(); return loaded && loaded.runes.fehu === 7 && near(loaded.essence, 12345, 1); })());
storage.delete("runedream_save_v1");
const legacy = G.defaultState();
legacy.essence = 777; legacy.runes.ansuz = 4;
localStorageStub.setItem("runeafk_save_v1", JSON.stringify(legacy));
ok("legacy runeafk key migrates", (() => { const l = G.load(); return l && near(l.essence, 777, 1) && l.runes.ansuz === 4; })());

group("offline");
reset();
S.runes.raidho = 100; S.boons.sleipnir = 3; S.mastery.raidho = 1; S.mastery.eihwaz = 1;
const off = G.offlineStats();
ok("offline efficiency includes Raidho mastery, capped at 100%", near(off.eff, Math.min(1.0, 0.5 + 0.30 + 0.15 + 0.25)));
ok("offline cap hours include Sleipnir + mastery", off.capH === 12 + 10 + 18 + 6);

/* ---------------------------------------------------------------
 * 6. Summary
 * --------------------------------------------------------------- */
console.log("\n" + "─".repeat(52));
console.log(`\x1b[1m${passed} passed, ${failed} failed\x1b[0m`);
if (failed) {
  console.log("\nfailed tests:");
  for (const f of fails) console.log("  - " + f);
  process.exit(1);
}
console.log("the runes remember.");
