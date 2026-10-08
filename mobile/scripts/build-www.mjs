#!/usr/bin/env node
// Copies the website into mobile/www for the iOS and Android apps (Capacitor's webDir). The apps run
// this same code; booking links open in the phone's browser, and the app downloads the weekly prices
// from weekender-trips.com when it's online (see refreshAppData in index.html).
import fs from "node:fs/promises";

const ROOT = new URL("../../", import.meta.url).pathname, OUT = new URL("../www/", import.meta.url).pathname;
const FILES = ["index.html", "privacy.html", "favicon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "manifest.webmanifest", "og.png"];
const DIRS = ["assets", "data"];
await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });
for (const f of FILES) await fs.copyFile(ROOT + f, OUT + f);
for (const d of DIRS) await fs.cp(ROOT + d, OUT + d, { recursive: true, filter: (src) => !/city-data\.json$|REPORT\.md$|nearby-airports\.json$|cities-meta\.json$/.test(src) });
// The app ships its own copy of d3 so it works offline from the first launch.
const d3 = await fs.readFile(ROOT + "node_modules/d3/dist/d3.min.js", "utf8").catch(() => null);
let html = await fs.readFile(OUT + "index.html", "utf8");
if (d3) { await fs.writeFile(OUT + "assets/d3.min.js", d3); html = html.replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/d3@[\d.]+\/dist\/d3\.min\.js/g, "assets/d3.min.js"); }
await fs.writeFile(OUT + "index.html", html);
const size = (await fs.readdir(OUT, { recursive: true })).length;
console.log(`built mobile/www (${size} files)`);
