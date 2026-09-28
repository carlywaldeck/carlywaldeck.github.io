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
| `<style>` | The design: clean, minimal layout with one accent color, light theme only |
| City data `<script>` | 80 cities: costs, month-by-month scores, 3-day itineraries, 2–4 day trips each (231), 1–3 weekend escapes each (177), and tips |
| App `<script>` | Estimates costs, ranks destinations, updates the list and map as you change settings |

**How costs are estimated:** hostel nights, food, local transport and sights, plus round-trip travel. Travel options are estimated from distance:
- **Bus** and **train** only within the same landmass (e.g. mainland Europe, or within Morocco), no train where rail links are poor, limited to about 3 hours each way per day of the trip
- **Boat** on real ferry routes between cities in the list (e.g. Málaga–Tangier, Palermo–Tunis, Barcelona–Palma, Stockholm–Tallinn); overnight ferries are allowed on trips of 3+ days
- **Flight** for anything 250 km or more or across water, including airport transfers; the app notes where budget airlines really fly from (e.g. Florence → Pisa or Bologna)

By default the app picks the best mix of price and travel time; you can switch options for any trip. Adding a day trip swaps it in for your last city day and adds its travel and entry cost. Lodging and travel prices are adjusted for how busy the chosen month is.

**Short trips (1–2 days):** with 1 day, the app shows day trips from your host city plus other cities you can reach by train or bus in 2½ hours or less (no hostel cost). With 2 days, it adds weekend escapes to small places nearby with one night away (e.g. Pisa & Lucca from Florence). These appear in their own section above the cities.

**How trips are ranked:** 45% interest match (interests you can only get on a day trip count a bit less) + 35% how good the month is + 20% how much budget is left over. On 1–2 day trips price counts for more (35/25/40). There's also a "Cheapest first" sort.

## Milestones
- [x] Week 3: Idea set
- [ ] Week 6: Working MVP (80 cities, 4 ways to travel, day trips, calendar and itineraries: first version done)
- [ ] Week 10: Peer user testing
- [ ] Week 12: Final product
- [ ] Week 13: Final presentation

## Map
Switch the results to **Map** to see every trip from your host city: markers colored by price (well under budget / near budget / a little over), routes drawn by transport (train solid, bus dotted, boat dashed, flights as arcs), and both stops for two-stop escapes. Hover to highlight, click for a summary and "See the plan", drag to pan, scroll or use the buttons to zoom. The map is drawn in SVG from Natural Earth country outlines (public domain) embedded in the page, so it needs no map service.

## Live prices
The app is ready for real flight fares via a small free Cloudflare Worker ([`api/worker.js`](api/worker.js)) and the Travelpayouts API, plus GetYourGuide and Omio affiliate links. Step-by-step setup: [docs/LIVE_PRICES.md](docs/LIVE_PRICES.md). Until it's set up, everything uses estimates.
