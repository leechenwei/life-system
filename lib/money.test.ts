import { test } from "node:test";
import assert from "node:assert/strict";
import { signedAmount, planMath } from "./money.ts";

test("spend is negative, income is positive, sign of input ignored", () => {
  assert.equal(signedAmount("spend", 25), -25);
  assert.equal(signedAmount("spend", -25), -25); // abs first
  assert.equal(signedAmount("income", 3000), 3000);
});

test("below buffer: not safe, reports how much to go", () => {
  const r = planMath(6000, 2000, 6); // target 12000
  assert.equal(r.target, 12000);
  assert.equal(r.safe, false);
  assert.equal(r.toGo, 6000);
  assert.equal(r.surplus, 0);
});

test("above buffer: safe, reports idle surplus", () => {
  const r = planMath(15000, 2000, 6); // target 12000
  assert.equal(r.safe, true);
  assert.equal(r.surplus, 3000);
  assert.equal(r.toGo, 0);
});

test("exactly at buffer counts as safe", () => {
  const r = planMath(12000, 2000, 6);
  assert.equal(r.safe, true);
  assert.equal(r.surplus, 0);
});
