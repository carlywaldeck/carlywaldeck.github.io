# Weekender on iOS and Android

The phone apps are the website wrapped with [Capacitor](https://capacitorjs.com), in `mobile/`.
One codebase: every improvement to the site ships to both apps.

## What's already set up
- **`mobile/`**: the Capacitor project (app id `com.weekendertrips.app`, name *Weekender*), with
  the native projects in `mobile/ios` and `mobile/android`, app icons and splash screens for every
  size (from `mobile/assets/`, made with `npm run assets`), and store screenshots in `mobile/store/`.
- **`npm run build`** (in `mobile/`) copies the site into `mobile/www`, including its own copy of the
  map library, so the app works offline from the first launch.
- **Fresh prices:** the app ships with this week's data and downloads newer prices from
  `weekender-trips.com/data/app-data.json` when it's online (used the next time it opens).
- **Native touches:** the phone's own share sheet for trips, votes and story images (Share +
  Filesystem plugins), a branded splash screen and status bar, and booking links that open in the
  phone's browser. Links shared from the app point to weekender-trips.com.
- **Automatic builds** (`.github/workflows/mobile.yml`, "Build phone apps"): on every change to the
  app or the site, GitHub builds an **Android test app** (download `weekender-android-debug` from the
  run's *Artifacts*, unzip, open the `.apk` on an Android phone and allow installing) and compiles
  the **iOS app** for the simulator to catch problems early.

## Publish on Google Play (Android)
1. **Google Play Console** account: $25 once, at play.google.com/console (identity check takes
   a few days).
2. Install **Android Studio** on any computer. In `mobile/`: `npm install`, then `npm run android`
   (copies the site and opens the project).
3. In Android Studio: **Build → Generate Signed App Bundle / APK → Android App Bundle**, create an
   upload key (keep the file and password safe), build `release`.
4. In Play Console: **Create app** → fill the listing (below) → upload the `.aab` to **Internal
   testing** first, add your email as a tester, install it from the link, then promote to
   **Production**. New personal accounts must run a closed test with 12 testers for 14 days first.

## Publish on the App Store (iPhone)
1. **Apple Developer Program**: $99/year, at developer.apple.com/programs (individual account).
2. A **Mac with Xcode** (free from the Mac App Store). In `mobile/`: `npm install`, then
   `npm run ios` (copies the site, installs CocoaPods, opens Xcode).
3. In Xcode: select the *App* target → **Signing & Capabilities** → your team. Set the version
   (1.0) and build number (1). Plug in your iPhone and press ▶ to try it.
4. **Product → Archive → Distribute App → App Store Connect**. In App Store Connect, create the app
   (bundle id `com.weekendertrips.app`), fill the listing, add the build, and **Submit for Review**
   (usually 1–3 days). TestFlight lets friends try it first.

Apple rejects apps that are "just a website". Weekender's case: it works offline, uses the native
share sheet, and has its own app experience (saved trips, price alerts, votes, story images). Mention
these in the review notes.

## Store listing (copy and paste)
- **Name:** Weekender: Cheap Weekend Trips
- **Subtitle (iOS, 30 chars):** Weekend trips for students
- **Short description (Android, 80 chars):** Cheap weekend trips from wherever you're studying, with real prices and plans.
- **Keywords (iOS):** study abroad,weekend trip,cheap travel,student travel,erasmus,europe,day trip,budget,itinerary
- **Description:**
  > Studying abroad? Weekender finds the best cheap weekend trips from your city.
  >
  > Pick where you're studying, your budget and how many days. Weekender scores 120 cities and 640+
  > day trips and weekend escapes from 1 to 10 on price, weather, crowds and what you're into, and
  > shows them on a globe.
  >
  > • Real prices: real flight fares updated weekly, plus trains, buses, hostels, food and sights, all in
  > • This weekend: last-minute trips ranked with the real weather forecast
  > • Day-by-day plans with sunrise and sunset, and where to book each part
  > • Group votes: send your saved trips to the group chat and let friends vote
  > • Story images and a travel map of everywhere you've been
  > • Price alerts when a saved trip gets cheaper
  >
  > Free. No sign-up needed.
- **Category:** Travel. **Age rating:** 4+ / Everyone.
- **Privacy policy URL:** https://weekender-trips.com/privacy.html
- **Support URL:** https://weekender-trips.com
- **Screenshots:** `mobile/store/iphone-1.png` … `iphone-5.png` (1290×2796, the 6.7" size; App
  Store Connect scales them for smaller iPhones; Play Console accepts them too).
- **Data safety / privacy labels:** email and name (only with an account), saved trips and ratings
  (only with an account), no tracking, no ads. See `privacy.html`.

## Updating the apps
Site changes reach the apps when you rebuild: `npm run sync` in `mobile/`, then archive in Xcode /
build a new bundle in Android Studio and upload (raise the version each time). Prices refresh on
their own every week without an update.

## Sign-in links in the app
Email links (password reset) open the website, not the app. Logging in with email and password
works in the app as usual.
