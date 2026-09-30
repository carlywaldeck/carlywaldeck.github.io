#!/usr/bin/env node
// Builds data/city-data.json (and data/REPORT.md) for every city in data/cities-meta.json from
// free, public, keyless sources. Runs on GitHub Actions (.github/workflows/data.yml) once a month.
//
//   Climate     Open-Meteo historical weather (ERA5), daily 2020–2024      open-meteo.com (CC BY 4.0)
//   Crowds      Eurostat tour_occ_nim: nights in tourist accommodation     ec.europa.eu/eurostat
//               by month (country level); Wikipedia pageviews where
//               Eurostat has no data
//   Prices      Eurostat prc_ppp_ind: price level of restaurants & hotels  ec.europa.eu/eurostat
//               (EU27 = 100); World Bank price level ratio elsewhere       data.worldbank.org
//   Places      OpenStreetMap via the Overpass API: counts of bars,        openstreetmap.org (ODbL)
//               museums, beaches, peaks... around each city
//   Popularity  Wikipedia pageviews, monthly 2022–2024                     wikimedia.org
//
// Options (environment variables):
//   ONLY=lisbon,madrid   only these cities (others keep their previous values)
//   SKIP=osm,climate     skip sources (previous values are kept)
//   TIME_BUDGET_MIN=110  stop fetching after this many minutes and save what we have
// Any request that fails keeps the city's previous value, so one bad day never wipes the data.
// Cities that are still missing a source are fetched first, so repeated runs fill the gaps.

import fs from "node:fs/promises";

const ROOT = new URL("..", import.meta.url).pathname;
const META = JSON.parse(await fs.readFile(ROOT + "data/cities-meta.json", "utf8")).cities;
const OUT = ROOT + "data/city-data.json";
const REPORT = ROOT + "data/REPORT.md";
const UA = "WeekenderDataBot/1.0 (student project; +https://github.com/carlywaldeck/gsb-5576-project)";
const ONLY = new Set((process.env.ONLY || "").split(",").filter(Boolean));
const SKIP = new Set((process.env.SKIP || "").split(",").filter(Boolean));
const CLIMATE_YEARS = [2020, 2024];
const PAGEVIEW_RANGE = ["2022010100", "2024123100"];
const DEADLINE = Date.now() + Number(process.env.TIME_BUDGET_MIN || 110) * 60000;
const outOfTime = () => Date.now() > DEADLINE;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (x, d = 2) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d);
const mean = (xs) => { const v = xs.filter((x) => x != null && Number.isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const errors = [];
const log = (...a) => console.log(...a);

// fetch with retries: backs off on 429 and 5xx, gives up after a few tries.
async function get(url, { method = "GET", body, headers = {}, tries = 4, wait = 5000 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { method, body, headers: { "User-Agent": UA, "Accept": "application/json", ...headers } });
      if (res.ok) return await res.json();
      last = new Error(`${res.status} ${res.statusText} for ${url.slice(0, 120)}`);
      if (res.status !== 429 && res.status < 500) break; // a real "no" (404 etc.): don't retry
      await sleep(res.status === 429 ? Math.max(wait, 60000) : wait * (i + 1));
    } catch (e) {
      last = e;
      await sleep(wait * (i + 1));
    }
  }
  throw last;
}

let previous = { cities: {} };
try { previous = JSON.parse(await fs.readFile(OUT, "utf8")); } catch { /* first run */ }
const prev = (id) => previous.cities?.[id] || {};

const cities = META.map((c) => ({ ...c, data: { ...prev(c.id) } }));
const todo = cities.filter((c) => !ONLY.size || ONLY.has(c.id));
// The cities to fetch for one source: those missing it first, then the rest (oldest data last).
const order = (key) => [...todo.filter((c) => !c.data[key]), ...todo.filter((c) => c.data[key])];
let skippedForTime = 0;
const timeUp = (step) => { if (!outOfTime()) return false; skippedForTime++; if (skippedForTime === 1) errors.push(`time budget reached during ${step}; remaining cities keep their previous values`); return true; };

