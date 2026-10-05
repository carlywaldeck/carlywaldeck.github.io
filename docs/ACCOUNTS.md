# Turning on accounts (Supabase, free)

Weekender works without accounts: everything stays in the visitor's browser. With Supabase set up, a
**My trips → Keep your trips on every device** box appears. People type their email, click the link
they're sent, and their saved trips, visited places, ratings and search sync across devices.

## 1. Create the project (5 min)
1. Sign up at **supabase.com** (free) and click **New project**. Pick any name and a region near Europe.
2. When it's ready, open **SQL Editor → New query**, paste this, and click **Run**:

```sql
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "read own row"   on public.profiles for select using (auth.uid() = id);
create policy "insert own row" on public.profiles for insert with check (auth.uid() = id);
create policy "update own row" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "delete own row" on public.profiles for delete using (auth.uid() = id);
```

Row-level security means each person can only read and write their own row, even though the key
in the page is public.

## 2. Allow sign-in links back to the site
**Authentication → URL Configuration**:
- **Site URL:** `https://carlywaldeck.github.io`
- **Redirect URLs:** add `https://carlywaldeck.github.io/`

Email sign-in is on by default. Supabase's built-in email sender allows only a few emails per hour,
which is fine for a class demo; for more, connect your own email service under **Authentication → SMTP**.

## 3. Connect the site
**Project Settings → API**: copy the **Project URL** and the **anon public** key. Both are meant to
be public. In `index.html`, fill in:

```js
const SUPABASE_URL = window.WEEKENDER_SUPABASE_URL || "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = window.WEEKENDER_SUPABASE_KEY || "YOUR-ANON-KEY";
```

Never paste the **service_role** key anywhere in the site: that one bypasses row-level security.

## What gets stored
One row per person: places they've been (with star ratings), saved trips, and their last search
(home city, budget, trip lengths, month, interests, currency, optional age range and travel style).
Nothing else: no names, no location, no tracking.
