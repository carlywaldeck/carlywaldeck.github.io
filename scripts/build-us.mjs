#!/usr/bin/env node
// Builds the California data for the US version (data/us-data.js) from:
//  - scripts/us/colleges.mjs and scripts/us/places.mjs: colleges and hand-picked places with notes and plans;
//  - OSRM (OpenStreetMap routing): real drive times and distances from every campus to every place;
//  - Wikipedia: coordinates to check ours, and pageviews for popularity;
//  - Open-Meteo: 5 years of daily weather per place, for the best months to go;
//  - OpenStreetMap (Overpass): extra local finds near each campus (waterfalls, peaks, hot springs,
//    viewpoints, caves… that have a Wikipedia article);
//  - EIA (US Energy Information Administration): this week's California gas price (needs EIA_KEY).
// Network results are cached in data/us-sources.json, so the build also works offline (with
// estimates for anything never fetched). Run: node scripts/build-us.mjs  (FETCH=1 to refresh sources)
import fs from "node:fs/promises";
import { COLLEGES } from "./us/colleges.mjs";
import { PLACES } from "./us/places.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = ROOT + "data/us-sources.json";
const FETCH = !!process.env.FETCH;
const UA = "Weekender/1.0 (student trip planner; https://weekender-trips.com)";
const sources = JSON.parse(await fs.readFile(SRC, "utf8").catch(() => "{}"));
sources.routes = sources.routes || {}; sources.wiki = sources.wiki || {}; sources.climate = sources.climate || {}; sources.osm = sources.osm || {};
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, opts = {}) {
  for (let i = 0; i < (opts.tries || 3); i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, ...(opts.headers || {}) }, method: opts.method || "GET", body: opts.body, signal: AbortSignal.timeout(opts.timeout || 60000) });
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) { if (i === (opts.tries || 3) - 1) throw e; await sleep((opts.wait || 3000) * (i + 1)); }
  }
}
const toRad = (d) => (d * Math.PI) / 180;
const km = (a, b) => { const R = 6371, dLat = toRad(b[0] - a[0]), dLon = toRad(b[1] - a[1]); const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };

// ---------------------------------------------------------------- 1. Wikipedia: coordinates and popularity
async function fetchWiki(items) {
  const todo = items.filter((x) => x.wiki && !sources.wiki[x.wiki]);
  for (let i = 0; i < todo.length; i += 40) {
    const batch = todo.slice(i, i + 40);
    try {
      const titles = batch.map((x) => decodeURIComponent(x.wiki).replace(/_/g, " ")).join("|");
      const d = await get(`https://en.wikipedia.org/w/api.php?action=query&prop=coordinates&redirects=1&format=json&titles=${encodeURIComponent(titles)}`);
      const norm = Object.fromEntries([...(d.query.normalized || []), ...(d.query.redirects || [])].map((n) => [n.to, n.from]));
      for (const p of Object.values(d.query.pages || {})) {
        let from = p.title; while (norm[from]) from = norm[from];
        const item = batch.find((x) => decodeURIComponent(x.wiki).replace(/_/g, " ") === from || decodeURIComponent(x.wiki).replace(/_/g, " ") === p.title);
        if (item) sources.wiki[item.wiki] = { ...(sources.wiki[item.wiki] || {}), title: p.title, coord: p.coordinates ? [p.coordinates[0].lat, p.coordinates[0].lon] : null };
      }
    } catch (e) { log("wikipedia coordinates:", e.message); }
    await sleep(500);
  }
  // Monthly pageviews over the last year: how well known a place is.
  const end = new Date(); end.setUTCDate(1); const start = new Date(end); start.setUTCFullYear(start.getUTCFullYear() - 1);
  const ym = (d) => d.toISOString().slice(0, 7).replace("-", "") + "01";
  for (const x of items) {
    const w = sources.wiki[x.wiki];
    if (!w || w.views != null) continue;
    try {
      const d = await get(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(w.title.replace(/ /g, "_"))}/monthly/${ym(start)}/${ym(end)}`, { tries: 2 });
      w.views = Math.round(d.items.reduce((s, i) => s + i.views, 0) / Math.max(1, d.items.length));
    } catch { w.views = 0; }
    await sleep(120);
  }
}

// ---------------------------------------------------------------- 2. OSRM: drive times campus → place
async function fetchRoutes(colleges, places) {
  for (const c of colleges) {
    const missing = places.filter((p) => !sources.routes[`${c.id}|${p.id}`]);
    for (let i = 0; i < missing.length; i += 90) {
      const batch = missing.slice(i, i + 90);
      const coords = [[c.lon, c.lat], ...batch.map((p) => [p.lon, p.lat])].map((x) => x.map((v) => v.toFixed(5)).join(",")).join(";");
      try {
        const d = await get(`https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&annotations=duration,distance`, { wait: 5000 });
        batch.forEach((p, k) => { const s = d.durations[0][k + 1], m = d.distances[0][k + 1]; if (s != null && m != null) sources.routes[`${c.id}|${p.id}`] = [Math.round(m / 100) / 10, Math.round(s / 36) / 100]; });
      } catch (e) { log(`osrm ${c.id}:`, e.message); }
      await sleep(1100); // the public server allows about one request a second
    }
  }
}

// ---------------------------------------------------------------- 3. Open-Meteo: what each month is like
async function fetchClimate(places) {
  const y1 = new Date().getUTCFullYear() - 1, y0 = y1 - 4;
  for (const p of places) {
    if (sources.climate[p.id]) continue;
    try {
      const d = await get(`https://archive-api.open-meteo.com/v1/archive?latitude=${p.lat}&longitude=${p.lon}&start_date=${y0}-01-01&end_date=${y1}-12-31&daily=temperature_2m_max,precipitation_sum&timezone=auto`, { wait: 20000 });
      const hi = Array(12).fill(0), n = Array(12).fill(0), wet = Array(12).fill(0);
      d.daily.time.forEach((t, i) => { const m = Number(t.slice(5, 7)) - 1; if (d.daily.temperature_2m_max[i] == null) return; hi[m] += d.daily.temperature_2m_max[i]; n[m]++; if (d.daily.precipitation_sum[i] >= 1) wet[m]++; });
      sources.climate[p.id] = { hiF: hi.map((h, m) => Math.round((h / n[m]) * 9 / 5 + 32)), wetDays: wet.map((w, m) => Math.round((w / n[m]) * 30)) };
    } catch (e) { log(`climate ${p.id}:`, e.message); }
    await sleep(800);
  }
}

