import assert from "node:assert/strict";
import test from "node:test";
import { divideRoundHalfUp, formatINR, gstOn, rupeesToPaise } from "../packages/ledger/src/index.ts";

test("rupees at the edge become whole paise", () => {
  assert.equal(rupeesToPaise("333.10"), 33310);
  assert.equal(rupeesToPaise("49.9"), 4990);
  assert.equal(rupeesToPaise(149), 14900);
  assert.throws(() => rupeesToPaise("12.345"));
});

test("integer division rounds half up", () => {
  assert.equal(divideRoundHalfUp(5050, 100), 51);
  assert.equal(divideRoundHalfUp(5049, 100), 50);
  assert.equal(divideRoundHalfUp(-5050, 100), -51);
  assert.throws(() => divideRoundHalfUp(1.5, 100));
});

test("GST on a taxable value", () => {
  assert.equal(gstOn(14900, 18), 2682);
  assert.equal(gstOn(14900, 0), 0);
  assert.throws(() => gstOn(14900, 7 as never));
});

test("formats rupees the Indian way", () => {
  assert.equal(formatINR(33310), "₹333.10");
  assert.equal(formatINR(12345678), "₹1,23,456.78");
  assert.equal(formatINR(-500), "-₹5.00");
});
