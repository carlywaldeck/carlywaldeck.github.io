// Checks the price-alert emails (scripts/price-alerts.mjs): who gets one, for which trips, and that
// nobody gets the same news twice.
import { suite } from "./helpers.mjs";
import { findDrops, emailFor, tripId } from "../scripts/price-alerts.mjs";

export default function run() {
  const t = suite("alerts");
  const trip = (key, total) => ({ key, home: "florence", days: 3, month: 10, budget: 300, name: key[0].toUpperCase() + key.slice(1).split("@")[0], total });
  const ana = { id: "a", email: "ana@example.com", name: "Ana", saved: [trip("prague@3", 200), trip("lisbon@3", 250), trip("paris@3", 300)] };
  const ben = { id: "b", email: "ben@example.com", name: "", saved: [trip("prague@3", 200)] };
  const now = { "prague@3": 170, "lisbon@3": 245, "paris@3": null };
  const price = (u, s) => now[s.key];

  let out = findDrops([ana, ben], price, new Map());
  t.check(out.length === 2, `both people with a real drop get an email (${out.length})`);
  t.check(out[0].drops.length === 1 && out[0].drops[0].s.key === "prague@3" && out[0].drops[0].now === 170,
    "only drops of at least €10 and 5% count (Prague −€30 yes, Lisbon −€5 no, unpriced Paris skipped)");

  const sent = new Map([[`a|${tripId(ana.saved[0])}`, 170]]);
  out = findDrops([ana, ben], price, sent);
  t.check(out.length === 1 && out[0].user.id === "b", "nobody hears about the same price twice");
  now["prague@3"] = 150;
  out = findDrops([ana], price, sent);
  t.check(out.length === 1 && out[0].drops[0].now === 150, "a further drop after an email is news again");

  const mail = emailFor(out[0], () => "Florence");
  t.check(/Prague is €50 cheaper/.test(mail.subject) && /€200/.test(mail.html) && /€150/.test(mail.html) && /#trip=prague%403/.test(mail.html) && /untick/.test(mail.html),
    `the email names the trip, old and new price, links to it, and says how to stop (${mail.subject})`);
  const two = emailFor({ user: ana, drops: [{ s: ana.saved[0], was: 200, now: 150 }, { s: ana.saved[1], was: 250, now: 200 }] });
  t.check(two.subject === "2 of your saved trips got cheaper", `several drops in one email (${two.subject})`);
  return t.done();
}
