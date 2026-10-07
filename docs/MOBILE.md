# Weekender on iOS and Android

## Today: installable web app (free, done)
The site is a **Progressive Web App**: `manifest.webmanifest` (name, icons, colors) plus `sw.js` (a
service worker that keeps the app and its data available offline). On a phone, **📱 Get the app** on
the landing page explains how to add it to the home screen: on Android/Chrome it installs in one tap;
on iPhone it's Share → Add to Home Screen. It then opens full screen with the Weekender icon.

## Next: App Store and Google Play (Capacitor)
The fastest path to real store apps is to **wrap this same web app with [Capacitor](https://capacitorjs.com)**
(free, by the Ionic team). One codebase: every improvement to the site ships to both apps.

1. **Accounts:** Apple Developer Program ($99/year) and Google Play Console ($25 once). Store
   listings need the icon (`brand/icon-1080.png`), screenshots, a description and the privacy page.
2. **Project:** `npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`,
   `npx cap init Weekender travel.weekender.app --web-dir=www`, copy `index.html`, icons and
   `privacy.html` into `www/` (a small build script), then `npx cap add ios` and `npx cap add android`.
3. **Build:** iOS needs a Mac with Xcode (`npx cap open ios`, then Archive → upload); Android
   builds in Android Studio (`npx cap open android`, then Build → Generate Signed Bundle).
4. **Make it feel native** (Apple rejects apps that are "just a website"):
   - push notifications for price drops on saved trips (`@capacitor/push-notifications` + a small
     scheduled job comparing the weekly fares with saved trips);
   - share sheet for trips and the travel-map image (`@capacitor/share`);
   - offline saved trips (already works through the service worker);
   - haptics, a native splash screen and status-bar color.
5. **Logins:** add the app's URL scheme (e.g. `weekender://`) to Supabase's redirect URLs so
   password-reset links open the app.
6. **Review:** Apple usually takes 1–3 days; Google a few hours to a few days.

Estimated effort once the site is stable: about a week of work, mostly store listings, native
touches and review back-and-forth.
