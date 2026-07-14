/**
 * Malaysian statutory deduction engine.
 * Rates based on KWSP (EPF) and PERKESO (SOCSO/EIS) 2024 schedules.
 * Update tables here when official rates change.
 */

export type DeductionInput = {
  grossWage: number;          // basic + fixed allowances subject to EPF
  ageOver60: boolean;
  isMalaysian: boolean;
  applyEpf?: boolean;         // toggle off for sole-prop self-payment
  applySocso?: boolean;
  applyEis?: boolean;
  reliefs?: PcbReliefs;       // optional, only used by calcPCB
};

export type DeductionResult = {
  epfEmployee: number;
  epfEmployer: number;
  socsoEmployee: number;
  socsoEmployer: number;
  eisEmployee: number;
  eisEmployer: number;
  pcb: number;
};

// ---------------------------------------------------------------
// EPF — KWSP Third Schedule (simplified continuous formula)
// For wages > RM 20,000 the Third Schedule rounds up to RM 20 bands;
// we approximate with rates which is correct to within a ringgit
// for ordinary salaries. Replace with full table for exact match.
// ---------------------------------------------------------------
export function calcEPF(wage: number, ageOver60: boolean) {
  if (wage <= 0) return { employee: 0, employer: 0 };

  let empRate: number, erRate: number;
  if (ageOver60) {
    // Age 60+: employee 0%, employer 4% (Malaysian) — simplified
    empRate = 0;
    erRate = wage <= 5000 ? 0.04 : 0.04;
  } else {
    // Under 60
    empRate = 0.11; // employee
    erRate  = wage <= 5000 ? 0.13 : 0.12;
  }
  return {
    employee: round2(wage * empRate),
    employer: round2(wage * erRate),
  };
}

// ---------------------------------------------------------------
// SOCSO + EIS — PERKESO contribution table (Category 1)
// Source: PERKESO Jadual Caruman 2024
// Each tier: [wageCeiling, socsoEmployee, socsoEmployer, eisEmployee, eisEmployer]
// Truncated to common brackets; extend for full 76-row table if needed.
// ---------------------------------------------------------------
type Tier = { ceiling: number; socsoEe: number; socsoEr: number; eisEe: number; eisEr: number };

