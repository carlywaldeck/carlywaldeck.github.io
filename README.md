# Weekender

A budget trip planner for study-abroad students in Europe, covering 120 places across Europe, North Africa and the Middle East: enter your budget, trip length and free months, and get destinations that fit, the best time to go, and a sample itinerary.

GSB 5576 semester project. See [docs/IDEA.md](docs/IDEA.md) for the full idea set and [docs/METHODS.md](docs/METHODS.md) for the data sources, scoring formula, taste model and limitations in one place.

## What you can do
- **Find trips:** pick where you're based, a month, a budget, trip lengths and interests. Trips are listed by score (or by price), with routes on the globe.
- **Read a plan:** each plan has three tabs: **Overview** (score breakdown, costs, how to get there), **Itinerary** (day by day, plus day trips) and **Details** (about the place, the data behind it, best months and extras).
- **Tailored itineraries:** activities that match your interests are marked ✓, and the best-matching days come first. If the city doesn't cover an interest, the plan suggests the day trip that does.
- **Save and share:** ☆ Save keeps a trip under **My trips**. **Share** copies a link that opens the same trip (same home, length, month, budget and interests) for anyone.
- **Accounts:** sign up with your name, email and password. You're greeted by name, skip the start-up questions on later visits, and everything below follows you to any device.
- **Places you've been:** add each place with the month you went and a 1–5★ rating. Ratings teach both taste models.
- **My travel map:** see every place you've been on the globe, numbered and joined in the order you went, colored by rating, with countries, kilometers and your favorite place.

The interface keeps secondary controls tucked away: currency is in **Filters**, the map key is behind **Map key**, and interest chips open with **Edit**.

## Run it
No installs needed. Download the repo and double-click `index.html` to open it in your browser.

## Tests
```
npm install
npm test        # data, flight-model and price-alert checks + app tests in headless Chromium
```
The data suite checks every city (fields, coordinates, seasons, tags, itineraries, travel speeds). The app suite drives the real page: the landing flow, a sweep of every city × 1–5 days × 4 months (over 50,000 trips), plan tabs, tailoring, the taste model, save and share links, and the phone layout. GitHub Actions runs both on every push (`.github/workflows/test.yml`).

## Live site (GitHub Pages)
The site is published from `main` at **https://weekender-trips.com/**. Every push to `main` (including the monthly data refresh) republishes it within a couple of minutes. Anyone with the link can use it; each visitor's search, visited places and ratings stay in their own browser.

## How it's built
Everything is in one file, `index.html`, so it works however it's opened (double-clicked, previewed, or hosted). It has four parts:

| Section | What it does |
|---|---|
| `<style>` | The design: a light, polished globe with frosted-glass panels and a blue accent |
| City data `<script>` | 120 cities: costs, month-by-month scores, 3-day itineraries, 2–4 day trips each (371 in all), 1–4 weekend escapes each (277 in all), and tips. 29 interests, from food and beaches to hidden gems, film locations and hot springs |
| Open data `<script>` | Real data per city (climate, crowds, prices, OpenStreetMap counts, popularity), written by the GitHub Action; see below |
| App `<script>` | Estimates costs, scores destinations, updates the list and globe as you change settings |

**How costs are estimated:** hostel nights, food, local transport and sights, plus round-trip travel. Travel options are estimated from distance:
- **Bus** and **train** only within the same landmass (e.g. mainland Europe, or within Morocco), no train where rail links are poor, limited to about 3 hours each way per day of the trip
- **Boat** on real ferry routes between cities in the list (e.g. Málaga–Tangier, Palermo–Tunis, Barcelona–Palma, Stockholm–Tallinn); overnight ferries are allowed on trips of 3+ days
- **Flight** for anything 250 km or more or across water, including airport transfers; the app notes where budget airlines really fly from (e.g. Florence → Pisa or Bologna)

By default the app picks the best mix of price and travel time; you can switch options for any trip. Adding a day trip swaps it in for your last city day and adds its travel and entry cost. Lodging and travel prices are adjusted for how busy the chosen month is.

