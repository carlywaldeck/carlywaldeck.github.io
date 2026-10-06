// Flight price model, shared by the data pipeline (which trains it) and the tests.
// The page has its own copy of features() and predict() (search "flight price model" in index.html);
// tests/model.test.mjs checks that both copies agree.
//
// Ridge regression on log(round-trip fare): prices grow roughly like a power of distance, and errors
// are proportional (a €20 miss matters on a €40 fare, not on a €400 one), so a log scale fits better.

export const FEATURES = [
  "log distance", "log distance²", "demand at destination that month", "demand at home that month",
  "destination price level", "destination popularity", "home popularity"
];

export function features({ km, destMult = 1, homeMult = 1, destLevel = 1, destPop = 0.5, homePop = 0.5 }) {
  const l = Math.log(Math.max(50, km));
  return [l, l * l, destMult, homeMult, destLevel, destPop, homePop];
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
export function fit(X, prices, lambda = 1) {
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
  model.smear = X.reduce((s, r, k) => s + Math.exp(y[k] - logPredict(model, r)), 0) / n;
  return model;
}
function logPredict(m, x) { return m.b + x.reduce((s, v, j) => s + ((v - m.mean[j]) / m.std[j]) * m.w[j], 0); }
export function predict(m, x) { return Math.exp(logPredict(m, x)) * m.smear; }

// The hand-written formula the app used before real fares (round trip, EUR, before airport transfers).
export function oldFormula(km, destMult = 1) { return (70 + km * 0.04) * destMult; }

export function haversineKm(a, b) {
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
