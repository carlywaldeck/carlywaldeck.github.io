# Price alerts

Weekender tells people when a trip they saved gets cheaper.

- **On the site (works now, no setup):** every saved trip is priced again with the latest fares.
  My trips shows "↓ €23 cheaper than when you saved it", and when someone comes back after a drop,
  a short message tells them which trip got cheaper (once per drop).
- **By email (needs the setup below):** people with an account can tick **Email me when a saved
  trip gets cheaper** under their name → Saved trips. Every Monday, after the weekly fare update,
  `scripts/price-alerts.mjs` prices their saved trips again and emails them the ones that dropped by
  at least €10 and 5%. Nobody gets the same news twice: a trip is only mentioned again if it drops
  further.

## Set up the emails (about 15 minutes, free)

### 1. A table that remembers what was already emailed
In Supabase: **SQL Editor → New query**, paste this and click **Run**:

```sql
create table if not exists public.price_alerts (
  user_id uuid references auth.users on delete cascade,
  trip text not null,
  price integer not null,
  sent_at timestamptz default now(),
  primary key (user_id, trip)
);
alter table public.price_alerts enable row level security;
-- No policies on purpose: only the weekly job (with the secret key) can read or write it.
```

### 2. An email sender: Resend
1. Sign up at [resend.com](https://resend.com) (free: 3,000 emails a month, 100 a day).
2. **Domains → Add domain** → `weekender-trips.com`. Resend shows a few DNS records (TXT and MX).
3. In Cloudflare → weekender-trips.com → **DNS → Records**, add each one exactly as shown, with the
   cloud **grey (DNS only)**. Back in Resend, click **Verify** (a few minutes).
4. **API Keys → Create API key**, permission **Sending access**. Copy it (it starts with `re_`).

Emails come from `alerts@weekender-trips.com`. You don't need a mailbox for it.

### 3. Give the weekly job its two keys
In GitHub: the repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
|---|---|
| `RESEND_API_KEY` | the `re_…` key from Resend |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → **Project Settings → API Keys** → the **secret** key (`sb_secret_…`), or the legacy `service_role` key |

The Supabase secret key can read every account, so it only goes into GitHub secrets: never into
`index.html` or anywhere public.

### 4. Check it
The emails go out with the Monday fare update. To try it sooner: tick the box in your own
account, save a trip, then run **Actions → Refresh city data → Run workflow**. The log's last step
("Email price alerts") says how many people have alerts on and how many were emailed. While the
keys aren't set, it just says "Price alerts skipped".

To test without sending anything, run it locally with `DRY_RUN=1`:
`SUPABASE_SERVICE_ROLE_KEY=… DRY_RUN=1 node scripts/price-alerts.mjs`.
