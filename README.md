# Weekender (working name)

A budget trip planner for study-abroad students in Europe, covering 120 places across Europe, North Africa and the Middle East: enter your budget, trip length and free months, and get destinations that fit, the best time to go, and a sample itinerary.

GSB 5576 semester project. See [docs/IDEA.md](docs/IDEA.md) for the full idea set.

## Run it
No installs needed. Download the repo and double-click `index.html` to open it in your browser.

## Live site (GitHub Pages)
The site is published from `main` at **https://carlywaldeck.github.io/gsb-5576-project/**. Every push to `main` (including the monthly data refresh) republishes it within a couple of minutes. Anyone with the link can use it; each visitor's search, visited places and ratings stay in their own browser.

## How it's built
Everything is in one file, `index.html`, so it works however it's opened (double-clicked, previewed, or hosted). It has three sections:

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
- **Price:** how much of your budget it leaves (over budget scores 0 here).
- **Timing:** how good your month is for that place.
- **Your interests:** how many of the interests you picked it matches (a city's day trips count a bit less). Left out if you pick none.
- **Trip length:** whether your number of days suits the distance. Under 1½ hours away is best as 1–2 days, a 2–3½ hour trip as 2–3 days, a 3½–6 hour trip as 3–4 days, and farther trips as 4–5+ days. Day trips suit 1 day and weekend escapes 2.
- **Your taste:** what the taste model predicts you'll think of it (below).

With interests picked, the weights are 35% interests, 25% price, 20% timing and 20% trip length. Without them, they're 35% price, 35% timing and 30% trip length. The taste model then counts for 10% (from your profile alone) up to 30% (once you've rated 4+ places). Colors follow the score: teal is 7.5–10, gold 5.5–7.4, and rose is below 5.5 or over budget.

## Places you've been and the taste model
Add places you've been from the landing page, the **Been there** button or **I've been here** on any trip. They stop being suggested, and you can rate each one from 1 to 5 stars. Everything is saved in your browser only (localStorage): your search, your optional age range and travel style, and your ratings. Nothing is sent anywhere.

