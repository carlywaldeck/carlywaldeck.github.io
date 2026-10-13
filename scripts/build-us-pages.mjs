#!/usr/bin/env node
// Builds one static page per California college ("Weekend trips from Cal Poly SLO") at us/from/<college>/,
// plus us/from/index.html, and adds them to sitemap.xml, so search engines can find the US version.
// The trips are computed by the app itself (us/index.html loaded headless with Playwright) for next
// month, a $250 budget and four friends in a gas car, so the pages match what the planner shows.
// Run: node scripts/build-us-pages.mjs (the California data workflow runs it after each refresh).
import fs from "node:fs/promises";
import { openBrowser, openApp, US_INDEX } from "../tests/helpers.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const SITE = (process.env.SITE_URL || "https://weekender-trips.com").replace(/\/$/, "");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const browser = await openBrowser();
const page = await openApp(browser, { file: US_INDEX });
const data = await page.evaluate(() => {
  const month = (new Date().getMonth() + 1) % 12;
  const out = { month: MONTHS_FULL[month], year: Number(ymFor(month).slice(0, 4)), colleges: [] };
  for (const c of [...CITIES].sort((a, b) => a.name.localeCompare(b.name))) {
    state.home = c.id; state.month = month; state.budget = 250; state.interests = new Set(); state.modes = new Set(Object.keys(MODES));
    state.car = { riders: 4, type: "gas" };
    const pick = (days, n, test = () => true) => {
      state.daysSet = new Set([days]); state.days = days; update();
      return current.trips.filter((t) => !t.over && test(t)).slice(0, n).map((t) => ({
        name: t.dest.name, kind: tripKind(t), days: t.days, total: Math.round(t.cost.total), score: t.score10, hours: t.cost.transport.hours,
        when: usWhen(t).filter((w) => w[4] !== false).map((w) => `${w[1]} ${w[2]}`), note: t.dest.escape.note, train: !!t.dest.escape.alt
      }));
    };
    out.colleges.push({ id: c.id, name: c.name, town: c.town,
      local: pick(1, 6, (t) => t.dest.escape.local), day: pick(1, 6, (t) => !t.dest.escape.local), weekend: pick(2, 6), long: pick(3, 6) });
  }
  return out;
});
await browser.close();

const hrs = (h) => (h < 0.9 ? `${Math.max(5, Math.round(h * 12) * 5)} min` : `${Math.round(h * 2) / 2}h`.replace(".5h", "½h"));
const style = `:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#F7F8FA;color:#13233F;font:16px/1.6 Geist,system-ui,-apple-system,sans-serif}
main{max-width:860px;margin:0 auto;padding:32px 20px 64px}a{color:#2F5BEA}.brand{display:inline-flex;align-items:center;gap:10px;font-weight:700;font-size:20px;color:#13233F;text-decoration:none}.brand span{color:#2F5BEA}
h1{font-size:clamp(30px,6vw,44px);line-height:1.1;margin:28px 0 10px;letter-spacing:-0.02em}h2{font-size:22px;margin:36px 0 12px}.lede{color:#5A6B85;font-size:18px;margin:0 0 20px}
.cta{display:inline-block;background:#2F5BEA;color:#fff;text-decoration:none;font-weight:600;padding:13px 20px;border-radius:12px;box-shadow:0 6px 18px rgba(47,91,234,.3)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}.card{background:#fff;border:1px solid #E3E8EF;border-radius:14px;padding:14px 16px}
.card h3{margin:0;font-size:18px}.card .sub{color:#5A6B85;font-size:14px}.row{display:flex;justify-content:space-between;align-items:baseline;margin-top:8px}
.price{font-size:20px;font-weight:700}.score{font-weight:700;color:#1F9E89;background:#E6F5F2;border-radius:8px;padding:1px 8px;font-size:14px}.tag{font-size:13px;color:#0B8A7C;font-weight:600}
.note{color:#5A6B85;font-size:14px;margin:6px 0 0}footer{margin-top:44px;color:#5A6B85;font-size:14px}.links{columns:3 180px;padding:0;list-style:none}.links li{margin:2px 0}`;
const head = (title, desc, path) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${SITE}/${path}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${SITE}/${path}">
<meta property="og:image" content="${SITE}/og.png"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&display=swap"><style>${style}</style></head><body><main>
<a class="brand" href="/us/"><img src="/favicon.svg" alt="" width="30" height="30">weekender<span>.</span></a>`;
const card = (t) => `<div class="card"><h3>${esc(t.name)}</h3><div class="sub">${esc(t.kind)} · drive ${hrs(t.hours)} each way${t.train ? " · or train" : ""}</div>
<div class="row"><span class="price">$${t.total}</span><span class="score">${t.score.toFixed(1)}/10</span></div>${t.when.length ? `<div class="tag">${esc(t.when.join(" · "))}</div>` : ""}<p class="note">${esc(t.note)}</p></div>`;
const foot = `<footer>Prices are per person for ${data.month} ${data.year}, for four friends sharing a car: gas, park fees, a shared campsite or room, and food. Drive times are real road routes; updated weekly.
<br><a href="/us/">Weekender California</a> · <a href="/us/from/">All colleges</a> · <a href="/">Studying abroad in Europe?</a> · <a href="/privacy.html">Privacy &amp; terms</a> · Some links on Weekender are affiliate links.</footer></main></body></html>`;

await fs.rm(ROOT + "us/from", { recursive: true, force: true });
const urls = [];
for (const c of data.colleges) {
  const all = [...c.local, ...c.day, ...c.weekend, ...c.long];
  if (!all.length) continue;
  const path = `us/from/${c.id}/`, cheapest = Math.min(...all.map((t) => t.total));
  const title = `Weekend trips from ${c.name}: local finds, day trips and road trips (${data.month} ${data.year}) | Weekender`;
  const desc = `The best weekend trips from ${c.name}, from $${cheapest}: ${[...c.day, ...c.weekend].slice(0, 3).map((t) => `${t.name} $${t.total}`).join(", ")}. Real drive times, gas split with friends, campsites and day-by-day plans.`;
  const html = `${head(title, desc, path)}
