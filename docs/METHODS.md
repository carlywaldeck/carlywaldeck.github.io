# Methods

How Weekender turns open data and a few stated assumptions into a scored, priced trip. Every number in the app comes from one of three places, and the app labels which one:

1. **Measured open data**, refreshed monthly by a GitHub Action (`scripts/build-data.mjs`).
2. **Stated assumptions**: the base amounts for a student day, and the speed and price of each way to travel.
3. **Hand-written content**: itineraries, tips, day trips and a few tags with no reliable open source.

## 1. Data sources

| Measure | Source | Coverage | Used for |
|---|---|---|---|
| Daily weather 2020–2024 | Open-Meteo historical archive (ERA5) | All 120 cities | Month-by-month comfort |
| Tourist nights by month | Eurostat `tour_occ_nim` (by country) | EU/EEA countries | Crowd index, seasonal prices |
| Price level, restaurants & hotels | Eurostat `prc_ppp_ind` (A0111, EU = 100) | EU/EEA and candidates | Daily costs |
| Price level elsewhere | World Bank PPP (`PA.NUS.PRVT.PP`) ÷ exchange rate (`PA.NUS.FCRF`) | Remaining countries | Daily costs |
| What's there | OpenStreetMap via Overpass (counts within set distances) | All cities | Interest tags |
| Distance to the coast | Natural Earth coastline (public domain) | All cities | Separates sea beaches from lake beaches |
| Popularity | Wikipedia pageviews, last 24 months | All cities | Tourist premium, "hidden gems", crowd fallback |
| Live extras | Wikipedia REST, Open-Meteo, Nager.Date holidays, ECB/Frankfurter rates | When online | Photos, weather, holidays, currency |

`data/REPORT.md` is regenerated on every run. It compares the data-driven values with the original hand-written estimates. In the 2 October 2026 run, best-month scores correlated at 0.74 (85% within one point). Daily costs correlated at 0.84 (11 EUR/day apart on average). Tag agreement ranged from 50% to 83% depending on the interest.

## 2. From data to numbers

**Best months (1–5).** Comfort = 0.55 × temperature fit (best at a 23 °C high, or 27 °C for beach places) + 0.25 × fewer rainy days + 0.2 × sunshine. Crowds above the city's yearly average are subtracted; quiet months earn no bonus, because off-season places often close. The final score blends the month's rank within the city's own year (60%) with its rank against every city-month (40%). This stops cool northern cities from scoring poorly all year.

**Daily cost.** An EU-average student day is assumed to cost €30 hostel + €26 food + €6 local transit + €12 activities. That base is multiplied by the country's price level (data) and by 0.83–1.17 for how touristy the city is (Wikipedia pageviews). Lodging and travel rise 40% of the way with the month's crowd index.

**Interest tags.** For "how much" interests (food, nightlife, museums…), a city's strength is its percentile among all cities in OpenStreetMap counts. For "is it there" interests (beach, snow, islands…), strength comes from a fixed presence scale. Beaches, water sports and islands count only a third for cities away from the sea. A city is tagged at strength 0.6 or higher. Festivals, film locations and old towns stay hand-picked.

**Trip cost.** Nights × hostel, plus food and transit per day, plus the prices of the itinerary days actually shown, plus round-trip travel. Each way to travel is estimated from distance with assumed speeds and per-km prices:
- Bus and train run only on the same landmass, and no train where rail is poor.
- Ferries run only on real routes.
- Flights cover 250 km or more, or any water crossing, and include airport transfers.

## 3. Scoring (1–10)

Each trip gets components in 0…1:

- **Price** = `1.15 − total / budget`, clamped to 0…1, and 0 if over budget.
- **Timing** = `(month score − 1) / 4`.
- **Interests** = the average over your picked interests of the city's tag strength. A day trip that covers the interest counts 0.6.
- **Trip length**: the ideal length is set by hours each way (≤1.5 h → 1–2 days, ≤3.5 h → 2–3, ≤6 h → 3–4, farther → 4–5). The score drops by 0.4 per day beyond half a day off. A whole city in 1 day is ×0.85.

`base = 0.35·interests + 0.25·price + 0.20·timing + 0.20·length`. With no interests picked, it is `0.35·price + 0.35·timing + 0.30·length`.
`score = (1 − w)·base + w·taste`, where w grows from 0.10 to 0.30 as you rate places. Shown as `1 + 9·score`. Colors: 7.5+ teal, 5.5–7.4 gold, otherwise rose.

## 4. Taste model

This is ridge regression in the browser, with no server.
- Each place is a 32-number vector: 29 interest tags (a city's day-trip tags weigh 0.35), cost per day, latitude and longitude. All features are centered.
- Ratings of 1–5 stars map to −1…+1.
- The model solves `w = (XᵀX + λI)⁻¹(Xᵀy + λ·w₀)` with λ = 1.5. The prior `w₀` comes from your picked interests plus small, stated nudges for age range and travel style. With few ratings the model stays near the prior; each rating pulls it toward your real taste.
- Explanations use cosine similarity to places you rated ("similar to Barcelona, which you rated 5★") or the largest learned weight.

## 5. Tailored itineraries

Each of the 1,080 itinerary activities (120 cities × 3 days × 3 slots) is tagged with interests by keyword rules ("Picasso Museum" → Art & museums). About 85% get at least one tag. Days are reordered so the days that best match your interests come first, so a 2-day trip keeps the two days that suit you. The budget prices exactly the days shown. Matching activities are marked ✓. If an interest isn't covered by the city days, the plan suggests the day trip that covers it.

## 6. Testing

`npm test` runs two suites, and GitHub Actions runs them on every push (`.github/workflows/test.yml`).
- **Data (≈4,800 checks):** required fields; coordinates inside each country's bounding box; 12 month scores and price multipliers; valid tags; 3×3 itineraries; coordinates for every escape; plausible travel speeds.
- **App, in a headless browser:**
  - the landing flow
  - a sweep of every city × 1–5 days × 4 months (over 50,000 trips), checked for valid costs and scores
  - plan tabs
  - tailoring
  - the taste model
  - save and share links reopening the same trip
  - a 360 px phone layout with no horizontal overflow

## 7. Limitations

- **Prices are estimates, not quotes.** The base student day and the per-km travel prices are our assumptions, scaled by real price-level data. Live fares need the optional worker in `docs/LIVE_PRICES.md`.
- **Crowds are national.** Eurostat reports tourist nights by country, so a quiet month in Spain is quiet for every Spanish city. Wikipedia pageviews fill in where Eurostat has no data.
- **OpenStreetMap counts measure supply, not quality.** Many bars don't make great nightlife, and mapping is denser in some countries than others.
- **Itineraries, tips and day trips are hand-written.** Their prices are typical student prices, not live ones.
- **The taste model is per person.** With no server it can't learn from other travelers (collaborative filtering would need a shared ratings database).
- **No user testing yet.** Layout and wording decisions have not been validated with students.
