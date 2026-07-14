import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// Brand palette
const INK = "#0F172A";       // slate-900
const SUB = "#475569";       // slate-600
const MUTED = "#94A3B8";     // slate-400
const HAIR = "#E2E8F0";      // slate-200
const SOFT = "#F8FAFC";      // slate-50
const ACCENT = "#4F46E5";    // indigo-600
const ACCENT_SOFT = "#EEF2FF"; // indigo-50

const s = StyleSheet.create({
  page: { padding: 0, fontSize: 10, fontFamily: "Helvetica", color: INK },

  // Top brand strip
  brandStrip: { height: 6, backgroundColor: ACCENT },

  // Header block
  header: { paddingHorizontal: 40, paddingTop: 28, paddingBottom: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brandWrap: { flexDirection: "column" },
  brandName: { fontSize: 16, fontWeight: 700, letterSpacing: 0.3 },
  brandSub: { fontSize: 9, color: SUB, marginTop: 2 },
  brandAddr: { fontSize: 9, color: SUB, marginTop: 2, maxWidth: 240 },

  docMeta: { alignItems: "flex-end" },
  docTitle: { fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: 1.5 },
  docPeriod: { fontSize: 22, fontWeight: 700, marginTop: 2, color: INK },
  docRef: { fontSize: 8, color: MUTED, marginTop: 4 },

  // Divider
  divider: { height: 1, backgroundColor: HAIR, marginHorizontal: 40 },

  // Body
  body: { padding: 40, paddingTop: 22 },

  // Info grid (two columns)
  grid: { flexDirection: "row", gap: 18, marginBottom: 22 },
  col: { flex: 1 },
  blockLabel: { fontSize: 8, color: MUTED, letterSpacing: 1.2, fontWeight: 700, marginBottom: 6 },
  blockBox: { backgroundColor: SOFT, borderRadius: 6, padding: 12 },
  empName: { fontSize: 13, fontWeight: 700, marginBottom: 2 },
  empMeta: { fontSize: 9, color: SUB, marginBottom: 1 },
  kv: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 },
  kvKey: { color: SUB, fontSize: 9 },
  kvVal: { fontSize: 9 },

  // Section title
  sectionTitle: { fontSize: 9, color: MUTED, letterSpacing: 1.2, fontWeight: 700, marginBottom: 8, marginTop: 4 },

  // Table-like rows
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: HAIR },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 10 },
  rowValue: { fontSize: 10 },
  rowBold: { fontSize: 10, fontWeight: 700 },

  subtotal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: HAIR },
  subtotalLabel: { fontSize: 10, fontWeight: 700 },
  subtotalValue: { fontSize: 10, fontWeight: 700 },

  // Net pay hero
  netBand: { marginTop: 22, backgroundColor: ACCENT, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  netLabel: { fontSize: 9, color: ACCENT_SOFT, letterSpacing: 1.5, fontWeight: 700 },
  netLabelSub: { fontSize: 9, color: ACCENT_SOFT, marginTop: 2 },
  netValue: { fontSize: 22, color: "#FFFFFF", fontWeight: 700 },

  // Employer contributions strip
  employerStrip: { marginTop: 18, backgroundColor: SOFT, borderRadius: 6, padding: 12, flexDirection: "row", justifyContent: "space-between" },
  employerCell: { alignItems: "center", flex: 1 },
  employerLabel: { fontSize: 8, color: MUTED, letterSpacing: 1, fontWeight: 700 },
  employerValue: { fontSize: 11, marginTop: 3, fontWeight: 700 },

  // Footer
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerLeft: { fontSize: 8, color: MUTED, maxWidth: 360 },
  footerRight: { fontSize: 8, color: MUTED },
});

export type PdfData = {
  company: { name: string; ssm_no: string; address: string };
  employee: { name: string; ic_no: string; designation: string; epf_no?: string; socso_no?: string; bank_name?: string; bank_account?: string };
  period: { year: number; month: number };
  earnings: { basic: number; allowances: number; overtime: number; bonus: number; gross: number };
  deductions: { epfEe: number; socsoEe: number; eisEe: number; pcb: number; other: number; total: number };
  employer: { epfEr: number; socsoEr: number; eisEr: number };
  net: number;
};

// Server-side render to a Buffer (used by the generate action to store the PDF).
export async function renderPayslipPdf(d: PdfData): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  return renderToBuffer(<PayslipDoc d={d} />);
}