// ---------------------------------------------------------------- 4. OpenStreetMap: local finds near campus
const OSM_KINDS = [["natural", "waterfall", "Waterfall", ["nature", "hiking"]], ["natural", "hot_spring", "Hot spring", ["spas", "nature", "offbeat"]],
  ["natural", "peak", "Summit hike", ["hiking", "views", "mountains"]], ["natural", "cave_entrance", "Cave", ["caves", "offbeat"]], ["natural", "arch", "Rock arch", ["views", "offbeat"]],
  ["natural", "beach", "Beach", ["beach"]], ["tourism", "viewpoint", "Viewpoint", ["views"]], ["leisure", "garden", "Garden", ["gardens"]], ["historic", "ghost_town", "Ghost town", ["history", "offbeat"]]];
async function fetchOsm(colleges) {
  for (const c of colleges) {
    if (sources.osm[c.id]) continue;
    const q = `[out:json][timeout:60];(${OSM_KINDS.map(([k, v]) => `nwr["${k}"="${v}"]["wikipedia"](around:40000,${c.lat},${c.lon});`).join("")});out center tags 80;`;
    try {
      const d = await get("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" }, wait: 15000, timeout: 90000 });
      sources.osm[c.id] = (d.elements || []).map((e) => {
        const kind = OSM_KINDS.find(([k, v]) => e.tags[k] === v);
        return kind && e.tags.name ? { name: e.tags.name, lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon, kind: kind[2], tags: kind[3], wiki: String(e.tags.wikipedia).replace(/^en:/, "").replace(/ /g, "_") } : null;
      }).filter((x) => x && x.lat && !/^[a-z]{2}:/.test(x.wiki));
    } catch (e) { log(`osm ${c.id}:`, e.message); }
    await sleep(2000);
  }
}

// ---------------------------------------------------------------- 5. EIA: gas price
async function fetchGas() {
  if (!process.env.EIA_KEY) return;
  try {
    const d = await get(`https://api.eia.gov/v2/petroleum/pri/gnd/data/?api_key=${process.env.EIA_KEY}&frequency=weekly&data[0]=value&facets[duoarea][]=SCA&facets[product][]=EPMR&sort[0][column]=period&sort[0][direction]=desc&length=1`);
    const row = d.response.data[0];
    if (row && row.value > 2) sources.gas = { price: Number(row.value), week: row.period, source: "EIA weekly California regular gasoline" };
  } catch (e) { log("eia:", e.message.replace(process.env.EIA_KEY, "***")); }
}

