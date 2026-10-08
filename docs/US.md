# Weekender California (weekender-trips.com/us/)

Same site, same domain, same features as the Europe version: the trip list, 1–10 scores, plans
with Overview / Itinerary / Booking / Details tabs, saving, group votes, story images, the calendar,
price alerts and accounts. The difference is the data and the way you travel.

## How visitors pick a version

The first card on the landing page asks **Where are you studying?**: 🇪🇺 Europe or 🇺🇸 California.
The choice is remembered in the browser (`weekender:region`), so a California student who opens
weekender-trips.com later goes straight to /us/. Links to a trip or a vote always open where they
point. To switch back, pick Europe (it links to `/?region=eu`). Saved trips are kept separately per
version, and an account keeps both.

## What it shows

Pick your college (49 to start: every UC and CSU campus, plus the larger private colleges,
Cal Poly SLO included) and you get three groups:

- **Local finds**: under 45 minutes from campus (Bishop Peak, Montaña de Oro and Pismo's dunes from Cal Poly SLO).
- **Day trips**: up to about 3 hours each way.
- **Weekend trips**: up to about 7 hours each way, with a night camping, in a hostel, motel or cabin;
  long drives like Zion show up as long weekends when you pick 3+ days.

Everything is priced for driving: gas for the round trip split three ways (30 mpg, this week's
California gas price), park fees split per car, tickets, the night's stay per person, and food.

## Where the data comes from

| What | Source |
|------|--------|
| Colleges and 95 hand-picked places, with notes and day plans | `scripts/us/colleges.mjs`, `scripts/us/places.mjs` |
| Drive times and distances from every campus | OSRM (OpenStreetMap road routing) |
| Coordinates check and popularity | Wikipedia (coordinates, 60 days of pageviews) |
| Best months to go | Open-Meteo, 5 years of daily weather, blended with a season profile per kind of place |
| Extra local finds near each campus (waterfalls, peaks, hot springs, caves, viewpoints…) | OpenStreetMap via Overpass, only ones with a Wikipedia article |
| Gas price | US Energy Information Administration (weekly, needs a free `EIA_KEY` secret; $4.85 otherwise) |
| Live weather forecast, sunrise/sunset, holidays | Open-Meteo, solar equations, Nager.Date (same as Europe) |

`scripts/build-us.mjs` builds `data/us-data.js`; network results are cached in
`data/us-sources.json`. Without a fetch, drive times are estimated from distance (shown as
"estimated" in Details). The **Refresh California data** workflow fetches everything every
Wednesday and whenever the US scripts change, so the real routes and weather land after the first run.

Optional: get a free EIA key at https://www.eia.gov/opendata/register.php and add it as the
repository secret `EIA_KEY` for weekly gas prices. Nothing else to sign up for; nothing costs money.

## How it's built

`us/index.html` is generated from `index.html` by `scripts/build-us-page.mjs` (it sets
`window.REGION = "us"`, loads `data/us-data.js` and `assets/us.js` instead of the Europe data, and
swaps the wording). Edit `index.html`, then run `node scripts/build-us-page.mjs`; the tests fail if
you forget. `assets/us.js` turns colleges into home cities and places into trips, so the app code is
shared; the few US-only branches in `index.html` check `US`.

To add a college or a place, add a line to `scripts/us/colleges.mjs` or `scripts/us/places.mjs`, then
run `node scripts/build-us.mjs && node scripts/build-us-page.mjs` (or push and let the workflow do it).