<h1>Weekend trips from ${esc(c.name)}</h1>
<p class="lede">Hidden spots near ${esc(c.town)}, day trips and weekend road trips from ${esc(c.name)} in ${data.month}, scored 1–10 on price, timing and what's happening, with gas, park fees, a campsite or room and food included.</p>
<a class="cta" href="/us/#from=${c.id}">Plan your own trip from ${esc(c.name)} →</a>
${c.local.length ? `<h2>Local finds near campus</h2><div class="grid">${c.local.map(card).join("")}</div>` : ""}
${c.day.length ? `<h2>Day trips</h2><div class="grid">${c.day.map(card).join("")}</div>` : ""}
${c.weekend.length ? `<h2>Weekend trips</h2><div class="grid">${c.weekend.map(card).join("")}</div>` : ""}
${c.long.length ? `<h2>Long weekends</h2><div class="grid">${c.long.map(card).join("")}</div>` : ""}
<h2>Personalize it</h2><p>Set your budget, how many friends are coming, your car (or no car: train and bus), and what you're into (hiking, beaches, camping, stargazing, food and 35 more), and Weekender re-ranks every trip for you, with a day-by-day plan, directions and campsites.</p>
<a class="cta" href="/us/#from=${c.id}">Find my trips from ${esc(c.name)} →</a>
${foot}`;
  await fs.mkdir(ROOT + path, { recursive: true });
  await fs.writeFile(ROOT + path + "index.html", html);
  urls.push(`${SITE}/${path}`);
}
await fs.writeFile(ROOT + "us/from/index.html", `${head("Weekend trips from California colleges | Weekender", "Pick your college and see the best local finds, day trips and weekend road trips from it, with real drive times and costs.", "us/from/")}
<h1>Weekend trips from your college</h1><p class="lede">Pick where you go to school.</p>
<ul class="links">${data.colleges.map((c) => `<li><a href="/us/from/${c.id}/">${esc(c.name)}</a></li>`).join("")}</ul>
${foot}`);
urls.unshift(`${SITE}/us/from/`);
// Add these pages to the sitemap (written by scripts/build-pages.mjs), replacing any older ones.
const today = new Date().toISOString().slice(0, 10);
const old = await fs.readFile(ROOT + "sitemap.xml", "utf8").catch(() => "");
const keep = [...old.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod><\/url>/g)].filter((m) => !m[1].includes("/us/from/"));
const rows = [...keep.map((m) => [m[1], m[2]]), ...urls.map((u) => [u, today])];
await fs.writeFile(ROOT + "sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.map(([u, d]) => `  <url><loc>${u}</loc><lastmod>${d}</lastmod></url>`).join("\n")}\n</urlset>\n`);
console.log(`built ${urls.length - 1} college pages + us/from/index.html, added to sitemap.xml`);
