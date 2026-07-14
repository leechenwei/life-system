// Pure money logic — no DB, no framework, easy to test.

// Quick-add stores spend as negative, income as positive.
export function signedAmount(kind: string, raw: number): number {
  const a = Math.abs(raw);
  return kind === "income" ? a : -a;
}

export type TxRow = { amount: number | string; occurred_on: string; category?: string | null };

// Transfers move money between your own accounts — never spend or income.
export const isTransfer = (r: TxRow) => r.category === "Transfer";

// Derive this-month totals AND 90-day avg spend from ONE transaction scan.
// rows: last ~90 days. firstOfMonth: "YYYY-MM-DD". Transfers excluded.
export function reduceTxStats(rows: TxRow[], firstOfMonth: string) {
  let mSpend = 0, mIncome = 0, spend90 = 0;
  for (const r of rows) {
    if (isTransfer(r)) continue;
    const a = Number(r.amount);
    if (r.occurred_on >= firstOfMonth) {
      if (a < 0) mSpend += -a; else mIncome += a;
    }
    if (a < 0) spend90 += -a;
  }
  return {
    month: { spend: mSpend, income: mIncome, net: mIncome - mSpend },
    avgSpendRaw: spend90 / 3, // 90 days ≈ 3 months
    hasData: rows.length > 0,
  };
}

// Analytics aggregates for the stats page. rows: ~6 months of transactions.
// `today` passed in (not read from the clock) so this stays pure and testable.
export function aggregateAnalytics(rows: TxRow[], today: string, monthsBack = 6) {
  // month keys, oldest -> newest, ending at today's month
  const [y0, m0] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
  const months: { ym: string; spend: number; income: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y0, m0 - 1 - i, 1));
    months.push({ ym: d.toISOString().slice(0, 7), spend: 0, income: 0 });
  }
  const byYm = new Map(months.map((m) => [m.ym, m]));
  const thisYm = today.slice(0, 7);
  const catTotals = new Map<string, number>();

  for (const r of rows) {
    if (isTransfer(r)) continue;
    const a = Number(r.amount);
    const m = byYm.get(r.occurred_on.slice(0, 7));
    if (m) { if (a < 0) m.spend += -a; else m.income += a; }
    if (a < 0 && r.occurred_on.slice(0, 7) === thisYm) {
      const c = r.category || "Uncategorized";
      catTotals.set(c, (catTotals.get(c) ?? 0) + -a);
    }
  }
  const categories = [...catTotals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
  return { months, categories };
}

// The Plan brain's rule: buffer = months × avg spend; anything above it is surplus.
export function planMath(emergencyFund: number, avgSpend: number, bufferMonths: number) {
  const target = bufferMonths * avgSpend;
  const safe = emergencyFund >= target;
  return {
    target,
    safe,
    surplus: safe ? emergencyFund - target : 0,
    toGo: safe ? 0 : target - emergencyFund,
  };
}
