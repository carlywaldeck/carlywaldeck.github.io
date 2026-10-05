// Shared helpers for the tests: load the app's data straight from index.html, a tiny assertion
// counter, and a browser page with the d3 CDN served from node_modules (so tests run offline
// and always use the same d3 version).
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const INDEX = ROOT + "index.html";
const html = fs.readFileSync(INDEX, "utf8");

const between = (start, end) => { const a = html.indexOf(start); if (a < 0) throw new Error(`not found: ${start}`); return html.slice(a + start.length, html.indexOf(end, a)); };
export function loadAppData() {
  return {
    CITIES: (0, eval)("[" + between("window.CITIES = [", "\n];\n</script>") + "]"),
    PLACES: JSON.parse(between("window.PLACES = ", ";\n")),
    INTERESTS: (0, eval)("({" + between("const INTERESTS = {", "\n};") + "})"),
    WIKI: (0, eval)("({" + between("const WIKI_TITLES = {", "\n};") + "})")
  };
}

export function suite(name) {
  let passed = 0;
  const failures = [];
  return {
    check(ok, msg) { if (ok) passed++; else failures.push(msg); },
    done() {
      console.log(`${failures.length ? "✗" : "✓"} ${name}: ${passed} passed, ${failures.length} failed`);
      failures.slice(0, 30).forEach((f) => console.log("   - " + f));
      if (failures.length > 30) console.log(`   … and ${failures.length - 30} more`);
      return failures.length;
    }
  };
}

export async function openBrowser() {
  const { chromium } = await import("playwright");
  return chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
}
export async function openApp(browser, { width = 1440, height = 900, hash = "", context = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, ...context });
  const page = await ctx.newPage();
  const d3 = fs.readFileSync(ROOT + "node_modules/d3/dist/d3.min.js", "utf8");
  await page.route("https://cdn.jsdelivr.net/**", (r) => r.fulfill({ body: d3, contentType: "application/javascript" }));
  await page.route(/^https:\/\/(?!cdn\.jsdelivr).*/, (r) => r.abort()); // no live APIs: test the built-in data
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  await page.goto("file://" + INDEX + hash);
  await page.waitForFunction(() => typeof update === "function" && document.querySelector("#results"));
  return page;
}
