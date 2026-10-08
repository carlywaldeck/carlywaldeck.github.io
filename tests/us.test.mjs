// Tests for the US (California) version at /us/: the data, the generated page, and the app running
// with colleges as homes and driving trips (local finds, day trips, weekend trips).
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { suite, openBrowser, openApp, ROOT, INDEX, US_INDEX } from "./helpers.mjs";

export default async function run() {
  const t = suite("us");
  // ---- data
  const win = {};
  new Function("window", fs.readFileSync(ROOT + "data/us-data.js", "utf8"))(win);
  const D = win.US_DATA;
  t.check(D && D.region === "us" && D.colleges.length >= 40, `US data loads with the California colleges (${D && D.colleges.length})`);
  const slo = D.colleges.find((c) => c.id === "cal-poly-slo");
  const kinds = (c) => ({ l: c.trips.filter((x) => x[3][0] === "l").length, d: c.trips.filter((x) => x[3][0] === "d").length, w: c.trips.filter((x) => "wx".includes(x[3][0])).length });
  t.check(slo && slo.name === "Cal Poly SLO", "Cal Poly SLO is one of the colleges");
  const k = slo ? kinds(slo) : {};
  t.check(k.l >= 3 && k.d >= 5 && k.w >= 8, `Cal Poly SLO has local finds, day trips and weekend trips (${JSON.stringify(k)})`);
  const thin = D.colleges.filter((c) => { const x = kinds(c); return x.d + x.l < 4 || x.w < 6; }).map((c) => c.id);
  t.check(!thin.length, `every college has enough trips (thin: ${thin})`);
  const badTrips = D.colleges.flatMap((c) => c.trips.filter(([id, km, h]) => !D.places[id] || !(km > 0) || !(h > 0) || h > 9.5).map((x) => `${c.id}→${x[0]}`));
  t.check(!badTrips.length, `trips point at real places with sane distances (${badTrips.slice(0, 5)})`);
  const badPlaces = Object.entries(D.places).filter(([, p]) => !p.name || !p.note || !(p.lat > 32 && p.lat < 43.5) || !(p.lon > -125 && p.lon < -112.5) || !Array.isArray(p.days) || !p.days.length || p.season.length !== 12 || !p.tags.length)
    .map(([id]) => id); // California, plus the long-weekend trips just over the border (Zion, Crater Lake)
  t.check(!badPlaces.length, `places have a note, a plan, tags, 12 months of seasons and coordinates in or near California (${badPlaces.slice(0, 5)})`);
  t.check(D.gas.price > 2 && D.gas.price < 9 && D.mpg > 0 && D.riders >= 1, `gas math inputs are sane ($${D.gas.price}, ${D.mpg} mpg, ${D.riders} riders)`);

  // ---- the generated page is up to date with index.html
  let fresh = true;
  try { execFileSync("node", [ROOT + "scripts/build-us-page.mjs", "--check"], { stdio: "pipe" }); } catch { fresh = false; }
  t.check(fresh, "us/index.html is up to date (run node scripts/build-us-page.mjs)");
  const html = fs.readFileSync(US_INDEX, "utf8");
  t.check(/<base href="\.\.\/">/.test(html) && /window\.REGION = "us"/.test(html) && /data\/us-data\.js/.test(html) && !/data\/app-data\.js\?v/.test(html),
    "the US page loads the US data instead of the European data");

  const browser = await openBrowser();
  try {
    // ---- the app in US mode
    const page = await openApp(browser, { file: US_INDEX });
    const r = await page.evaluate(() => {
      state.home = "cal-poly-slo"; state.month = 3; state.budget = 300; state.daysSet = new Set([1, 2, 3]); state.days = 1; state.interests = new Set(); update(); closeLanding(false);
      const trips = current.trips.filter((x) => !x.over);
      const groups = [...document.querySelectorAll("#results .group-h, #results h3, #results [class*=group] > :first-child")].map((h) => h.textContent).join(" | ");
      return { region: REGION, currency: state.currency, modes: Object.keys(MODES), n: trips.length, kinds: [...new Set(trips.map(tripKind))], allCar: trips.every((x) => x.cost.transport.mode === "car"),
        groups, results: document.querySelector("#results").textContent, cur: document.querySelector("#region-us").getAttribute("aria-current"), storeKey: STORE_KEY,
        weekend: (trips.find((x) => x.days === 2 && x.dest.escape.stayKind === "camp") || {}).key, cheap: trips.every((x) => x.cost.total < 400) };
    });
    t.check(r.region === "us" && r.currency === "USD" && r.modes.join() === "car", `US mode: dollars and driving (${r.region}, ${r.currency}, ${r.modes})`);
    t.check(r.n >= 15 && r.allCar && r.cheap, `Cal Poly SLO gets driving trips at student prices (${r.n})`);
    t.check(["Local find", "Day trip", "Weekend trip"].every((x) => r.kinds.includes(x)), `trips are local finds, day trips and weekend trips (${r.kinds})`);
    t.check(/Local finds/.test(r.results) && /Day trips from Cal Poly SLO/.test(r.results) && /Weekend trips from Cal Poly SLO/.test(r.results), `the list is grouped by kind of trip (${r.results.slice(0, 160)})`);
    t.check(r.cur === "true" && r.storeKey !== "weekender:v1", `California is marked as the current version, with its own saved data (${r.storeKey})`);
    t.check(!!r.weekend, "there is a camping weekend trip");
    const plan = await page.evaluate(async (key) => {
      ui.drawer = key; ui.tab = "booking"; renderDrawer();
      const booking = document.querySelector("#drawer").innerHTML;
      ui.tab = "details"; renderDrawer();
      const details = document.querySelector("#drawer").textContent;
      ui.tab = "itinerary"; renderDrawer();
      const itin = document.querySelector("#drawer").textContent;
      return { booking, details, itin, local: document.querySelector("#drawer").textContent };
    }, r.weekend);
    t.check(/google\.com\/maps\/dir/.test(plan.booking) && /recreation\.gov|reservecalifornia/i.test(plan.booking), "booking: driving directions and campsite reservations");
    t.check(/miles each way/.test(plan.details) && /mpg/.test(plan.details), "details: the drive and the gas math");
    t.check(/Drive from Cal Poly SLO/.test(plan.itin) && /Camp/.test(plan.itin) && !/€/.test(plan.itin), "itinerary: drive there, camp, all in dollars");
    // Search finds colleges.
    await page.evaluate(() => openLanding());
    await page.fill("#lp-home-input", "cal poly");
    const opts = await page.evaluate(() => [...document.querySelectorAll("#lp-home-list li")].map((li) => li.textContent).join(" | "));
    t.check(/Cal Poly SLO/.test(opts) && /Cal Poly Pomona/.test(opts), `searching "cal poly" finds the campuses (${opts.slice(0, 120)})`);
    t.check(!page.errors.length, `US page errors: ${page.errors}`);

    // ---- Europe is unchanged, and offers the switch
    const eu = await openApp(browser);
    const e = await eu.evaluate(() => ({ region: REGION, cur: document.querySelector("#region-eu").getAttribute("aria-current"), href: document.querySelector("#region-us").getAttribute("href"), modes: Object.keys(MODES).length, homes: CITIES.length }));
    t.check(e.region === "eu" && e.cur === "true" && e.href === "us/" && e.modes === 4 && e.homes >= 100, `Europe stays the default, with a link to California (${JSON.stringify(e)})`);
    t.check(!eu.errors.length, `Europe page errors: ${eu.errors}`);
    // Someone who picked California is sent to /us/ when they open the plain address.
    const ctx = await browser.newContext();
    await ctx.route(/^https?:\/\//, (r) => r.abort());
    await ctx.addInitScript(() => { try { localStorage.setItem("weekender:region", "us"); } catch {} });
    const bp = await ctx.newPage();
    await bp.goto("file://" + INDEX).catch(() => {});
    await bp.waitForURL(/\/us\/$/, { timeout: 5000 }).catch(() => {});
    const url = bp.url();
    t.check(/\/us\/(index\.html)?$/.test(url), `a California student opening the site goes to /us/ (${url})`);
  } finally {
    await browser.close();
  }
  return t.done();
}
if (import.meta.url === `file://${process.argv[1]}`) process.exit((await run()) ? 1 : 0);
