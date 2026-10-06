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
//   Popularity  Wikipedia pageviews, monthly, the last 24 months           wikimedia.org
//   Coast       OpenStreetMap: is there sea coastline within 15 km?        openstreetmap.org (ODbL)
//
// Options (environment variables):
//   ONLY=lisbon,madrid   only these cities (others keep their previous values)
//   SKIP=osm,climate     skip sources (previous values are kept)
//   TIME_BUDGET_MIN=110  stop fetching after this many minutes and save what we have
// Any request that fails keeps the city's previous value, so one bad day never wipes the data.
// Cities that are still missing a source are fetched first, so repeated runs fill the gaps.

import fs from "node:fs/promises";
import * as flightModel from "./flight-model.mjs";

// On GitHub Actions, "::notice::" / "::warning::" / "::error::" lines become annotations on the run,
// readable in the Actions tab (and through the API) without opening the logs.
const annotate = (level, msg) => { if (process.env.GITHUB_ACTIONS) console.log(`::${level} title=Data run::${String(msg).replace(/\r?\n/g, " ")}`); };
process.on("uncaughtException", (e) => { annotate("error", `crashed: ${e.stack || e.message}`); process.exit(1); });
process.on("unhandledRejection", (e) => { annotate("error", `crashed: ${(e && e.stack) || e}`); process.exit(1); });

const ROOT = new URL("..", import.meta.url).pathname;
const META = JSON.parse(await fs.readFile(ROOT + "data/cities-meta.json", "utf8")).cities;
const NEARBY = JSON.parse(await fs.readFile(ROOT + "data/nearby-airports.json", "utf8")).cities;
const OUT = ROOT + "data/city-data.json";
const REPORT = ROOT + "data/REPORT.md";
const UA = "WeekenderDataBot/1.0 (student project; +https://github.com/carlywaldeck/gsb-5576-project)";
const ONLY = new Set((process.env.ONLY || "").split(",").filter(Boolean));
const SKIP = new Set((process.env.SKIP || "").split(",").filter(Boolean));
const CLIMATE_YEARS = [2020, 2024];
// Last 24 full months: recent enough that renamed articles (e.g. "Zürich" -> "Zurich") don't split the count.
const PV_END = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 0));
const PV_START = new Date(Date.UTC(PV_END.getUTCFullYear() - 2, PV_END.getUTCMonth() + 1, 1));
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
const PAGEVIEW_RANGE = [ymd(PV_START) + "00", ymd(PV_END) + "00"];
const PV_LABEL = `${PV_START.toISOString().slice(0, 7)} to ${PV_END.toISOString().slice(0, 7)}`;
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
      c.data.wikipedia = { title, monthlyViews: Math.round(avg), seasonal: monthly.map((m) => round(m / avg)), years: PV_LABEL };
      log("wikipedia", c.id, title, Math.round(avg));
    } catch (e) { errors.push(`wikipedia ${c.id}: ${e.message}`); }
    await sleep(300);
  }
}

