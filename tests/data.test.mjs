// Checks every city, day trip and escape: required fields, valid values, coordinates inside the
// right country, coordinates for every map point, and plausible travel times.
import { loadAppData, suite } from "./helpers.mjs";

export default function run() {
  const { CITIES, PLACES, INTERESTS } = loadAppData();
  const t = suite("data");
  // Rough country bounding boxes [minLat, maxLat, minLon, maxLon].
  const BOX = { Spain: [27.5, 43.9, -18.3, 4.4], Portugal: [32.5, 42.2, -31.3, -6.1], France: [41.3, 51.1, -5.2, 9.6], UK: [49.9, 60.9, -8.2, 1.8], Netherlands: [50.7, 53.6, 3.3, 7.3], Germany: [47.2, 55.1, 5.8, 15.1], Czechia: [48.5, 51.1, 12.1, 18.9], Austria: [46.3, 49.1, 9.5, 17.2], Hungary: [45.7, 48.6, 16.1, 22.9], Poland: [49, 54.9, 14.1, 24.2], Italy: [35.4, 47.1, 6.6, 18.6], Greece: [34.8, 41.8, 19.3, 29.7], Ireland: [51.4, 55.4, -10.5, -5.9], Belgium: [49.5, 51.5, 2.5, 6.4], Denmark: [54.5, 57.8, 8, 15.2], Sweden: [55.3, 69.1, 11, 24.2], Switzerland: [45.8, 47.9, 5.9, 10.5], Croatia: [42.4, 46.6, 13.4, 19.5], Slovenia: [45.4, 46.9, 13.3, 16.6], Estonia: [57.5, 59.7, 21.7, 28.2], Latvia: [55.6, 58.1, 20.9, 28.3], Lithuania: [53.9, 56.5, 20.9, 26.9], "Türkiye": [35.8, 42.2, 25.6, 44.9], Bulgaria: [41.2, 44.3, 22.3, 28.7], Romania: [43.6, 48.3, 20.2, 29.8], Serbia: [42.2, 46.2, 18.8, 23.1], Malta: [35.8, 36.1, 14.1, 14.6], Morocco: [27.6, 35.95, -13.2, -1], Tunisia: [30.2, 37.6, 7.5, 11.6], Jordan: [29.1, 33.4, 34.9, 39.3], Georgia: [41, 43.6, 40, 46.8], Cyprus: [34.5, 35.8, 32.2, 34.6], Albania: [39.6, 42.7, 19.2, 21.1], "Bosnia & Herzegovina": [42.5, 45.3, 15.7, 19.7], Iceland: [63.2, 66.6, -24.6, -13.4], Norway: [57.9, 71.2, 4.5, 31.2], Finland: [59.8, 70.1, 20.5, 31.6], Luxembourg: [49.4, 50.2, 5.7, 6.6], Montenegro: [41.8, 43.6, 18.4, 20.4], "North Macedonia": [40.8, 42.4, 20.4, 23.1], Armenia: [38.8, 41.3, 43.4, 46.7], Egypt: [22, 31.7, 24.7, 36.9] };
  const km = (a, b) => { const r = (d) => d * Math.PI / 180; const x = Math.sin(r(b[0] - a[0]) / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(r(b[1] - a[1]) / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(x)); };
  const hoursOf = (how) => { const s = how.toLowerCase(), h = s.match(/(\d+)h(\d+)?/), m = s.match(/(\d+)\s*min/); const fh = h ? +h[1] + (h[2] ? +h[2] / 60 : 0) : null, fm = m ? +m[1] / 60 : null; return fh != null && fm != null ? (h.index < m.index ? fh : fm) : fh ?? fm; };

  const ids = new Set(), names = new Set();
  t.check(CITIES.length >= 100, `expected 100+ cities, got ${CITIES.length}`);
  for (const c of CITIES) {
    t.check(!ids.has(c.id), `duplicate id ${c.id}`); ids.add(c.id);
    t.check(!names.has(c.name), `duplicate name ${c.name}`); names.add(c.name);
    t.check(/^[A-Z]{3}$/.test(c.code), `${c.id}: airport code ${c.code}`);
    const box = BOX[c.country];
    t.check(box && c.lat >= box[0] && c.lat <= box[1] && c.lon >= box[2] && c.lon <= box[3], `${c.id}: (${c.lat}, ${c.lon}) not inside ${c.country}`);
    t.check(c.season.length === 12 && c.season.every((x) => Number.isInteger(x) && x >= 1 && x <= 5), `${c.id}: season must be 12 scores of 1–5`);
    t.check(c.priceMult.length === 12 && c.priceMult.every((x) => x >= 0.5 && x <= 2), `${c.id}: priceMult must be 12 values in 0.5–2`);
    t.check(["hostel", "food", "transit", "activities"].every((k) => c.costs[k] >= 0), `${c.id}: costs`);
    t.check(c.interests.every((k) => INTERESTS[k]), `${c.id}: unknown interest in ${c.interests}`);
    t.check(c.itinerary.length === 3 && c.itinerary.every((d) => d.length === 3 && d.every(([w, x]) => typeof w === "string" && x >= 0)), `${c.id}: itinerary must be 3 days × 3 slots`);
    t.check(c.bestTime && c.tips.length >= 2, `${c.id}: bestTime and 2+ tips`);
    t.check(c.dayTrips.length >= 2 && c.weekends.length >= 1, `${c.id}: needs 2+ day trips and 1+ weekend escape`);
    for (const [kind, list] of [["day", c.dayTrips], ["weekend", c.weekends]]) for (const e of list) {
      t.check(e.tags.every((k) => INTERESTS[k]), `${c.id} → ${e.name}: unknown tag`);
      t.check(kind === "day" ? e.cost >= 0 : e.travel >= 0 && e.stay >= 0 && e.sights >= 0 && e.days.length === 2, `${c.id} → ${e.name}: price fields`);
      const pts = PLACES[e.name];
      t.check(!!pts, `${c.id} → ${e.name}: no map coordinates`);
      if (!pts) continue;
      const hours = hoursOf(e.how), d = Math.max(...pts.map((p) => km([c.lat, c.lon], p)));
      t.check(hours != null, `${c.id} → ${e.name}: can't read a travel time from "${e.how}"`);
      t.check(d < 700, `${c.id} → ${e.name}: ${Math.round(d)} km away is too far for an escape`);
      // Faster than a high-speed train (or slower than walking) means a wrong time or coordinate.
      if (hours && d > 60 && !/ferry|boat/i.test(e.how)) t.check(d / hours < 300 && d / hours > 8, `${c.id} → ${e.name}: ${Math.round(d)} km in ${hours}h`);
    }
  }
  return t.done();
}
if (import.meta.url === `file://${process.argv[1]}`) process.exit(run() ? 1 : 0);