// ---------------------------------------------------------------------------------------------
// 1. Wikipedia: canonical titles and monthly pageviews
async function wikipedia() {
  for (const c of order("wikipedia")) {
    if (timeUp("wikipedia")) break;
    try {
      const s = await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(c.wiki.replace(/ /g, "_"))}`);
      const title = (s.titles && s.titles.canonical) || c.wiki.replace(/ /g, "_");
      const pv = await get(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(title)}/monthly/${PAGEVIEW_RANGE[0]}/${PAGEVIEW_RANGE[1]}`);
      const byMonth = Array.from({ length: 12 }, () => []);
      for (const it of pv.items || []) byMonth[Number(it.timestamp.slice(4, 6)) - 1].push(it.views);
      const monthly = byMonth.map(mean);
      const avg = mean(monthly);
      c.data.wikipedia = { title, monthlyViews: Math.round(avg), seasonal: monthly.map((m) => round(m / avg)), years: "2022–2024" };
      log("wikipedia", c.id, title, Math.round(avg));
    } catch (e) { errors.push(`wikipedia ${c.id}: ${e.message}`); }
    await sleep(300);
  }
}

// ---------------------------------------------------------------------------------------------
// 2. Climate: Open-Meteo archive, daily max temperature, precipitation and sunshine
async function climate() {
  const [y0, y1] = CLIMATE_YEARS;
  for (const c of order("climate")) {
    if (timeUp("climate")) break;
    try {
      const d = await get(`https://archive-api.open-meteo.com/v1/archive?latitude=${c.lat}&longitude=${c.lon}` +
        `&start_date=${y0}-01-01&end_date=${y1}-12-31&daily=temperature_2m_max,precipitation_sum,sunshine_duration&timezone=auto`, { wait: 20000, tries: 3 });
      const t = d.daily.time, hi = d.daily.temperature_2m_max, pr = d.daily.precipitation_sum, sun = d.daily.sunshine_duration;
      const acc = Array.from({ length: 12 }, () => ({ hi: [], rainy: 0, sun: [], days: 0 }));
      t.forEach((day, i) => {
        const m = Number(day.slice(5, 7)) - 1, a = acc[m];
        if (hi[i] != null) a.hi.push(hi[i]);
        if (sun[i] != null) a.sun.push(sun[i] / 3600);
        if (pr[i] != null) { a.days++; if (pr[i] >= 1) a.rainy++; }
      });
      const years = y1 - y0 + 1;
      const high = acc.map((a) => round(mean(a.hi), 1));
      const rainDays = acc.map((a) => round(a.rainy / years, 1));
      const sunHours = acc.map((a) => round(mean(a.sun), 1));
      c.data.climate = { high, rainDays, sunHours, comfort: high.map((h, m) => round(comfort(h, rainDays[m], sunHours[m]))), years: `${y0}–${y1}` };
      log("climate", c.id, high.join(" "));
    } catch (e) { errors.push(`climate ${c.id}: ${e.message}`); }
    await sleep(1500);
  }
}
// Comfort for sightseeing, 0–1: best around a 25°C daily high, fewer rainy days, more sun.
function comfort(high, rainDays, sunHours) {
  if (high == null) return null;
  const t = Math.exp(-(((high - 25) / 8) ** 2));
  const r = 1 - clamp(rainDays / 15, 0, 1);
  const s = clamp((sunHours ?? 6) / 10, 0, 1);
  return 0.55 * t + 0.25 * r + 0.2 * s;
}

// ---------------------------------------------------------------------------------------------
// JSON-stat (Eurostat) helper: value for a set of category labels, other dimensions at index 0.
function jsonStat(d, pick) {
  const ids = d.id, size = d.size, strides = ids.map((_, i) => size.slice(i + 1).reduce((a, b) => a * b, 1));
  return (labels) => {
    let idx = 0;
    ids.forEach((dim, i) => {
      const want = labels[dim] ?? pick[dim];
      const pos = want != null ? d.dimension[dim].category.index[want] : 0;
      if (pos == null) idx = NaN; else idx += pos * strides[i];
    });
    const v = Number.isNaN(idx) ? undefined : d.value[idx];
    return v == null ? null : Number(v);
  };
}
const eurostatGeo = (iso2) => ({ GR: "EL", GB: "UK" }[iso2] || iso2);