const colleges = COLLEGES.map(([id, name, town, lat, lon, code, wiki]) => ({ id, name, town, lat, lon, code, wiki }));
if (FETCH) {
  log("fetching sources…");
  await fetchWiki([...colleges, ...PLACES]);
  // Use Wikipedia's coordinates where ours are more than 3 km off.
  for (const x of [...colleges, ...PLACES]) { const w = sources.wiki[x.wiki]; if (w && w.coord && km([x.lat, x.lon], w.coord) > 3 && km([x.lat, x.lon], w.coord) < 60) { x.lat = w.coord[0]; x.lon = w.coord[1]; } }
  await fetchGas();
  await fetchOsm(colleges);
  await fetchRoutes(colleges, PLACES);
  await fetchClimate(PLACES);
  sources.fetched = new Date().toISOString().slice(0, 10);
  await fs.writeFile(SRC, JSON.stringify(sources));
} else {
  for (const x of [...colleges, ...PLACES]) { const w = sources.wiki[x.wiki]; if (w && w.coord && km([x.lat, x.lon], w.coord) > 3 && km([x.lat, x.lon], w.coord) < 60) { x.lat = w.coord[0]; x.lon = w.coord[1]; } }
}

// ---------------------------------------------------------------- build
const GAS = sources.gas || { price: 4.85, week: "2026-10", source: "estimate (California regular, set EIA_KEY to update weekly)" };
const MPG = 30, RIDERS = 3; // a typical car, shared by three friends
const STAY = { camp: 12, hostel: 48, motel: 65, cabin: 55 }; // per person per night: a $35 campsite for three, a $130 motel room for two…
const FOOD = 30; // per day: groceries, a cheap lunch and dinner out
// How good each month is (1–5), by kind of place; climate data (when fetched) nudges these.
const SEASON = {
  coast: [4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 4, 4], north_coast: [2, 2, 3, 3, 4, 5, 5, 5, 5, 4, 3, 2], bay: [3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 4, 3],
  city: [4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 4, 4], wine: [3, 3, 4, 4, 5, 5, 4, 4, 5, 5, 4, 3], valley: [3, 3, 4, 5, 5, 3, 2, 2, 4, 5, 4, 3],
  foothills: [3, 3, 4, 5, 5, 4, 3, 3, 4, 5, 4, 3], sierra: [2, 2, 3, 3, 4, 5, 5, 5, 5, 4, 2, 2], sierra_high: [1, 1, 1, 2, 3, 5, 5, 5, 5, 3, 1, 1],
  snow: [5, 5, 5, 3, 3, 4, 5, 5, 4, 3, 3, 4], high_desert: [3, 3, 4, 5, 5, 4, 3, 3, 5, 5, 4, 3], desert: [5, 5, 5, 4, 2, 1, 1, 1, 2, 4, 5, 5],
  socal_mtn: [4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 4, 4]
};
function season(p) {
  const base = SEASON[p.area] || SEASON.city, c = sources.climate[p.id];
  if (!c) return base;
  return base.map((s, m) => {
    const t = c.hiF[m], comfy = t >= 62 && t <= 85 ? 5 : t >= 52 && t <= 92 ? 4 : t >= 42 && t <= 100 ? 2.5 : 1.5;
    const dry = c.wetDays[m] <= 3 ? 5 : c.wetDays[m] <= 7 ? 4 : c.wetDays[m] <= 11 ? 3 : 2;
    // Snow places want cold months: trust the profile there.
    return p.area === "snow" ? s : Math.max(1, Math.min(5, Math.round(0.6 * s + 0.2 * comfy + 0.2 * dry)));
  });
}
function route(c, p) {
  const r = sources.routes[`${c.id}|${p.id}`];
  if (r) return { km: r[0], hours: r[1], real: true };
  // No routing yet: straight line × 1.3 for roads, slower in the mountains and far north.
  const slow = ["sierra", "sierra_high", "north_coast", "socal_mtn", "snow"].includes(p.area);
  const d = km([c.lat, c.lon], [p.lat, p.lon]) * 1.3;
  return { km: Math.round(d), hours: Math.round((d / (slow ? 62 : 82) + 0.15) * 100) / 100, real: false };
}
const pop = (p) => (sources.wiki[p.wiki] || {}).views || 0;

