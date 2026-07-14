import { test } from "node:test";
import assert from "node:assert/strict";
import { signedAmount, planMath, reduceTxStats, aggregateAnalytics } from "./money.ts";
import { parseReceiptReply } from "./receipt.ts";

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

test("transfers are excluded from spend/income stats", () => {
  const rows = [
    { amount: -100, occurred_on: "2026-07-05", category: "Transfer" }, // bank -> TnG
    { amount: 100, occurred_on: "2026-07-05", category: "Transfer" },
    { amount: -30, occurred_on: "2026-07-06", category: "Food" },
  ];
  const r = reduceTxStats(rows, "2026-07-01");
  assert.equal(r.month.spend, 30);   // transfer's -100 NOT counted
  assert.equal(r.month.income, 0);   // transfer's +100 NOT counted
});

test("aggregateAnalytics: month buckets + category totals, transfers skipped", () => {
  const rows = [
    { amount: -50, occurred_on: "2026-07-02", category: "Food" },
    { amount: -20, occurred_on: "2026-07-03", category: "Food" },
    { amount: -10, occurred_on: "2026-07-04", category: "Transport" },
    { amount: 3000, occurred_on: "2026-07-01", category: null },
    { amount: -99, occurred_on: "2026-06-15", category: "Bills" },   // last month
    { amount: -500, occurred_on: "2026-07-05", category: "Transfer" }, // skipped
  ];
  const a = aggregateAnalytics(rows, "2026-07-14", 3);
  assert.equal(a.months.length, 3);
  assert.deepEqual(a.months.map((m) => m.ym), ["2026-05", "2026-06", "2026-07"]);
  assert.equal(a.months[2].spend, 80);
  assert.equal(a.months[2].income, 3000);
  assert.equal(a.months[1].spend, 99);
  assert.deepEqual(a.categories[0], { category: "Food", total: 70 }); // sorted desc, this month only
  assert.equal(a.categories.find((c) => c.category === "Transfer"), undefined);
});

test("parseReceiptReply: clean JSON, fenced JSON, and junk", () => {
  const clean = parseReceiptReply('{"amount": 25.5, "merchant": "TNG", "date": "2026-07-10", "category": "Transport"}');
  assert.equal(clean.amount, 25.5);
  assert.equal(clean.merchant, "TNG");
  assert.equal(clean.date, "2026-07-10");

  const fenced = parseReceiptReply('Here you go:\n```json\n{"amount": 12, "merchant": "KFC", "date": null, "category": "Food"}\n```');
  assert.equal(fenced.amount, 12);
  assert.equal(fenced.category, "Food");

  const junk = parseReceiptReply("sorry, I cannot read this image");
  assert.equal(junk.amount, null);

  const badDate = parseReceiptReply('{"amount": 5, "merchant": "X", "date": "10/07/2026", "category": "Other"}');
  assert.equal(badDate.date, null); // non-ISO date rejected
  assert.equal(badDate.amount, 5);
});
