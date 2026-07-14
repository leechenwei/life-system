import { getAnalytics, getTxStats, money } from "@/lib/data";

export const dynamic = "force-dynamic";

// Palette: validated with the dataviz skill's checker (income/spend pair ΔE 13.3
// deutan + direct labels; category bars are one sequential hue, magnitude = length).
const INCOME = "#008300";
const SPEND = "#e34948";
const BLUE = "#2a78d6";

const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${Math.round(n)}`;

function MonthChart({ months }: { months: { ym: string; spend: number; income: number }[] }) {
  const W = 360, H = 180, PAD = 24, BOTTOM = 22;
  const max = Math.max(1, ...months.flatMap((m) => [m.spend, m.income]));
  const slot = (W - PAD * 2) / months.length;
  const bw = Math.min(18, slot / 2 - 3);
  const y = (v: number) => H - BOTTOM - (v / max) * (H - BOTTOM - 18);
  const label = (ym: string) => new Date(ym + "-01").toLocaleString("en", { month: "short" });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Income vs spending by month">
      {[0.5, 1].map((f) => (
        <line key={f} x1={PAD} x2={W - PAD} y1={y(max * f)} y2={y(max * f)} stroke="#e5e5e5" strokeWidth="1" />
      ))}
      {months.map((m, i) => {
        const cx = PAD + slot * i + slot / 2;
        const last = i === months.length - 1;
        return (
          <g key={m.ym}>
            {/* income | spend pair, 2px gap, 4px rounded data-ends */}
            <rect x={cx - bw - 1} width={bw} y={y(m.income)} height={Math.max(0, H - BOTTOM - y(m.income))} rx="4" fill={INCOME}>
              <title>{label(m.ym)} income: {money(m.income)}</title>
            </rect>
            <rect x={cx + 1} width={bw} y={y(m.spend)} height={Math.max(0, H - BOTTOM - y(m.spend))} rx="4" fill={SPEND}>
              <title>{label(m.ym)} spending: {money(m.spend)}</title>
            </rect>
            {/* selective direct labels: latest month only */}
            {last && m.income > 0 && (
              <text x={cx - 1 - bw / 2} y={y(m.income) - 4} textAnchor="middle" fontSize="9" fill="#52514e">{compact(m.income)}</text>
            )}
            {last && m.spend > 0 && (
              <text x={cx + 1 + bw / 2} y={y(m.spend) - 4} textAnchor="middle" fontSize="9" fill="#52514e">{compact(m.spend)}</text>
            )}
            <text x={cx} y={H - 6} textAnchor="middle" fontSize="10" fill={last ? "#0b0b0b" : "#8a8a86"}>{label(m.ym)}</text>
          </g>
        );
      })}
      <line x1={PAD} x2={W - PAD} y1={H - BOTTOM} y2={H - BOTTOM} stroke="#d4d4d4" strokeWidth="1" />
    </svg>
  );
}

function CategoryBars({ categories }: { categories: { category: string; total: number }[] }) {
  const top = categories.slice(0, 6);
  const other = categories.slice(6).reduce((s, c) => s + c.total, 0);
  if (other > 0) top.push({ category: "Other", total: other });
  const max = Math.max(1, ...top.map((c) => c.total));
  return (
    <div className="flex flex-col gap-2">
      {top.map((c) => (
        <div key={c.category} className="flex items-center gap-2">
          <span className="w-24 truncate text-xs text-neutral-600">{c.category}</span>
          <div className="h-4 flex-1 rounded-full bg-neutral-100">
            <div
              className="h-4 rounded-full"
              style={{ width: `${Math.max(3, (c.total / max) * 100)}%`, background: BLUE }}
              title={`${c.category}: ${money(c.total)}`}
            />
          </div>
          <span className="w-16 text-right text-xs font-medium tabular-nums">{money(c.total)}</span>
        </div>
      ))}
      {top.length === 0 && <p className="text-sm text-neutral-500">No spending recorded this month yet.</p>}
    </div>
  );
}

export default async function StatsPage() {
  const [a, stats] = await Promise.all([getAnalytics(), getTxStats()]);
  const day = new Date().getDate();
  const dailyAvg = stats.month.spend / Math.max(1, day);
  const topCat = a.categories[0];

  return (
    <main className="flex flex-col gap-5 p-4">
      <h1 className="pt-2 text-xl font-semibold">Stats</h1>

      {/* KPI row */}
      <section className="grid grid-cols-2 gap-3">
        <Tile label="Spent this month" value={money(stats.month.spend)} />
        <Tile label="Daily average" value={money(dailyAvg)} />
        <Tile label="Net this month" value={money(stats.month.net)} tone={stats.month.net >= 0 ? "text-green-600" : "text-red-600"} />
        <Tile label="Top category" value={topCat ? topCat.category : "—"} sub={topCat ? money(topCat.total) : undefined} />
      </section>

      <section className="rounded-xl border bg-white p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Income vs spending · 6 months</h2>
        </div>
        {/* legend (2 series) */}
        <div className="mb-2 flex gap-4 text-xs text-neutral-600">
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: INCOME }} /> Income</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: SPEND }} /> Spending</span>
        </div>
        <MonthChart months={a.months} />
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Where it went · this month</h2>
        <CategoryBars categories={a.categories} />
      </section>

      <p className="text-xs text-neutral-400">Transfers between your own accounts are excluded.</p>
    </main>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`truncate text-lg font-semibold ${tone ?? ""}`}>{value}</p>
      {sub && <p className="text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}
