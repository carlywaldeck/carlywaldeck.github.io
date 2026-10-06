// Runs every test file and exits non-zero if anything failed (used by `npm test` and CI).
import data from "./data.test.mjs";
import app from "./app.test.mjs";
import model from "./model.test.mjs";

const failed = data() + model() + (await app());
console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