// 3. Crowds: Eurostat monthly nights spent at tourist accommodation, per country
async function crowds() {
  const countries = [...new Set(todo.map((c) => c.iso2))];
  const byCountry = {};
  for (const iso of countries) {
    const geo = eurostatGeo(iso);
    try {
      const d = await get(`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tour_occ_nim?format=JSON&lang=EN` +
        `&geo=${geo}&unit=NR&c_resid=TOTAL&nace_r2=I551-I553&sinceTimePeriod=2017-01`, { tries: 2 });
      const val = jsonStat(d, {});
      const times = Object.keys(d.dimension.time.category.index);
      const byMonth = Array.from({ length: 12 }, () => []);
      for (const tm of times) {
        const v = val({ time: tm });
        if (v != null && !/^2020|^2021/.test(tm)) byMonth[Number(tm.slice(5, 7)) - 1].push(v); // skip the COVID years
      }
      const monthly = byMonth.map(mean);
      if (monthly.some((m) => m == null)) throw new Error("incomplete months");
      const avg = mean(monthly);
      const yrs = [...new Set(times.filter((tm) => val({ time: tm }) != null).map((tm) => tm.slice(0, 4)))];
      byCountry[iso] = { index: monthly.map((m) => round(m / avg)), source: "eurostat", detail: `Eurostat nights in tourist accommodation, ${geo}, ${yrs[0]}–${yrs[yrs.length - 1]} (excl. 2020–21)` };
      log("crowds", iso, byCountry[iso].index.join(" "));
    } catch (e) { log("crowds", iso, "no Eurostat data:", e.message); }
    await sleep(500);
  }
  for (const c of todo) {
    if (byCountry[c.iso2]) c.data.crowds = byCountry[c.iso2];
    else if (c.data.wikipedia) c.data.crowds = { index: c.data.wikipedia.seasonal, source: "wikipedia", detail: "Wikipedia pageviews by month, 2022–2024 (no Eurostat data for this country)" };
  }
}

