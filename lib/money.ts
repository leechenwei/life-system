// Pure money logic — no DB, no framework, easy to test.

// Quick-add stores spend as negative, income as positive.
export function signedAmount(kind: string, raw: number): number {
  const a = Math.abs(raw);
  return kind === "income" ? a : -a;
}

// Derive this-month totals AND 90-day avg spend from ONE transaction scan.
// rows: [{ amount, occurred_on }] from the last ~90 days. firstOfMonth: "YYYY-MM-DD".
export function reduceTxStats(
  rows: { amount: number | string; occurred_on: string }[],
  firstOfMonth: string,
) {
  let mSpend = 0, mIncome = 0, spend90 = 0;
  for (const r of rows) {
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
