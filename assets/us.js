// Weekender US (California): turns data/us-data.js into what the app already understands, so the
// US version shares every screen and feature with the Europe one. Colleges become the "home cities";
// each place becomes a local find, day trip or weekend trip from a college, priced for driving:
// gas split between friends, park fees, a campsite, hostel, motel or cabin, and food.
(function () {
  const D = window.US_DATA;
  if (!D) return;
  window.REGION = "us";
  const P = D.places;
  const gasShare = (km) => Math.round((km * 2 / 1.609) / D.mpg * D.gas.price / D.riders);
  const hm = (h) => { const t = Math.max(10, Math.round(h * 60 / 5) * 5); return t < 60 ? `${t} min` : `${Math.floor(t / 60)}h${t % 60 ? String(t % 60).padStart(2, "0") : ""}`; };
  const SEASON = [3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 4, 3];
  window.US_WIKI = {};
  window.PLACES = window.PLACES || {};
  window.CITIES = D.colleges.map((c) => {
    const dayTrips = [], weekends = [];
    for (const [id, km, hours, kind] of c.trips) {
      const p = P[id];
      if (!p) continue;
      window.PLACES[p.name] = [[p.lat, p.lon]];
      if (p.wiki) window.US_WIKI[p.name] = decodeURIComponent(p.wiki).replace(/_/g, " ");
      const base = { name: p.name, place: id, how: `Drive, ${hm(hours)}`, tags: p.tags, note: p.note, season: p.season, km, realRoute: !kind.includes("~") };
      const feeShare = Math.round(p.fee / D.riders);
      if (kind[0] === "l" || kind[0] === "d") dayTrips.push({ ...base, local: kind[0] === "l", cost: gasShare(km) + feeShare + p.ticket, days: p.days.slice(0, 1) });
      else weekends.push({ ...base, travel: gasShare(km), stay: D.stay[p.stay] || D.stay.motel, stayKind: p.stay || "motel", sights: feeShare + p.ticket, days: p.days, minDays: kind[0] === "x" ? 3 : 2 });
    }
    if (c.wiki) window.US_WIKI[c.name] = decodeURIComponent(c.wiki).replace(/_/g, " ");
    return { id: c.id, code: c.code, name: c.name, town: c.town, country: "USA", lat: c.lat, lon: c.lon,
      costs: { hostel: D.stay.hostel, food: D.food, transit: 5, activities: 15 }, interests: [], season: SEASON,
      priceMult: [0.95, 0.95, 1, 1, 1.05, 1.15, 1.2, 1.2, 1.05, 1, 0.95, 1], bestTime: "", itinerary: [[], [], []], tips: [], dayTrips, weekends };
  });
  // No European city data in this version: the app falls back to the values above.
  window.CITY_DATA = { generated: D.generated, region: "us", sources: D.sources, cities: {} };
})();
