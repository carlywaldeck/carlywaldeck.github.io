# Adding live prices

Weekender works on estimates. This guide adds **real flight fares**, plus proper **activity** and **train/bus** booking links, without paying for anything.

It works like this:

```
Weekender page  ──asks──▶  your price worker (Cloudflare, free)  ──asks──▶  Travelpayouts flight API
 (GitHub Pages)  ◀─fare──                                        ◀─fare──
```

The worker keeps your API token secret. If the token were in the page, anyone could copy it.

> The Claude-hosted preview link can't call outside services, so live prices only show on the GitHub Pages version.

---

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
