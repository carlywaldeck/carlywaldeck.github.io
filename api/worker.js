// Weekender price worker (Cloudflare Workers, free tier).
//
// The web page can't call flight-price APIs directly: that would expose your API token,
// and most APIs block requests from browsers anyway. This tiny worker sits in between:
// the page asks it for a route and month, it asks Travelpayouts (with your secret token)
// and returns just the cheapest fare.
//
// Setup: see docs/LIVE_PRICES.md. Needs two settings in the Cloudflare dashboard:
//   TRAVELPAYOUTS_TOKEN  (secret)  your Travelpayouts API token
//   ALLOWED_ORIGIN       (text)    your site, e.g. https://weekender-trips.com

export default {
  async fetch(request, env) {
    const headers = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Content-Type": "application/json"
    };
    const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });

    const url = new URL(request.url);
    if (url.pathname !== "/flights") return reply({ error: "Not found" }, 404);

    // e.g. /flights?from=MAD&to=LIS&month=2026-10
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";
    const month = url.searchParams.get("month") || "";
    if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to) || !/^\d{4}-\d{2}$/.test(month)) {
      return reply({ error: "Use from=XXX&to=XXX&month=YYYY-MM" }, 400);
    }

    const api = new URL("https://api.travelpayouts.com/aviasales/v3/prices_for_dates");
    api.search = new URLSearchParams({
      origin: from,
      destination: to,
      departure_at: month,
      one_way: "false",
      currency: "eur",
      sorting: "price",
      limit: "1",
      token: env.TRAVELPAYOUTS_TOKEN
    });

    // Cache each answer for 6 hours so repeated lookups don't use up the API quota.
    const res = await fetch(api, { cf: { cacheTtl: 21600, cacheEverything: true } });
    if (!res.ok) return reply({ error: `Price API answered ${res.status}` }, 502);

    const data = await res.json();
    const best = data.data && data.data[0];
    if (!best) return reply({ price: null });
    return reply({
      price: best.price,
      departure_at: best.departure_at,
      return_at: best.return_at,
      airline: best.airline,
      transfers: best.transfers,
      link: best.link ? "https://www.aviasales.com" + best.link : null
    });
  }
};