// Places are stored once; each college gets its routes: [place id, road km, hours, kinds], where kinds
// says how the place works from this campus: l = local find, d = day trip, w = weekend, x = 3+ days.
const places = {};
const addPlace = (p) => { places[p.id] = { name: p.name, lat: +p.lat.toFixed(4), lon: +p.lon.toFixed(4), area: p.area, tags: p.tags, fee: p.fee || 0, ticket: p.ticket || 0, stay: p.stay, note: p.note, days: p.days, wiki: p.wiki, season: season(p), pop: pop(p), ...(sources.climate[p.id] ? { clim: sources.climate[p.id] } : {}), ...(p.osm ? { osm: 1 } : {}) }; };
PLACES.forEach(addPlace);
const out = [];
for (const c of colleges) {
  const local = [], day = [], wkd = [];
  const all = [...PLACES];
  // Extra local finds from OpenStreetMap near this campus (not already one of our places).
  for (const o of (sources.osm[c.id] || [])) {
    if (all.some((p) => km([p.lat, p.lon], [o.lat, o.lon]) < 4 || p.name === o.name)) continue;
    const p = { id: `osm-${o.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name: o.name, lat: o.lat, lon: o.lon, area: "coast", tags: o.tags, fee: 0, stay: null, trip: "local", osm: true,
      note: `${o.kind} near campus (found in OpenStreetMap; it has a Wikipedia page).`, days: [`${o.kind}: go in the late afternoon for the light, then dinner near campus`], wiki: o.wiki };
    all.push(p); if (!places[p.id]) addPlace(p);
  }
  for (const p of all) {
    const r = route(c, p), h = r.hours;
    if (p.area === "city" && km([c.lat, c.lon], [p.lat, p.lon]) < 12) continue; // you're already there
    const row = (k) => [p.id, Math.round(r.km), Math.round(h * 100) / 100, k + (r.real ? "" : "~")];
    if ((p.trip === "local" || p.trip === "both" || p.trip === "day") && h <= 0.8) local.push(row("l"));
    else if ((p.trip === "local" && h <= 1.5) || ((p.trip === "both" || p.trip === "day") && h <= 3)) day.push(row("d"));
    if (((p.trip === "both" || p.trip === "weekend") && h >= 1 && h <= 7) || (p.trip === "long" && h <= 9)) wkd.push(row(p.trip === "long" ? "x" : "w"));
  }
  const fame = (a, b) => (places[b[0]].pop - places[a[0]].pop) || (a[1] - b[1]);
  out.push({ id: c.id, code: c.code, name: c.name, town: c.town, lat: c.lat, lon: c.lon, wiki: c.wiki,
    trips: [...local.sort((a, b) => a[1] - b[1]).slice(0, 8), ...day.sort(fame).slice(0, 14), ...wkd.sort(fame).slice(0, 22)] });
}
const data = { generated: new Date().toISOString().slice(0, 10), region: "us",
  sources: { places: "Hand-picked by Weekender (scripts/us/places.mjs)", routes: Object.keys(sources.routes).length ? "OSRM / OpenStreetMap road routing" : "estimated from distance (routing not fetched yet)",
    wiki: "Wikipedia (coordinates, pageviews)", climate: Object.keys(sources.climate).length ? "Open-Meteo, 5 years of daily weather" : "season profiles by type of place", osm: "OpenStreetMap (Overpass)", gas: GAS.source },
  gas: GAS, mpg: MPG, riders: RIDERS, stay: STAY, food: FOOD, fetched: sources.fetched || null, places, colleges: out };
const js = "// Generated by scripts/build-us.mjs. Do not edit by hand.\nwindow.US_DATA = " + JSON.stringify(data) + ";\n";
await fs.writeFile(ROOT + "data/us-data.js", js);
const n = out.reduce((s, c) => s + c.trips.length, 0);
log(`wrote data/us-data.js: ${out.length} colleges, ${PLACES.length} places, ${n} trips (${Math.round(js.length / 1024)} KB); routes ${Object.keys(sources.routes).length}, climate ${Object.keys(sources.climate).length}, osm ${Object.keys(sources.osm).length}, gas $${GAS.price}`);
