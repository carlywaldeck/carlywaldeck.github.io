#!/usr/bin/env node
// Things that change daily, for the California version: concerts, sports, shows and festivals near each
// place on the coming weekends (Ticketmaster Discovery API, needs TICKETMASTER_KEY), and campsites near
// each camping trip with how many sites are still open on Friday and Saturday nights (campgrounds from
// Recreation.gov's RIDB API, needs RIDB_KEY; availability from Recreation.gov's public calendar).
// Writes data/us-live.js (loaded by the app when a plan opens) and caches the campground list in
// data/us-camps.json. Without the keys it keeps whatever was fetched before.
// Run: node scripts/build-us-live.mjs (the daily "Refresh events and campsites" workflow runs it).
import fs from "node:fs/promises";
import { PLACES } from "./us/places.mjs";
import { PLACES_WEST } from "./us/places-west.mjs";
import { COLLEGES } from "./us/colleges.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = ROOT + "data/us-live.js", CAMPS = ROOT + "data/us-camps.json";
const UA = "Weekender/1.0 (student trip planner; https://weekender-trips.com)";
const TM = process.env.TICKETMASTER_KEY, RIDB = process.env.RIDB_KEY;
const WEEKS = Number(process.env.WEEKS || 8); // ~3,000 Ticketmaster calls a day (the limit is 5,000)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
async function get(url, headers = {}, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json", ...headers }, signal: AbortSignal.timeout(45000) });
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
      if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { fatal: true });
      return await r.json();
    } catch (e) { if (e.fatal || i === tries - 1) throw e; await sleep(3000 * (i + 1)); }
  }
}
const prev = await fs.readFile(OUT, "utf8").then((s) => JSON.parse(s.slice(s.indexOf("{"), s.lastIndexOf("}") + 1))).catch(() => ({ events: {}, camps: {} }));
const iso = (d) => d.toISOString().slice(0, 10);
// The coming weekends: [Friday, Sunday] for the next WEEKS weeks.
const weekends = [];
{ const d = new Date(); d.setUTCHours(12, 0, 0, 0); while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
  for (let w = 0; w < WEEKS; w++) { const f = new Date(d); f.setUTCDate(d.getUTCDate() + 7 * w); const s = new Date(f); s.setUTCDate(f.getUTCDate() + 2); weekends.push([iso(f), iso(s)]); } }
// Trip places, plus each college's own town ("c:" + college id) for the "In your town" card.
const places = [...PLACES, ...PLACES_WEST, ...COLLEGES.map(([id, name, town, lat, lon]) => ({ id: "c:" + id, name: town, lat, lon, area: "town" }))];

