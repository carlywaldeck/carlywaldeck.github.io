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
    t.check(roads.bus && Math.abs(roads.bus.hours - (3.6 * 1.25 + 0.5)) < 0.01 && roads.bus.road, `bus time uses the road driving time, got ${JSON.stringify(roads.bus)}`);
    t.check(!roads.overland, "no road connection means no bus or train");

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
    const calls = { posts: [] };
    const remote = { been: { rome: { r: 4, n: "Rome" } }, saved: [] };
    const setup = async (page) => {
      await page.addInitScript(() => { window.WEEKENDER_SUPABASE_URL = "https://fake.supabase.co"; window.WEEKENDER_SUPABASE_KEY = "anon"; });
      await page.route("https://fake.supabase.co/**", async (r) => {
        const u = new URL(r.request().url()), json = (b, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(b) });
        if (u.pathname === "/auth/v1/signup") { calls.signup = JSON.parse(r.request().postData()); return json({ id: "user-2", email: calls.signup.email }); }
        if (u.pathname === "/auth/v1/token" && u.searchParams.get("grant_type") === "password") {
          const body = JSON.parse(r.request().postData());
          if (body.password !== "travel1234") return json({ error_code: "invalid_credentials", msg: "Invalid login credentials" }, 400);
          return json({ access_token: "t2", refresh_token: "r2", expires_in: 3600, user: { id: "user-2", email: body.email, user_metadata: { name: "Carly" } } });
        }
        if (u.pathname === "/auth/v1/user" && r.request().method() === "PUT") { calls.userUpdate = JSON.parse(r.request().postData()); return json({ id: "user-2", user_metadata: calls.userUpdate.data || { name: "Carly" } }); }
        if (u.pathname === "/auth/v1/logout") return r.fulfill({ status: 204, body: "" });
        if (u.pathname === "/auth/v1/user") return json({ id: "user-1", email: "student@school.edu" });
        if (u.pathname === "/rest/v1/profiles" && r.request().method() === "GET") return json([{ data: remote }]);
        if (u.pathname === "/rest/v1/profiles") { calls.posts.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 201, body: "" }); }
        return json({}, 404);
      });
    };
    const ap = await openApp(browser, { setup, hash: "#access_token=tok&refresh_token=ref&expires_in=3600&token_type=bearer&type=magiclink" });
    await ap.waitForFunction(() => { try { return ((JSON.parse(localStorage.getItem("weekender:v1") || "{}").been || {}).rome || {}).r === 4; } catch { return false; } }, null, { timeout: 30000 });
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
    // First visit: the account window opens on "Create your account"; signing up asks you to confirm by email.
    const lp = await openApp(browser, { setup, firstVisit: true });
    await lp.waitForSelector("#login-modal:not([hidden]) #auth-name");
    t.check(await lp.isVisible("#lp-login"), "the landing page has a Log in button in the corner");
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
    // Wrong password: a plain-language error.
    await lp.evaluate(() => { logOut(); openLogin("login"); });
    await lp.fill("#auth-email", "carly@school.edu");
    await lp.fill("#auth-pass", "wrong-pass");
    await lp.click("#auth-form button[type=submit]");
    await lp.waitForSelector(".form-error");
    t.check(/don't match/.test(await lp.textContent(".form-error")), "a wrong password shows a clear error");
    t.check(!ap.errors.length && !lp.errors.length, `account page errors: ${[...ap.errors, ...lp.errors].join("; ")}`);
  } finally {
    await browser.close();
  }
  return t.done();
}
if (import.meta.url === `file://${process.argv[1]}`) process.exit((await run()) ? 1 : 0);
