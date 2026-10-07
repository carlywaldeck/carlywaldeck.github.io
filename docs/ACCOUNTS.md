# Turning on accounts (Supabase, free)

Weekender works without accounts: everything stays in the visitor's browser. With Supabase set up, a
**Log in** button appears in the top-right corner. People create an account with their first name,
email and a password; their saved trips, visited places, ratings, home city, age range and travel style
then follow them to every device. Logged-in visitors are greeted by name ("Hi, Carly") and skip the
start-up questions. The account page lets them change their details and password; "Forgot password?"
emails a reset link.

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

### 1b. Let the model learn from everyone's ratings (collaborative filtering)
Run this too (another **New query → Run**). It stores each logged-in person's star ratings and shares
them with the recommendation model **anonymously**: the public view swaps the account id for a
scrambled one, so nobody can see who rated what.

```sql
create table public.ratings (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  place text not null,
  stars smallint not null check (stars between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, place)
);
alter table public.ratings enable row level security;
create policy "manage own ratings" on public.ratings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create view public.ratings_anon as
  select md5(user_id::text) as rater, place, stars from public.ratings;
grant select on public.ratings_anon to anon, authenticated;
```

Supabase may warn that the view is "security definer": that's intended here, since it's how the view
can show everyone's ratings (without account ids) while the table itself stays private.

### 1c. Feedback messages
The **Feedback** button saves messages to a `feedback` table. Anyone can send one; only you can read
them (in Supabase: **Table Editor → feedback**).

```sql
create table public.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  message text not null check (char_length(message) between 1 and 2000),
  email text,
  page text,
  home text,
  user_agent text
);
alter table public.feedback enable row level security;
create policy "anyone can send feedback" on public.feedback for insert to anon, authenticated with check (true);
```

### 1d. Let people delete their data
Lets the **Delete my account** button remove the person's login too (not just their saved data):

```sql
create or replace function public.delete_my_account() returns void
language sql security definer set search_path = public as $$
  delete from auth.users where id = auth.uid();
$$;
grant execute on function public.delete_my_account() to authenticated;
```

## 2. Allow sign-in links back to the site
**Authentication → URL Configuration**:
- **Site URL:** `https://weekender-trips.com`
- **Redirect URLs:** add `https://weekender-trips.com/**` and `https://www.weekender-trips.com/**` (keep `https://carlywaldeck.github.io/**` too)

Email + password sign-in is on by default (**Authentication → Sign In / Providers → Email**). By default
Supabase asks new users to confirm their email before the first login; turn off **Confirm email** there
if you'd rather people get in straight away. Set the **minimum password length** to 8 to match the form.
Supabase's built-in email sender allows only a few emails per hour, which is fine for a class demo; for
more, connect your own email service under **Authentication → SMTP**.

## 3. Connect the site
**Project Settings → API**: copy the **Project URL** and the **anon public** key. Both are meant to
be public. In `index.html`, fill in:

```js
const SUPABASE_URL = window.WEEKENDER_SUPABASE_URL || "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = window.WEEKENDER_SUPABASE_KEY || "YOUR-ANON-KEY";
```

Never paste the **service_role** key anywhere in the site: that one bypasses row-level security.

## What gets stored
- **Account:** email, password (hashed by Supabase; never visible to anyone) and first name.
- **profiles:** one row per person with places they've been (with star ratings), saved trips, and their
  last search (home city, budget, trip lengths, month, interests, currency, optional age range and
  travel style). Only that person can read it.
- **ratings:** each star rating (place + stars). Shared with the model only through `ratings_anon`,
  which has no account ids.
