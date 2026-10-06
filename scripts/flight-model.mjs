// Flight price model, shared by the data pipeline (which trains it) and the tests.
// The page has its own copy of features() and predict() (search "flight price model" in index.html);
// tests/model.test.mjs checks that both copies agree.
//
// Ridge regression on log(round-trip fare): prices grow roughly like a power of distance, and errors
// are proportional (a €20 miss matters on a €40 fare, not on a €400 one), so a log scale fits better.

export const FEATURES = [
  "log distance", "log distance²", "demand at destination that month", "demand at home that month",
  "destination price level", "destination popularity", "home popularity",
  "how cheap flights from this airport are", "how cheap flights to this airport are", "how cheap this month is", "short hop (< 500 km)"
];

// Airport and month effects ("target encoding"): the average log fare from each departure airport,
// to each destination airport, and in each calendar month, shrunk toward the overall average when
// there are few fares (5 imaginary fares at the average). Budget-airline hubs like London or Barcelona
// come out cheap; airports with few routes come out expensive.
export function encode(rows) {
  const g = rows.reduce((s, r) => s + Math.log(r.price), 0) / rows.length;
  const table = (key) => {
    const acc = {};
    for (const r of rows) { const a = (acc[r[key]] = acc[r[key]] || [0, 0]); a[0] += Math.log(r.price); a[1]++; }
    return Object.fromEntries(Object.entries(acc).map(([k, [s, n]]) => [k, Math.round(((s + 5 * g) / (n + 5)) * 1000) / 1000]));
  };
  return { g: Math.round(g * 1000) / 1000, origin: table("origin"), dest: table("dest"), month: table("month") };
}

export function features({ km, destMult = 1, homeMult = 1, destLevel = 1, destPop = 0.5, homePop = 0.5, origin, dest, month }, enc) {
  const l = Math.log(Math.max(50, km)), e = enc || { g: 0, origin: {}, dest: {}, month: {} };
  return [l, l * l, destMult, homeMult, destLevel, destPop, homePop,
    e.origin[origin] ?? e.g, e.dest[dest] ?? e.g, e.month[month] ?? e.g, km < 500 ? 1 : 0];
}

// Solve A x = b (Gaussian elimination with partial pivoting).
function solve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c || !M[c][c]) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => (r[i] ? r[n] / r[i] : 0));
}

// X: rows of features, prices: fares in EUR. Returns the model (plain JSON).
export function fit(X, prices, lambda = 1, { smear = true } = {}) {
  const n = X.length, d = X[0].length, y = prices.map(Math.log);
  const mean = Array.from({ length: d }, (_, j) => X.reduce((s, r) => s + r[j], 0) / n);
  const std = mean.map((m, j) => Math.sqrt(X.reduce((s, r) => s + (r[j] - m) ** 2, 0) / n) || 1);
  const Z = X.map((r) => r.map((v, j) => (v - mean[j]) / std[j]));
  const yMean = y.reduce((s, v) => s + v, 0) / n;
  const A = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => Z.reduce((s, r) => s + r[i] * r[j], 0) + (i === j ? lambda : 0)));
  const bvec = Array.from({ length: d }, (_, i) => Z.reduce((s, r, k) => s + r[i] * (y[k] - yMean), 0));
  const w = solve(A, bvec);
  const model = { mean, std, w, b: yMean, smear: 1 };
  // Smearing: exp(mean log) underestimates the mean price; correct by the average residual factor.
  // (Off when predicting a typical, i.e. median, fare: the pipeline does that, since a few very
  // expensive outliers shouldn't raise every estimate.)
  if (smear) model.smear = X.reduce((s, r, k) => s + Math.exp(y[k] - logPredict(model, r)), 0) / n;
  return model;
}
function logPredict(m, x) { return m.b + x.reduce((s, v, j) => s + ((v - m.mean[j]) / m.std[j]) * m.w[j], 0); }
export function predict(m, x) { return Math.exp(logPredict(m, x)) * m.smear; }

// Route history for the "known route" model: the median log fare on this route in the other months,
// and on the reverse route in any month (round trips cost about the same both ways), plus flags for
// whether each exists. prices: { "MAD-LIS": [12 monthly fares, 0 = none] }; skip = month index to ignore.
export const ROUTE_FEATURES = ["this route in other months", "has other months", "the reverse route", "has reverse route"];
export function routeFeatures(prices, origin, dest, skip, g) {
  const logMedian = (arr, skipI) => {
    const v = (arr || []).map((p, i) => (i !== skipI && p > 0 ? Math.log(p) : null)).filter((x) => x != null).sort((a, b) => a - b);
    return v.length ? v[v.length >> 1] : null;
  };
  const same = logMedian(prices[`${origin}-${dest}`], skip), rev = logMedian(prices[`${dest}-${origin}`], -1);
  return [same ?? g, same != null ? 1 : 0, rev ?? g, rev != null ? 1 : 0];
}

// The hand-written formula the app used before real fares (round trip, EUR, before airport transfers).
export function oldFormula(km, destMult = 1) { return (70 + km * 0.04) * destMult; }

export function haversineKm(a, b) {
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