The taste model is a small machine-learning model that runs in the page:
- **Features:** each place is described by 32 numbers: its 29 interest tags (a city's day-trip tags count 0.35), its cost per day, and its latitude and longitude. Every feature is centered on the average city.
- **Starting point (prior):** before you rate anything, the model starts from what you told it. Your picked interests get a positive weight. Your age range and who you travel with add small nudges, e.g. 18–21 leans toward nightlife, festivals and cheaper places, and traveling with a partner leans toward views, villages, food and wine. These are assumptions, and ratings override them.
- **Learning:** ridge regression pulled toward that prior, `w = (XᵀX + λI)⁻¹ (Xᵀy + λ·w₀)` with λ = 1.5, where y is each rating mapped to −1…+1. It's solved exactly (Gaussian elimination) and retrains instantly on every change. With few ratings it stays close to the prior; each rating moves it toward your real taste.
- **Explanations:** the plan shows why a place scored as it did, e.g. "similar to Barcelona, which you rated 5★" (cosine similarity to your rated places) or "you tend to rate beach places highly" (the biggest positive weight). The Been there panel shows what the model has learned overall.

Because the app has no server, the model only learns from your own ratings. Learning from other travelers who share your age, travel style and interests (collaborative filtering) would need a shared database of ratings; that would be a natural next step.

## Milestones
- [x] Week 3: Idea set
- [x] Week 6: Working MVP (120 cities, 4 ways to travel, day trips, best-month calendar, itineraries, scores, open data)
- [ ] Week 10: Peer user testing
- [ ] Week 12: Final product
- [ ] Week 13: Final presentation

## The globe
The app is built around a 3D globe on a soft daylight backdrop: sage-green land on a soft blue ocean, lightly shaded for depth (colors live in one `MAP` object, so the palette is easy to swap). Every place in the app is marked with a small dot. Trips are arcs (flights arc high; trains and buses stay low), the selected route turns blue, and destination markers use their score color. Nothing animates on its own: the globe only redraws when you drag, zoom or change a setting. Projection and drawing use [d3-geo](https://d3js.org/d3-geo) on canvas with Natural Earth outlines (public domain).

**Landing page:** the app opens on a short form (where you're based, month, currency (€, $ or £), budget, trip lengths, interests, optional age range and travel style, and places you've been). **Show my trips** flies you into the globe, and everything stays editable from the top bar. Click the Weekender logo to go back.

**Finding your city:** the From box is a search field. Type any part of a city or country name (accents optional, so "malaga" finds Málaga), then use the arrow keys and Enter, or click a result.
- After the landing page, the camera flies in from space to your host city.
- Routes to your top trips lift off the surface as arcs (flights higher, trains and buses low).
- Markers are colored by score: teal = strong pick (7.5–10), gold = decent (5.5–7.4), rose = weaker or over budget. The top 12 picks get full markers; the rest are small dots.
- Selecting a trip, from the list or the globe, flies the camera there Earth-zoom style and shows a summary card. **Open the plan** slides in the full plan.
- Drag to spin, scroll to zoom, **Fit trips** to reframe, **Whole Earth** to pull back to space.

**TikTok:** every plan has a "See it on TikTok" row that opens TikTok searches for the place (things to do, on a budget, where to eat, your matching interests, hidden gems). Searches always show current videos and need no API key.

## Open data behind the numbers
Best months, seasonal price swings, daily costs and interest tags come from public data, not guesses. A GitHub Action (`.github/workflows/data.yml`) runs `scripts/build-data.mjs` once a month, and whenever the scripts change. It saves the results to `data/city-data.json` and writes `data/REPORT.md`, which compares them with the original hand-written estimates. `scripts/embed-data.mjs` then copies the data into `index.html`, so the page still works as one file. You can also run it by hand: **Actions → Refresh city data → Run workflow**.

| What | Source | How it's used |
|---|---|---|
| Weather by month | Open-Meteo historical weather (ERA5), daily 2020–2024 | Comfort = 0.55 × temperature (best at a 25°C high) + 0.25 × fewer rainy days + 0.2 × sunshine |
| Crowds by month | Eurostat `tour_occ_nim` (nights in tourist accommodation, by country); Wikipedia pageviews where Eurostat has none | Best months = 0.65 × comfort + 0.35 × fewer crowds, ranked into 1–5; prices rise 40% of the way with the crowd index |
| Price level | Eurostat `prc_ppp_ind` (restaurants & hotels, EU = 100); World Bank price level ratio elsewhere | Daily costs = an EU-average city × the country's price level × 0.83–1.17 for how touristy the city is |
| What's there | OpenStreetMap via Overpass: counts of restaurants, bars, museums, beaches, peaks, viewpoints… within set distances | Each interest's strength (0–1) is the city's rank among all the cities; tagged when in the top 40% |
| Popularity | Wikipedia pageviews 2022–2024 | Touristy-city price premium; "hidden gems" = many sights but fewer visitors |

Festivals, film locations and old towns have no reliable open data, so those tags stay hand-picked. So do the itineraries, tips and day trips. Each plan shows **The data behind this**, e.g. weather for your month, crowd level, price level, OpenStreetMap counts and popularity, each with its source.

## Live data (free, keyless APIs)
When the site runs somewhere that allows outside requests (e.g. GitHub Pages), it enriches every trip with:
- **Photos and summaries** from the [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) (images from Wikimedia Commons, credited on each photo)
- **Typical weather** by month (average highs/lows, rainy days, sunshine) from the [Open-Meteo historical archive](https://open-meteo.com/en/docs/historical-weather-api) (ERA5, CC BY 4.0), averaged over 2020–2024 (the same years the data pipeline uses)
- **Public holidays** in the destination during your month from [Nager.Date](https://date.nager.at)
- **Exchange rates** for the € / $ / £ picker and local-currency amounts from the ECB via [Frankfurter](https://www.frankfurter.app), plus [ExchangeRate-API](https://www.exchangerate-api.com) for currencies the ECB doesn't publish (MAD, TND, JOD, GEL, RSD, ALL, BAM, MKD, AMD, EGP)

Everything is cached in the browser, times out after 8 seconds, and is optional: if a service is down or blocked, the app keeps working on its built-in estimates and says so.

## Live prices
The app is ready for real flight fares via a small free Cloudflare Worker ([`api/worker.js`](api/worker.js)) and the Travelpayouts API, plus GetYourGuide and Omio affiliate links. Step-by-step setup: [docs/LIVE_PRICES.md](docs/LIVE_PRICES.md). Until it's set up, everything uses estimates.
