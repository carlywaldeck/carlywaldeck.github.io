# Idea Set (Week 3)

## Working name
**Weekender**: a budget trip planner for study-abroad students in Europe.

## The problem
Study-abroad students have a rare chance to see a lot of Europe cheaply, but:
- There are too many options, and it's hard to know which places fit a student budget.
- It isn't obvious **when** to go: the same city can be cheap and pleasant one month and overpriced and packed the next.
- Planning a 2–4 day trip (transport, a bed, what to do) takes hours of searching across many sites.

*Motivation:* I ran into this myself while studying abroad. I had lots of options, no idea of the best timing for cost or experience, and no single place to compare.

## Target user
A college student studying abroad for a semester in a European city who:
- takes weekend trips and one or two longer breaks
- has a tight, fixed budget (roughly €150–€500 per trip)
- travels by budget airline, train or bus, and sleeps in hostels or cheap rentals
- usually travels with friends

## One-line pitch
> Tell it your budget and your free weekends; it tells you where to go, when it's cheapest and best, and what to do there.

## How it works
**Inputs**
- Home city (where you're studying)
- Total budget per person
- Trip length (days)
- Month(s) you're free
- Interests: food, nightlife, museums/history, outdoors, beaches, architecture

**Outputs**
1. **Ranked destinations** that fit the budget, each with an estimated cost breakdown (transport, lodging, food, activities).
2. **Best-time calendar**: a month-by-month score for each city covering price, crowds, weather and events.
3. **Sample itinerary**: a day-by-day plan that fits the budget and interests.
4. **Booking links**: deep links to Google Flights / Skyscanner / Omio for live prices.

## What makes it different
Most travel tools answer *"what should I do in X?"* This app answers *"given my budget and my free dates, where and when should I go?"*, using data made for students on a budget rather than for average tourists.

## Constraints
- **$0 budget.** No paid APIs or hosting.
- **No prior dev experience.** Built with AI assistance (Claude).
- **Web app first.** It's easiest to deploy and share with employers.

## Data plan (all free)
| Data | Source |
|---|---|
| Monthly weather | Open-Meteo historical/climate API (free, no key) |
| Public holidays / busy periods | Nager.Date API (free) |
| Daily costs (hostel, meals, local transit, attractions) | Curated dataset built with Claude's help, then spot-checked by hand |
| Crowd / price seasonality and events | Curated monthly scores for each city |
| Transport cost between cities | Typical price ranges by mode (budget flight / train / bus) plus deep links for live prices |
| Itineraries | Generated with Claude during development and stored as data (no paid API at runtime) |

**How AI is used without paying for an API:** a Claude subscription does not include API access, so the app won't call an AI model live. Instead, Claude is used *while building* to research and structure the city dataset and to write itinerary templates for each city and interest. The app then assembles and filters those itineraries to match the user's budget and trip length. (A free-tier AI API could be added later as a stretch goal.)

## Scope
**MVP (Week 6)**
- Input form → ranked list from ~15 cities with a cost estimate
- One sample itinerary per city
- Deployed publicly (GitHub Pages or Vercel free tier)

**Final product (Week 12)**
- 40–60 cities
- Best-time calendar for each city
- Itineraries tailored by interest and trip length
- Save or share a trip plan
- Polished, mobile-friendly design

**Stretch goals**
- Group mode (split budget, shared interests)
- Map view
- "Surprise me" button
- Expand beyond study-abroad students and beyond Europe

## Success looks like
- A classmate can go from "I have €250 and a free weekend in March" to a destination and plan in under 2 minutes.
- In peer testing (Week 10), most testers say they'd use it to plan a real trip.

## Open questions
- Which home cities to support first (start with the most common study-abroad cities)?
- How to keep cost estimates honest (show ranges and a "last checked" date)?
- Do users want cheaper trips or better value, e.g., "worth spending €40 more to go to Lisbon instead"?
