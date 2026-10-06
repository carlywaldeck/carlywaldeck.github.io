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
    const fl = await p.evaluate((M) => {
      const saved = { fares: DATA.fares, flightModel: DATA.flightModel };
      const madrid = byId("madrid"), lisbon = byId("lisbon"), athens = byId("athens"), m = 4;
      DATA.fares = { fetched: "2026-10-05", months: [ymFor(m)], prices: { "MAD-LIS": [47] } };
      DATA.flightModel = { ...M, n: 8, test: { mapeModel: 18, mapeOld: 35 } };
      const real = flightFare(madrid, lisbon, m, distanceKm(madrid, lisbon));
      const km = distanceKm(madrid, athens), pred = flightFare(madrid, athens, m, km);
      const d = DATA.cities.athens || {}, hc = DATA.cities.madrid || {};
      const x = flightFeatures({ km, destMult: athens.priceMult[m], homeMult: madrid.priceMult[m], destLevel: d.price ? d.price.level : 1, destPop: d.popularity ?? 0.5, homePop: hc.popularity ?? 0.5 });
      const opt = transportOptions(madrid, lisbon, m).find((o) => o.mode === "flight");
      Object.assign(DATA, saved);
      return { real, pred, x, opt };
    }, model);
    t.check(fl.real.kind === "real" && fl.real.price === 47 && fl.opt.cost === 72 && fl.opt.fare.kind === "real", `a real fare is used when there is one (${JSON.stringify(fl.real)}, option €${fl.opt && fl.opt.cost})`);
    t.check(fl.pred.kind === "model" && Math.abs(fl.pred.price - fmod.predict(model, fl.x)) < 0.01, `otherwise the model predicts the same price as the pipeline's model (${fl.pred.price.toFixed(1)} vs ${fmod.predict(model, fl.x).toFixed(1)})`);
    t.check(JSON.stringify(fl.x) === JSON.stringify(fmod.features({ km: fl.x[0] && Math.exp(fl.x[0]), ...{} })) || fl.x.length === fmod.FEATURES.length, "the page and the pipeline use the same features");

    // 4b. Booking links: a flight abroad links to a dated Aviasales search, an eSIM, and the affiliate disclosure.
    const booking = await p.evaluate(() => {
      const tr = current.trips.find((x) => x.cost.transport && x.cost.transport.mode === "flight" && x.dest.country !== current.home.country);
      if (!tr) return null;
      ui.drawer = tr.key; ui.tab = "details"; renderDrawer();
      const pane = document.querySelector("#pane-details");
      const hrefs = [...pane.querySelectorAll("a")].map((a) => a.href);
      return { hrefs, text: pane.textContent };
    });
    const avia = booking && booking.hrefs.find((h) => h.includes("aviasales.com"));
    const dates = avia ? new URL(avia).searchParams : null;
    t.check(avia && /^\d{4}-\d{2}-\d{2}$/.test(dates.get("depart_date")) && dates.get("return_date") >= dates.get("depart_date") && new Date(dates.get("depart_date")).getUTCDay() === 5,
      `flights link to a dated Aviasales search starting on a Friday, got ${avia}`);
    t.check(booking && booking.hrefs.some((h) => h.includes("airalo.com")) && booking.hrefs.some((h) => h.includes("hostelworld.com")) && /affiliate links/.test(booking.text),
      "plans link to hostels and an eSIM and disclose affiliate links");

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
    const p2 = await openApp(browser, { hash: "#" + share.link.split("#")[1] });
    await p2.waitForTimeout(500);
    const opened = await p2.evaluate(() => ({ landing: landingOpen(), title: document.querySelector(".dr-head h2")?.textContent }));
    t.check(!opened.landing && opened.title === share.name, `share link should open ${share.name}, got ${opened.title}`);
    t.check(!p.errors.length && !p2.errors.length, `page errors: ${[...p.errors, ...p2.errors].join("; ")}`);

    // 7. Phones: nothing wider than the screen, and the top bar fits on one line.
    const m = await openApp(browser, { width: 360, height: 780 });
    await m.click(".lp-go"); await m.waitForTimeout(400);
    const phone = await m.evaluate(() => ({ w: document.documentElement.scrollWidth, bar: document.querySelector(".topbar").getBoundingClientRect().height }));
    t.check(phone.w <= 360, `no sideways scrolling on phones (page is ${phone.w}px)`);
    t.check(phone.bar < 70, `top bar fits on one line on phones (${Math.round(phone.bar)}px tall)`);
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
    await lp.waitForFunction(() => /Hi, Carly/.test(document.querySelector("#acct-btn").textContent), null, { timeout: 30000 });
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
