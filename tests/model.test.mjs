// Checks the flight price model (scripts/flight-model.mjs): it recovers a known price pattern from
// noisy fares, beats the old distance formula on routes it never saw, and gives sensible prices.
import { suite } from "./helpers.mjs";
import * as fm from "../scripts/flight-model.mjs";

export default function run() {
  const t = suite("model");
  // Synthetic fares with a known shape: price ∝ km^0.45, +40% in peak demand, pricier destinations
  // cost more, with ±15% noise (deterministic pseudo-random so the test is repeatable).
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const make = (n) => Array.from({ length: n }, () => {
    const km = 300 + rand() * 2700, destMult = 0.8 + rand() * 0.6, homeMult = 0.8 + rand() * 0.6;
    const destLevel = 0.5 + rand() * 1.2, destPop = rand(), homePop = rand();
    const price = 9 * km ** 0.45 * (1 + (destMult - 1)) * (0.8 + 0.25 * destLevel) * (0.85 + 0.3 * rand());
    return { x: fm.features({ km, destMult, homeMult, destLevel, destPop, homePop }), price, km, destMult };
  });
  const train = make(600), test = make(200);
  const m = fm.fit(train.map((r) => r.x), train.map((r) => r.price));
  const mape = (f) => test.reduce((s, r) => s + Math.abs(f(r) - r.price) / r.price, 0) / test.length;
  const model = mape((r) => fm.predict(m, r.x)), old = mape((r) => fm.oldFormula(r.km, r.destMult));
  t.check(model < 0.12, `model error on unseen fares should be near the 15% noise level, got ${(model * 100).toFixed(1)}%`);
  t.check(model < old, `model (${(model * 100).toFixed(1)}%) beats the old formula (${(old * 100).toFixed(1)}%)`);
  const cheap = fm.predict(m, fm.features({ km: 400 })), far = fm.predict(m, fm.features({ km: 2800 }));
  t.check(cheap > 20 && far > cheap, `longer flights cost more (${cheap.toFixed(0)} → ${far.toFixed(0)})`);
  const peak = fm.predict(m, fm.features({ km: 1200, destMult: 1.35 })), quiet = fm.predict(m, fm.features({ km: 1200, destMult: 0.85 }));
  t.check(peak > quiet, `peak months cost more (${quiet.toFixed(0)} → ${peak.toFixed(0)})`);
  t.check(Number.isFinite(m.smear) && m.smear > 0.9 && m.smear < 1.2, `smearing factor is sensible (${m.smear})`);
  return t.done();
}
