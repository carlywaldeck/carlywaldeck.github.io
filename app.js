// Weekender: turns the user's inputs into ranked trip ideas.
// Data lives in data/cities.js (window.CITIES).

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const INTERESTS = {
  food: "Food", nightlife: "Nightlife", history: "History", art: "Art & museums",
  architecture: "Architecture", outdoors: "Outdoors", beach: "Beach"
};
const SLOTS = ["Morning", "Afternoon", "Evening"];

const $ = (id) => document.getElementById(id);

// ---------- Setting up the form ----------

function setupForm() {
  const sorted = [...CITIES].sort((a, b) => a.name.localeCompare(b.name));
  $("home").innerHTML = sorted.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  $("home").value = "madrid";

  const nextMonth = (new Date().getMonth() + 1) % 12;
  $("month").innerHTML = MONTHS.map((m, i) =>
    `<option value="${i}" ${i === nextMonth ? "selected" : ""}>${m}</option>`).join("");

  $("interest-list").innerHTML = Object.entries(INTERESTS).map(([key, label]) =>
    `<label class="chip"><input type="checkbox" value="${key}"> ${label}</label>`).join("");

  $("trip-form").addEventListener("submit", (e) => {
    e.preventDefault();
    render(findTrips(readInputs()));
  });
}

function readInputs() {
  return {
    home: CITIES.find(c => c.id === $("home").value),
    budget: Number($("budget").value) || 0,
    days: Number($("days").value),
    month: Number($("month").value),
    interests: [...document.querySelectorAll("#interest-list input:checked")].map(i => i.value)
  };
}

// ---------- Cost estimates ----------

