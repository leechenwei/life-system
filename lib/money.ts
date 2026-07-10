// Pure money logic — no DB, no framework, easy to test.

// Quick-add stores spend as negative, income as positive.
export function signedAmount(kind: string, raw: number): number {
  const a = Math.abs(raw);
  return kind === "income" ? a : -a;
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
