# Adding real flight prices

Weekender can price flights with **real fares** from Travelpayouts (the cheapest round trips Aviasales
travelers found in the last few days), and trains a **flight price model** on those fares to predict
prices for routes and months that have none. Both run inside the existing GitHub data workflow, so
there's no server to set up:

```
GitHub data workflow (weekly) ──token──▶ Travelpayouts Data API ──fares──▶ data/city-data.json ──▶ the page
                               └─ trains the flight price model on those fares ─┘
```

## Quick setup (10 minutes)
1. **Get your token:** in the Travelpayouts dashboard, join the **Aviasales** program, then copy your
   **API token** (Profile → API token, or Tools → API). Keep it private.
2. **Store it as a GitHub secret:** in the repo, go to **Settings → Secrets and variables → Actions →
   New repository secret**. Name: `TRAVELPAYOUTS_TOKEN`. Value: your token. Save.
3. **Run it once:** **Actions → Refresh city data → Run workflow**. In the "Skip sources" box enter
   `wikipedia,climate,crowds,prices,roads,coast,osm` so only fares run (about 15 minutes).
4. When it finishes, `data/REPORT.md` shows how many real fares came in and how accurate the model is
   on routes it never saw. After that, fares refresh automatically every Monday.

In each plan, flights then show **real fare** (with the month it was found) or "predicted by a model
trained on N real fares". Without the token, everything keeps working on the old estimates.

---

## Optional: instant live fares with a Cloudflare Worker
The weekly fares above are enough for most uses. If you also want each plan to look up a fare the
moment it opens, set up the small worker below.

## Step 1: Put the site on GitHub Pages (5 min)
1. Make sure the repo is named `carlywaldeck.github.io` (a user site, served at the bare domain).
2. Go to **Settings → Pages**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
3. After a minute your site is at `https://carlywaldeck.github.io/`.

Affiliate programs usually ask for a live website when you apply, and this is it.

## Step 2: Get a Travelpayouts token (flights, 10 min)
Travelpayouts is a free affiliate network. Its data API returns **cached real fares**: the cheapest prices people found on Aviasales in the last few days.

1. Sign up at **travelpayouts.com** (free).
2. Add your website (the GitHub Pages URL) as a project.
3. Join the **Aviasales** program inside the dashboard.
4. Find your **API token** in your profile/API settings and copy it. Keep it private.

Limits to know: prices are recent searches, not guaranteed checkout prices, and quiet routes may have none. The app then falls back to its estimate and says so.

## Step 3: Deploy the worker (Cloudflare, 10 min)
1. Create a free account at **cloudflare.com**.
2. Go to **Workers & Pages → Create → Create Worker**, name it e.g. `weekender-prices`, and deploy the starter.
3. Click **Edit code**, replace everything with the contents of [`api/worker.js`](../api/worker.js), and deploy.
4. In the worker's **Settings → Variables and Secrets**, add:
   - `TRAVELPAYOUTS_TOKEN` as a **Secret**: your token from step 2
   - `ALLOWED_ORIGIN` as **Text**: `https://carlywaldeck.github.io`
5. Test it in your browser:
   `https://weekender-prices.<your-subdomain>.workers.dev/flights?from=MAD&to=LIS&month=2026-11`
   You should see something like `{"price":64,"departure_at":"…","link":"https://www.aviasales.com/…"}`.
   `{"price":null}` just means no recent fare for that route and month; try a busier route.

## Step 4: Connect the page (1 min)
In `index.html`, find this line and paste your worker URL:

```js
const LIVE_PRICES_URL = window.WEEKENDER_API || "";
// becomes
const LIVE_PRICES_URL = "https://weekender-prices.<your-subdomain>.workers.dev";
```

Commit, push, and merge to `main`. Open any trip's plan: the flight option shows a **live** tag and the total uses the real fare.

## Step 5: Activities (GetYourGuide)
Every plan already has a **Tours & tickets** link that searches GetYourGuide for that city.

1. Apply to the **GetYourGuide Partner Program** (partner.getyourguide.com) with your GitHub Pages URL.
2. Once approved, copy your `partner_id` into `index.html`:
   ```js
   const GYG_PARTNER_ID = "YOUR_ID";
   ```
   Links then carry your ID (bookings through them can earn commission).
3. GetYourGuide also offers API access to approved partners, which could show real tour prices and ratings inside each plan. Ask about it once you're approved; it would plug into the same worker as a second route.

## Step 6: Trains and buses (Omio)
Omio has an affiliate program (check Omio's website footer for "Affiliates", or look inside Travelpayouts). Once approved, use its link generator to make deep links for a route, and swap them in for the generic **Train/Bus tickets** link in `extrasSection()` in `index.html`.

Omio doesn't offer a public price API to small partners, so train and bus prices stay as estimates with a booking link. That's normal, and it's how most small travel sites do it.

---

### Why not scrape Skyscanner/Omio/GetYourGuide directly?
- Their terms of service forbid it.
- They actively block bots, so a scraper keeps breaking.
- It isn't something you want to explain in an interview.

The approach above uses official data, is free, and is a good story: *"estimates everywhere, real fares where available, with a serverless proxy to keep keys secret."*
