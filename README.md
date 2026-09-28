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
| `<style>` | The design: bright, playful look with a departures-board header, ticket-style results, light and dark themes |
| City data `<script>` | 80 cities: costs, month-by-month scores, 3-day itineraries, 2–4 nearby day trips each (231 total), and tips |
| App `<script>` | Estimates costs, ranks destinations, and updates the board and tickets as you change settings |

**How costs are estimated:** hostel nights, food, local transport and sights, plus round-trip travel. Travel options are estimated from distance:
- **Bus** and **train** only within the same landmass (e.g. mainland Europe, or within Morocco), no train where rail links are poor, limited to about 3 hours each way per day of the trip
- **Boat** on real ferry routes between cities in the list (e.g. Málaga–Tangier, Palermo–Tunis, Barcelona–Palma, Stockholm–Tallinn); overnight ferries are allowed on trips of 3+ days
- **Flight** for anything 250 km or more or across water, including airport transfers; the app notes where budget airlines really fly from (e.g. Florence → Pisa or Bologna)

By default the app picks the best mix of price and travel time; you can switch options for any trip. Adding a day trip swaps it in for your last city day and adds its travel and entry cost. Lodging and travel prices are adjusted for how busy the chosen month is.

**How trips are ranked:** 45% interest match (interests you can only get on a day trip count a bit less) + 35% how good the month is + 20% how much budget is left over.

## Milestones
- [x] Week 3: Idea set
- [ ] Week 6: Working MVP (80 cities, 4 ways to travel, day trips, calendar and itineraries: first version done)
- [ ] Week 10: Peer user testing
- [ ] Week 12: Final product
- [ ] Week 13: Final presentation

## Live prices (not yet)
Prices are estimates. Scraping Skyscanner, Omio or GetYourGuide isn't an option: their terms forbid it, they actively block bots, and a static page can't call other sites anyway. The realistic path is an official data source (for example Travelpayouts' free flight-price API, or affiliate programs from Omio/GetYourGuide) called through a small free serverless function (Cloudflare Workers or Vercel) that keeps the API key private.
