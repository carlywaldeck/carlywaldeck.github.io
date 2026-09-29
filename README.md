# Weekender (working name)

A budget trip planner for study-abroad students in Europe, covering 80 places across Europe, North Africa and the Middle East: enter your budget, trip length and free months, and get destinations that fit, the best time to go, and a sample itinerary.

GSB 5576 semester project. See [docs/IDEA.md](docs/IDEA.md) for the full idea set.

## Run it
No installs needed. Download the repo and double-click `index.html` to open it in your browser.

## Publish it for free (GitHub Pages)
1. Merge this branch into `main`.
2. On GitHub, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, then pick `main` and `/ (root)`, and save.
4. After about a minute, the site is live at `https://carlywaldeck.github.io/gsb-5576-project/`.

## How it's built
Everything is in one file, `index.html`, so it works however it's opened (double-clicked, previewed, or hosted). It has three sections:

| Section | What it does |
|---|---|
| `<style>` | The design: bright "daylight" globe app with floating frosted-glass panels and a coral accent |
| City data `<script>` | 80 cities: costs, month-by-month scores, 3-day itineraries, 2–4 day trips each (231), 1–3 weekend escapes each (177), and tips |
| App `<script>` | Estimates costs, ranks destinations, updates the list and map as you change settings |

**How costs are estimated:** hostel nights, food, local transport and sights, plus round-trip travel. Travel options are estimated from distance:
- **Bus** and **train** only within the same landmass (e.g. mainland Europe, or within Morocco), no train where rail links are poor, limited to about 3 hours each way per day of the trip
- **Boat** on real ferry routes between cities in the list (e.g. Málaga–Tangier, Palermo–Tunis, Barcelona–Palma, Stockholm–Tallinn); overnight ferries are allowed on trips of 3+ days
- **Flight** for anything 250 km or more or across water, including airport transfers; the app notes where budget airlines really fly from (e.g. Florence → Pisa or Bologna)

By default the app picks the best mix of price and travel time; you can switch options for any trip. Adding a day trip swaps it in for your last city day and adds its travel and entry cost. Lodging and travel prices are adjusted for how busy the chosen month is.

**Short trips (1–2 days):** with 1 day, the app shows day trips from your host city plus other cities you can reach by train or bus in 2½ hours or less (no hostel cost). With 2 days, it adds weekend escapes to small places nearby with one night away (e.g. Pisa & Lucca from Florence). These appear in their own section above the cities.

**Trip lengths:** pick any combination of 1–4 days; results are grouped by length.

**How trips are ranked:** 45% interest match (interests you can only get on a day trip count a bit less) + 35% how good the month is + 20% how much budget is left over. On 1–2 day trips price counts for more (35/25/40). There's also a "Cheapest first" sort.

## Milestones
- [x] Week 3: Idea set
- [ ] Week 6: Working MVP (80 cities, 4 ways to travel, day trips, calendar and itineraries: first version done)
- [ ] Week 10: Peer user testing
- [ ] Week 12: Final product
- [ ] Week 13: Final presentation

## The globe
The app is built around a 3D globe (orthographic projection drawn on canvas with [d3-geo](https://d3js.org/d3-geo), country outlines from Natural Earth, public domain).
- On load, the camera flies in from space to your host city.
- Routes to your top trips lift off the surface as arcs (flights higher, trains and buses low).
- Markers are colored by price: teal = great value (good price for your budget and a good month to go), amber = okay, rose = pricey or off-season.
- Selecting a trip, from the list or the globe, flies the camera there Earth-zoom style and shows a summary card. **Open the plan** slides in the full plan.
- Drag to spin, scroll to zoom, **Fit trips** to reframe, **Whole Earth** to pull back to space.

## Live data (free, keyless APIs)
When the site runs somewhere that allows outside requests (e.g. GitHub Pages), it enriches every trip with:
- **Photos and summaries** from the [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) (images from Wikimedia Commons, credited on each photo)
- **Typical weather** by month (average highs/lows, rainy days, sunshine) from the [Open-Meteo historical archive](https://open-meteo.com/en/docs/historical-weather-api) (ERA5, CC BY 4.0), averaged over 2019–2024
- **Public holidays** in the destination during your month from [Nager.Date](https://date.nager.at)
- **Exchange rates** for the € / $ / £ picker and local-currency amounts from the ECB via [Frankfurter](https://www.frankfurter.app), plus [ExchangeRate-API](https://www.exchangerate-api.com) for currencies the ECB doesn't publish (MAD, TND, JOD, GEL, RSD, ALL)

Everything is cached in the browser, times out after 8 seconds, and is optional: if a service is down or blocked, the app keeps working on its built-in estimates and says so.

## Live prices
The app is ready for real flight fares via a small free Cloudflare Worker ([`api/worker.js`](api/worker.js)) and the Travelpayouts API, plus GetYourGuide and Omio affiliate links. Step-by-step setup: [docs/LIVE_PRICES.md](docs/LIVE_PRICES.md). Until it's set up, everything uses estimates.
