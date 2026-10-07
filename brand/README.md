# Weekender brand kit

## Slogan
**Your semester, every weekend.**

Supporting line (for bios and ads): *Cheap weekend trips from wherever you're studying.*

Alternatives if you want a different tone:
- *Study abroad. See everything.* (aspirational)
- *More weekends. Less spending.* (budget-first)
- *Where to this weekend?* (casual, good for TikTok captions)

## Logo
The mark is three cities joined by two trips, and the hops make a **w**. The last stop is gold:
the next trip.

| File | Use it for |
|---|---|
| `profile-picture.png` (1080×1080) | Instagram, TikTok, X, LinkedIn profile photo (circle-safe) |
| `icon-1080.png`, `icon-512.png` | App icon, anywhere a rounded square fits |
| `logo-horizontal.png` | Documents, slides, white backgrounds |
| `logo-horizontal-transparent.png` | On top of photos or colored backgrounds |
| `logo-horizontal-on-blue.png` | Dark/colored placements |
| `banner-1500x500.png` | X / LinkedIn header |
| `logo-mark.svg` | Vector master (scales to any size) |

## Colors and type
| | Hex | Use |
|---|---|---|
| Weekender blue | `#2F5BEA` | Buttons, links, the dot |
| Deep blue | `#1F45C9` | Gradients, pressed states |
| Ink | `#13233F` | Text |
| Gold | `#FFC857` | The "next trip" accent, sparingly |
| Mist | `#F7F8FA` | Backgrounds |

Font: **Geist** (free, Google Fonts), bold for headlines.

## Social accounts
Use the same handle everywhere. Try in this order and take the first one free on **all** platforms:
`@weekender.trips` · `@weekendertrips` · `@getweekender` · `@weekender.eu`

**Instagram bio (150 characters max)**
> Your semester, every weekend ✈️
> Cheap weekend trips from wherever you're studying abroad 🌍
> Free trip planner ↓

**TikTok bio (80 characters max)**
> Cheap weekend trips for students abroad ✈️ Free planner ↓

**X / Threads**
> Your semester, every weekend. Free planner that finds cheap weekend trips from wherever you're studying abroad, with real fares and day-by-day plans.

Put the site link in every bio (use the domain once you have it).

## Domain
Check these on **Cloudflare Registrar** (sells at cost, about $10/year, free privacy) or **Porkbun**,
in this order: `weekendertrips.com`, `getweekender.com`, `weekender.travel`, `weekenderapp.com`.
Prefer **.com**. Avoid hyphens.

Once you buy it, tell Claude the domain: it adds a `CNAME` file to the repo, and you add these DNS records
at the registrar (GitHub Pages docs: "Managing a custom domain"):
- `A` records for the bare domain → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- `CNAME` record `www` → `carlywaldeck.github.io`

Then in the repo: **Settings → Pages → Custom domain**, enter it and tick **Enforce HTTPS**. Also update
Supabase **Site URL / Redirect URLs** and the Travelpayouts project to the new domain.

Before committing to the name, search "Weekender travel" on your national trademark register
(e.g. USPTO, EUIPO) and the app stores: if a travel company already uses it, pick a variant.

## First posts (launch week)
1. **"I built a free app for study abroad weekend trips"**: 15-second screen recording: pick your
   city → budget → the globe flies in → top trip with price. End on the site link.
2. **"€150 weekends from Florence this month"** (do one per big study-abroad city: Florence, Madrid,
   Barcelona, Paris, London, Rome): top 3 trips with real prices from the site.
3. **"My study abroad travel map"**: post your own Share image from the travel map; invite people
   to make theirs. Repost the best ones.
4. **"Cheapest month to visit…"**: one city, its best months from the site's weather + crowd data.
5. **"Day trips you can do for under €30 from…"**.
6. **"Hidden gems: places with real sights but fewer tourists"** (the Hidden gems interest).
7. **Before/after budget**: "I planned a 3-day trip to Lisbon for €180, here's the breakdown."
8. **Poll story**: "Where are you studying?" → reply with that city's best trips.
9. **Behind the scenes**: "It uses real flight fares and 3 machine-learning models" (good for
   LinkedIn and your class).

Hashtags: #studyabroad #studyabroadlife #erasmus #budgettravel #weekendtrip #europetravel
#[city]studyabroad (e.g. #florencestudyabroad)

## Where students are
- Study-abroad program WhatsApp / GroupMe / Facebook groups (ask the admin first)
- r/studyAbroad, r/Erasmus, city subreddits ("r/florence")
- University study-abroad offices (offer it as a free resource for their students)
- Erasmus Student Network (ESN) sections in each city
