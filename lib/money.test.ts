import { test } from "node:test";
import assert from "node:assert/strict";
import { signedAmount, planMath, reduceTxStats } from "./money.ts";

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

test("reduceTxStats: splits month vs 90-day, spend/income by sign", () => {
  const rows = [
    { amount: -100, occurred_on: "2026-07-05" }, // this month spend
    { amount: 3000, occurred_on: "2026-07-01" }, // this month income
    { amount: -50, occurred_on: "2026-06-20" },  // last month spend (in 90d)
  ];
  const r = reduceTxStats(rows, "2026-07-01");
  assert.equal(r.month.spend, 100);
  assert.equal(r.month.income, 3000);
  assert.equal(r.month.net, 2900);
  assert.equal(r.avgSpendRaw, 150 / 3); // (100+50)/3
  assert.equal(r.hasData, true);
});

test("reduceTxStats: no rows => hasData false, zero avg", () => {
  const r = reduceTxStats([], "2026-07-01");
  assert.equal(r.hasData, false);
  assert.equal(r.avgSpendRaw, 0);
  assert.equal(r.month.net, 0);
});