**Short trips (1–2 days):** with 1 day, the app shows day trips from your host city plus other cities you can reach by train or bus in 2½ hours or less (no hostel cost). With 2 days, it adds weekend escapes to small places nearby with one night away (e.g. Pisa & Lucca from Florence). These appear in their own section above the cities.

**Trip lengths:** pick any combination of 1, 2, 3, 4 and 5+ days; results are grouped by length. A 5+ trip is priced as 5 days.

**Sights in the budget** come from the itinerary itself: the prices of the plan's activities for the days you'll spend in the city, plus a daily allowance for free days beyond the 3-day plan.

**How trips are scored (1–10):** every trip gets one score that mixes
- **Price:** anything within budget is fine and cheaper is better (60% of budget scores 0.82, the full budget 0.5, over budget 0).
- **Timing:** how good your month is for that place (an average month counts as decent, 0.7).
- **Your interests:** how many of the interests you picked it matches (a city's day trips count a bit less). Left out if you pick none.
- **Trip length:** whether your number of days suits the distance. Under 1½ hours away is best as 1–2 days, a 2–3½ hour trip as 2–3 days, a 3½–6 hour trip as 3–4 days, and farther trips as 4–5+ days. Day trips suit 1 day and weekend escapes 2.
- **Your taste:** what the taste model predicts you'll think of it (below).

With interests picked, the weights are 35% interests, 25% price, 20% timing and 20% trip length. Without them, they're 35% price, 35% timing and 30% trip length. Your taste then nudges the score up or down around neutral: by up to ±0.45 points from your profile alone, rising to ±1.35 once you've rated 4+ places. Colors follow the score: teal is 7.5–10, gold 5.5–7.4, and rose is below 5.5 or over budget.

## Places you've been and the taste model
Add places you've been from the landing page, the **My trips** button or **I've been here** on any trip. They stop being suggested, and you can rate each one from 1 to 5 stars. Everything is saved in your browser only (localStorage): your search, your optional age range and travel style, and your ratings. Nothing is sent anywhere.

The taste model is a small machine-learning model that runs in the page:
- **Features:** each place is described by 32 numbers: its 29 interest tags (a city's day-trip tags count 0.35), its cost per day, and its latitude and longitude. Every feature is centered on the average city.
- **Starting point (prior):** before you rate anything, the model starts from what you told it. Your picked interests get a positive weight. Your age range and who you travel with add small nudges, e.g. 18–21 leans toward nightlife, festivals and cheaper places, and traveling with a partner leans toward views, villages, food and wine. These are assumptions, and ratings override them.
- **Learning:** ridge regression pulled toward that prior, `w = (XᵀX + λI)⁻¹ (Xᵀy + λ·w₀)` with λ = 1.5, where y is each rating mapped to −1…+1. It's solved exactly (Gaussian elimination) and retrains instantly on every change. With few ratings it stays close to the prior; each rating moves it toward your real taste.
- **Explanations:** the plan shows why a place scored as it did, e.g. "similar to Barcelona, which you rated 5★" (cosine similarity to your rated places) or "you tend to rate beach places highly" (the biggest positive weight). The My trips panel shows what the model has learned overall.

**Travelers like you (collaborative filtering):** with accounts on, star ratings are shared anonymously and a second model, item-based collaborative filtering, learns which places the same people rate alike ("travelers who liked Lisbon also liked Porto"). It's blended into the taste score as more people rate places. Details: [docs/METHODS.md](docs/METHODS.md).

## Milestones
- [x] Week 3: Idea set
- [x] Week 6: Working MVP (120 cities, 4 ways to travel, day trips, best-month calendar, itineraries, scores, open data)
- [ ] Week 10: Peer user testing
- [ ] Week 12: Final product
- [ ] Week 13: Final presentation

## The globe
The app is built around a 3D globe on a soft daylight backdrop: sage-green land on a soft blue ocean, lightly shaded for depth (colors live in one `MAP` object, so the palette is easy to swap). Trips are arcs (flights arc high; trains and buses stay low), the selected route turns blue, and destination markers use their score color. Nothing animates on its own: the globe only redraws when you drag, zoom or change a setting. Projection and drawing use [d3-geo](https://d3js.org/d3-geo) on canvas with Natural Earth outlines (public domain).

**Landing page:** the app opens on a short form (where you're based, month, currency (€, $ or £), budget, trip lengths, interests, optional age range and travel style, and places you've been). **Show my trips** flies you into the globe, and everything stays editable from the top bar. Click the Weekender logo to go back.

**Finding your city:** the From box is a search field. Type any part of a city or country name (accents optional, so "malaga" finds Málaga), then use the arrow keys and Enter, or click a result.
- After the landing page, the camera flies in from space to your host city.
- Routes to your top trips lift off the surface as arcs (flights higher, trains and buses low).
- Markers are colored by score: teal = strong pick (7.5–10), gold = decent (5.5–7.4), rose = weaker or over budget. The top 8 picks get markers, and the top 4 are labeled, so the map stays readable.
- Selecting a trip, from the list or the globe, flies the camera there Earth-zoom style and shows a summary card. **Open the plan** slides in the full plan.
- Drag to spin, scroll to zoom, **Fit trips** to reframe. **Map key** explains the colors.

**TikTok:** every plan has a "See it on TikTok" row that opens TikTok searches for the place (things to do, on a budget, where to eat, your matching interests, hidden gems). Searches always show current videos and need no API key.

## Open data behind the numbers
Best months, seasonal price swings, daily costs and interest tags come from public data, not guesses. A GitHub Action (`.github/workflows/data.yml`) runs `scripts/build-data.mjs` once a month, and whenever the scripts change. It saves the results to `data/city-data.json` and writes `data/REPORT.md`, which compares them with the original hand-written estimates. `scripts/embed-data.mjs` then copies the data into `index.html`, so the page still works as one file. You can also run it by hand: **Actions → Refresh city data → Run workflow**.

| What | Source | How it's used |
|---|---|---|
| Weather by month | Open-Meteo historical weather (ERA5), daily 2020–2024 | Comfort = 0.55 × temperature (best at a 23°C high, 27°C for beach places) + 0.25 × fewer rainy days + 0.2 × sunshine |
| Crowds by month | Eurostat `tour_occ_nim` (nights in tourist accommodation, by country); Wikipedia pageviews where Eurostat has none | Best months: comfort minus a penalty for crowds above the yearly average (quiet months aren't rewarded, since off-season places often close). The 1–5 score is 60% how the month ranks within the city's own year and 40% how it ranks against every city-month. Prices rise 40% of the way with the crowd index |
| Price level | Eurostat `prc_ppp_ind` (restaurants & hotels, EU = 100); World Bank PPP ÷ exchange rate elsewhere | Daily costs = an EU-average student day (€30 hostel, €26 food, €6 transit, €12 activities) × the country's price level × 0.83–1.17 for how touristy the city is. The base amounts are our assumptions; the scaling is data |
| What's there | OpenStreetMap via Overpass: counts of restaurants, bars, museums, beaches, peaks, viewpoints… within set distances | "How much" interests (food, nightlife, museums…): the city's rank among all cities. "Is it there" interests (beach, snow, islands…): a fixed scale, and beaches, water sports and islands count a third away from the sea (coastline check). Tagged at 0.6+ |
| Popularity | Wikipedia pageviews, the last 24 months | Touristy-city price premium; "hidden gems" = real sights but fewer Wikipedia readers than most places |

Festivals, film locations and old towns have no reliable open data, so those tags stay hand-picked. So do the itineraries, tips and day trips. Each plan shows **The data behind this**, e.g. weather for your month, crowd level, price level, OpenStreetMap counts and popularity, each with its source.

## Live data (free, keyless APIs)
When the site runs somewhere that allows outside requests (e.g. GitHub Pages), it enriches every trip with:
- **Photos and summaries** from the [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) (images from Wikimedia Commons, credited on each photo)
- **Typical weather** by month (average highs/lows, rainy days, sunshine) from the [Open-Meteo historical archive](https://open-meteo.com/en/docs/historical-weather-api) (ERA5, CC BY 4.0), averaged over 2020–2024 (the same years the data pipeline uses)
- **Public holidays** in the destination during your month from [Nager.Date](https://date.nager.at)
- **Exchange rates** for the € / $ / £ picker and local-currency amounts from the ECB via [Frankfurter](https://www.frankfurter.app), plus [ExchangeRate-API](https://www.exchangerate-api.com) for currencies the ECB doesn't publish (MAD, TND, JOD, GEL, RSD, ALL, BAM, MKD, AMD, EGP)

Everything is cached in the browser, times out after 8 seconds, and is optional: if a service is down or blocked, the app keeps working on its built-in estimates and says so.

## This weekend (last minute)
Pick **⚡ This weekend** in the month menu (or the link under *Show my trips*): trips leave this
Friday (or today on a Saturday), and instead of 5-year climate averages they're ranked with this
weekend's real forecast for every city (one Open-Meteo request), shown on each row. Flights carry a
note that last-minute fares often cost more than the month's fares.

## Real details in plans
- **The real flight behind a fare:** the weekly data job keeps the flight behind each route-month's
  cheapest fare (departure and return times, stops, duration, airline) in `data/fare-details.js`,
  loaded only when a plan needs it.
- **Sunrise and sunset** for each day of a plan, computed with the standard solar equations and
  shown in the destination's local time.

## California version (/us/)
weekender-trips.com/us/ is the same planner for California college students: pick your college
(49, Cal Poly SLO included) and get local finds, day trips, weekend trips and long weekends (Vegas,
San Diego, Zion…), priced for driving: gas split between the people in your car, park fees,
campsites and motel rooms shared. Plans add Apple Maps directions, low tides, the moon for
stargazing and air quality. Visitors choose Europe or California on
the landing page and the site remembers. Data: hand-picked places, OSRM routes, Wikipedia,
Open-Meteo, OpenStreetMap, NOAA tides and EIA gas prices. See [docs/US.md](docs/US.md).

## Phone apps
`mobile/` wraps the site into iOS and Android apps with Capacitor; GitHub builds an installable
Android test app on every change. Publishing steps and the store listing: [docs/MOBILE.md](docs/MOBILE.md).

## Sharing: group votes, story images, calendar
- **Group vote:** with 2+ saved trips, My trips offers *Ask friends to vote*: one link (`#vote=…`)
  with up to 4 trips. Friends see each trip's current price, open the plans, and tap *Vote*, which
  sends "I vote Prague! 🗳️" back to the group chat through the share sheet. No accounts or server.
- **Story image:** *Story image* in any plan makes a 1080×1920 picture (destination, the route on
  the globe, the all-in price and its breakdown, the site address) for Instagram or TikTok stories.
- **Add to calendar:** the Booking tab downloads an `.ics` event for the weekend's dates with a
  link back to the plan.

## Price alerts
Saved trips are priced again with each week's fares: My trips shows how much each one moved since it
was saved, and returning visitors hear about the biggest drop. With an account, people can also opt
in to a Monday email when a saved trip gets cheaper (`scripts/price-alerts.mjs`, run by the data
workflow). Setup: [docs/PRICE_ALERTS.md](docs/PRICE_ALERTS.md).

## Monetization (Travelpayouts)
Weekender earns through [Travelpayouts](https://www.travelpayouts.com), a travel affiliate network. Travelpayouts **Drive** (a script in `<head>`) turns links to partner brands into affiliate links automatically, for every program joined in the Travelpayouts dashboard. Each plan's booking links point at partner brands:
- **Flights:** a Kiwi.com search (English, strong on European budget airlines) for the trip's route and a weekend in the chosen month, plus an Aviasales search in English to compare
- **Hostels:** Hostelworld
- **Tours & tickets:** GetYourGuide
- **Mobile data:** Airalo eSIM, for trips to another country
- **Trains & buses:** Omio

Every booking block says that some links are affiliate links, and commissions never affect scores or rankings. Setting `TP_MARKER` in `index.html` also tags the Aviasales links directly.

## Live prices
The app is ready for real flight fares via a small free Cloudflare Worker ([`api/worker.js`](api/worker.js)) and the Travelpayouts API, plus GetYourGuide and Omio affiliate links. Step-by-step setup: [docs/LIVE_PRICES.md](docs/LIVE_PRICES.md). Until it's set up, everything uses estimates.