const RM = (n: number) => `RM ${Number(n).toFixed(2)}`;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function PayslipDoc({ d }: { d: PdfData }) {
  const periodLabel = `${MONTHS[d.period.month - 1]} ${d.period.year}`;
  const ref = `${d.period.year}${String(d.period.month).padStart(2, "0")}-${(d.employee.name || "X").split(/\s+/).map(w => w[0]).join("").slice(0, 3).toUpperCase()}`;

  const anyDeduction = d.deductions.total > 0 || d.deductions.epfEe > 0 || d.deductions.socsoEe > 0 || d.deductions.eisEe > 0 || d.deductions.other > 0;
  const docTitle = anyDeduction ? "PAYSLIP" : "STATEMENT OF MONTHLY DRAWINGS";

  const earningsRows = [
    { label: "Basic Salary", value: d.earnings.basic },
    d.earnings.allowances > 0 && { label: "Allowances", value: d.earnings.allowances },
    d.earnings.overtime > 0 && { label: "Overtime", value: d.earnings.overtime },
    d.earnings.bonus > 0 && { label: "Bonus", value: d.earnings.bonus },
  ].filter(Boolean) as { label: string; value: number }[];

  const deductionRows = [
    d.deductions.epfEe > 0 && { label: "EPF (Employee)", value: d.deductions.epfEe },
    d.deductions.socsoEe > 0 && { label: "SOCSO (Employee)", value: d.deductions.socsoEe },
    d.deductions.eisEe > 0 && { label: "EIS (Employee)", value: d.deductions.eisEe },
    d.deductions.pcb > 0 && { label: "PCB", value: d.deductions.pcb },
    d.deductions.other > 0 && { label: "Other", value: d.deductions.other },
  ].filter(Boolean) as { label: string; value: number }[];

  const anyEmployer = d.employer.epfEr > 0 || d.employer.socsoEr > 0 || d.employer.eisEr > 0;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.brandStrip} />

        <View style={s.header}>
          <View style={s.brandWrap}>
            <Text style={s.brandName}>{d.company.name}</Text>
            <Text style={s.brandSub}>SSM {d.company.ssm_no}</Text>
            <Text style={s.brandAddr}>{d.company.address}</Text>
          </View>
          <View style={s.docMeta}>
            <Text style={s.docTitle}>{docTitle}</Text>
            <Text style={s.docPeriod}>{periodLabel}</Text>
            <Text style={s.docRef}>Ref · {ref}</Text>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.body}>
          {/* Info grid: employee + payment */}
          <View style={s.grid}>
            <View style={s.col}>
              <Text style={s.blockLabel}>EMPLOYEE</Text>
              <View style={s.blockBox}>
                <Text style={s.empName}>{d.employee.name}</Text>
                {d.employee.designation ? <Text style={s.empMeta}>{d.employee.designation}</Text> : null}
                <View style={{ height: 6 }} />
                {d.employee.ic_no ? <View style={s.kv}><Text style={s.kvKey}>IC No</Text><Text style={s.kvVal}>{d.employee.ic_no}</Text></View> : null}
                {d.employee.epf_no ? <View style={s.kv}><Text style={s.kvKey}>EPF No</Text><Text style={s.kvVal}>{d.employee.epf_no}</Text></View> : null}
                {d.employee.socso_no ? <View style={s.kv}><Text style={s.kvKey}>SOCSO No</Text><Text style={s.kvVal}>{d.employee.socso_no}</Text></View> : null}
              </View>
            </View>
            <View style={s.col}>
              <Text style={s.blockLabel}>PAYMENT</Text>
              <View style={s.blockBox}>
                <View style={s.kv}><Text style={s.kvKey}>Pay Period</Text><Text style={s.kvVal}>{periodLabel}</Text></View>
                <View style={s.kv}><Text style={s.kvKey}>Pay Date</Text><Text style={s.kvVal}>{new Date().toISOString().slice(0, 10)}</Text></View>
                {d.employee.bank_name ? <View style={s.kv}><Text style={s.kvKey}>Bank</Text><Text style={s.kvVal}>{d.employee.bank_name}</Text></View> : null}
                {d.employee.bank_account ? <View style={s.kv}><Text style={s.kvKey}>Account</Text><Text style={s.kvVal}>{d.employee.bank_account}</Text></View> : null}
              </View>
            </View>
          </View>

          {/* Earnings */}
          <Text style={s.sectionTitle}>EARNINGS</Text>
          {earningsRows.map((r, i) => (
            <View key={r.label} style={[s.row, i === earningsRows.length - 1 ? s.rowLast : {}]}>
              <Text style={s.rowLabel}>{r.label}</Text>
              <Text style={s.rowValue}>{RM(r.value)}</Text>
            </View>
          ))}
          <View style={s.subtotal}>
            <Text style={s.subtotalLabel}>Gross Earnings</Text>
            <Text style={s.subtotalValue}>{RM(d.earnings.gross)}</Text>
          </View>

          {/* Deductions */}
          {deductionRows.length > 0 && (
            <>
              <View style={{ height: 14 }} />
              <Text style={s.sectionTitle}>DEDUCTIONS</Text>
              {deductionRows.map((r, i) => (
                <View key={r.label} style={[s.row, i === deductionRows.length - 1 ? s.rowLast : {}]}>
                  <Text style={s.rowLabel}>{r.label}</Text>
                  <Text style={s.rowValue}>- {RM(r.value)}</Text>
                </View>
              ))}
              <View style={s.subtotal}>
                <Text style={s.subtotalLabel}>Total Deductions</Text>
                <Text style={s.subtotalValue}>- {RM(d.deductions.total)}</Text>
              </View>
            </>
          )}

          {/* Net Pay hero */}
          <View style={s.netBand}>
            <View>
              <Text style={s.netLabel}>NET {anyDeduction ? "PAY" : "DRAWINGS"}</Text>
              <Text style={s.netLabelSub}>{periodLabel}</Text>
            </View>
            <Text style={s.netValue}>{RM(d.net)}</Text>
          </View>

          {/* Employer contributions — only show when relevant */}
          {anyEmployer && (
            <>
              <View style={{ height: 6 }} />
              <View style={s.employerStrip}>
                <View style={s.employerCell}>
                  <Text style={s.employerLabel}>EPF (ER)</Text>
                  <Text style={s.employerValue}>{RM(d.employer.epfEr)}</Text>
                </View>
                <View style={s.employerCell}>
                  <Text style={s.employerLabel}>SOCSO (ER)</Text>
                  <Text style={s.employerValue}>{RM(d.employer.socsoEr)}</Text>
                </View>
                <View style={s.employerCell}>
                  <Text style={s.employerLabel}>EIS (ER)</Text>
                  <Text style={s.employerValue}>{RM(d.employer.eisEr)}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerLeft}>
            {anyDeduction
              ? "This is a computer-generated payslip and does not require a signature."
              : "Sole proprietorship — owner's monthly drawings. No statutory deductions applicable. This document is computer-generated."}
          </Text>
          <Text style={s.footerRight}>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
}