// ---------------------------------------------------------------------------------------------
// 2. Climate: Open-Meteo archive, daily max temperature, precipitation and sunshine
async function climate() {
  const [y0, y1] = CLIMATE_YEARS;
  // 2020–2024 history never changes: only fetch cities that don't have it yet.
  for (const c of todo.filter((c) => !c.data.climate || c.data.climate.years !== `${y0}–${y1}`)) {
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
// Comfort, 0–1: best around a 23°C daily high for sightseeing (27°C for beach places), fewer rainy
// days, more sun.
function comfort(high, rainDays, sunHours, ideal = 23) {
  if (high == null) return null;
  const t = Math.exp(-(((high - ideal) / 9) ** 2));
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
    else if (c.data.wikipedia) c.data.crowds = { index: c.data.wikipedia.seasonal, source: "wikipedia", detail: `Wikipedia pageviews by month, ${PV_LABEL} (no Eurostat data for this country)` };
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
  // World Bank: price level = PPP conversion factor for private consumption ÷ market exchange rate
  // (both in local currency per US$), latest year with both. One request per country and indicator,
  // so one missing country can't blank the rest. Scaled so the EU average = 1, like Eurostat.
  const wbLatest = async (iso, ind) => {
    const d = await get(`https://api.worldbank.org/v2/country/${iso}/indicator/${ind}?format=json&date=2015:2025&per_page=20`, { tries: 2 });
    const rows = Array.isArray(d) && Array.isArray(d[1]) ? d[1].filter((r) => r.value != null) : [];
    return Object.fromEntries(rows.map((r) => [r.date, r.value]));
  };
  const wb = {};
  const eu = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"];
  for (const iso of [...new Set([...isos.filter((i) => !level[i]), ...eu])]) {
    try {
      const [ppp, fx] = await Promise.all([wbLatest(iso, "PA.NUS.PRVT.PP"), wbLatest(iso, "PA.NUS.FCRF")]);
      const year = Object.keys(ppp).filter((y) => fx[y]).sort().pop();
      if (year) wb[iso] = { v: ppp[year] / fx[year], year };
    } catch (e) { errors.push(`prices worldbank ${iso}: ${e.message}`); }
    await sleep(200);
  }
  const euAvg = mean(eu.map((k) => wb[k] && wb[k].v));
  for (const iso of isos) {
    if (level[iso] || !wb[iso] || !euAvg) continue;
    level[iso] = { level: round(wb[iso].v / euAvg), source: "worldbank", detail: `World Bank price level (PPP ÷ exchange rate), ${wb[iso].year}, relative to the EU average`, year: wb[iso].year };
  }
  log("prices worldbank", Object.keys(wb).length, "countries");
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
  desert:      { r: 80000,  label: "volcanoes & named dunes", q: ['node[natural=volcano]', 'nwr[natural=dune][name]'] },
  vintage:     { r: 5000,   label: "second-hand & vintage shops", q: ['nwr[shop~"^(second_hand|charity|antiques)$"]'] },
  books:       { r: 5000,   label: "bookshops & libraries", q: ['nwr[shop=books]', 'nwr[amenity=library]'] },
  vegan:       { r: 5000,   label: "places with vegan or vegetarian options", q: ['nwr[~"^diet:(vegan|vegetarian)$"~"^(yes|only)$"]'] },
  cycling:     { r: 15000,  label: "bike rentals & cycle routes", q: ['nwr[amenity=bicycle_rental]', 'relation[route=bicycle]'] },
  caves:       { r: 60000,  label: "named caves & waterfalls", q: ['node[natural=cave_entrance][name]', 'nwr[waterway=waterfall][name]'] },
  themeparks:  { r: 40000,  label: "theme & water parks", q: ['nwr[tourism=theme_park]', 'nwr[leisure=water_park]'] },
  gardens:     { r: 10000,  label: "named gardens", q: ['nwr[leisure=garden][name]'] },
  climbing:    { r: 40000,  label: "climbing walls & crags", q: ['nwr[sport=climbing]'] },
  lgbtq:       { r: 10000,  label: "LGBTQ+ venues", q: ['nwr[lgbtq~"^(primary|welcome|friendly|yes)$"]', 'nwr[gay=yes]'] },
  games:       { r: 10000,  label: "escape rooms & game shops", q: ['nwr[leisure=escape_game]', 'nwr[shop=games]'] },
  students:    { r: 10000,  label: "universities & colleges", q: ['nwr[amenity~"^(university|college)$"]'] }
};
const PRESENCE_SCALES = {
  beach: { lo: 5, hi: 150 }, surf: { lo: 2, hi: 40 }, snow: { lo: 5, hi: 40 }, desert: { lo: 1, hi: 40 },
  islands: { lo: 5, hi: 100 }, mountains: { lo: 50, hi: 1500 }, lakes: { lo: 5, hi: 200 },
  spas: { lo: 2, hi: 60 }, wildlife: { lo: 3, hi: 60 }
};
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
function overpassQuery(c, keys = Object.keys(OSM_QUERIES)) {
  const parts = keys.map((k) => OSM_QUERIES[k]).map(({ r, q }) =>
    `(${q.map((f) => f.replace(/^(nwr|node|way|relation)/, `$1(around:${r},${c.lat},${c.lon})`)).join(";")};);out count;`);
  return `[out:json][timeout:180];\n${parts.join("\n")}`;
}
async function osm() {
  // OpenStreetMap changes slowly: refetch a city only when it's missing or older than 90 days
  // (FULL_OSM=1 refetches everything).
  const age = (c) => (Date.now() - Date.parse(c.data.osmDate || previous.generated || "2000-01-01")) / 864e5;
  // Also refetch cities missing a count for a newly added interest.
  const keys = Object.keys(OSM_QUERIES);
  const list = order("osm").filter((c) => process.env.FULL_OSM === "1" || !c.data.osm || keys.some((k) => c.data.osm[k] == null) || age(c) > 90);
  log(`osm: ${list.length} cities to fetch`);
  for (const [i, c] of list.entries()) {
    if (timeUp("osm")) break;
    // Only new interests missing? Ask for just those counts (much faster than the full query).
    const full = process.env.FULL_OSM === "1" || !c.data.osm || age(c) > 90;
    const want = full ? keys : keys.filter((k) => c.data.osm[k] == null);
    const body = "data=" + encodeURIComponent(overpassQuery(c, want));
    let done = false;
    for (const url of OVERPASS) {
      try {
        const d = await get(url, { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" }, tries: 2, wait: 20000 });
        const counts = (d.elements || []).filter((e) => e.type === "count").map((e) => Number(e.tags.total));
        if (counts.length !== want.length) throw new Error(`expected ${want.length} counts, got ${counts.length}`);
        c.data.osm = { ...(full ? {} : c.data.osm), ...Object.fromEntries(want.map((k, j) => [k, counts[j]])) };
        if (full) c.data.osmDate = new Date().toISOString().slice(0, 10);
        log(`osm ${i + 1}/${list.length}`, c.id, JSON.stringify(c.data.osm));
        done = true;
        break;
      } catch (e) { log("osm", c.id, url, e.message); }
    }
    if (!done) errors.push(`osm ${c.id}: all Overpass servers failed`);
    await sleep(8000); // be polite: Overpass is a free, shared service
  }
}

// 5b. Coast: is the city on the sea? One tiny Overpass query per city. Used so lake and river
// beaches (tagged the same as sea beaches in OpenStreetMap) don't make an inland city a beach place.
async function coast() {
  const stopAt = Date.now() + 20 * 60000; // at most 20 minutes; Natural Earth covers the rest
  for (const c of order("coast").filter((c) => !c.data.coast)) {
    if (timeUp("coast") || Date.now() > stopAt) break;
    const body = "data=" + encodeURIComponent(`[out:json][timeout:60];way[natural=coastline](around:15000,${c.lat},${c.lon});out count;`);
    for (const url of OVERPASS) {
      try {
        const d = await get(url, { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" }, tries: 2, wait: 10000 });
        const n = Number(((d.elements || []).find((e) => e.type === "count") || { tags: {} }).tags.total);
        if (!Number.isFinite(n)) throw new Error("no count");
        c.data.coast = { onSea: n > 0, coastlineWays: n };
        log("coast", c.id, n);
        break;
      } catch (e) { log("coast", c.id, url, e.message); }
    }
    await sleep(2000);
  }
}

// 5c. Roads: real driving distance and time between every pair of cities, from OpenStreetMap via
// the OSRM routing service (table API). Used for bus and train times instead of straight lines.
// Roads barely change, so this reruns only every 180 days or when cities are added.
let roads = previous.roads || {};
async function roadTable() {
  const key = (a, b) => [a.id, b.id].sort().join("|");
  const stale = !previous.roadsDate || (Date.now() - Date.parse(previous.roadsDate)) / 864e5 > 180;
  const missing = cities.some((a) => cities.some((b) => a.id < b.id && !(key(a, b) in roads)));
  if (!stale && !missing) { log("roads: up to date"); return; }
  const next = {}, CH = 40;
  for (let i = 0; i < cities.length; i += CH) {
    for (let j = 0; j < cities.length; j += CH) {
      if (timeUp("roads")) return;
      const src = cities.slice(i, i + CH), dst = cities.slice(j, j + CH), pts = [...src, ...dst];
      const coords = pts.map((c) => `${c.lon},${c.lat}`).join(";");
      const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=${src.map((_, k) => k).join(";")}` +
        `&destinations=${dst.map((_, k) => src.length + k).join(";")}&annotations=duration,distance`;
      try {
        const d = await get(url, { tries: 3, wait: 10000 });
        if (d.code !== "Ok") throw new Error(d.code);
        src.forEach((a, x) => dst.forEach((b, y) => {
          if (a.id >= b.id) return;
          const km = d.distances[x][y], s = d.durations[x][y];
          // null = no road connection; keep it (as null) so the app knows there's no overland route.
          next[key(a, b)] = km == null || s == null ? null : [Math.round(km / 1000), Math.round(s / 360) / 10];
        }));
      } catch (e) { errors.push(`roads ${i}-${j}: ${e.message}`); }
      await sleep(2000); // the public OSRM server is shared: go slowly
    }
  }
  if (Object.keys(next).length) { roads = { ...roads, ...next }; previous.roadsDate = new Date().toISOString().slice(0, 10); }
  log("roads:", Object.keys(next).length, "city pairs");
}

// 5d. Flight fares: real round-trip prices from the Travelpayouts / Aviasales Data API (the cheapest
// fares Aviasales users found in the last few days; cached by Aviasales for about a week). Needs a
// free Travelpayouts token in the TRAVELPAYOUTS_TOKEN secret; without it this step is skipped.
// One request per departure city and month returns the cheapest fare to every destination.
let fares = previous.fares || null;
const nextMonths = (n) => Array.from({ length: n }, (_, i) => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + i); return d.toISOString().slice(0, 7); });
async function fetchFares() {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) { log("fares: no TRAVELPAYOUTS_TOKEN, skipping"); annotate("warning", "fares skipped: no TRAVELPAYOUTS_TOKEN secret found (Settings → Secrets and variables → Actions)"); return; }
  const months = nextMonths(12);
  // Our cities' airports plus the nearby ones students use (data/nearby-airports.json).
  const codes = [...new Set([...cities.map((c) => c.code), ...Object.values(NEARBY).flat().map((a) => a[0])])];
  const wanted = new Set(codes);
  const prices = {};
  let rows = 0, failed = 0;
  for (const origin of codes) {
    for (const [mi, month] of months.entries()) {
      if (timeUp("fares")) break;
      const url = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&departure_at=${month}` +
        `&one_way=false&unique=true&sorting=price&direct=false&currency=eur&limit=1000&token=${token}`;
      try {
        const d = await get(url, { tries: 2, wait: 5000 });
        if (d.success === false) throw new Error(d.error || "API error");
        for (const r of d.data || []) {
          if (!wanted.has(r.destination) || r.destination === origin || !(r.price > 0)) continue;
          const k = `${origin}-${r.destination}`;
          prices[k] = prices[k] || Array(12).fill(0);
          if (!prices[k][mi] || r.price < prices[k][mi]) prices[k][mi] = Math.round(r.price);
          rows++;
        }
      } catch (e) {
        if (++failed <= 5) errors.push(`fares ${origin} ${month}: ${e.message.replace(token, "***")}`);
      }
      await sleep(400); // stay well under the API's rate limit
    }
  }
  log(`fares: ${rows} fares for ${Object.keys(prices).length} routes (${failed} failed requests)`);
  annotate(rows ? "notice" : "warning", `fares: ${rows} fares on ${Object.keys(prices).length} routes, ${failed} of ${codes.length * months.length} requests failed${errors.find((e) => e.startsWith("fares")) ? `; first error: ${errors.find((e) => e.startsWith("fares"))}` : ""}`);
  if (rows) fares = smoothFares(prices, months, previous.fares);
  else errors.push("fares: the API returned no fares for our cities (check the token and that the Aviasales program is joined)");
}

// Each run is one snapshot of "the cheapest fare people found lately", which is noisy. Keep every fare
// seen in the last 5 weeks per route and month, and publish their median: steadier prices, and a route
// that wasn't searched this week still has last week's fare.
function smoothFares(prices, months, prev) {
  const today = new Date().toISOString().slice(0, 10), cutoff = new Date(Date.now() - 35 * 864e5).toISOString().slice(0, 10);
  const history = {};
  // Older data without history: treat its published prices as one earlier snapshot.
  const prevHistory = prev && (prev.history || (prev.prices && Object.fromEntries(Object.entries(prev.prices).map(([route, arr]) =>
    [route, Object.fromEntries(arr.map((p, i) => [prev.months[i], p > 0 ? [[p, prev.fetched]] : []]).filter(([, e]) => e.length))]))));
  for (const [route, byMonth] of Object.entries(prevHistory || {})) {
    for (const [ym, entries] of Object.entries(byMonth)) {
      if (!months.includes(ym)) continue;
      const keep = entries.filter(([, day]) => day >= cutoff && day !== today);
      if (keep.length) (history[route] = history[route] || {})[ym] = keep;
    }
  }
  for (const [route, arr] of Object.entries(prices)) arr.forEach((p, i) => {
    if (!(p > 0)) return;
    const h = (history[route] = history[route] || {});
    h[months[i]] = [...(h[months[i]] || []), [p, today]].slice(-5);
  });
  const median = (v) => { const s = v.map(([p]) => p).sort((a, b) => a - b); return s.length % 2 ? s[s.length >> 1] : Math.round((s[s.length / 2 - 1] + s[s.length / 2]) / 2); };
  const out = {};
  for (const [route, byMonth] of Object.entries(history)) out[route] = months.map((ym) => (byMonth[ym] ? median(byMonth[ym]) : 0));
  const snapshots = new Set(Object.values(history).flatMap((m) => Object.values(m).flat().map(([, d]) => d)));
  return { fetched: today, source: "Travelpayouts / Aviasales Data API", months, prices: out, history, snapshots: snapshots.size };
}

// Flight price model (see scripts/flight-model.mjs): trained on the real fares above, so routes and
// months with no recent fare get a data-driven estimate instead of the old distance formula.
// Evaluated on routes held out of training (every 5th route), against the old formula.
let flightFit = previous.flightModel || null;
function trainFlightModel() {
  if (!fares) return;
  const byCode = new Map();
  for (const c of cities) if (!byCode.has(c.code)) byCode.set(c.code, c);
  const inputOf = (h, d, m) => {
    const km = flightModel.haversineKm(h, d);
    return { km, destMult: (d.data.priceMult || [])[m] || 1, homeMult: (h.data.priceMult || [])[m] || 1, destLevel: d.data.price ? d.data.price.level : 1,
      destPop: d.data.popularity ?? 0.5, homePop: h.data.popularity ?? 0.5, origin: h.code, dest: d.code, month: m };
  };
  const rows = [];
  for (const [k, arr] of Object.entries(fares.prices)) {
    const [o, dcode] = k.split("-"), h = byCode.get(o), d = byCode.get(dcode);
    if (!h || !d) continue; // nearby-airport fares are used as real fares, not for training
    arr.forEach((p, i) => {
      if (!(p > 0)) return;
      const m = Number(fares.months[i].slice(5, 7)) - 1;
      rows.push({ k, i, price: p, origin: o, dest: dcode, month: m, input: inputOf(h, d, m) });
    });
  }
  if (rows.length < 50) { log(`flight model: only ${rows.length} fares, not training`); return; }
  const g0 = (enc) => enc.g;
  // Two models: "new route" (no fares on this route at all) and "known route" (fares in other months,
  // or on the reverse route), which adds that route's history.
  const xNew = (r, enc) => flightModel.features(r.input, enc);
  const xKnown = (r, enc, P) => [...flightModel.features(r.input, enc), ...flightModel.routeFeatures(P, r.origin, r.dest, r.i, g0(enc))];
  const train = (tr, P) => {
    const enc = flightModel.encode(tr);
    return { enc, mNew: flightModel.fit(tr.map((r) => xNew(r, enc)), tr.map((r) => r.price), 1, { smear: false }),
      mKnown: flightModel.fit(tr.map((r) => xKnown(r, enc, P)), tr.map((r) => r.price), 1, { smear: false }) };
  };
  const pricesOf = (rs) => { const P = {}; for (const r of rs) (P[r.k] = P[r.k] || Array(12).fill(0))[r.i] = r.price; return P; };
  const stats = (errs) => {
    const a = [...errs].sort((x, y) => x - y);
    return a.length ? { n: a.length, median: Math.round(a[a.length >> 1] * 100), mean: Math.round((a.reduce((s, v) => s + v, 0) / a.length) * 100) } : { n: 0 };
  };
  // Test A: routes the model never saw (every 5th route held out).
  const routes = [...new Set(rows.map((r) => r.k))].sort(), heldRoutes = new Set(routes.filter((_, i) => i % 5 === 0));
  const trA = rows.filter((r) => !heldRoutes.has(r.k)), teA = rows.filter((r) => heldRoutes.has(r.k));
  const A = train(trA, pricesOf(trA));
  const errA = teA.map((r) => Math.abs(flightModel.predict(A.mNew, xNew(r, A.enc)) - r.price) / r.price);
  const errOld = teA.map((r) => Math.abs(flightModel.oldFormula(r.input.km, r.input.destMult) - r.price) / r.price);
  // Test B: missing months (every 5th route-month held out), answered the way the app does it:
  // the reverse route's fare that month if there is one, else the known-route model, else the new-route model.
  const heldCell = (r) => ((r.k.charCodeAt(0) * 31 + r.k.charCodeAt(4) * 7 + r.i * 17) % 5) === 0;
  const trB = rows.filter((r) => !heldCell(r)), teB = rows.filter(heldCell), PB = pricesOf(trB);
  const B = train(trB, PB);
  const tiers = { reverse: [], known: [], new: [] };
  for (const r of teB) {
    const [o, d] = r.k.split("-"), rev = (PB[`${d}-${o}`] || [])[r.i];
    if (rev > 0) {
      tiers.reverse.push(Math.abs(rev - r.price) / r.price);
      const k = flightModel.predict(B.mKnown, xKnown(r, B.enc, PB));
      (tiers.blend = tiers.blend || []).push(Math.abs(Math.sqrt(rev * k) - r.price) / r.price);
    }
    else if (PB[r.k] || PB[`${d}-${o}`]) tiers.known.push(Math.abs(flightModel.predict(B.mKnown, xKnown(r, B.enc, PB)) - r.price) / r.price);
    else tiers.new.push(Math.abs(flightModel.predict(B.mNew, xNew(r, B.enc)) - r.price) / r.price);
  }
  // What people actually see: every pair of our cities at least 250 km apart, every month. How many
  // flight prices are real fares (direct or via a nearby airport), and how big is the typical error of
  // all the flight prices shown (real fares count as exact; the rest use the test errors above)?
  const P = fares.prices, alts = (c) => [c.code, ...(NEARBY[c.id] || []).map((a) => a[0])];
  const seen = { real: 0, reverse: 0, known: 0, new: 0 };
  for (const h of cities) for (const d of cities) {
    if (h === d || h.code === d.code || flightModel.haversineKm(h, d) < 250) continue;
    for (let i = 0; i < 12; i++) {
      const real = alts(h).some((o) => alts(d).some((x) => (P[`${o}-${x}`] || [])[i] > 0));
      if (real) seen.real++;
      else if ((P[`${d.code}-${h.code}`] || [])[i] > 0) seen.reverse++;
      else if (P[`${h.code}-${d.code}`] || P[`${d.code}-${h.code}`]) seen.known++;
      else seen.new++;
    }
  }
  const total = Object.values(seen).reduce((s, v) => s + v, 0);
  const sampled = [];
  const take = (errs, n) => { if (!errs.length) return; for (let j = 0; j < n; j++) sampled.push(errs[Math.floor((j * errs.length) / n)]); };
  for (let j = 0; j < Math.round((seen.real / total) * 2000); j++) sampled.push(0);
  take(tiers.blend || tiers.reverse, Math.round((seen.reverse / total) * 2000));
  take(tiers.known, Math.round((seen.known / total) * 2000));
  take(errA, Math.round((seen.new / total) * 2000));
  const final = train(rows, pricesOf(rows));
  flightFit = { ...final.mNew, enc: final.enc, known: { mean: final.mKnown.mean, std: final.mKnown.std, w: final.mKnown.w, b: final.mKnown.b, smear: 1 },
    features: flightModel.FEATURES, routeFeatures: flightModel.ROUTE_FEATURES, trained: fares.fetched, n: rows.length, routes: routes.length,
    test: { fares: teA.length, routes: heldRoutes.size, newRoute: stats(errA), oldFormula: stats(errOld),
      reverse: stats(tiers.reverse), blend: stats(tiers.blend || []), knownRoute: stats(tiers.known), newRouteB: stats(tiers.new),
      shown: { share: Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, Math.round((v / total) * 100)])), ...stats(sampled) },
      // kept for the page's short note
      medianModel: stats(errA).median, medianOld: stats(errOld).median, mapeModel: stats(errA).mean, mapeOld: stats(errOld).mean } };
  const t = flightFit.test;
  log("flight model", JSON.stringify(t));
  annotate("notice", `flight prices: ${t.shown.share.real}% are real fares; typical error of all flight prices shown ${t.shown.median}% (mean ${t.shown.mean}%). Model on unseen routes ${t.newRoute.median}% vs ${t.oldFormula.median}% old formula; known routes ${t.knownRoute.median}%; reverse fares ${t.reverse.median}%`);
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
  // Interest strength 0–1.
  // "How much" interests (food, nightlife, museums...): the city's rank among all cities.
  // "Is it there" interests (beach, snow...): a fixed log scale from `lo` (barely) to `hi` (plenty),
  // so a couple of small ski slopes don't rank a city near the top just because most have none.
  for (const k of keys) {
    const ranks = percentileRanks(cities.map((c) => (c.data.osm && c.data.osm[k] != null ? Math.log1p(c.data.osm[k]) : null)));
    cities.forEach((c, i) => {
      if (ranks[i] == null) return;
      c.data.strengths = c.data.strengths || {};
      const n = c.data.osm[k], sc = PRESENCE_SCALES[k];
      let s = n === 0 ? 0 : sc ? clamp((Math.log1p(n) - Math.log1p(sc.lo)) / (Math.log1p(sc.hi) - Math.log1p(sc.lo)), 0, 1) : ranks[i];
      // Beaches, water sports and islands only fully count on the sea; lake and river ones count a third.
      // On the sea? OpenStreetMap's coastline check if we have it, else Natural Earth distance (≤ 20 km).
      const onSea = c.data.coast ? c.data.coast.onSea : c.coastKm != null ? c.coastKm <= 20 : true;
      if ((k === "beach" || k === "surf" || k === "islands") && !onSea) s /= 3;
      c.data.strengths[k] = round(s);
    });
  }
  // Popularity (Wikipedia readers) and "hidden gems": real sights but fewer readers than most places.
  const pop = percentileRanks(cities.map((c) => (c.data.wikipedia ? Math.log(c.data.wikipedia.monthlyViews + 1) : null)));
  cities.forEach((c, i) => {
    if (pop[i] == null) return;
    c.data.popularity = round(pop[i]);
    const st = c.data.strengths;
    if (!st) return;
    const sights = mean([st.history, st.art, st.views, st.castles]);
    st.offbeat = round(sights < 0.3 ? 0 : 1 - pop[i]);
  });

  // Best months. Each month's raw score is weather comfort minus a penalty for peak crowds (only
  // above the yearly average: an empty month isn't a bonus, since off-season places often close).
  // The 1–5 score blends how the month ranks within the city's own year (60%) with how it ranks
  // against every city-month (40%), so a cool city's best month still counts as its best time.
  const rank = (sorted) => (s) => { let lo = 0, hi = sorted.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < s) lo = mid + 1; else hi = mid; } return lo / sorted.length; };
  const raw = new Map();
  for (const c of cities) {
    const cl = c.data.climate, cr = c.data.crowds;
    if (!cl) continue;
    const beach = c.estimate.interests.includes("beach") || (c.data.strengths && c.data.strengths.beach >= 0.6);
    cl.comfort = cl.high.map((h, m) => round(comfort(h, cl.rainDays[m], cl.sunHours[m], beach ? 27 : 23)));
    raw.set(c, cl.comfort.map((cf, m) => cf - 0.25 * (cr ? clamp(cr.index[m] - 1, 0, 1) : 0)));
  }
  const absRank = rank([...raw.values()].flat().sort((a, b) => a - b));
  const blended = new Map();
  for (const [c, r] of raw) {
    const lo = Math.min(...r), hi = Math.max(...r);
    blended.set(c, r.map((v) => 0.6 * (hi > lo ? (v - lo) / (hi - lo) : 0.5) + 0.4 * absRank(v)));
  }
  const q = rank([...blended.values()].flat().sort((a, b) => a - b));
  for (const c of cities) {
    if (blended.has(c)) c.data.season = blended.get(c).map((s) => Math.min(5, 1 + Math.floor(q(s) * 5)));
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
  if (fares) {
    const n = Object.values(fares.prices).reduce((s, a) => s + a.filter((p) => p > 0).length, 0);
    L.push("## Flight fares and the flight price model", "",
      `- Real round-trip fares (Travelpayouts / Aviasales, fetched ${fares.fetched}): **${n}** route-months on **${Object.keys(fares.prices).length}** routes, each the median of up to 5 weekly snapshots (${fares.snapshots || 1} so far)`);
    if (flightFit && flightFit.test && flightFit.test.shown) {
      const t = flightFit.test, s = t.shown.share;
      L.push(`- Models: ridge regression on log(fare), trained on ${flightFit.n} fares. "New route": ${flightFit.features.length} features (${flightFit.features.join(", ")}). "Known route" adds: ${flightFit.routeFeatures.join(", ")}`, "",
        "| Test | Typical error | Average error |", "|---|---|---|",
        `| New-route model, ${t.routes} routes it never saw | **${t.newRoute.median}%** | ${t.newRoute.mean}% |`,
        `| Old distance formula, same routes | ${t.oldFormula.median}% | ${t.oldFormula.mean}% |`,
        `| Missing month: reverse route's real fare that month (${t.reverse.n} cases) | **${t.reverse.median}%** | ${t.reverse.mean}% |`,
        `| Missing month: known-route model (${t.knownRoute.n} cases) | **${t.knownRoute.median}%** | ${t.knownRoute.mean}% |`,
        `| **All flight prices people see** (${s.real}% real fares, ${s.reverse}% reverse, ${s.known}% known-route model, ${s.new}% new-route model) | **${t.shown.median}%** | ${t.shown.mean}% |`, "");
    }
    L.push("");
  }
  if (errors.length) L.push("## Problems on this run", "", ...errors.slice(0, 50).map((e) => `- ${e}`), "");
  return L.join("\n");
}

// ---------------------------------------------------------------------------------------------
const steps = { wikipedia, climate, crowds, prices, fares: fetchFares, roads: roadTable, coast, osm };
for (const [name, fn] of Object.entries(steps)) {
  if (SKIP.has(name)) { log(`skipping ${name}`); continue; }
  log(`== ${name} (${Math.round((DEADLINE - Date.now()) / 60000)} min left)`);
  try { await fn(); } catch (e) { errors.push(`${name}: ${e.message}`); log(`${name} failed:`, e.message); }
}
derive();
trainFlightModel();
const meta = {
  generated: new Date().toISOString().slice(0, 10),
  sources: {
    climate: "Open-Meteo historical weather API (ERA5 reanalysis), daily 2020–2024, CC BY 4.0: https://open-meteo.com/",
    crowds: "Eurostat tour_occ_nim, nights spent at tourist accommodation by month: https://ec.europa.eu/eurostat/databrowser/view/tour_occ_nim/",
    prices: "Eurostat prc_ppp_ind, price level indices for restaurants & hotels (EU27 = 100): https://ec.europa.eu/eurostat/databrowser/view/prc_ppp_ind/ ; World Bank PA.NUS.PRVT.PP ÷ PA.NUS.FCRF (price level vs. the EU average) elsewhere: https://data.worldbank.org/indicator/PA.NUS.PRVT.PP",
    places: "OpenStreetMap contributors via the Overpass API, ODbL: https://www.openstreetmap.org/copyright",
    popularity: `Wikimedia pageviews API, English Wikipedia, ${PV_LABEL}: https://wikimedia.org/api/rest_v1/`,
    roads: "Driving distance and time between cities: OpenStreetMap contributors via OSRM (project-osrm.org), ODbL",
    fares: "Round-trip flight fares: Travelpayouts / Aviasales Data API (cheapest fares found by Aviasales users in the last days)"
  },
  method: {
    comfort: "0.55 × temperature (best at a 23°C daily high, or 27°C for beach places) + 0.25 × fewer rainy days + 0.2 × sunshine",
    season: "comfort − 0.25 × crowds above the yearly average; 60% rank within the city's own year + 40% rank across all city-months, into 1–5",
    priceMult: "1 + 0.4 × (crowd index − 1), kept between 0.8 and 1.4",
    costs: `EU-average city (${JSON.stringify(BASE_COSTS)} EUR/day) × country price level × (0.83 to 1.17 by Wikipedia popularity)`,
    interests: "Food, nightlife, museums and other 'how much' interests: rank among all the cities of the OpenStreetMap count (log scale). Beach, snow, islands and other 'is it there' interests: a fixed log scale per interest. Beaches, water sports and islands count a third away from the sea. Tagged at 0.6 and up. Festivals, film spots and old towns stay hand-picked.",
    offbeat: "1 − popularity rank (Wikipedia readers), for places with real sights (history, museums, viewpoints, castles)"
  },
  osm: Object.fromEntries(Object.entries(OSM_QUERIES).map(([k, v]) => [k, { label: v.label, radiusKm: v.r / 1000 }])),
  errors
};
const out = { ...meta, roadsDate: previous.roadsDate, roads, fares, flightModel: flightFit, cities: Object.fromEntries(cities.map((c) => [c.id, c.data])) };
await fs.writeFile(OUT, JSON.stringify(out, null, 1));
await fs.writeFile(REPORT, report(meta));
log(`wrote ${OUT} (${errors.length} problems)`);
annotate("notice", `wrote data: ${cities.length} cities, ${errors.length} problems; steps skipped: ${[...SKIP].join(",") || "none"}`);
// Fail the job only if almost nothing worked (so a broken source shows up as a red run).
const got = cities.filter((c) => c.data.climate && c.data.osm).length;
if (got < cities.length * 0.5) { console.error(`only ${got}/${cities.length} cities have climate and OSM data`); process.exit(1); }
