import { db } from "@/lib/supabase";
import { getAccounts, money } from "@/lib/data";
import { saveCompany, saveEmployee, deletePayslip, deactivateEmployee } from "./actions";
import SubmitButton from "../submit-button";
import GenerateForm from "./generate-form";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function PayslipPage() {
  const supabase = db();
  const [{ data: company }, { data: employees }, { data: slips }, accounts] = await Promise.all([
    supabase.from("companies").select("*").limit(1).maybeSingle(),
    supabase.from("employees").select("*").eq("is_active", true).order("created_at"),
    supabase.from("payslips").select("*, employees(name)").order("period_year", { ascending: false }).order("period_month", { ascending: false }).limit(24),
    getAccounts(),
  ]);

  // Signed URLs for history PDFs (1 hour).
  const paths = (slips ?? []).map((s) => s.pdf_path).filter(Boolean) as string[];
  const { data: signed } = paths.length
    ? await supabase.storage.from("attachments").createSignedUrls(paths, 3600)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s, i) => [paths[i], s.signedUrl]));

  return (
    <main className="flex flex-col gap-5 p-4">
      <div>
        <h1 className="pt-2 text-xl font-semibold">Payslips</h1>
        <p className="text-sm text-neutral-500">
          Your SSM business — issue payslips, keep income proof for loans.
        </p>
      </div>

      {/* Company */}
      <details className="rounded-xl border bg-white p-3" open={!company}>
        <summary className="cursor-pointer text-sm font-medium">
          🏢 {company ? company.name : "Set up your company (SSM)"}
        </summary>
        <form action={saveCompany} className="mt-3 flex flex-col gap-2">
          <input name="name" defaultValue={company?.name ?? ""} placeholder="Business name (as per SSM)" required className="rounded-lg border p-2 text-sm" />
          <input name="ssm_no" defaultValue={company?.ssm_no ?? ""} placeholder="SSM registration no." required className="rounded-lg border p-2 text-sm" />
          <textarea name="address" defaultValue={company?.address ?? ""} placeholder="Business address" rows={2} className="rounded-lg border p-2 text-sm" />
          <input name="business_type" defaultValue={company?.business_type ?? ""} placeholder="e.g. Pemilikan Tunggal" className="rounded-lg border p-2 text-sm" />
          <SubmitButton className="rounded-lg bg-black p-2 text-sm text-white">Save company</SubmitButton>
        </form>
      </details>

      {/* Employees */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-500">Employees</h2>
        {(employees ?? []).map((e) => (
          <details key={e.id} className="rounded-xl border bg-white">
            <summary className="flex cursor-pointer items-center justify-between p-3 text-sm">
              <span className="font-medium">{e.name}</span>
              <span className="text-neutral-500">{money(Number(e.basic_salary))}/mo</span>
            </summary>
            <form action={saveEmployee} className="flex flex-col gap-2 border-t p-3">
              <input type="hidden" name="id" value={e.id} />
              <input name="name" defaultValue={e.name} required className="rounded-lg border p-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input name="ic_no" defaultValue={e.ic_no ?? ""} placeholder="IC no." className="rounded-lg border p-2 text-sm" />
                <input name="designation" defaultValue={e.designation ?? ""} placeholder="Designation" className="rounded-lg border p-2 text-sm" />
                <input name="epf_no" defaultValue={e.epf_no ?? ""} placeholder="EPF no." className="rounded-lg border p-2 text-sm" />
                <input name="socso_no" defaultValue={e.socso_no ?? ""} placeholder="SOCSO no." className="rounded-lg border p-2 text-sm" />
                <input name="bank_name" defaultValue={e.bank_name ?? ""} placeholder="Bank" className="rounded-lg border p-2 text-sm" />
                <input name="bank_account" defaultValue={e.bank_account ?? ""} placeholder="Account no." className="rounded-lg border p-2 text-sm" />
              </div>
              <label className="text-xs text-neutral-500">Basic salary (RM/month)
                <input name="basic_salary" type="number" step="0.01" defaultValue={Number(e.basic_salary)} className="mt-1 w-full rounded-lg border p-2 text-sm" />
              </label>
              <SubmitButton className="rounded-lg bg-black p-2 text-sm text-white">Save changes</SubmitButton>
            </form>
            <form action={deactivateEmployee} className="border-t p-3 pt-2">
              <input type="hidden" name="id" value={e.id} />
              <SubmitButton pendingLabel="Removing…" className="w-full rounded-lg border border-red-200 p-2 text-xs text-red-600">
                Remove employee (past payslips are kept)
              </SubmitButton>
            </form>
          </details>
        ))}
        <details className="rounded-xl border border-dashed bg-white p-3">
          <summary className="cursor-pointer text-sm font-medium">＋ Add employee (e.g. yourself)</summary>
          <form action={saveEmployee} className="mt-3 flex flex-col gap-2">
            <input name="name" placeholder="Full name (as per IC)" required className="rounded-lg border p-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input name="ic_no" placeholder="IC no." className="rounded-lg border p-2 text-sm" />
              <input name="designation" placeholder="e.g. Owner / Director" className="rounded-lg border p-2 text-sm" />
              <input name="bank_name" placeholder="Bank" className="rounded-lg border p-2 text-sm" />
              <input name="bank_account" placeholder="Account no." className="rounded-lg border p-2 text-sm" />
            </div>
            <input name="basic_salary" type="number" step="0.01" placeholder="Basic salary RM/month" className="rounded-lg border p-2 text-sm" />
            <SubmitButton className="rounded-lg bg-black p-2 text-sm text-white">Add employee</SubmitButton>
          </form>
        </details>
      </section>

      {/* Generate */}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Generate payslip</h2>
        {!company || (employees ?? []).length === 0 ? (
          <p className="text-sm text-neutral-500">Set up your company and add an employee first.</p>
        ) : (
          <GenerateForm
            employees={(employees ?? []).map((e) => ({ id: e.id, name: e.name }))}
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
          />
        )}
        <p className="mt-2 text-xs text-neutral-400">
          Leave EPF/SOCSO/EIS unticked for sole-prop owner drawings. Picking an account also logs
          the income with the PDF attached as proof.
        </p>
      </section>

      {/* History */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-500">History</h2>
        {(slips ?? []).length === 0 && <p className="text-sm text-neutral-500">No payslips yet.</p>}
        {(slips ?? []).map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border bg-white p-3">
            <div>
              <p className="text-sm font-medium">{MONTHS[s.period_month - 1]} {s.period_year} · {s.employees?.name}</p>
              <p className="text-xs text-neutral-500">
                Gross {money(Number(s.gross_pay))} · Net {money(Number(s.net_pay))}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {s.pdf_path && urlByPath.get(s.pdf_path) && (
                <a href={urlByPath.get(s.pdf_path) ?? "#"} target="_blank" rel="noreferrer"
                  className="rounded-lg border px-3 py-1 text-xs">
                  PDF
                </a>
              )}
              <form action={deletePayslip}>
                <input type="hidden" name="id" value={s.id} />
                <SubmitButton pendingLabel="…" className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600">
                  ✕
                </SubmitButton>
              </form>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
