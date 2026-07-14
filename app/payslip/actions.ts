"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { calcDeductions } from "@/lib/deductions";
import { renderPayslipPdf } from "@/lib/payslip-pdf";

function num(v: FormDataEntryValue | null): number {
  return Number(v ?? 0) || 0;
}
function str(v: FormDataEntryValue | null): string {
  return (v ?? "").toString().trim();
}
const r2 = (n: number) => Math.round(n * 100) / 100;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Upsert the single company (sole proprietorship = one row).
export async function saveCompany(form: FormData) {
  const supabase = db();
  const row = {
    name: str(form.get("name")),
    ssm_no: str(form.get("ssm_no")),
    address: str(form.get("address")),
    business_type: str(form.get("business_type")) || null,
  };
  if (!row.name || !row.ssm_no) return;
  const { data: existing } = await supabase.from("companies").select("id").limit(1).single();
  if (existing) await supabase.from("companies").update(row).eq("id", existing.id);
  else await supabase.from("companies").insert(row);
  revalidatePath("/payslip");
}

export async function saveEmployee(form: FormData) {
  const supabase = db();
  const { data: company } = await supabase.from("companies").select("id").limit(1).single();
  if (!company) return;
  const id = str(form.get("id"));
  const row = {
    company_id: company.id,
    name: str(form.get("name")),
    ic_no: str(form.get("ic_no")) || null,
    epf_no: str(form.get("epf_no")) || null,
    socso_no: str(form.get("socso_no")) || null,
    bank_name: str(form.get("bank_name")) || null,
    bank_account: str(form.get("bank_account")) || null,
    designation: str(form.get("designation")) || null,
    basic_salary: num(form.get("basic_salary")),
  };
  if (!row.name) return;
  if (id) await supabase.from("employees").update(row).eq("id", id);
  else await supabase.from("employees").insert(row);
  revalidatePath("/payslip");
}

// Delete a payslip: remove its PDF from storage + any Files/receipt entries
// pointing at it, then the row. A linked income transaction (if you logged one)
// is left alone — delete that separately from the Home Recent list if needed.
export async function deletePayslip(form: FormData) {
  const id = str(form.get("id"));
  if (!id) return;
  const supabase = db();
  const { data: slip } = await supabase.from("payslips").select("pdf_path").eq("id", id).single();
  if (slip?.pdf_path) {
    await supabase.storage.from("attachments").remove([slip.pdf_path]);
    await supabase.from("attachments").delete().eq("storage_path", slip.pdf_path);
  }
  await supabase.from("payslips").delete().eq("id", id);
  revalidatePath("/payslip");
  revalidatePath("/files");
}

// Deactivate (not hard-delete) so past payslips keep their employee reference.
export async function deactivateEmployee(form: FormData) {
  const id = str(form.get("id"));
  if (!id) return;
  await db().from("employees").update({ is_active: false }).eq("id", id);
  revalidatePath("/payslip");
}

