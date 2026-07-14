"use client";

import { useActionState } from "react";
import { generatePayslip } from "./actions";

type Opt = { id: string; name: string };
type State = { ok: boolean; msg: string } | null;

export default function GenerateForm({ employees, accounts }: { employees: Opt[]; accounts: Opt[] }) {
  const [state, action, pending] = useActionState<State, FormData>(
    async (_prev, form) => generatePayslip(form),
    null,
  );
  const now = new Date();

  return (
    <form action={action} className="flex flex-col gap-2">
      <select name="employee_id" required className="rounded-lg border p-2 text-sm" defaultValue={employees[0]?.id ?? ""}>
        {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <select name="month" className="rounded-lg border p-2 text-sm" defaultValue={now.getMonth() + 1}>
          {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2026, i).toLocaleString("en", { month: "long" })}</option>)}
        </select>
        <input name="year" type="number" defaultValue={now.getFullYear()} className="rounded-lg border p-2 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input name="allowances" type="number" step="0.01" placeholder="Allowances" className="rounded-lg border p-2 text-sm" />
        <input name="overtime" type="number" step="0.01" placeholder="Overtime" className="rounded-lg border p-2 text-sm" />
        <input name="bonus" type="number" step="0.01" placeholder="Bonus" className="rounded-lg border p-2 text-sm" />
        <input name="other_deductions" type="number" step="0.01" placeholder="Other deductions" className="rounded-lg border p-2 text-sm" />
      </div>
      <div className="flex gap-4 rounded-lg border border-dashed p-2 text-sm">
        {/* Sole-prop owner drawings: statutory deductions usually OFF */}
        <label className="flex items-center gap-1.5"><input type="checkbox" name="apply_epf" /> EPF</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" name="apply_socso" /> SOCSO</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" name="apply_eis" /> EIS</label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select name="account_id" className="rounded-lg border p-2 text-sm" defaultValue="">
          <option value="">— also log income to… (optional) —</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input name="pay_date" type="date" className="rounded-lg border p-2 text-sm" />
      </div>
      <button disabled={pending || employees.length === 0}
        className="rounded-lg bg-black p-3 text-sm font-medium text-white transition-all active:scale-[0.97] disabled:opacity-60">
        {pending ? "Generating PDF…" : "Generate payslip"}
      </button>
      {state && (
        <p className={`text-sm ${state.ok ? "text-green-700" : "text-red-600"}`}>{state.msg}</p>
      )}
    </form>
  );
}