// Straight-line distance between two cities in km (haversine formula).
function distanceKm(a, b) {
  const rad = (d) => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Rough round-trip transport cost. Short hops go by train/bus; longer ones by budget airline
// (including getting to and from the airport).
function estimateTransport(home, dest, month) {
  const km = distanceKm(home, dest);
  const mult = dest.priceMult[month];
  if (km < 600) {
    return { mode: "Train / bus", cost: Math.round(Math.max(25, km * 0.2) * mult), hours: Math.round(km / 80 + 0.5) };
  }
  return { mode: "Budget flight", cost: Math.round((70 + km * 0.04) * mult + 25), hours: Math.round(km / 750 + 3) };
}

function estimateTrip(home, dest, days, month) {
  const nights = Math.max(1, days - 1);
  const transport = estimateTransport(home, dest, month);
  const lodging = Math.round(nights * dest.costs.hostel * dest.priceMult[month]);
  const food = days * dest.costs.food;
  const local = days * (dest.costs.transit + dest.costs.activities);
  return { transport, lodging, food, local, nights, total: transport.cost + lodging + food + local };
}

// ---------- Ranking ----------

function findTrips({ home, budget, days, month, interests }) {
  const trips = CITIES.filter(c => c.id !== home.id).map(dest => {
    const cost = estimateTrip(home, dest, days, month);
    const matched = interests.filter(i => dest.interests.includes(i));
    const interestScore = interests.length ? matched.length / interests.length : 1;
    const seasonScore = dest.season[month] / 5;
    const savings = Math.max(0, Math.min(1, 1 - cost.total / budget));
    // Weighted mix: what you like, how good the month is, and how much budget is left over.
    const score = 0.45 * interestScore + 0.35 * seasonScore + 0.2 * savings;
    return { dest, cost, matched, score };
  });

  trips.sort((a, b) => b.score - a.score);
  return {
    inputs: { home, budget, days, month, interests },
    fits: trips.filter(t => t.cost.total <= budget),
    stretch: trips.filter(t => t.cost.total > budget && t.cost.total <= budget * 1.2)
  };
}

// ---------- Rendering ----------

const euro = (n) => `€${Math.round(n)}`;

function seasonLabel(score) {
  return ["", "Poor time to go", "Not ideal", "Decent time", "Good time", "Great time"][score];
}

function priceLabel(mult) {
  if (mult <= 0.85) return { text: "cheap", cls: "low" };
  if (mult >= 1.2) return { text: "pricey", cls: "high" };
  return { text: "average", cls: "mid" };
}

function calendar(dest, selected) {
  return `<div class="calendar">${MONTHS.map((m, i) => {
    const price = priceLabel(dest.priceMult[i]);
    return `<div class="month s${dest.season[i]} ${i === selected ? "selected" : ""}"
      title="${m}: ${seasonLabel(dest.season[i])}, ${price.text} prices">
      <span>${m}</span><small class="${price.cls}">${price.text === "cheap" ? "€" : price.text === "pricey" ? "€€€" : "€€"}</small>
    </div>`;
  }).join("")}</div>
  <p class="legend">Color = how good the month is (darker is better). € / €€ / €€€ = relative prices.</p>`;
}

function itinerary(dest, days) {
  const plan = dest.itinerary.slice(0, Math.min(days, 3)).map((day, d) => `
    <li><strong>Day ${d + 1}</strong>
      <ul>${day.map(([what, cost], s) =>
        `<li><span class="slot">${SLOTS[s]}</span> ${what} <span class="cost">${cost ? euro(cost) : "free"}</span></li>`).join("")}
      </ul>
    </li>`).join("");
  const extra = days > 3 ? `<li><strong>Day 4</strong><ul><li>${dest.extraDay}</li></ul></li>` : "";
  return `<ol class="itinerary">${plan}${extra}</ol>`;
}

function links(home, dest) {
  const q = encodeURIComponent(`Flights from ${home.name} to ${dest.name}`);
  const hostels = encodeURIComponent(`cheap hostels ${dest.name}`);
  return `<div class="links">
    <a href="https://www.google.com/travel/flights?q=${q}" target="_blank" rel="noopener">Flights</a>
    <a href="https://www.omio.com/" target="_blank" rel="noopener">Trains &amp; buses</a>
    <a href="https://www.google.com/search?q=${hostels}" target="_blank" rel="noopener">Hostels</a>
  </div>`;
}

function card(trip, inputs, rank) {
  const { dest, cost, matched } = trip;
  const { home, budget, days, month } = inputs;
  const left = budget - cost.total;
  return `
  <article class="card trip">
    <div class="trip-head">
      <div>
        <h3>${rank}. ${dest.name} <span class="country">${dest.country}</span></h3>
        <p class="meta">
          <span class="badge s${dest.season[month]}">${seasonLabel(dest.season[month])} in ${MONTHS[month]}</span>
          ${matched.map(m => `<span class="tag">${INTERESTS[m]}</span>`).join("")}
        </p>
      </div>
      <div class="total">
        <strong>~${euro(cost.total)}</strong>
        <small class="${left >= 0 ? "under" : "over"}">${left >= 0 ? `${euro(left)} under budget` : `${euro(-left)} over`}</small>
      </div>
    </div>

    <details>
      <summary>See cost breakdown, best time to go and itinerary</summary>
      <h4>Cost breakdown (per person)</h4>
      <table class="breakdown">
        <tr><td>${cost.transport.mode} round trip (~${cost.transport.hours}h each way)</td><td>${euro(cost.transport.cost)}</td></tr>
        <tr><td>Hostel, ${cost.nights} night${cost.nights > 1 ? "s" : ""}</td><td>${euro(cost.lodging)}</td></tr>
        <tr><td>Food, ${days} days</td><td>${euro(cost.food)}</td></tr>
        <tr><td>Local transport &amp; sights</td><td>${euro(cost.local)}</td></tr>
        <tr class="sum"><td>Estimated total</td><td>${euro(cost.total)}</td></tr>
      </table>

      <h4>When to go</h4>
      <p>${dest.bestTime}</p>
      ${calendar(dest, month)}

      <h4>Sample ${days}-day itinerary</h4>
      ${itinerary(dest, days)}

      <h4>Money-saving tips</h4>
      <ul class="tips">${dest.tips.map(t => `<li>${t}</li>`).join("")}</ul>

      ${links(home, dest)}
    </details>
  </article>`;
}

function render({ inputs, fits, stretch }) {
  const out = [];
  out.push(`<h2>${fits.length} trip${fits.length === 1 ? "" : "s"} from ${inputs.home.name} for ${euro(inputs.budget)} in ${MONTHS[inputs.month]}</h2>`);
  if (!fits.length) out.push(`<p class="empty">Nothing fits that budget yet. Try a shorter trip, a cheaper month, or a slightly higher budget.</p>`);
  fits.forEach((t, i) => out.push(card(t, inputs, i + 1)));
  if (stretch.length) {
    out.push(`<h2 class="stretch">Worth stretching for (up to 20% over budget)</h2>`);
    stretch.forEach((t, i) => out.push(card(t, inputs, fits.length + i + 1)));
  }
  $("results").innerHTML = out.join("");
  $("results").scrollIntoView({ behavior: "smooth" });
}

setupForm();