// ---------------------------------------------------------------------------------------------
// 4. Prices: Eurostat restaurants & hotels price level (EU27 = 100), World Bank price level otherwise
async function prices() {
  const isos = [...new Set(cities.map((c) => c.iso2))];
  const level = {};
  try {
    // Eurostat's price survey covers the EU, EFTA and candidate countries only.
    const covered = new Set(["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "NO", "CH", "GB", "ME", "MK", "AL", "RS", "TR", "BA"]);
    const geos = isos.filter((i) => covered.has(i)).map(eurostatGeo);
    const d = await get(`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_ppp_ind?format=JSON&lang=EN` +
      `&na_item=PLI_EU27_2020&ppp_cat=A0111&sinceTimePeriod=2019&${geos.map((g) => "geo=" + g).join("&")}`);
    const val = jsonStat(d, {});
    const times = Object.keys(d.dimension.time.category.index).sort().reverse();
    for (const iso of isos) {
      const geo = eurostatGeo(iso);
      if (d.dimension.geo.category.index[geo] == null) continue;
      const year = times.find((tm) => val({ geo, time: tm }) != null);
      if (year) level[iso] = { level: round(val({ geo, time: year }) / 100), source: "eurostat", detail: `Eurostat price level of restaurants & hotels, ${year} (EU average = 100)`, year };
    }
    log("prices eurostat", Object.keys(level).length, "countries");
  } catch (e) { errors.push(`prices eurostat: ${e.message}`); }
  try {
    const d = await get(`https://api.worldbank.org/v2/country/${isos.join(";")}/indicator/PA.NUS.PPPC.RF?format=json&mrnev=1&per_page=300`);
    const rows = (d[1] || []).filter((r) => r.value != null);
    const wb = Object.fromEntries(rows.map((r) => [r.country.id, { v: r.value, year: r.date }]));
    // Put World Bank ratios on the Eurostat scale: divide by the average ratio of the EU countries we have.
    const eu = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"];
    const euAvg = mean(eu.map((k) => wb[k] && wb[k].v));
    for (const iso of isos) {
      if (level[iso] || !wb[iso] || !euAvg) continue;
      level[iso] = { level: round(wb[iso].v / euAvg), source: "worldbank", detail: `World Bank price level ratio, ${wb[iso].year}, relative to the EU average`, year: wb[iso].year };
    }
    log("prices worldbank", rows.length, "countries");
  } catch (e) { errors.push(`prices worldbank: ${e.message}`); }
  for (const c of todo) if (level[c.iso2]) c.data.price = level[c.iso2];
}

// ---------------------------------------------------------------------------------------------
// 5. OpenStreetMap: what's actually there. One Overpass query per city, one count per interest.
// Radius is in meters around the city center. "wikipedia" filters keep only notable places.
const OSM_QUERIES = {
  food:        { r: 5000,   label: "restaurants", q: ['nwr[amenity=restaurant]'] },
  nightlife:   { r: 5000,   label: "bars, pubs & clubs", q: ['nwr[amenity~"^(bar|pub|nightclub)$"]'] },
  cafes:       { r: 5000,   label: "cafés", q: ['nwr[amenity=cafe]'] },
  markets:     { r: 10000,  label: "markets", q: ['nwr[amenity=marketplace]'] },
  art:         { r: 10000,  label: "museums & galleries", q: ['nwr[tourism~"^(museum|gallery)$"]'] },
  history:     { r: 10000,  label: "notable historic sites", q: ['nwr[historic][wikipedia]'] },
  architecture:{ r: 5000,   label: "notable buildings (with a Wikipedia article)", q: ['nwr[building][wikipedia]'] },
  castles:     { r: 30000,  label: "castles, palaces & forts", q: ['nwr[historic~"^(castle|palace|fort)$"]'] },
  sacred:      { r: 10000,  label: "notable churches, mosques & temples", q: ['nwr[amenity=place_of_worship][wikipedia]'] },
  music:       { r: 10000,  label: "music venues & theatres", q: ['nwr[amenity~"^(music_venue|theatre|arts_centre)$"]'] },
  streetart:   { r: 10000,  label: "murals & graffiti", q: ['nwr[tourism=artwork][artwork_type~"mural|graffiti"]'] },
  sports:      { r: 15000,  label: "stadiums", q: ['nwr[leisure=stadium]'] },
  nature:      { r: 10000,  label: "named parks & reserves", q: ['nwr[leisure~"^(park|nature_reserve)$"][name]'] },
  hiking:      { r: 30000,  label: "hiking routes", q: ['relation[route=hiking]'] },
  mountains:   { r: 40000,  label: "mountain peaks", q: ['node[natural=peak]'] },
  lakes:       { r: 30000,  label: "named lakes & rivers", q: ['nwr[natural=water][water~"^(lake|river|reservoir)$"][name]'] },
  views:       { r: 20000,  label: "viewpoints", q: ['nwr[tourism=viewpoint]'] },
  spas:        { r: 20000,  label: "spas, saunas, baths & hot springs", q: ['nwr[leisure~"^(sauna|spa)$"]', 'nwr[amenity=public_bath]', 'nwr[natural=hot_spring]'] },
  surf:        { r: 40000,  label: "surf, dive & kite spots", q: ['nwr[sport~"surfing|scuba_diving|kitesurfing|windsurfing"]'] },
  beach:       { r: 30000,  label: "beaches", q: ['nwr[natural=beach]'] },
  islands:     { r: 50000,  label: "islands", q: ['nwr[place~"^(island|islet)$"][name]'] },
  wine:        { r: 30000,  label: "wineries, breweries & wine shops", q: ['nwr[craft~"^(winery|brewery)$"]', 'nwr[shop=wine]'] },
  snow:        { r: 60000,  label: "ski areas", q: ['nwr[landuse=winter_sports]'] },
  wildlife:    { r: 60000,  label: "zoos, aquariums & national parks", q: ['nwr[tourism~"^(zoo|aquarium)$"]', 'nwr[boundary=national_park]'] },
  desert:      { r: 80000,  label: "volcanoes & named dunes", q: ['node[natural=volcano]', 'nwr[natural=dune][name]'] }
};
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
function overpassQuery(c) {
  const parts = Object.values(OSM_QUERIES).map(({ r, q }) =>
    `(${q.map((f) => f.replace(/^(nwr|node|way|relation)/, `$1(around:${r},${c.lat},${c.lon})`)).join(";")};);out count;`);
  return `[out:json][timeout:180];\n${parts.join("\n")}`;
}
async function osm() {
  const list = order("osm");
  for (const [i, c] of list.entries()) {
    if (timeUp("osm")) break;
    const body = "data=" + encodeURIComponent(overpassQuery(c));
    let done = false;
    for (const url of OVERPASS) {
      try {
        const d = await get(url, { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" }, tries: 2, wait: 20000 });
        const counts = (d.elements || []).filter((e) => e.type === "count").map((e) => Number(e.tags.total));
        const keys = Object.keys(OSM_QUERIES);
        if (counts.length !== keys.length) throw new Error(`expected ${keys.length} counts, got ${counts.length}`);
        c.data.osm = Object.fromEntries(keys.map((k, j) => [k, counts[j]]));
        log(`osm ${i + 1}/${list.length}`, c.id, JSON.stringify(c.data.osm));
        done = true;
        break;
      } catch (e) { log("osm", c.id, url, e.message); }
    }
    if (!done) errors.push(`osm ${c.id}: all Overpass servers failed`);
    await sleep(8000); // be polite: Overpass is a free, shared service
  }
}

// ---------------------------------------------------------------------------------------------
// Derived values: everything the app uses, computed from the raw data above.
const BASE_COSTS = { hostel: 30, food: 26, transit: 6, activities: 12 }; // EUR/day, an EU-average city, student budget
const EDITORIAL = ["festivals", "film", "villages"]; // no reliable open data: keep the hand-picked tags

function percentileRanks(values) {
  // Rank of each value among the others, 0..1 (ties share the average rank). null stays null.
  const v = values.map((x, i) => ({ x, i })).filter((o) => o.x != null).sort((a, b) => a.x - b.x);
  const out = values.map(() => null);
  for (let a = 0; a < v.length;) {
    let b = a; while (b + 1 < v.length && v[b + 1].x === v[a].x) b++;
    const r = v.length > 1 ? ((a + b) / 2) / (v.length - 1) : 0.5;
    for (let k = a; k <= b; k++) out[v[k].i] = r;
    a = b + 1;
  }
  return out;
}

function derive() {
  const keys = Object.keys(OSM_QUERIES);
  // Interest strength 0–1: where this city ranks among all cities for that kind of place (none = 0).
  for (const k of keys) {
    const ranks = percentileRanks(cities.map((c) => (c.data.osm ? Math.log1p(c.data.osm[k]) : null)));
    cities.forEach((c, i) => {
      if (ranks[i] == null) return;
      c.data.strengths = c.data.strengths || {};
      c.data.strengths[k] = c.data.osm[k] === 0 ? 0 : round(ranks[i]);
    });
  }
  // Popularity and "hidden gems": lots to see (historic sites, museums, viewpoints) but fewer visitors.
  const pop = percentileRanks(cities.map((c) => (c.data.wikipedia ? Math.log(c.data.wikipedia.monthlyViews + 1) : null)));
  const sights = percentileRanks(cities.map((c) => (c.data.strengths ? mean([c.data.strengths.history, c.data.strengths.art, c.data.strengths.views, c.data.strengths.castles]) : null)));
  const gem = percentileRanks(cities.map((c, i) => (pop[i] == null || sights[i] == null ? null : sights[i] - pop[i])));
  cities.forEach((c, i) => {
    if (pop[i] != null) c.data.popularity = round(pop[i]);
    if (gem[i] != null) { c.data.strengths = c.data.strengths || {}; c.data.strengths.offbeat = round(gem[i]); }
  });

  // Best months: 65% weather comfort + 35% fewer crowds, ranked across every city-month into 1–5.
  const all = [];
  for (const c of cities) {
    const cl = c.data.climate, cr = c.data.crowds;
    if (!cl) continue;
    c._s = cl.comfort.map((cf, m) => {
      const crowd = cr ? clamp((cr.index[m] - 0.6) / 1.0, 0, 1) : 0.5;
      return 0.65 * cf + 0.35 * (1 - crowd);
    });
    all.push(...c._s);
  }
  all.sort((a, b) => a - b);
  const q = (s) => { let lo = 0, hi = all.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (all[mid] < s) lo = mid + 1; else hi = mid; } return lo / all.length; };
  for (const c of cities) {
    if (c._s) c.data.season = c._s.map((s) => Math.min(5, 1 + Math.floor(q(s) * 5)));
    delete c._s;
    // Prices rise with crowds: +40% of the crowd index above average, kept within 0.8–1.4.
    if (c.data.crowds) c.data.priceMult = c.data.crowds.index.map((x) => round(clamp(1 + 0.4 * (x - 1), 0.8, 1.4)));
    // Daily costs: an EU-average city scaled by the country's price level, plus up to ±17% for how
    // touristy the city is (Wikipedia popularity rank).
    if (c.data.price) {
      const prem = c.data.popularity != null ? 0.83 + 0.34 * c.data.popularity : 1;
      c.data.costs = Object.fromEntries(Object.entries(BASE_COSTS).map(([k, v]) =>
        [k, Math.max(k === "transit" ? 1 : 5, Math.round(v * c.data.price.level * (k === "transit" ? 1 : prem)))]));
    }
    // Tags shown in the app: strong data signals (top 40%) plus the editorial-only ones.
    if (c.data.strengths) {
      const strong = Object.entries(c.data.strengths).filter(([, s]) => s >= 0.6).map(([k]) => k);
      c.data.interests = [...new Set([...strong, ...c.estimate.interests.filter((k) => EDITORIAL.includes(k))])];
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Report: how the real data compares with the original hand-written estimates.
function pearson(xs, ys) {
  const n = xs.length, mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
}
function report(meta) {
  const L = [];
  L.push("# Data report", "", `Generated ${meta.generated} by \`scripts/build-data.mjs\`. This compares the original hand-written estimates in the app with the values computed from open data.`, "");
  const withSeason = cities.filter((c) => c.data.season);
  const xs = [], ys = [];
  withSeason.forEach((c) => c.data.season.forEach((s, m) => { xs.push(c.estimate.season[m]); ys.push(s); }));
  if (xs.length) {
    const agree = xs.filter((x, i) => Math.abs(x - ys[i]) <= 1).length / xs.length;
    L.push("## Best months (1–5 scores)", "",
      `- City-months compared: ${xs.length}`,
      `- Correlation between estimates and data: **${round(pearson(xs, ys))}** (1 = identical ranking, 0 = unrelated)`,
      `- Within one point of each other: **${Math.round(agree * 100)}%**`, "");
    const diffs = withSeason.map((c) => ({ c, d: mean(c.data.season.map((s, m) => Math.abs(s - c.estimate.season[m]))) })).sort((a, b) => b.d - a.d).slice(0, 8);
    L.push("Biggest disagreements (average points off per month):", "", "| City | Off by | Estimate (Jan–Dec) | Data (Jan–Dec) |", "|---|---|---|---|");
    diffs.forEach(({ c, d }) => L.push(`| ${c.name} | ${round(d, 1)} | ${c.estimate.season.join(" ")} | ${c.data.season.join(" ")} |`));
    L.push("");
  }
  const withCost = cities.filter((c) => c.data.costs);
  if (withCost.length) {
    const tot = (o) => o.hostel + o.food + o.transit + o.activities;
    const rel = withCost.map((c) => ({ c, e: tot(c.estimate.costs), d: tot(c.data.costs) }));
    L.push("## Daily costs (hostel + food + transit + activities, EUR)", "",
      `- Correlation between estimates and data: **${round(pearson(rel.map((r) => r.e), rel.map((r) => r.d)))}**`,
      `- Average difference: **${Math.round(mean(rel.map((r) => Math.abs(r.d - r.e))))} EUR/day**`, "",
      "| City | Estimate | Data | Price level | Source |", "|---|---|---|---|---|");
    rel.sort((a, b) => Math.abs(b.d - b.e) - Math.abs(a.d - a.e)).slice(0, 12)
      .forEach(({ c, e, d }) => L.push(`| ${c.name} | ${e} | ${d} | ${c.data.price.level} | ${c.data.price.source} |`));
    L.push("");
  }
  const withTags = cities.filter((c) => c.data.strengths);
  if (withTags.length) {
    L.push("## Interest tags: hand-picked vs. OpenStreetMap", "", "Agreement = share of cities where the hand-picked tag and the data (top 40% of cities) say the same thing.", "", "| Interest | Agreement | Tagged by hand only | Found by data only |", "|---|---|---|---|");
    for (const k of Object.keys(OSM_QUERIES).concat("offbeat")) {
      const both = withTags.filter((c) => c.data.strengths[k] != null);
      if (!both.length) continue;
      const hand = (c) => c.estimate.interests.includes(k), data = (c) => c.data.strengths[k] >= 0.6;
      const same = both.filter((c) => hand(c) === data(c)).length / both.length;
      const handOnly = both.filter((c) => hand(c) && !data(c)).map((c) => c.name).slice(0, 5).join(", ");
      const dataOnly = both.filter((c) => !hand(c) && data(c)).map((c) => c.name).slice(0, 5).join(", ");
      L.push(`| ${k} | ${Math.round(same * 100)}% | ${handOnly || "–"} | ${dataOnly || "–"} |`);
    }
    L.push("");
  }
  L.push("## Coverage", "",
    `- Climate: ${cities.filter((c) => c.data.climate).length}/${cities.length} cities`,
    `- Crowds: ${cities.filter((c) => c.data.crowds?.source === "eurostat").length} from Eurostat, ${cities.filter((c) => c.data.crowds?.source === "wikipedia").length} from Wikipedia pageviews`,
    `- Prices: ${cities.filter((c) => c.data.price?.source === "eurostat").length} from Eurostat, ${cities.filter((c) => c.data.price?.source === "worldbank").length} from the World Bank`,
    `- OpenStreetMap counts: ${cities.filter((c) => c.data.osm).length}/${cities.length} cities`,
    `- Wikipedia popularity: ${cities.filter((c) => c.data.wikipedia).length}/${cities.length} cities`, "");
  if (errors.length) L.push("## Problems on this run", "", ...errors.slice(0, 50).map((e) => `- ${e}`), "");
  return L.join("\n");
}

// ---------------------------------------------------------------------------------------------
const steps = { wikipedia, climate, crowds, prices, osm };
for (const [name, fn] of Object.entries(steps)) {
  if (SKIP.has(name)) { log(`skipping ${name}`); continue; }
  log(`== ${name} (${Math.round((DEADLINE - Date.now()) / 60000)} min left)`);
  try { await fn(); } catch (e) { errors.push(`${name}: ${e.message}`); log(`${name} failed:`, e.message); }
}
derive();
const meta = {
  generated: new Date().toISOString().slice(0, 10),
  sources: {
    climate: "Open-Meteo historical weather API (ERA5 reanalysis), daily 2020–2024, CC BY 4.0: https://open-meteo.com/",
    crowds: "Eurostat tour_occ_nim, nights spent at tourist accommodation by month: https://ec.europa.eu/eurostat/databrowser/view/tour_occ_nim/",
    prices: "Eurostat prc_ppp_ind, price level indices for restaurants & hotels (EU27 = 100): https://ec.europa.eu/eurostat/databrowser/view/prc_ppp_ind/ ; World Bank PA.NUS.PPPC.RF price level ratio: https://data.worldbank.org/indicator/PA.NUS.PPPC.RF",
    places: "OpenStreetMap contributors via the Overpass API, ODbL: https://www.openstreetmap.org/copyright",
    popularity: "Wikimedia pageviews API, English Wikipedia, 2022–2024: https://wikimedia.org/api/rest_v1/"
  },
  method: {
    comfort: "0.55 × temperature (best at a 25°C daily high) + 0.25 × fewer rainy days + 0.2 × sunshine",
    season: "0.65 × comfort + 0.35 × fewer crowds, ranked across all city-months into 1–5",
    priceMult: "1 + 0.4 × (crowd index − 1), kept between 0.8 and 1.4",
    costs: `EU-average city (${JSON.stringify(BASE_COSTS)} EUR/day) × country price level × (0.83 to 1.17 by Wikipedia popularity)`,
    interests: "Percentile rank among all the cities of the OpenStreetMap count (log scale); tagged when in the top 40%. Festivals, film spots and old towns stay hand-picked.",
    offbeat: "Rank of (sights rank − popularity rank): lots to see, fewer visitors"
  },
  osm: Object.fromEntries(Object.entries(OSM_QUERIES).map(([k, v]) => [k, { label: v.label, radiusKm: v.r / 1000 }])),
  errors
};
const out = { ...meta, cities: Object.fromEntries(cities.map((c) => [c.id, c.data])) };
await fs.writeFile(OUT, JSON.stringify(out, null, 1));
await fs.writeFile(REPORT, report(meta));
log(`wrote ${OUT} (${errors.length} problems)`);
// Fail the job only if almost nothing worked (so a broken source shows up as a red run).
const got = cities.filter((c) => c.data.climate && c.data.osm).length;
if (got < cities.length * 0.5) { console.error(`only ${got}/${cities.length} cities have climate and OSM data`); process.exit(1); }