// ---------------------------------------------------------------- events (Ticketmaster)
// Per place and weekend, the most relevant events within 20 miles (25 for big parks with few venues),
// at most 4 a day. Kept: [date, time, name, venue, url, kind].
const KIND = { Music: "music", Sports: "sports", "Arts & Theatre": "arts", Film: "film", Miscellaneous: "misc" };
async function fetchEvents() {
  if (!TM) { log("events: no TICKETMASTER_KEY, keeping the previous events"); return prev.events || {}; }
  const out = {};
  let calls = 0, failed = 0;
  for (const p of places) {
    const list = [];
    for (const [fri, sun] of weekends) {
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TM}&latlong=${p.lat},${p.lon}&radius=${p.area === "town" ? 10 : p.area === "city" || p.city ? 15 : 25}&unit=miles` +
        `&startDateTime=${fri}T00:00:00Z&endDateTime=${sun}T23:59:59Z&size=25&sort=relevance,desc&locale=*`;
      try {
        const d = await get(url); calls++;
        for (const e of (d._embedded && d._embedded.events) || []) {
          const date = e.dates && e.dates.start && e.dates.start.localDate, seg = e.classifications && e.classifications[0] && e.classifications[0].segment && e.classifications[0].segment.name;
          if (!date || date < fri || date > sun || /parking|upsell|vip package|shuttle|gift card/i.test(e.name) || (e.dates.status && e.dates.status.code === "cancelled")) continue;
          if (list.filter((x) => x[0] === date).length >= 4 || list.some((x) => x[2] === e.name && x[0] === date)) continue;
          const venue = e._embedded && e._embedded.venues && e._embedded.venues[0];
          list.push([date, (e.dates.start.localTime || "").slice(0, 5), e.name.slice(0, 90), venue ? String(venue.name || "").slice(0, 60) : "", e.url, KIND[seg] || "misc"]);
        }
      } catch (err) { failed++; if (failed < 5) log(`events ${p.id} ${fri}: ${String(err.message).replace(TM, "***")}`); }
      await sleep(250); // the API allows 5 requests a second
    }
    if (list.length) out[p.id] = list.sort((a, b) => a[0].localeCompare(b[0]));
  }
  log(`events: ${calls} calls, ${failed} failed, ${Object.keys(out).length} places with events`);
  return calls ? out : prev.events || {};
}

// ---------------------------------------------------------------- campsites (Recreation.gov)
// Campgrounds within 15 miles of each camping trip, from RIDB (refreshed monthly, cached), then the
// number of open sites on each Friday and Saturday night from Recreation.gov's availability calendar.
async function fetchCampgrounds() {
  const cached = JSON.parse(await fs.readFile(CAMPS, "utf8").catch(() => "{}"));
  const fresh = cached.fetched && Date.now() - Date.parse(cached.fetched) < 30 * 864e5;
  if (fresh || !RIDB) { if (!RIDB) log("campgrounds: no RIDB_KEY, using the cached list"); return cached.places || {}; }
  const out = {};
  for (const p of places.filter((x) => x.stay === "camp")) {
    try {
      const d = await get(`https://ridb.recreation.gov/api/v1/facilities?latitude=${p.lat}&longitude=${p.lon}&radius=15&activity=CAMPING&limit=50`, { apikey: RIDB });
      const camps = (d.RECDATA || []).filter((f) => /campground/i.test(f.FacilityTypeDescription || "") && f.Reservable && f.FacilityLatitude)
        .map((f) => [String(f.FacilityID), String(f.FacilityName).replace(/\s+/g, " ").trim().replace(/\b([A-Z])([A-Z]+)\b/g, (m, a, b) => a + b.toLowerCase()), +f.FacilityLatitude.toFixed(4), +f.FacilityLongitude.toFixed(4)])
        .slice(0, 4);
      if (camps.length) out[p.id] = camps;
    } catch (e) { log(`ridb ${p.id}: ${String(e.message).replace(RIDB, "***")}`); }
    await sleep(400);
  }
  if (Object.keys(out).length) await fs.writeFile(CAMPS, JSON.stringify({ fetched: new Date().toISOString().slice(0, 10), places: out }));
  log(`campgrounds: ${Object.values(out).flat().length} near ${Object.keys(out).length} places`);
  return Object.keys(out).length ? out : cached.places || {};
}
async function fetchAvailability(byPlace) {
  const nights = new Set(weekends.flatMap(([fri]) => { const s = new Date(fri + "T12:00:00Z"); s.setUTCDate(s.getUTCDate() + 1); return [fri, iso(s)]; }));
  const months = [...new Set([...nights].map((n) => n.slice(0, 7)))];
  const open = {}; // campground id → { night: open sites }
  let ok = 0, failed = 0;
  for (const id of new Set(Object.values(byPlace).flat().map((c) => c[0]))) {
    const counts = {};
    for (const m of months) {
      try {
        const d = await get(`https://www.recreation.gov/api/camps/availability/campground/${id}/month?start_date=${m}-01T00%3A00%3A00.000Z`);
        for (const site of Object.values(d.campsites || {})) for (const [t, v] of Object.entries(site.availabilities || {})) {
          const n = t.slice(0, 10);
          if (nights.has(n)) counts[n] = (counts[n] || 0) + (v === "Available" ? 1 : 0);
        }
        ok++;
      } catch (e) { failed++; }
      await sleep(1200);
    }
    if (Object.keys(counts).length) open[id] = counts;
  }
  log(`availability: ${ok} months read, ${failed} failed, ${Object.keys(open).length} campgrounds`);
  return open;
}
async function fetchCamps() {
  const byPlace = await fetchCampgrounds();
  if (!Object.keys(byPlace).length) return prev.camps || {};
  const open = await fetchAvailability(byPlace);
  if (!Object.keys(open).length) return prev.camps || {};
  const out = {};
  for (const [pid, camps] of Object.entries(byPlace)) out[pid] = camps.map(([id, name, lat, lon]) => [id, name, lat, lon, open[id] || null]);
  return out;
}

const events = await fetchEvents();
const camps = await fetchCamps();
const data = { generated: new Date().toISOString(), weekends, events, camps };
await fs.writeFile(OUT, "// Generated by scripts/build-us-live.mjs (daily). Do not edit by hand.\nwindow.US_LIVE = " + JSON.stringify(data) + ";\n");
log(`wrote data/us-live.js (${Math.round(JSON.stringify(data).length / 1024)} KB): events for ${Object.keys(events).length} places, campsites for ${Object.keys(camps).length}`);