const SOCSO_TIERS: Tier[] = [
  { ceiling: 30,    socsoEe: 0.10, socsoEr: 0.40, eisEe: 0.05, eisEr: 0.05 },
  { ceiling: 50,    socsoEe: 0.20, socsoEr: 0.70, eisEe: 0.10, eisEr: 0.10 },
  { ceiling: 70,    socsoEe: 0.30, socsoEr: 1.10, eisEe: 0.15, eisEr: 0.15 },
  { ceiling: 100,   socsoEe: 0.40, socsoEr: 1.50, eisEe: 0.20, eisEr: 0.20 },
  { ceiling: 140,   socsoEe: 0.60, socsoEr: 2.10, eisEe: 0.25, eisEr: 0.25 },
  { ceiling: 200,   socsoEe: 0.85, socsoEr: 2.95, eisEe: 0.40, eisEr: 0.40 },
  { ceiling: 300,   socsoEe: 1.25, socsoEr: 4.35, eisEe: 0.50, eisEr: 0.50 },
  { ceiling: 400,   socsoEe: 1.75, socsoEr: 6.15, eisEe: 0.70, eisEr: 0.70 },
  { ceiling: 500,   socsoEe: 2.25, socsoEr: 7.85, eisEe: 0.90, eisEr: 0.90 },
  { ceiling: 600,   socsoEe: 2.75, socsoEr: 9.65, eisEe: 1.10, eisEr: 1.10 },
  { ceiling: 700,   socsoEe: 3.25, socsoEr: 11.35, eisEe: 1.30, eisEr: 1.30 },
  { ceiling: 800,   socsoEe: 3.75, socsoEr: 13.15, eisEe: 1.50, eisEr: 1.50 },
  { ceiling: 900,   socsoEe: 4.25, socsoEr: 14.85, eisEe: 1.70, eisEr: 1.70 },
  { ceiling: 1000,  socsoEe: 4.75, socsoEr: 16.65, eisEe: 1.90, eisEr: 1.90 },
  { ceiling: 1100,  socsoEe: 5.25, socsoEr: 18.35, eisEe: 2.10, eisEr: 2.10 },
  { ceiling: 1200,  socsoEe: 5.75, socsoEr: 20.15, eisEe: 2.30, eisEr: 2.30 },
  { ceiling: 1300,  socsoEe: 6.25, socsoEr: 21.85, eisEe: 2.50, eisEr: 2.50 },
  { ceiling: 1400,  socsoEe: 6.75, socsoEr: 23.65, eisEe: 2.70, eisEr: 2.70 },
  { ceiling: 1500,  socsoEe: 7.25, socsoEr: 25.35, eisEe: 2.90, eisEr: 2.90 },
  { ceiling: 1600,  socsoEe: 7.75, socsoEr: 27.15, eisEe: 3.10, eisEr: 3.10 },
  { ceiling: 1700,  socsoEe: 8.25, socsoEr: 28.85, eisEe: 3.30, eisEr: 3.30 },
  { ceiling: 1800,  socsoEe: 8.75, socsoEr: 30.65, eisEe: 3.50, eisEr: 3.50 },
  { ceiling: 1900,  socsoEe: 9.25, socsoEr: 32.35, eisEe: 3.70, eisEr: 3.70 },
  { ceiling: 2000,  socsoEe: 9.75, socsoEr: 34.15, eisEe: 3.90, eisEr: 3.90 },
  { ceiling: 2100,  socsoEe: 10.25, socsoEr: 35.85, eisEe: 4.10, eisEr: 4.10 },
  { ceiling: 2200,  socsoEe: 10.75, socsoEr: 37.65, eisEe: 4.30, eisEr: 4.30 },
  { ceiling: 2300,  socsoEe: 11.25, socsoEr: 39.35, eisEe: 4.50, eisEr: 4.50 },
  { ceiling: 2400,  socsoEe: 11.75, socsoEr: 41.15, eisEe: 4.70, eisEr: 4.70 },
  { ceiling: 2500,  socsoEe: 12.25, socsoEr: 42.85, eisEe: 4.90, eisEr: 4.90 },
  { ceiling: 2600,  socsoEe: 12.75, socsoEr: 44.65, eisEe: 5.10, eisEr: 5.10 },
  { ceiling: 2700,  socsoEe: 13.25, socsoEr: 46.35, eisEe: 5.30, eisEr: 5.30 },
  { ceiling: 2800,  socsoEe: 13.75, socsoEr: 48.15, eisEe: 5.50, eisEr: 5.50 },
  { ceiling: 2900,  socsoEe: 14.25, socsoEr: 49.85, eisEe: 5.70, eisEr: 5.70 },
  { ceiling: 3000,  socsoEe: 14.75, socsoEr: 51.65, eisEe: 5.90, eisEr: 5.90 },
  { ceiling: 3100,  socsoEe: 15.25, socsoEr: 53.35, eisEe: 6.10, eisEr: 6.10 },
  { ceiling: 3200,  socsoEe: 15.75, socsoEr: 55.15, eisEe: 6.30, eisEr: 6.30 },
  { ceiling: 3300,  socsoEe: 16.25, socsoEr: 56.85, eisEe: 6.50, eisEr: 6.50 },
  { ceiling: 3400,  socsoEe: 16.75, socsoEr: 58.65, eisEe: 6.70, eisEr: 6.70 },
  { ceiling: 3500,  socsoEe: 17.25, socsoEr: 60.35, eisEe: 6.90, eisEr: 6.90 },
  { ceiling: 3600,  socsoEe: 17.75, socsoEr: 62.15, eisEe: 7.10, eisEr: 7.10 },
  { ceiling: 3700,  socsoEe: 18.25, socsoEr: 63.85, eisEe: 7.30, eisEr: 7.30 },
  { ceiling: 3800,  socsoEe: 18.75, socsoEr: 65.65, eisEe: 7.50, eisEr: 7.50 },
  { ceiling: 3900,  socsoEe: 19.25, socsoEr: 67.35, eisEe: 7.70, eisEr: 7.70 },
  { ceiling: 4000,  socsoEe: 19.75, socsoEr: 69.05, eisEe: 7.90, eisEr: 7.90 },
  { ceiling: 4100,  socsoEe: 20.25, socsoEr: 70.85, eisEe: 8.10, eisEr: 8.10 },
  { ceiling: 4200,  socsoEe: 20.75, socsoEr: 72.55, eisEe: 8.30, eisEr: 8.30 },
  { ceiling: 4300,  socsoEe: 21.25, socsoEr: 74.35, eisEe: 8.50, eisEr: 8.50 },
  { ceiling: 4400,  socsoEe: 21.75, socsoEr: 76.05, eisEe: 8.70, eisEr: 8.70 },
  { ceiling: 4500,  socsoEe: 22.25, socsoEr: 77.85, eisEe: 8.90, eisEr: 8.90 },
  { ceiling: 4600,  socsoEe: 22.75, socsoEr: 79.55, eisEe: 9.10, eisEr: 9.10 },
  { ceiling: 4700,  socsoEe: 23.25, socsoEr: 81.35, eisEe: 9.30, eisEr: 9.30 },
  { ceiling: 4800,  socsoEe: 23.75, socsoEr: 83.05, eisEe: 9.50, eisEr: 9.50 },
  { ceiling: 4900,  socsoEe: 24.25, socsoEr: 84.85, eisEe: 9.70, eisEr: 9.70 },
  { ceiling: 5000,  socsoEe: 24.75, socsoEr: 86.65, eisEe: 9.90, eisEr: 9.90 },
  // Ceiling: wages above RM 6000 contribute based on RM 6000
  { ceiling: 6000,  socsoEe: 29.75, socsoEr: 104.15, eisEe: 11.90, eisEr: 11.90 },
  { ceiling: Infinity, socsoEe: 29.75, socsoEr: 104.15, eisEe: 11.90, eisEr: 11.90 },
];

