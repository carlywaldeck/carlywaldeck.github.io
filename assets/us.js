// Weekender US (California): turns data/us-data.js into what the app already understands, so the
// US version shares every screen and feature with the Europe one. Colleges become the "home cities";
// each place becomes a local find, day trip, weekend or long weekend from a college. Costs (gas split
// between friends, park fees, a campsite, hostel, motel or cabin, and food) are worked out in the app
// (usEstimate in index.html), because they depend on your car, how many of you go, and the month.
(function () {
  const D = window.US_DATA;
  if (!D) return;
  window.REGION = "us";
  const P = D.places;
  const toRad = (d) => (d * Math.PI) / 180;
  const km = (a, b) => { const x = Math.sin(toRad(b.lat - a.lat) / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(toRad(b.lon - a.lon) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
  // Hand-picked places near each other, so a longer trip can add a second stop (Vegas → Valley of Fire).
  const handPicked = Object.entries(P).filter(([, p]) => !p.osm);
  const nearby = (id) => handPicked.filter(([k, q]) => k !== id && km(P[id], q) < 70).sort((a, b) => km(P[id], a[1]) - km(P[id], b[1])).slice(0, 3)
    .map(([k, q]) => ({ place: k, name: q.name, plan: q.days[0] }));
  window.US_WIKI = {};
  window.PLACES = window.PLACES || {};
  window.CITIES = D.colleges.map((c) => {
    const dayTrips = [], weekends = [];
    for (const [id, dist, hours, kind, wKm, wHours] of c.trips) {
      const p = P[id];
      if (!p) continue;
      window.PLACES[p.name] = [[p.lat, p.lon]];
      if (p.wiki) window.US_WIKI[p.name] = decodeURIComponent(p.wiki).replace(/_/g, " ");
      const base = { name: p.name, place: id, how: "Drive", km: dist, hours, winter: wKm ? [wKm, wHours] : null, port: p.port || null, fee: p.fee, ticket: p.ticket,
        tags: p.tags, note: p.note, season: p.season, realRoute: !kind.includes("~"), osm: !!p.osm };
      if (kind[0] === "l" || kind[0] === "d") dayTrips.push({ ...base, local: kind[0] === "l", days: p.days.slice(0, 1) });
      else weekends.push({ ...base, stayKind: p.stay || "motel", days: p.days, extras: nearby(id), long: kind[0] === "x", minDays: kind[0] === "x" ? 3 : 2 });
    }
    if (c.wiki) window.US_WIKI[c.name] = decodeURIComponent(c.wiki).replace(/_/g, " ");
    return { id: c.id, code: c.code, name: c.name, town: c.town, country: "USA", lat: c.lat, lon: c.lon,
      costs: { hostel: D.stay.hostel, food: D.food.day, transit: 0, activities: 0 }, interests: [], season: [3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 4, 3],
      // Motels and cabins cost more in summer and on holiday weekends; campsites and gas don't follow this.
      priceMult: [0.95, 0.95, 1, 1, 1.05, 1.15, 1.2, 1.2, 1.05, 1, 0.95, 1], bestTime: "", itinerary: [[], [], []], tips: [], dayTrips, weekends };
  });
  // No European city data in this version: the app falls back to the values above.
  window.CITY_DATA = { generated: D.generated, region: "us", sources: D.sources, cities: {} };
})();
