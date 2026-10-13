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

Pick your college (65: every UC and CSU campus and the private four-year colleges, no community colleges;
Cal Poly SLO included) and you get four kinds of trips:

- **Local finds**: under 45 minutes from campus (Bishop Peak, Montaña de Oro and Pismo's dunes from Cal Poly SLO).
- **Day trips**: up to about 3 hours each way.
- **Weekend trips** (2 days): up to about 5½ hours each way.
- **Long weekends** (3+ days): the farther trips, 3 to 9 hours away: Las Vegas, San Diego, Joshua
  Tree, Zion, Sedona, the Grand Canyon… Longer trips add a second stop nearby (Vegas → Hoover Dam,
  Valley of Fire).

Trips are picked in every direction from campus (north, south and inland), not just the most famous
ones, which tend to cluster on one side.

## How trips are scored

Like Europe, each trip gets 1–10 from price (against your budget), timing (the month, seasonal
highlights, or this weekend's forecast), your interests and whether the trip length suits the
distance. California adds **drive time**: the share of your waking hours away spent on the road, since
nearly every trip is cheap for the budget and in a good month. A 15-minute local find barely
counts; 4 hours each way on a 2-day weekend counts a lot.

## How prices work

Everything is per person, for driving:

| Cost | How |
|------|-----|
| Gas | Round-trip miles × price per mile ÷ people in the car (4 by default). Gas car 30 mpg, hybrid 50, SUV 22, or an EV at about $0.12 a mile; this week's California gas price from EIA |
| Park fees and tickets | Fee per car ÷ people, plus tickets only when you can't go without them (the boat to an island, the tour that's the only way in). Optional extras (rafting, kayaks, a hot tub) are shown in the plan but not added |
| Where you sleep | A $35 campsite (up to 6), a $135 motel room with two beds (up to 4), a $160 cabin (up to 6), or a hostel bed (each city's own price: $36 in San Diego to $55 in Santa Barbara), split between the people going. Motels and cabins cost more in summer; campsites don't |
| Food | A coffee or snack for a local find ($5), lunch out on a day trip ($12), and per day away: $12 camping or $15 in a cabin (you cook), $20 at a motel, $25 in a city |

**Public transport.** Trips assume you drive, but every plan also has a transit route in Apple Maps,
and trips the train reaches show "Or take the train" with its fare and time. **No car?** Pick "No car:
train and bus" under Filters → Your car. Trips then go by Amtrak (Pacific
Surfliner, Coast Starlight, Capitol Corridor, San Joaquins and the Zephyr to Truckee and Reno) from the
campus's nearest station, with the bus or ferry from the arrival station (the YARTS bus into Yosemite,
the Highway 17 Express to Santa Cruz, the boat to Catalina or the Channel Islands). Fares are typical
Amtrak California fares with the 15% student discount; times are estimated from distance (about 40 mph
with stops, plus an hour for a change of line, and local transit for campuses away from a station).
Stations and car-free places are in `scripts/us/stations.mjs`.

**Filters → People going / Your car** changes all of this (1 to 5 people; gas, hybrid, SUV, electric, or no car).

## Extras in each plan

- **What's happening**: about 40 places have seasonal highlights, shown on the trip and boosting its
  score in those months: monarch butterflies at Pismo (Nov–Feb), elephant seal pups, gray and humpback
  whales, desert superblooms, Yosemite's waterfalls and the February firefall, Eastern Sierra fall
  color, snow season, apple picking at Oak Glen, cranes in the Central Valley, free festivals. Some are
  heads-ups instead (Death Valley's summer heat, Coachella weekends filling Palm Springs).

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
| Colleges and 157 hand-picked places, with notes and day plans | `scripts/us/colleges.mjs`, `scripts/us/places.mjs` |
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

## Events and campsites (daily)

`scripts/build-us-live.mjs` runs every morning (the **Refresh events and campsites** workflow) and
writes `data/us-live.js`, which the app loads when a plan opens:

- **What's on**: concerts, sports, shows and festivals within about 20 miles of each place on the next
  10 weekends, from the Ticketmaster Discovery API. Shown under Details → On your dates.
- **Open campsites**: for camping trips, the Recreation.gov campgrounds within 15 miles and how many
  sites are still open on your Friday and Saturday nights, with a link straight to each campground.
  State park campgrounds (ReserveCalifornia) aren't included; the plan links there too.

Both need free API keys saved as repository secrets (Settings → Secrets and variables → Actions):

| Secret | Where to get it |
|--------|-----------------|
| `TICKETMASTER_KEY` | developer.ticketmaster.com → sign up → My Apps → the Consumer Key |
| `RIDB_KEY` | ridb.recreation.gov → sign up → your profile → API key (finds the campgrounds; availability itself needs no key) |

Without them the sections just don't appear. Keys are only used by the workflow, never sent to the site.

## Pages for search engines

`scripts/build-us-pages.mjs` writes a page per college at `/us/from/<college>/` ("Weekend trips from
Cal Poly SLO") with that month's best local finds, day trips, weekends and long weekends, computed by
the app itself, and adds them to `sitemap.xml`. The California data job rebuilds them weekly.

## How it's built

`us/index.html` is generated from `index.html` by `scripts/build-us-page.mjs` (it sets
`window.REGION = "us"`, loads `data/us-data.js` and `assets/us.js` instead of the Europe data, and
swaps the wording). Edit `index.html`, then run `node scripts/build-us-page.mjs`; the tests fail if
you forget. `assets/us.js` turns colleges into home cities and places into trips, so the app code is
shared; the few US-only branches in `index.html` check `US`.

To add a college or a place, add a line to `scripts/us/colleges.mjs` or `scripts/us/places.mjs`, then
run `node scripts/build-us.mjs && node scripts/build-us-page.mjs` (or push and let the workflow do it).
