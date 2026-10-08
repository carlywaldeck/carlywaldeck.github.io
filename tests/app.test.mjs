// End-to-end tests in a real (headless) browser: the main flows a student goes through, plus a
// sweep of every starting city × trip length to make sure no trip ever shows a broken number.
import { openBrowser, openApp, suite } from "./helpers.mjs";

export default async function run() {
  const t = suite("app");
  const browser = await openBrowser();
  try {
    // 1. Landing page → globe, with a city search, interests, a trip length and dollars.
    let p = await openApp(browser);
    t.check(await p.evaluate(() => landingOpen()), "the landing page shows first");
    await p.click("#lp-home-input"); await p.keyboard.type("flor"); await p.keyboard.press("Enter");
    await p.click('#lp-interests .chip[data-v="food"]');
    await p.click('#lp-days .pick[data-v="2"]'); await p.click('#lp-days .pick[data-v="3"]'); // 2 on, 3 off
    await p.click(".lp-more summary"); // currency sits under "More options"
    await p.selectOption("#lp-currency", "USD");
    await p.click(".lp-go"); await p.waitForTimeout(500);
    const s = await p.evaluate(() => ({ landing: landingOpen(), home: state.home, days: [...state.daysSet], cur: state.currency, rows: document.querySelectorAll("#results .row").length, price: document.querySelector("#results .row-price")?.textContent, topbar: $("#home-input").value }));
    t.check(!s.landing, "Show my trips closes the landing page");
    t.check(s.home === "florence" && s.topbar === "Florence", `home should be Florence, got ${s.home} / ${s.topbar}`);
    t.check(s.days.length === 1 && s.days[0] === 2, `days should be [2], got ${s.days}`);
    t.check(s.rows > 10 && s.price.startsWith("$"), `results in dollars, got ${s.rows} rows, first price ${s.price}`);

    // 2. Every trip from every city, for every length and a few months: no broken numbers.
    const sweep = await p.evaluate(() => {
      const bad = []; let n = 0;
      for (const c of CITIES) for (const d of [1, 2, 3, 4, 5]) for (const m of [0, 4, 7, 10]) {
        state.home = c.id; state.daysSet = new Set([d]); state.days = d; state.month = m; state.budget = 400;
        for (const tr of orderedTrips(findTrips())) {
          n++;
          const ok = Number.isFinite(tr.cost.total) && tr.cost.total > 0 && tr.score10 >= 1 && tr.score10 <= 10 &&
            Object.values(tr.parts).every((v) => v == null || (v >= 0 && v <= 1)) && tripPoints(tr).length > 0;
          if (!ok && bad.length < 5) bad.push(`${c.id}→${tr.dest.name} ${d}d`);
        }
      }
      state.home = "florence"; state.daysSet = new Set([3]); state.days = 3; state.month = 4; update();
      return { n, bad };
    });
    t.check(sweep.n > 50000 && !sweep.bad.length, `${sweep.n} trips checked; broken: ${sweep.bad.join(", ")}`);

    // 3. Plans render cleanly in all three tabs.
    const plans = await p.evaluate(() => {
      const bad = [];
      for (const tr of current.trips.slice(0, 25)) {
        ui.drawer = tr.key; renderDrawer();
        const text = document.querySelector("#drawer-body").textContent;
        if (/undefined|NaN|\[object/.test(text)) bad.push(tr.dest.name);
      }
      return { bad, tabs: document.querySelectorAll("#drawer .tabs [role=tab]").length };
    });
    t.check(!plans.bad.length, `plans with broken text: ${plans.bad}`);
    t.check(plans.tabs >= 2, "the plan has tabs");

    // 4. Tailored itinerary: picking Beach marks beach activities in Barcelona's plan.
    const tailored = await p.evaluate(() => {
      state.home = "madrid"; $("#home").value = "madrid"; state.interests = new Set(["beach"]); update();
      const tr = current.trips.find((x) => x.dest.id === "barcelona");
      ui.drawer = tr.key; ui.tab = "plan"; renderDrawer();
      return document.querySelector("#pane-plan").textContent;
    });
    t.check(/✓ Beach/.test(tailored) && /Tailored to Beach/.test(tailored), "the itinerary highlights activities that match your interests");

    // 4a. Road data: with a real driving time, bus and train times come from it; with no road, there's no overland option.
    const roads = await p.evaluate(() => {
      DATA.roads = DATA.roads || {};
      const a = byId("madrid"), b = byId("valencia"), k = ["madrid", "valencia"].sort().join("|");
      const saved = DATA.roads[k];
      DATA.roads[k] = [356, 3.6];
      const withRoad = transportOptions(a, b, 5);
      DATA.roads[k] = null;
      const noRoad = transportOptions(a, b, 5);
      if (saved === undefined) delete DATA.roads[k]; else DATA.roads[k] = saved;
      return { bus: withRoad.find((o) => o.mode === "bus"), overland: noRoad.some((o) => o.mode === "bus" || o.mode === "train") };
    });
    t.check(roads.bus && Math.abs(roads.bus.hours - (3.6 * 1.1 + 0.3)) < 0.01 && roads.bus.road, `bus time uses the road driving time, got ${JSON.stringify(roads.bus)}`);
    t.check(!roads.overland, "no road connection means no bus or train");

    // 4c. Flight prices: a real fare when there is one, otherwise the trained model (same math as scripts/flight-model.mjs).
    const fmod = await import("../scripts/flight-model.mjs");
    const model = fmod.fit([fmod.features({ km: 500 }), fmod.features({ km: 1000, destMult: 1.2 }), fmod.features({ km: 2000, destLevel: 1.3 }), fmod.features({ km: 1500, destPop: 0.9 }),
      fmod.features({ km: 800, homeMult: 0.9 }), fmod.features({ km: 2500, destMult: 0.9 }), fmod.features({ km: 300 }), fmod.features({ km: 1800, homePop: 0.2 })], [60, 110, 160, 120, 80, 150, 55, 140]);
    model.enc = { g: 4.4, origin: { MAD: 4.1 }, dest: { ATH: 4.9 }, month: { 4: 4.5 } };
    const fl = await p.evaluate((M) => {
      const saved = { fares: DATA.fares, flightModel: DATA.flightModel };
      const madrid = byId("madrid"), lisbon = byId("lisbon"), athens = byId("athens"), m = 4;
      DATA.fares = { fetched: "2026-10-05", months: [ymFor(m)], prices: { "MAD-LIS": [47] } };
      DATA.flightModel = { ...M, n: 8, test: { mapeModel: 18, mapeOld: 35 } };
      const real = flightFare(madrid, lisbon, m, distanceKm(madrid, lisbon));
      const km = distanceKm(madrid, athens), pred = flightFare(madrid, athens, m, km);
      const d = DATA.cities.athens || {}, hc = DATA.cities.madrid || {};
      const x = flightFeatures({ km, destMult: athens.priceMult[m], homeMult: madrid.priceMult[m], destLevel: d.price ? d.price.level : 1, destPop: d.popularity ?? 0.5, homePop: hc.popularity ?? 0.5, origin: "MAD", dest: "ATH", month: m }, M.enc);
      const opt = transportOptions(madrid, lisbon, m).find((o) => o.mode === "flight");
      Object.assign(DATA, saved);
      return { real, pred, x, opt };
    }, model);
    t.check(fl.real.kind === "real" && fl.real.price === 47 && fl.opt.cost === 72 && fl.opt.fare.kind === "real", `a real fare is used when there is one (${JSON.stringify(fl.real)}, option €${fl.opt && fl.opt.cost})`);
    const xn = fmod.features({ km: Math.exp(fl.x[0]), destMult: fl.x[2], homeMult: fl.x[3], destLevel: fl.x[4], destPop: fl.x[5], homePop: fl.x[6], origin: "MAD", dest: "ATH", month: 4 }, model.enc);
    t.check(fl.x.slice(7).join() === xn.slice(7).join() && fl.x[7] === 4.1 && fl.x[8] === 4.9, `the page looks up airport and month effects like the pipeline (${fl.x.slice(7)} vs ${xn.slice(7)})`);
    t.check(fl.pred.kind === "model" && Math.abs(fl.pred.price - fmod.predict(model, fl.x)) < 0.01, `otherwise the model predicts the same price as the pipeline's model (${fl.pred.price.toFixed(1)} vs ${fmod.predict(model, fl.x).toFixed(1)})`);
    t.check(JSON.stringify(fl.x) === JSON.stringify(fmod.features({ km: fl.x[0] && Math.exp(fl.x[0]), ...{} })) || fl.x.length === fmod.FEATURES.length, "the page and the pipeline use the same features");

    // 4d. Nearby airports and the pricing order: real fare (incl. via a nearby airport) → reverse
    //     route blended with the model → known-route model → new-route model.
    const tiers = await p.evaluate((M) => {
      const saved = { fares: DATA.fares, flightModel: DATA.flightModel, nearby: DATA.nearby };
      const m = 4, ym = ymFor(m), month = (arr) => { const a = Array(12).fill(0); arr.forEach(([i, v]) => { a[i] = v; }); return a; };
      DATA.nearby = { florence: [["PSA", "Pisa", 9, 1.2, "train"]] };
      DATA.fares = { fetched: "2026-10-06", months: [ym, ...Array(11).fill("x")], prices: {
        "FLR-LIS": month([[0, 140]]), "PSA-LIS": month([[0, 60]]),           // Pisa + €18 train beats Florence
        "ATH-MAD": month([[0, 90]]), "MAD-ATH": month([[3, 110]]),           // reverse route this month
        "MAD-OSL": month([[2, 100], [5, 120]]) } };                            // known route, other months only
      DATA.flightModel = { ...M, n: 8, known: { mean: [...M.mean, 0, 0, 0, 0], std: [...M.std, 1, 1, 1, 1], w: [...M.w, 0.2, 0, 0, 0], b: M.b, smear: 1 }, test: {} };
      const f = (h, d) => flightFare(byId(h), byId(d), m, distanceKm(byId(h), byId(d)));
      const out = { pisa: f("florence", "lisbon"), rev: f("madrid", "athens"), known: f("madrid", "oslo"), fresh: f("madrid", "riga") };
      Object.assign(DATA, saved);
      return out;
    }, model);
    t.check(tiers.pisa.kind === "real" && tiers.pisa.price === 78 && tiers.pisa.via[0].name === "Pisa" && tiers.pisa.extraHours === 1.2,
      `flying from a nearby airport counts, train included (${JSON.stringify(tiers.pisa)})`);
    t.check(tiers.rev.kind === "reverse" && tiers.rev.rev === 90, `the reverse route's fare that month is used (${tiers.rev.kind})`);
    t.check(tiers.known.kind === "model" && tiers.known.known === true && tiers.fresh.kind === "model" && !tiers.fresh.known, `known and new routes use their own models (${tiers.known.kind}/${tiers.known.known}, ${tiers.fresh.kind}/${tiers.fresh.known})`);

    // 4e. High-speed rail: Florence–Rome is about 2h by train, not the 3h+ the road distance suggests.
    const hs = await p.evaluate(() => transportOptions(byId("florence"), byId("rome"), 4).find((o) => o.mode === "train"));
    t.check(hs && hs.highSpeed && hs.hours < 2.2, `Florence–Rome by high-speed train (${hs && hs.hours.toFixed(1)}h)`);

    // 4b. Booking links: a flight abroad links to dated Kiwi.com and Aviasales searches, an eSIM, and the affiliate disclosure.
    const booking = await p.evaluate(() => {
      const tr = current.trips.find((x) => x.cost.transport && x.cost.transport.mode === "flight" && x.dest.country !== current.home.country);
      if (!tr) return null;
      ui.drawer = tr.key; ui.tab = "book"; renderDrawer();
      const pane = document.querySelector("#pane-book"); // the Booking tab
      const hrefs = [...pane.querySelectorAll("a")].map((a) => a.href);
      return { hrefs, text: pane.textContent };
    });
    const avia = booking && booking.hrefs.find((h) => h.includes("aviasales.com"));
    const dates = avia ? new URL(avia).searchParams : null;
    t.check(avia && /^\d{4}-\d{2}-\d{2}$/.test(dates.get("depart_date")) && dates.get("return_date") >= dates.get("depart_date") && new Date(dates.get("depart_date")).getUTCDay() === 5,
      `flights link to a dated Aviasales search starting on a Friday, got ${avia}`);
    const kiwi = booking && booking.hrefs.find((h) => h.includes("kiwi.com"));
    const kq = kiwi ? new URL(kiwi).searchParams : null;
    t.check(kiwi && kq.get("departure") === dates.get("depart_date") && kq.get("lang") === "en" && dates.get("locale") === "en",
      `flight links are in English: Kiwi.com for the same weekend and Aviasales with locale=en (${kiwi})`);
    t.check(booking && booking.hrefs.some((h) => h.includes("airalo.com")) && booking.hrefs.some((h) => h.includes("hostelworld.com")) && /affiliate links/.test(booking.text),
      "plans link to hostels and an eSIM and disclose affiliate links");
    const tk = await p.evaluate(() => [...document.querySelectorAll("#drawer-body .links.tiktok a")].map((a) => a.href));
    t.check(tk.length >= 4 && tk.every((h) => h.startsWith("https://www.tiktok.com/search?q=")), `on computers, TikTok links open TikTok search (${tk[0]})`);

    // 5. Places you've been: hidden from results, and two ratings switch on the taste model.
    const been = await p.evaluate(() => {
      markBeen("lisbon", 5); markBeen("porto", 2); update();
      return { lisbon: current.trips.some((x) => x.dest.id === "lisbon"), n: TASTE.n, w: tasteWeight() };
    });
    t.check(!been.lisbon, "a visited city is no longer suggested");
    t.check(been.n === 2 && been.w > 0.1, `taste model learns from ratings (n=${been.n}, weight=${been.w})`);

    // 6. Save and share: a shared link opens the same trip in a fresh browser.
    const share = await p.evaluate(() => {
      const tr = current.trips[0]; toggleSave(tr);
      return { saved: isSaved(tr), link: shareLink(tr), name: tr.dest.name };
    });
    t.check(share.saved, "saving a trip works");
    // 6a. Price alerts: a saved trip is priced again with today's data; a drop shows on My trips
    // and is mentioned once when you come back.
    const pa = await p.evaluate(() => {
      const tr = current.trips[0], s = saved.find((x) => x.key === tr.key);
      const same = priceNow(s) === Math.round(tr.cost.total);
      s.total += 60; delete s.seen; store.set({ saved });
      const tag = savedHtml(), first = checkPriceDrops(), second = checkPriceDrops();
      return { same, tag: /cheaper than when you saved it/.test(tag), first: first && first.drop, second, toast: $("#toast").textContent };
    });
    t.check(pa.same, "a saved trip is priced again exactly like the live result");
    t.check(pa.tag && pa.first >= 59 && pa.first <= 61 && !pa.second && /cheaper than last time/.test(pa.toast),
      `a price drop shows on My trips and is mentioned once (${JSON.stringify(pa)})`);
    const p2 = await openApp(browser, { hash: "#" + share.link.split("#")[1] });
    await p2.waitForTimeout(500);
    const opened = await p2.evaluate(() => ({ landing: landingOpen(), title: document.querySelector(".dr-head h2")?.textContent }));
    t.check(!opened.landing && opened.title === share.name, `share link should open ${share.name}, got ${opened.title}`);
    t.check(!p.errors.length && !p2.errors.length, `page errors: ${[...p.errors, ...p2.errors].join("; ")}`);

    // 6c. Forecast: for a trip this month, plans show the real daily forecast (faked here).
    const fcp = await openApp(browser, { setup: async (page) => {
      await page.route("https://api.open-meteo.com/**", (r) => {
        const days = Array.from({ length: 14 }, (_, i) => new Date(Date.now() + i * 864e5).toISOString().slice(0, 10));
        r.fulfill({ contentType: "application/json", body: JSON.stringify({ daily: { time: days, weather_code: days.map((_, i) => [0, 3, 61][i % 3]),
          temperature_2m_max: days.map(() => 20), temperature_2m_min: days.map(() => 10), precipitation_probability_max: days.map(() => 30) } }) });
      });
      await page.route("https://archive-api.open-meteo.com/**", (r) => r.abort());
    } });
    const fc = await fcp.evaluate(async () => {
      closeLanding(false); state.month = new Date().getMonth(); update();
      const t = current.trips.find((x) => !x.dest.escape);
      ui.drawer = t.key; ui.tab = "details"; renderDrawer();
      tripForecast(t);
      await new Promise((r) => setTimeout(r, 600));
      renderDrawer();
      return { days: document.querySelectorAll("#drawer .fc-day").length, text: (document.querySelector("#drawer .fc") || {}).textContent || "" };
    });
    t.check(fc.days >= 1 && /68°/.test(fc.text), `plans for this month show the daily forecast (${fc.days} days)`);

    // 6d. "Get the app" explains how to install it (installable web app: manifest + service worker).
    const ga = await p.evaluate(() => { openGetApp(); const txt = document.querySelector("#login-body").textContent; closeLogin();
      return { txt, manifest: !!document.querySelector('link[rel="manifest"]') }; });
    t.check(/Get the Weekender app/.test(ga.txt) && /Home screen/i.test(ga.txt) && ga.manifest, "Get the app explains installing it, and the page has a web app manifest");

    // 6b. City pages link into the planner with #from=<city>: it skips the questions and shows that city's trips.
    const cityLink = await openApp(browser, { hash: "#from=lisbon&days=2" });
    await cityLink.waitForTimeout(400);
    const cl = await cityLink.evaluate(() => ({ landing: landingOpen(), home: state.home, days: [...state.daysSet], url: location.hash }));
    t.check(!cl.landing && cl.home === "lisbon" && cl.days.join() === "2" && !cl.url, `city page links open that city's trips (${JSON.stringify(cl)})`);

    // 7. Phones: nothing wider than the screen, and the top bar fits on one line.
    const m = await openApp(browser, { width: 360, height: 780 });
    await m.click(".lp-go"); await m.waitForTimeout(400);
    const phone = await m.evaluate(() => ({ w: document.documentElement.scrollWidth, bar: document.querySelector(".topbar").getBoundingClientRect().height }));
    t.check(phone.w <= 360, `no sideways scrolling on phones (page is ${phone.w}px)`);
    t.check(phone.bar < 70, `top bar fits on one line on phones (${Math.round(phone.bar)}px tall)`);
    // Two-finger pinch on the globe zooms smoothly (each step bigger than the last, no jumps back).
    const tp = await openApp(browser, { width: 390, height: 844, context: { hasTouch: true, isMobile: true } });
    await tp.evaluate(() => closeLanding(false)); await tp.waitForTimeout(800);
    const cdp = await tp.context().newCDPSession(tp);
    const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
    const s0 = await tp.evaluate(() => G.scale), scales = [];
    await touch("touchStart", [[165, 220], [225, 220]]);
    for (let i = 1; i <= 6; i++) { await touch("touchMove", [[165 - i * 8, 220], [225 + i * 8, 220]]); scales.push(await tp.evaluate(() => G.scale)); }
    await touch("touchEnd", []);
    t.check(scales.every((v, i) => v > (i ? scales[i - 1] : s0)) && scales[5] > s0 * 2.5, `pinching zooms the globe smoothly (${[s0, ...scales].map(Math.round).join(" → ")})`);
    await touch("touchStart", [[200, 260]]);
    for (let i = 1; i <= 4; i++) await touch("touchMove", [[200 + i * 10, 260]]);
    await touch("touchEnd", []);
    const tags = await tp.evaluate(() => { const t = current.trips[0]; ui.drawer = t.key; ui.tab = "plan"; renderDrawer(); const r = [...document.querySelectorAll("#drawer-body .links.tiktok a")].map((a) => a.href); ui.drawer = null; renderDrawer(); return r; });
    t.check(tags.length >= 4 && tags.every((h) => /^https:\/\/www\.tiktok\.com\/tag\/[a-z0-9]+$/.test(h)), `on phones, TikTok links open hashtag pages in the app (${tags[0]})`);
    const after = await tp.evaluate(() => ({ dragging: G.dragging, scale: G.scale }));
    t.check(!after.dragging && Math.abs(after.scale - scales[5]) < 1 && !tp.errors.length, `one finger then spins without changing the zoom (${JSON.stringify(after)}; ${tp.errors})`);
    t.check(!m.errors.length, `phone page errors: ${m.errors}`);

    // 8. Accounts (with a fake Supabase): the emailed link signs you in, data from the account
    // merges into this browser, and later changes are saved back to the account.
    const calls = { posts: [], ratings: [], log: [] };
    // Other travelers' ratings: people who love Lisbon also love Porto; Seville splits them.
    const crowdRows = [];
    for (let i = 0; i < 8; i++) {
      const fan = i < 6;
      crowdRows.push({ rater: "r" + i, place: "lisbon", stars: fan ? 5 : 2 }, { rater: "r" + i, place: "porto", stars: fan ? 5 : 2 },
        { rater: "r" + i, place: "seville", stars: fan ? 2 : 5 }, { rater: "r" + i, place: "prague", stars: 3 });
    }
    const remote = { been: { rome: { r: 4, n: "Rome" } }, saved: [] };
    const setup = async (page) => {
      await page.addInitScript(() => { window.WEEKENDER_SUPABASE_URL = "https://fake.supabase.co"; window.WEEKENDER_SUPABASE_KEY = "anon"; });
      page.on("framenavigated", (f) => { if (f === page.mainFrame()) calls.log.push("load " + f.url().split("/").pop().slice(0, 30)); });
      page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) calls.log.push("console " + m.text().slice(0, 120)); });
      await page.route("https://fake.supabase.co/**", async (r) => {
        calls.log.push(r.request().method() + " " + new URL(r.request().url()).pathname);
        const u = new URL(r.request().url()), json = (b, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(b) });
        if (u.pathname === "/auth/v1/signup") { calls.signup = JSON.parse(r.request().postData()); return json({ id: "user-2", email: calls.signup.email }); }
        if (u.pathname === "/auth/v1/token" && u.searchParams.get("grant_type") === "password") {
          const body = JSON.parse(r.request().postData());
          if (body.password !== "travel1234") return json({ error_code: "invalid_credentials", msg: "Invalid login credentials" }, 400);
          return json({ access_token: "t2", refresh_token: "r2", expires_in: 3600, user: { id: "user-2", email: body.email, user_metadata: { name: "Carly" } } });
        }
        if (u.pathname === "/auth/v1/user" && r.request().method() === "PUT") { calls.userUpdate = JSON.parse(r.request().postData()); return json({ id: "user-2", user_metadata: calls.userUpdate.data || { name: "Carly" } }); }
        if (u.pathname === "/auth/v1/logout") return r.fulfill({ status: 204, body: "" });
        if (u.pathname === "/rest/v1/ratings_anon") return json(crowdRows);
        if (u.pathname === "/rest/v1/ratings") { calls.ratings.push([r.request().method(), r.request().postData() && JSON.parse(r.request().postData())]); return r.fulfill({ status: 204, body: "" }); }
        if (u.pathname === "/auth/v1/user") return json({ id: "user-1", email: "student@school.edu" });
        if (u.pathname === "/rest/v1/profiles" && r.request().method() === "GET") return json([{ data: remote }]);
        if (u.pathname === "/rest/v1/profiles") { calls.posts.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 201, body: "" }); }
        return json({}, 404);
      });
    };
    const ap = await openApp(browser, { setup, hash: "#access_token=tok&refresh_token=ref&expires_in=3600&token_type=bearer&type=magiclink" });
    try {
      await ap.waitForFunction(() => { try { return ((JSON.parse(localStorage.getItem("weekender:v1") || "{}").been || {}).rome || {}).r === 4; } catch { return false; } }, null, { timeout: 30000 });
    } catch (e) {
      const state = await ap.evaluate(() => [localStorage.getItem("weekender:auth"), localStorage.getItem("weekender:v1"), location.href]).catch((x) => x.message);
      throw new Error(`login link never brought in the account's data. Requests: ${calls.log.join(" | ")}. Page errors: ${ap.errors.join("; ")}. State: ${JSON.stringify(state).slice(0, 400)}`);
    }
    await ap.waitForLoadState("load");
    await ap.waitForFunction(() => typeof update === "function" && document.querySelector("#acct-btn"), null, { timeout: 30000 });
    await ap.waitForFunction(() => /student@school\.edu/.test(document.querySelector("#acct-btn").getAttribute("aria-label") || ""), null, { timeout: 30000 });
    const acct = await ap.evaluate(() => ({ label: document.querySelector("#acct-btn").getAttribute("aria-label"), url: location.href, beenRome: been.rome && been.rome.r }));
    t.check(acct.beenRome === 4 && !acct.url.includes("access_token"),
      `the login link logs you in and brings in your account's places (${acct.label}, rome=${acct.beenRome})`);
    await ap.evaluate(() => { markBeen("paris", 5); update(); });
    for (let i = 0; i < 100 && !calls.posts.some((x) => x.data.been.paris); i++) await ap.waitForTimeout(100);
    const last = calls.posts[calls.posts.length - 1];
    t.check(last && last.id === "user-1" && last.data.been.rome.r === 4 && last.data.been.paris.r === 5, `changes are saved to the account, got ${JSON.stringify(last && last.data.been)}`);
    // No pop-up on arrival; saving a first trip offers a free account ("Create your account"),
    // and signing up asks you to confirm by email.
    const lp = await openApp(browser, { setup, firstVisit: true });
    t.check(await lp.isVisible("#lp-login"), "the landing page has a Log in button in the corner");
    await lp.waitForTimeout(800);
    t.check(await lp.evaluate(() => document.querySelector("#login-modal").hidden), "no sign-up pop-up when you first arrive");
    await lp.evaluate(() => { closeLanding(false); const t = current.trips[0]; ui.drawer = t.key; renderDrawer(); document.querySelector('[data-act="save"]').click(); });
    await lp.waitForSelector("#login-modal:not([hidden]) #auth-name");
    t.check(/Trip saved!/.test(await lp.textContent("#login-body")), "saving your first trip offers a free account");
    await lp.fill("#auth-name", "Carly");
    await lp.fill("#auth-email", "carly@school.edu");
    await lp.fill("#auth-pass", "travel1234");
    await lp.click("#auth-form button[type=submit]");
    await lp.waitForSelector("text=Check your email");
    t.check(calls.signup && calls.signup.data.name === "Carly" && calls.signup.password === "travel1234", "signing up sends name, email and password");
    // Logging in with a password greets you by name and hides the questions the account answers.
    await lp.evaluate(() => openLogin("login"));
    await lp.fill("#auth-email", "carly@school.edu");
    await lp.fill("#auth-pass", "travel1234");
    await lp.click("#auth-form button[type=submit]");
    try { await lp.waitForFunction(() => /Hi, Carly/.test(document.querySelector("#acct-btn").textContent), null, { timeout: 30000 }); }
    catch { throw new Error(`password login didn't greet. Button: ${await lp.textContent("#acct-btn").catch(() => "?")}. Window: ${(await lp.innerHTML("#login-body").catch(() => "")).replace(/\s+/g, " ").slice(0, 300)} Requests: ${calls.log.slice(-10).join(" | ")} Errors: ${lp.errors}`); }
    await lp.waitForLoadState("load");
    await lp.waitForFunction(() => typeof openLanding === "function", null, { timeout: 30000 });
    const greet = await lp.evaluate(() => { openLanding(); return { title: document.querySelector("#lp-title").textContent, guest: [...document.querySelectorAll(".lp-guest")].every(el => el.hidden) }; });
    t.check(/Hello, Carly/.test(greet.title) && greet.guest, `logged in: the landing says hello and skips age and places (${greet.title})`);
    // The account page shows your details and saves changes.
    await lp.evaluate(() => { closeLanding(false); openLogin(); });
    await lp.fill("#acct-name", "Carly W");
    await lp.click("#acct-form button[type=submit]");
    for (let i = 0; i < 50 && !calls.userUpdate; i++) await lp.waitForTimeout(100);
    t.check(calls.userUpdate && calls.userUpdate.data.name === "Carly W", "the account page updates your name");
    // Price alerts are opt-in from the account's Saved trips tab, and the choice is saved to the account.
    await lp.evaluate(() => { acctTab = "trips"; openLogin(); });
    const nPosts = calls.posts.length;
    await lp.check("#acct-alerts");
    for (let i = 0; i < 40 && calls.posts.length === nPosts; i++) await lp.waitForTimeout(100);
    const alertPost = calls.posts[calls.posts.length - 1];
    t.check(alertPost && alertPost.data.alerts === true, `turning on price alerts saves to the account (${JSON.stringify(alertPost && alertPost.data.alerts)})`);
    await lp.evaluate(() => { acctTab = "profile"; closeLogin(); });
    // Next visit: logged in with a saved search, you go straight to your trips.
    await lp.reload();
    await lp.waitForFunction(() => typeof update === "function" && document.querySelector("#results"), null, { timeout: 30000 });
    t.check(await lp.evaluate(() => !landingOpen()), "returning logged-in users skip the landing questions");
    // Wrong password: a plain-language error. (Let the page finish syncing with the account first.)
    await lp.waitForLoadState("networkidle");
    await lp.evaluate(() => { logOut(); openLogin("login"); });
    await lp.fill("#auth-email", "carly@school.edu");
    await lp.fill("#auth-pass", "wrong-pass");
    await lp.click("#auth-form button[type=submit]");
    try { await lp.waitForSelector(".form-error", { timeout: 15000 }); }
    catch { throw new Error(`no error shown for a wrong password. Window: ${(await lp.innerHTML("#login-body")).replace(/\s+/g, " ").slice(0, 600)} Requests: ${calls.log.slice(-8).join(" | ")}`); }
    t.check(/don't match/.test(await lp.textContent(".form-error")), "a wrong password shows a clear error");
    // 9. Collaborative filtering: rating Lisbon 5★ makes Porto (loved by the same travelers) a strong pick.
    const cf = await lp.evaluate(() => {
      markBeen("lisbon", 5); markBeen("seville", 1); update();
      const p = crowdPredict("porto"), s = crowdPredict("prague");
      const tr = current.trips.find((x) => x.dest.id === "porto");
      return { raters: CROWD.raters, porto: p, prague: s, why: tr ? tasteReason(tr) : "" };
    });
    t.check(cf.raters === 8 && cf.porto && cf.porto.because === "lisbon" && cf.porto.v > 0.8 && (!cf.prague || cf.porto.v > cf.prague.v),
      `travelers who liked Lisbon also liked Porto (porto ${cf.porto && cf.porto.v.toFixed(2)}, prague ${cf.prague && cf.prague.v.toFixed(2)})`);
    t.check(/travelers who liked Lisbon also liked it/.test(cf.why), `the score explains the crowd signal (${cf.why})`);
    t.check(calls.ratings.some(([m, body]) => m === "POST" && Array.isArray(body) && body.some((x) => x.place === "rome" && x.stars === 4)), "your ratings are shared with the model when logged in");
    // 10. Places you've been: dates, and the travel map on the globe.
    const tm = await lp.evaluate(() => {
      for (const id of Object.keys(been)) delete been[id];
      markBeen("lisbon", 5); markBeen("paris", 3); markBeen("rome", 4); saveBeen(); update();
      const set = (id, d) => { const el = [...document.querySelectorAll(`.bi-date[data-id="${id}"]`)][0]; el.value = d; el.dispatchEvent(new Event("change", { bubbles: true })); };
      document.querySelector("#been-btn").click();
      set("rome", "2026-02"); set("lisbon", "2025-09"); set("paris", "2025-10");
      const order = beenIds();
      showTravelMap();
      const out = { order, travel: G.travel, banner: document.querySelector("#travel-banner").textContent, panelHidden: getComputedStyle(document.querySelector(".panel")).display === "none", stops: travelStops().dated };
      hideTravelMap();
      out.back = !G.travel && document.querySelector("#travel-banner").hidden;
      return out;
    });
    t.check(tm.order.join() === "rome,paris,lisbon", `places list newest trip first (${tm.order})`);
    t.check(tm.travel && tm.panelHidden && /3 places/.test(tm.banner) && /3 countries/.test(tm.banner) && tm.stops.join() === "lisbon,paris,rome",
      `the travel map shows your places in the order you went (${tm.banner.trim().slice(0, 80)})`);
    t.check(tm.back, "Back to trips leaves the travel map");
    // 11. Any place in the world: Weekender's places plus the geocoder (faked here).
    const gp = await openApp(browser, { setup: async (page) => {
      await page.route("https://geocoding-api.open-meteo.com/**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ results: [
        { id: 1857910, name: "Kyoto", latitude: 35.02, longitude: 135.75, country: "Japan", admin1: "Kyoto" },
        { id: 3170647, name: "Pisa", latitude: 43.71, longitude: 10.4, country: "Italy", admin1: "Tuscany" }] }) }));
    } });
    await gp.evaluate(() => { closeLanding(false); document.querySelector("#been-btn").click(); });
    await gp.fill("#been-input", "pisa");
    await gp.waitForFunction(() => [...document.querySelectorAll("#been-list li[role=option]")].some((li) => /Pisa/.test(li.textContent)));
    const pisaFirst = await gp.evaluate(() => document.querySelector("#been-list li[role=option]").textContent);
    await gp.fill("#been-input", "kyoto");
    await gp.waitForFunction(() => /Kyoto/.test(document.querySelector("#been-list").textContent) && !/Searching/.test(document.querySelector("#been-list").textContent));
    await gp.click("#been-list li[role=option]");
    const geo = await gp.evaluate(() => ({ entry: been["geo:1857910"], listed: document.querySelector("#been-items").textContent, coord: placeCoord("geo:1857910"), countries: (showTravelMap(), document.querySelector("#travel-banner").textContent) }));
    t.check(/Pisa/.test(pisaFirst), `typing Pisa finds it (${pisaFirst})`);
    t.check(geo.entry && geo.entry.c === "Japan" && /Kyoto/.test(geo.listed) && geo.coord && Math.round(geo.coord[0]) === 136 && /1 place/.test(geo.countries),
      `any city in the world can be added and shows on the travel map (${JSON.stringify(geo.entry)})`);
    t.check(!gp.errors.length, `place search errors: ${gp.errors}`);
    t.check(!ap.errors.length && !lp.errors.length, `account page errors: ${[...ap.errors, ...lp.errors].join("; ")}`);
  } finally {
    await browser.close();
  }
  return t.done();
}
if (import.meta.url === `file://${process.argv[1]}`) process.exit((await run()) ? 1 : 0);