export function calcSocsoEis(wage: number, ageOver60: boolean) {
  if (wage <= 0) return { socsoEe: 0, socsoEr: 0, eisEe: 0, eisEr: 0 };
  const tier = SOCSO_TIERS.find(t => wage <= t.ceiling)!;
  // Age 60+ pays only Category 2 (employment injury only) — employee 0, employer ~1.25% capped.
  // Simplified: zero employee SOCSO + EIS, employer pays employer-side SOCSO only.
  if (ageOver60) {
    return { socsoEe: 0, socsoEr: tier.socsoEr, eisEe: 0, eisEr: 0 };
  }
  return { socsoEe: tier.socsoEe, socsoEr: tier.socsoEr, eisEe: tier.eisEe, eisEr: tier.eisEr };
}

// ---------------------------------------------------------------
// PCB (Income Tax MTD) — IMPLEMENTED BY USER
// See calcPCB() below — you decide the strategy.
// ---------------------------------------------------------------
export type PcbReliefs = {
  spouse?: boolean;
  numChildren?: number;
  zakat?: number;
  monthlyEpf?: number; // pass actual employee EPF so PCB doesn't double-count
};

// Sole-proprietor pays tax annually via LHDN Form B — no monthly withholding.
// Kept as a function (not a constant) so it's easy to switch to MTD later.
export function calcPCB(_input: DeductionInput): number {
  return 0;
}

// ---------------------------------------------------------------
// Top-level
// ---------------------------------------------------------------
export function calcDeductions(input: DeductionInput): DeductionResult {
  const zero = { employee: 0, employer: 0 };
  const epf  = input.applyEpf   ? calcEPF(input.grossWage, input.ageOver60) : zero;
  const se   = input.applySocso || input.applyEis
    ? calcSocsoEis(input.grossWage, input.ageOver60)
    : { socsoEe: 0, socsoEr: 0, eisEe: 0, eisEr: 0 };
  const pcb  = calcPCB({ ...input, reliefs: { ...input.reliefs, monthlyEpf: epf.employee } });
  return {
    epfEmployee:   epf.employee,
    epfEmployer:   epf.employer,
    socsoEmployee: input.applySocso ? se.socsoEe : 0,
    socsoEmployer: input.applySocso ? se.socsoEr : 0,
    eisEmployee:   input.applyEis   ? se.eisEe   : 0,
    eisEmployer:   input.applyEis   ? se.eisEr   : 0,
    pcb,
  };
}

function round2(n: number) { return Math.round(n * 100) / 100; }
