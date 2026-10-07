#!/usr/bin/env node
// Weekly price-drop emails. For everyone who turned on "Email me when a saved trip gets cheaper",
// prices each saved trip again with this week's fares (using the app's own priceNow(), loaded
// headless like the city pages) and emails a short list of the trips that got cheaper.
//
// A trip makes the list when it costs at least €10 and 5% less than when it was saved, and less
// again than the last time we emailed about it (so nobody gets the same news twice).
//
// Needs (GitHub secrets, see docs/PRICE_ALERTS.md): SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.
// Without them it explains what's missing and exits quietly. DRY_RUN=1 prints instead of sending.
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SITE = (process.env.SITE_URL || "https://weekender-trips.com").replace(/\/$/, "");
const FROM = process.env.ALERTS_FROM || "Weekender <alerts@weekender-trips.com>";
const html = fs.readFileSync(ROOT + "index.html", "utf8");
const SUPABASE_URL = process.env.SUPABASE_URL || (html.match(/const SUPABASE_URL = [^"]*"([^"]+)"/) || [])[1];

export const step = (total) => Math.max(10, total * 0.05);
export const tripId = (s) => `${s.home}|${s.key}|${s.month}|${s.budget}`;

// users: [{ id, email, name, saved: [...] }]; priceOf(s) -> today's price or null;
// sent: Map of "userId|tripId" -> price we last emailed about. Returns one entry per user to email.
export function findDrops(users, priceOf, sent) {
  const out = [];
  for (const u of users) {
    const drops = [];
    for (const s of u.saved || []) {
      const now = priceOf(u, s), was = Math.round(s.total);
      if (now == null || !was) continue;
      const last = sent.get(`${u.id}|${tripId(s)}`);
      if (was - now >= step(was) && (last == null || last - now >= step(last))) drops.push({ s, was, now });
    }
    if (drops.length) out.push({ user: u, drops: drops.sort((a, b) => (b.was - b.now) - (a.was - a.now)) });
  }
  return out;
}

const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function emailFor({ user, drops }, homeName = (id) => id) {
  const link = (s) => `${SITE}/#${new URLSearchParams({ trip: s.key, from: s.home, days: s.days, month: s.month, budget: s.budget })}`;
  const first = drops[0];
  const subject = drops.length === 1
    ? `${first.s.name} is €${first.was - first.now} cheaper`
    : `${drops.length} of your saved trips got cheaper`;
  const rows = drops.map(({ s, was, now }) => `<tr><td style="padding:10px 0;border-bottom:1px solid #E3E8EF">
      <a href="${esc(link(s))}" style="color:#13233F;font-weight:600;font-size:16px;text-decoration:none">${esc(s.name)}</a><br>
      <span style="color:#5A6B85;font-size:13px">From ${esc(homeName(s.home))} · ${s.days} day${s.days > 1 ? "s" : ""} · ${MONTHS[s.month]}</span></td>
      <td style="padding:10px 0;border-bottom:1px solid #E3E8EF;text-align:right;white-space:nowrap"><s style="color:#8A97AB">€${was}</s> <b style="color:#0B8A7C;font-size:16px">€${now}</b></td></tr>`).join("");
  const body = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;color:#13233F">
    <p style="font-size:20px;font-weight:700;margin:0 0 4px">weekender<span style="color:#2F5BEA">.</span></p>
    <p style="font-size:16px">Hi${user.name ? ` ${esc(user.name)}` : ""}, good news: ${drops.length === 1 ? "a trip you saved got" : "trips you saved got"} cheaper with this week's fares.</p>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <p><a href="${esc(link(first.s))}" style="display:inline-block;background:#2F5BEA;color:#fff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:10px">Open ${esc(first.s.name)} →</a></p>
    <p style="color:#5A6B85;font-size:12px">Prices are estimates for one person (travel, hostel, food and sights), not quotes; check before you book.
    You get this because you turned on price alerts. To stop them, log in at <a href="${SITE}" style="color:#2F5BEA">weekender-trips.com</a> → your name → Saved trips, and untick "Email me when a saved trip gets cheaper".</p></div>`;
  return { subject, html: body };
}

async function main() {
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY, RESEND = process.env.RESEND_API_KEY, DRY = !!process.env.DRY_RUN;
  if (!KEY || (!RESEND && !DRY) || !SUPABASE_URL) {
    console.log("Price alerts skipped: set the SUPABASE_SERVICE_ROLE_KEY and RESEND_API_KEY secrets to send them (docs/PRICE_ALERTS.md).");
    return;
  }
  const headers = { apikey: KEY, "Content-Type": "application/json", ...(KEY.startsWith("eyJ") ? { Authorization: `Bearer ${KEY}` } : {}) };
  const sb = async (path, opts = {}) => {
    const r = await fetch(SUPABASE_URL + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
    if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
    return r.status === 204 || r.status === 201 ? null : r.json();
  };
  const profiles = await sb("/rest/v1/profiles?select=id,data");
  const wanting = profiles.filter((p) => p.data && p.data.alerts === true && (p.data.saved || []).length);
  if (!wanting.length) { console.log("Price alerts: nobody has them on yet."); return; }
  const people = [];
  for (let page = 1; ; page++) {
    const r = await sb(`/auth/v1/admin/users?page=${page}&per_page=1000`);
    people.push(...(r.users || []));
    if ((r.users || []).length < 1000) break;
  }
  const byUser = new Map(people.map((u) => [u.id, u]));
  const users = wanting.map((p) => { const u = byUser.get(p.id); return u && u.email ? { id: p.id, email: u.email, name: (u.user_metadata && u.user_metadata.name) || "", saved: p.data.saved } : null; }).filter(Boolean);
  const sentRows = await sb("/rest/v1/price_alerts?select=user_id,trip,price");
  const sent = new Map(sentRows.map((r) => [`${r.user_id}|${r.trip}`, r.price]));

  // Price every saved trip with the app's own logic and this week's data.
  const { openBrowser, openApp } = await import("../tests/helpers.mjs");
  const browser = await openBrowser();
  const page = await openApp(browser);
  const all = users.flatMap((u) => u.saved.map((s) => ({ u: u.id, s })));
  const prices = await page.evaluate((list) => list.map(({ s }) => { try { return priceNow(s); } catch { return null; } }), all);
  const names = await page.evaluate(() => Object.fromEntries(CITIES.map((c) => [c.id, c.name])));
  await browser.close();
  const priceMap = new Map(all.map(({ u, s }, i) => [`${u}|${tripId(s)}`, prices[i]]));

  const todo = findDrops(users, (u, s) => priceMap.get(`${u.id}|${tripId(s)}`), sent);
  console.log(`Price alerts: ${users.length} people with alerts on, ${todo.length} to email.`);
  for (const item of todo) {
    const { subject, html: body } = emailFor(item, (id) => names[id] || id);
    if (DRY) { console.log(`[dry run] to ${item.user.email}: ${subject}`); continue; }
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [item.user.email], subject, html: body })
    });
    if (!r.ok) { console.log(`couldn't email ${item.user.id}: ${r.status} ${await r.text()}`); continue; }
    await sb("/rest/v1/price_alerts", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(item.drops.map((d) => ({ user_id: item.user.id, trip: tripId(d.s), price: d.now, sent_at: new Date().toISOString() }))) });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
