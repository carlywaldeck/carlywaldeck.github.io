#!/usr/bin/env node
// Builds one static page per home city ("Cheap weekend trips from Florence") at from/<city>/, plus
// from/index.html, sitemap.xml and robots.txt, so search engines can find Weekender. The trips are
// computed by the app itself (loaded headless with Playwright), for next month and a €300 budget,
// so the pages always match what the planner shows. Run: npm run pages (the data workflow runs it
// after each refresh).
import fs from "node:fs/promises";
import { openBrowser, openApp } from "../tests/helpers.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const SITE = (process.env.SITE_URL || "https://weekender-trips.com").replace(/\/$/, "");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const browser = await openBrowser();
const page = await openApp(browser);
const data = await page.evaluate(() => {
  const month = (new Date().getMonth() + 1) % 12;
  const out = { month: MONTHS_FULL[month], year: Number(ymFor(month).slice(0, 4)), cities: [] };
  const sorted = [...CITIES].sort((a, b) => a.name.localeCompare(b.name));
  for (const c of sorted) {
    state.home = c.id; state.month = month; state.budget = 300; state.interests = new Set(); state.modes = new Set(Object.keys(MODES));
    const pick = (days) => {
      state.daysSet = new Set([days]); state.days = days; update();
      return current.trips.filter((t) => !t.over).map((t) => ({
        name: t.dest.name, kind: tripKind(t), escape: isEscape(t), days: t.days, total: Math.round(t.cost.total), score: t.score10,
        mode: MODES[t.cost.transport.mode].label, hours: t.cost.transport.hours, fare: t.cost.transport.fare && t.cost.transport.fare.kind,
        why: (t.dest.interests || t.dest.tags || []).slice(0, 3).map((k) => INTERESTS[k]).filter(Boolean)
      }));
    };
    const weekend = [...pick(3), ...pick(2)].filter((t) => !t.escape);
    const seen = new Set(), cities = [];
    for (const t of weekend.sort((a, b) => b.score - a.score)) if (!seen.has(t.name) && cities.length < 10) { seen.add(t.name); cities.push(t); }
    const escapes = [...pick(1), ...pick(2)].filter((t) => t.escape);
    const seenE = new Set(), near = [];
    for (const t of escapes.sort((a, b) => b.score - a.score)) if (!seenE.has(t.name) && near.length < 6) { seenE.add(t.name); near.push(t); }
    const best = c.season.map((s, i) => [s, i]).filter(([s]) => s >= 4).map(([, i]) => MONTHS_FULL[i]);
    out.cities.push({ id: c.id, name: c.name, country: c.country, cities, near, best, lat: c.lat, lon: c.lon });
  }
  return out;
});
await browser.close();

