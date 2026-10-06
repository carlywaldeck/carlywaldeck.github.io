#!/usr/bin/env node
// Copies the parts of data/city-data.json the app needs into index.html (between the CITY_DATA
// markers), so the page keeps working as a single self-contained file.
import fs from "node:fs/promises";

const ROOT = new URL("..", import.meta.url).pathname;
const data = JSON.parse(await fs.readFile(ROOT + "data/city-data.json", "utf8"));
const keep = ["season", "priceMult", "costs", "interests", "strengths", "climate", "crowds", "price", "osm", "wikipedia", "popularity"];
const compact = {
  generated: data.generated, sources: data.sources, method: data.method, osm: data.osm, roads: data.roads || {},
  fares: data.fares || null,
  flightModel: data.flightModel ? { mean: data.flightModel.mean, std: data.flightModel.std, w: data.flightModel.w, b: data.flightModel.b,
    smear: data.flightModel.smear, enc: data.flightModel.enc, n: data.flightModel.n, trained: data.flightModel.trained, test: data.flightModel.test } : null,
  cities: Object.fromEntries(Object.entries(data.cities).map(([id, c]) => {
    const o = {};
    for (const k of keep) if (c[k] != null) o[k] = c[k];
    if (o.climate) delete o.climate.comfort;
    if (o.wikipedia) o.wikipedia = { title: o.wikipedia.title, monthlyViews: o.wikipedia.monthlyViews };
    return [id, o];
  }))
};
const START = "/* CITY_DATA:START */", END = "/* CITY_DATA:END */";
const html = await fs.readFile(ROOT + "index.html", "utf8");
const a = html.indexOf(START), b = html.indexOf(END);
if (a < 0 || b < a) throw new Error("CITY_DATA markers not found in index.html");
const next = html.slice(0, a + START.length) + "\nwindow.CITY_DATA = " + JSON.stringify(compact) + ";\n" + html.slice(b);
await fs.writeFile(ROOT + "index.html", next);
console.log(`embedded data for ${Object.keys(compact.cities).length} cities (${Math.round(JSON.stringify(compact).length / 1024)} KB)`);
