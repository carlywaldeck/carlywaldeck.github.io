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
  } finally {
    await browser.close();
  }
  return t.done();
}
if (import.meta.url === `file://${process.argv[1]}`) process.exit((await run()) ? 1 : 0);