const hrs = (h) => (h < 1 ? "under 1h" : `${Math.round(h * 2) / 2}h`.replace(".5h", "½h"));
const style = `:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#F7F8FA;color:#13233F;font:16px/1.6 Geist,system-ui,-apple-system,sans-serif}
main{max-width:860px;margin:0 auto;padding:32px 20px 64px}a{color:#2F5BEA}.brand{display:inline-flex;align-items:center;gap:10px;font-weight:700;font-size:20px;color:#13233F;text-decoration:none}.brand span{color:#2F5BEA}
h1{font-size:clamp(30px,6vw,44px);line-height:1.1;margin:28px 0 10px;letter-spacing:-0.02em}h2{font-size:22px;margin:36px 0 12px}.lede{color:#5A6B85;font-size:18px;margin:0 0 20px}
.cta{display:inline-block;background:#2F5BEA;color:#fff;text-decoration:none;font-weight:600;padding:13px 20px;border-radius:12px;box-shadow:0 6px 18px rgba(47,91,234,.3)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}.card{background:#fff;border:1px solid #E3E8EF;border-radius:14px;padding:14px 16px}
.card h3{margin:0;font-size:18px}.card .sub{color:#5A6B85;font-size:14px}.row{display:flex;justify-content:space-between;align-items:baseline;margin-top:8px}
.price{font-size:20px;font-weight:700}.score{font-weight:700;color:#1F9E89;background:#E6F5F2;border-radius:8px;padding:1px 8px;font-size:14px}.tag{font-size:12px;color:#2F5BEA;font-weight:600}
.note{color:#5A6B85;font-size:14px}footer{margin-top:44px;color:#5A6B85;font-size:14px}.links{columns:3 160px;padding:0;list-style:none}.links li{margin:2px 0}`;
const head = (title, desc, path) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${SITE}/${path}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${SITE}/${path}">
<meta property="og:image" content="${SITE}/og.png"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&display=swap"><style>${style}</style></head><body><main>
<a class="brand" href="/"><img src="/favicon.svg" alt="" width="30" height="30">weekender<span>.</span></a>`;
const card = (t) => `<div class="card"><h3>${esc(t.name)}</h3><div class="sub">${esc(t.kind)} · ${esc(t.mode)} ${hrs(t.hours)} each way · ${t.days} day${t.days > 1 ? "s" : ""}</div>
<div class="row"><span class="price">€${t.total}</span><span class="score">${t.score.toFixed(1)}/10</span></div>${t.fare === "real" ? '<div class="tag">Real flight fare</div>' : ""}${t.why.length ? `<div class="note">${esc(t.why.join(" · "))}</div>` : ""}</div>`;
const foot = `<footer>Prices are per person for ${data.month} ${data.year} with a €300 budget: travel, hostel, food, local transport and sights, from open data and real flight fares, updated weekly.
<br><a href="/">Weekender</a> · <a href="/from/">All cities</a> · <a href="/privacy.html">Privacy &amp; terms</a> · Some links on Weekender are affiliate links.</footer></main></body></html>`;

await fs.rm(ROOT + "from", { recursive: true, force: true });
const urls = [`${SITE}/`, `${SITE}/from/`, `${SITE}/privacy.html`];
for (const c of data.cities) {
  if (!c.cities.length && !c.near.length) continue;
  const path = `from/${c.id}/`, cheapest = [...c.cities, ...c.near].reduce((m, t) => Math.min(m, t.total), Infinity);
  const title = `Cheap weekend trips from ${c.name} (${data.month} ${data.year}) | Weekender`;
  const desc = `The best cheap weekend trips from ${c.name}, from €${cheapest}: ${c.cities.slice(0, 3).map((t) => `${t.name} €${t.total}`).join(", ")}. Real prices, travel times and day-by-day plans for students.`;
  const others = data.cities.filter((o) => o.country === c.country && o.id !== c.id).slice(0, 12);
  const html = `${head(title, desc, path)}
<h1>Cheap weekend trips from ${esc(c.name)}</h1>
<p class="lede">Studying in ${esc(c.name)}? These are the best-value weekends from ${esc(c.name)} in ${data.month}, scored 1–10 on price, timing and trip length, with travel, a hostel, food and sights included.</p>
<a class="cta" href="/#from=${c.id}">Plan your own trip from ${esc(c.name)} →</a>
${c.cities.length ? `<h2>Weekend city trips</h2><div class="grid">${c.cities.map(card).join("")}</div>` : ""}
${c.near.length ? `<h2>Day trips and one-night escapes</h2><div class="grid">${c.near.map(card).join("")}</div>` : ""}
${c.best.length ? `<h2>Best months to visit ${esc(c.name)}</h2><p>${esc(c.best.join(", "))}, based on 5 years of weather records and tourist numbers.</p>` : ""}
<h2>Personalize it</h2><p>Pick your budget, trip length and what you're into (food, beaches, nightlife, hiking and 36 more), and Weekender re-ranks every trip for you, with a day-by-day plan for each.</p>
<a class="cta" href="/#from=${c.id}">Find my trips from ${esc(c.name)} →</a>
${others.length ? `<h2>Other cities in ${esc(c.country)}</h2><ul class="links">${others.map((o) => `<li><a href="/from/${o.id}/">Trips from ${esc(o.name)}</a></li>`).join("")}</ul>` : ""}
${foot}`;
  await fs.mkdir(ROOT + path, { recursive: true });
  await fs.writeFile(ROOT + path + "index.html", html);
  urls.push(`${SITE}/${path}`);
}
const byCountry = {};
for (const c of data.cities) (byCountry[c.country] = byCountry[c.country] || []).push(c);
await fs.writeFile(ROOT + "from/index.html", `${head("Cheap weekend trips from 120 study-abroad cities | Weekender", "Pick your city and see the best cheap weekend trips from it, with real prices and day-by-day plans.", "from/")}
<h1>Cheap weekend trips from your city</h1><p class="lede">Pick where you're studying.</p>
${Object.keys(byCountry).sort().map((k) => `<h2>${esc(k)}</h2><ul class="links">${byCountry[k].map((c) => `<li><a href="/from/${c.id}/">${esc(c.name)}</a></li>`).join("")}</ul>`).join("")}
${foot}`);
const today = new Date().toISOString().slice(0, 10);
await fs.writeFile(ROOT + "sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`);
await fs.writeFile(ROOT + "robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`built ${urls.length - 3} city pages + index, sitemap.xml, robots.txt`);
