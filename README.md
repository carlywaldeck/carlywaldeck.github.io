# Weekender (working name)

A budget trip planner for study-abroad students in Europe: enter your budget, trip length and free months, and get destinations that fit, the best time to go, and a sample itinerary.

GSB 5576 semester project. See [docs/IDEA.md](docs/IDEA.md) for the full idea set.

## Run it
No installs needed. Download the repo and double-click `index.html` to open it in your browser.

## Publish it for free (GitHub Pages)
1. Merge this branch into `main`.
2. On GitHub, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, then pick `main` and `/ (root)`, and save.
4. After about a minute, the site is live at `https://carlywaldeck.github.io/gsb-5576-project/`.

## How it's built
| File | What it does |
|---|---|
| `index.html` | The page layout and input form |
| `styles.css` | How it looks |
| `app.js` | Estimates costs, ranks destinations, builds the results |
| `data/cities.js` | City data: costs, month-by-month scores, itineraries, tips |

**How costs are estimated:** round-trip transport is based on distance (train/bus under 600 km, budget flight over), plus hostel nights, food, and local transport and sights. Lodging and transport are adjusted for how busy the chosen month is.

**How trips are ranked:** 45% interest match + 35% how good the month is + 20% how much budget is left over.

## Milestones
- [x] Week 3: Idea set
- [ ] Week 6: Working MVP (16 cities, cost estimates, calendar, itineraries: first version done)
- [ ] Week 10: Peer user testing
- [ ] Week 12: Final product
- [ ] Week 13: Final presentation
