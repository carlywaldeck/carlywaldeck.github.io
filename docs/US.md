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
Cal Poly SLO included) and you get four kinds of trips:

- **Local finds**: under 45 minutes from campus (Bishop Peak, Montaña de Oro and Pismo's dunes from Cal Poly SLO).
- **Day trips**: up to about 3 hours each way.
- **Weekend trips** (2 days): up to about 5½ hours each way.
- **Long weekends** (3+ days): the farther trips, 3 to 9 hours away: Las Vegas, San Diego, Joshua
  Tree, Zion, Sedona, the Grand Canyon… Longer trips add a second stop nearby (Vegas → Hoover Dam,
  Valley of Fire).

Trips are picked in every direction from campus (north, south and inland), not just the most famous
ones, which tend to cluster on one side.

## How prices work

Everything is per person, for driving:

| Cost | How |
|------|-----|
| Gas | Round-trip miles × price per mile ÷ people in the car. Gas car 30 mpg, hybrid 50, SUV 22, or an EV at about $0.12 a mile; this week's California gas price |
| Park fees and tickets | Fee per car ÷ people, plus tickets per person (ferries, tours, cave tours) |
| Where you sleep | A $35 campsite (up to 6), a $135 motel room with two beds (up to 4), a $160 cabin (up to 6), or a $45 hostel bed, split between the people going. Motels and cabins cost more in summer; campsites don't |
| Food | A snack for a local find ($8), lunch out on a day trip ($15), and per day away: $15 camping (groceries), $20 cabin, $25 motel, $30 city hostel |

**Filters → People in the car / Your car** changes all of this (1 to 5 people, gas, hybrid, SUV or electric).

## Extras in each plan

- **Apple Maps** directions from campus (to the harbor for Catalina, the Channel Islands and Angel Island, with the boat to book).
- **Winter routes**: the Sierra passes (Tioga, Sonora, Ebbetts) close about November to May. Drives to
  Mono Lake, Mammoth and Bishop that cross them in summer use the longer winter route in those months.
- **Low tides** on your dates for beach trips (NOAA tide predictions), with the best day for tide pools.
- **The moon** on your nights for stargazing, desert and camping trips, and when the darkest skies are.
- **Air quality** (US AQI) when the trip is in the next few days, to catch wildfire smoke.
- Live weather forecast, sunrise and sunset, and holidays, as in Europe.

## Where the data comes from

| What | Source |
|------|--------|
| Colleges and 100+ hand-picked places, with notes and day plans | `scripts/us/colleges.mjs`, `scripts/us/places.mjs` |
| Drive times and distances from every campus | OSRM (OpenStreetMap road routing) |
| Coordinates check and popularity | Wikipedia (coordinates, 60 days of pageviews) |
| Best months to go | Open-Meteo, 5 years of daily weather, blended with a season profile per kind of place |
| Extra local finds near each campus (waterfalls, peaks, hot springs, caves, viewpoints…) | OpenStreetMap via Overpass, only ones with a Wikipedia article |
| Gas price | US Energy Information Administration (weekly, needs a free `EIA_KEY` secret; $4.85 otherwise) |
| Tide stations and low tides | NOAA CO-OPS (station list in the data job, predictions live in the app) |
| Air quality | Open-Meteo air-quality forecast (US AQI) |
| Live weather forecast, sunrise/sunset, moon, holidays | Open-Meteo, solar and lunar equations, Nager.Date |

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