// Generate: calc -> save row -> render PDF -> store -> optional income tx + proof link.
export async function generatePayslip(form: FormData): Promise<{ ok: boolean; msg: string }> {
  const supabase = db();
  const employee_id = str(form.get("employee_id"));
  const period_year = num(form.get("year"));
  const period_month = num(form.get("month"));
  if (!employee_id || !period_year || !period_month) return { ok: false, msg: "Pick employee and period." };

  const [{ data: emp }, { data: company }] = await Promise.all([
    supabase.from("employees").select("*").eq("id", employee_id).single(),
    supabase.from("companies").select("*").limit(1).single(),
  ]);
  if (!emp || !company) return { ok: false, msg: "Set up company and employee first." };

  const allowances = num(form.get("allowances"));
  const overtime = num(form.get("overtime"));
  const bonus = num(form.get("bonus"));
  const other_deductions = num(form.get("other_deductions"));
  const basic = Number(emp.basic_salary);
  const gross = r2(basic + allowances + overtime + bonus);

  const ded = calcDeductions({
    grossWage: basic + allowances, // OT/bonus not EPF-subject in this simplified engine
    ageOver60: emp.age_over_60,
    isMalaysian: emp.is_malaysian,
    applyEpf: form.get("apply_epf") === "on",
    applySocso: form.get("apply_socso") === "on",
    applyEis: form.get("apply_eis") === "on",
  });
  const totalDed = r2(ded.epfEmployee + ded.socsoEmployee + ded.eisEmployee + ded.pcb + other_deductions);
  const net = r2(gross - totalDed);

  const { data: slip, error } = await supabase.from("payslips").insert({
    employee_id, company_id: company.id, period_year, period_month,
    basic_salary: basic, allowances, overtime, bonus, gross_pay: gross,
    epf_employee: ded.epfEmployee, epf_employer: ded.epfEmployer,
    socso_employee: ded.socsoEmployee, socso_employer: ded.socsoEmployer,
    eis_employee: ded.eisEmployee, eis_employer: ded.eisEmployer,
    pcb: ded.pcb, other_deductions, total_deductions: totalDed, net_pay: net,
  }).select("id").single();
  if (error) {
    return { ok: false, msg: error.message.includes("duplicate") || error.message.includes("unique")
      ? "A payslip for that employee + month already exists."
      : `Save failed: ${error.message}` };
  }

  // Render + store the PDF in the attachments bucket.
  const pdf = await renderPayslipPdf({
    company: { name: company.name, ssm_no: company.ssm_no, address: company.address },
    employee: {
      name: emp.name, ic_no: emp.ic_no ?? "", designation: emp.designation ?? "",
      epf_no: emp.epf_no ?? undefined, socso_no: emp.socso_no ?? undefined,
      bank_name: emp.bank_name ?? undefined, bank_account: emp.bank_account ?? undefined,
    },
    period: { year: period_year, month: period_month },
    earnings: { basic, allowances, overtime, bonus, gross },
    deductions: {
      epfEe: ded.epfEmployee, socsoEe: ded.socsoEmployee, eisEe: ded.eisEmployee,
      pcb: ded.pcb, other: other_deductions, total: totalDed,
    },
    employer: { epfEr: ded.epfEmployer, socsoEr: ded.socsoEmployer, eisEr: ded.eisEmployer },
    net,
  });
  const pdf_path = `career/payslip-${period_year}-${String(period_month).padStart(2, "0")}-${slip.id.slice(0, 8)}.pdf`;
  const up = await supabase.storage.from("attachments").upload(pdf_path, pdf, { contentType: "application/pdf" });
  if (!up.error) await supabase.from("payslips").update({ pdf_path }).eq("id", slip.id);

  const periodLabel = `${MONTHS[period_month - 1]} ${period_year}`;

  // File it in the Files vault too (career area) so it's findable there.
  await supabase.from("attachments").insert({
    storage_path: pdf_path, life_area: "career",
    note: `Payslip ${periodLabel} — ${emp.name}`,
  });

  // Optional: log the income transaction with the payslip as proof.
  const account_id = str(form.get("account_id")) || null;
  if (account_id) {
    const { data: tx } = await supabase.from("transactions").insert({
      amount: net, account_id, category: "Salary",
      note: `Payslip ${periodLabel}`, life_area: "money",
      occurred_on: str(form.get("pay_date")) || new Date().toISOString().slice(0, 10),
    }).select("id").single();
    if (tx) {
      await supabase.from("attachments").insert({
        storage_path: pdf_path, life_area: "money",
        note: `Payslip ${periodLabel}`, linked_table: "transactions", linked_id: tx.id,
      });
      const { data: acc } = await supabase.from("accounts").select("balance").eq("id", account_id).single();
      if (acc) await supabase.from("accounts").update({ balance: Number(acc.balance) + net }).eq("id", account_id);
    }
  }

  revalidatePath("/payslip");
  revalidatePath("/");
  return { ok: true, msg: `Payslip ${periodLabel} generated — net ${net.toFixed(2)}.` };
}
