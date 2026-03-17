// HRPayroll.js v1.0 — SCHEMA VERIFIED
// WP-HR-11: Payroll Export — period CSV with validation
// Location: src/components/hq/HRPayroll.js
//
// ── NO NEW TABLES — reads only from confirmed schemas ─────────────────────────
// staff_profiles:      id, full_name, preferred_name, employee_number,
//                      job_title, department, bank_name, bank_account_number,
//                      bank_branch_code, bank_account_type, tax_number
// employment_contracts:staff_profile_id, gross_salary_zar, hourly_rate_zar,
//                      salary_frequency, standard_hours_per_day,
//                      standard_days_per_week, is_active, contract_type
// timesheets:          staff_profile_id, period_start, period_end, status,
//                      total_hours, regular_hours, overtime_hours,
//                      public_holiday_hours, late_count, absent_count
// loans_stipends:      staff_profile_id, record_type, repayment_per_period,
//                      repayment_frequency, outstanding_balance, status
//                      (active loans with payroll_deduction method only)
// leave_requests:      staff_profile_id, start_date, end_date,
//                      days_requested, status, leave_type_id
// leave_types:         id, name, paid
//
// ── NO DB WRITES — export only, no payroll_runs table exists ─────────────────
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

// ─── THEME ───────────────────────────────────────────────────────────────────

const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  border: "#e0dbd2",
  muted: "#888",
  white: "#fff",
  red: "#c0392b",
  bg: "#f7f6f2",
};

const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function zar(v) {
  if (v == null || isNaN(v)) return "R 0.00";
  return `R ${Number(v).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function csvEscape(val) {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n"))
    return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCSV(rows, filename) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── VALIDATION BADGE ─────────────────────────────────────────────────────────

function ValidationBadge({ issues }) {
  if (!issues || issues.length === 0) {
    return (
      <span
        style={{
          background: "#e8f5e9",
          color: "#2e7d32",
          border: "1px solid #a5d6a7",
          borderRadius: 20,
          padding: "2px 10px",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        ✓ Valid
      </span>
    );
  }
  return (
    <span
      style={{
        background: "#fff3e0",
        color: "#e65100",
        border: "1px solid #ffcc80",
        borderRadius: 20,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      ⚠ {issues.length} warning{issues.length > 1 ? "s" : ""}
    </span>
  );
}

// ─── PERIOD SELECTOR ──────────────────────────────────────────────────────────

function PeriodSelector({ periods, selected, onSelect }) {
  if (periods.length === 0) {
    return (
      <div
        style={{
          background: "#fff8e1",
          border: "1px solid #ffe082",
          borderRadius: 4,
          padding: "14px 16px",
          fontSize: 13,
          color: "#f57f17",
        }}
      >
        ⚠ No approved or locked timesheets found. Timesheets must be at least
        admin_approved status before payroll export.
      </div>
    );
  }
  return (
    <div>
      <label
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: C.muted,
          display: "block",
          marginBottom: 6,
        }}
      >
        Select Pay Period
      </label>
      <select
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: 2,
          padding: "9px 12px",
          fontSize: 13,
          fontFamily: FONTS.body,
          background: C.white,
          color: "#333",
          outline: "none",
          minWidth: 280,
        }}
      >
        <option value="">— Select period —</option>
        {periods.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label} ({p.staffCount} staff)
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── PAYROLL ROW CALCULATION ──────────────────────────────────────────────────

function buildPayrollRow(
  staff,
  contract,
  timesheet,
  loanDeductions,
  unpaidDays,
) {
  const issues = [];

  // ── Gross Pay ──
  let grossPay = 0;
  let payBasis = "—";

  if (contract) {
    if (contract.salary_frequency === "monthly" && contract.gross_salary_zar) {
      grossPay = parseFloat(contract.gross_salary_zar);
      payBasis = "Monthly Salary";
    } else if (contract.hourly_rate_zar && timesheet) {
      const hours = parseFloat(timesheet.regular_hours || 0);
      const otHours = parseFloat(timesheet.overtime_hours || 0);
      const phHours = parseFloat(timesheet.public_holiday_hours || 0);
      grossPay =
        hours * parseFloat(contract.hourly_rate_zar) +
        otHours * parseFloat(contract.hourly_rate_zar) * 1.5 +
        phHours * parseFloat(contract.hourly_rate_zar) * 2;
      payBasis = "Hourly";
    } else {
      issues.push("No active contract rate found");
    }
  } else {
    issues.push("No active contract");
  }

  // ── Unpaid Leave Deduction ──
  let unpaidDeduction = 0;
  if (unpaidDays > 0 && contract?.gross_salary_zar) {
    const workingDaysPerMonth = (contract.standard_days_per_week || 5) * 4.33;
    const dailyRate =
      parseFloat(contract.gross_salary_zar) / workingDaysPerMonth;
    unpaidDeduction = dailyRate * unpaidDays;
  }

  // ── Loan Deductions ──
  const totalLoanDeduction = loanDeductions.reduce((sum, l) => {
    return sum + (parseFloat(l.repayment_per_period) || 0);
  }, 0);

  // ── Net Pay ──
  const totalDeductions = unpaidDeduction + totalLoanDeduction;
  const netPay = Math.max(0, grossPay - totalDeductions);

  // ── Validations ──
  if (!staff.bank_account?.account_number)
    issues.push("No bank account on file");
  if (!staff.tax_number) issues.push("No tax number on file");
  if (netPay <= 0 && grossPay > 0) issues.push("Net pay is zero or negative");

  return {
    staffId: staff.id,
    employeeNumber: staff.employee_number || "—",
    fullName: staff.full_name || staff.preferred_name || "—",
    jobTitle: staff.job_title || "—",
    department: staff.department || "—",
    payBasis,
    grossPay,
    unpaidDeduction,
    loanDeduction: totalLoanDeduction,
    totalDeductions,
    netPay,
    regularHours: timesheet ? parseFloat(timesheet.regular_hours || 0) : 0,
    overtimeHours: timesheet ? parseFloat(timesheet.overtime_hours || 0) : 0,
    phHours: timesheet ? parseFloat(timesheet.public_holiday_hours || 0) : 0,
    lateCount: timesheet ? timesheet.late_count || 0 : 0,
    absentCount: timesheet ? timesheet.absent_count || 0 : 0,
    bankName: staff.bank_account?.bank_name || "—",
    bankAccount: staff.bank_account?.account_number || "—",
    bankBranch: staff.bank_account?.branch_code || "—",
    bankAccountType: staff.bank_account?.account_type || "—",
    taxNumber: staff.tax_number || "—",
    tsStatus: timesheet?.status || "no timesheet",
    issues,
  };
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function HRPayroll({ tenantId }) {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [payrollRows, setPayrollRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [error, setError] = useState(null);
  const [showBanking, setShowBanking] = useState(false);

  // ── Load available pay periods from approved/locked timesheets ──────────────
  useEffect(() => {
    if (!tenantId) return;
    const load = async () => {
      setLoadingPeriods(true);
      const { data, error } = await supabase
        .from("timesheets")
        .select("period_start, period_end, status, staff_profile_id")
        .eq("tenant_id", tenantId)
        .in("status", ["admin_approved", "hr_approved", "locked"])
        .order("period_start", { ascending: false });

      if (!error && data) {
        // Group by period_start + period_end
        const periodMap = {};
        data.forEach((ts) => {
          const key = `${ts.period_start}__${ts.period_end}`;
          if (!periodMap[key]) {
            periodMap[key] = {
              value: key,
              label: `${formatDate(ts.period_start)} – ${formatDate(ts.period_end)}`,
              periodStart: ts.period_start,
              periodEnd: ts.period_end,
              staffCount: 0,
            };
          }
          periodMap[key].staffCount++;
        });
        setPeriods(Object.values(periodMap));
      }
      setLoadingPeriods(false);
    };
    load();
  }, [tenantId]);

  // ── Build payroll when period selected ────────────────────────────────────
  const buildPayroll = useCallback(
    async (periodKey) => {
      if (!periodKey) {
        setPayrollRows([]);
        return;
      }
      const [periodStart, periodEnd] = periodKey.split("__");
      setLoading(true);
      setError(null);

      try {
        // 1. Get all timesheets for this period
        const { data: tsData, error: tsErr } = await supabase
          .from("timesheets")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("period_start", periodStart)
          .eq("period_end", periodEnd)
          .in("status", ["admin_approved", "hr_approved", "locked"]);
        if (tsErr) throw tsErr;

        const staffIds = [
          ...new Set((tsData || []).map((t) => t.staff_profile_id)),
        ];
        if (staffIds.length === 0) {
          setPayrollRows([]);
          setLoading(false);
          return;
        }

        // 2. Staff profiles
        const { data: staffData, error: sErr } = await supabase
          .from("staff_profiles")
          .select(
            "id, full_name, preferred_name, employee_number, job_title, department, bank_account, tax_number",
          )
          .in("id", staffIds);
        if (sErr) throw sErr;

        // 3. Active contracts for these staff
        const { data: contractData, error: cErr } = await supabase
          .from("employment_contracts")
          .select(
            "staff_profile_id, gross_salary_zar, hourly_rate_zar, salary_frequency, standard_hours_per_day, standard_days_per_week, contract_type",
          )
          .in("staff_profile_id", staffIds)
          .eq("is_active", true);
        if (cErr) throw cErr;

        // 4. Active loans with payroll_deduction method
        const { data: loanData, error: lErr } = await supabase
          .from("loans_stipends")
          .select(
            "staff_profile_id, record_type, repayment_per_period, repayment_frequency, outstanding_balance, disbursed_method, status",
          )
          .in("staff_profile_id", staffIds)
          .eq("status", "active")
          .eq("disbursed_method", "payroll_deduction");
        if (lErr) throw lErr;

        // 5. Unpaid leave requests overlapping this period
        const { data: leaveData, error: lvErr } = await supabase
          .from("leave_requests")
          .select("staff_profile_id, days_requested, leave_types(name, paid)")
          .in("staff_profile_id", staffIds)
          .eq("status", "admin_approved")
          .lte("start_date", periodEnd)
          .gte("end_date", periodStart);
        if (lvErr) throw lvErr;

        // ── Build lookup maps ──
        const tsMap = {};
        (tsData || []).forEach((t) => {
          tsMap[t.staff_profile_id] = t;
        });

        const contractMap = {};
        (contractData || []).forEach((c) => {
          contractMap[c.staff_profile_id] = c;
        });

        const loanMap = {};
        (loanData || []).forEach((l) => {
          if (!loanMap[l.staff_profile_id]) loanMap[l.staff_profile_id] = [];
          loanMap[l.staff_profile_id].push(l);
        });

        // Unpaid leave days per staff
        const unpaidMap = {};
        (leaveData || []).forEach((lr) => {
          if (lr.leave_types?.paid === false) {
            unpaidMap[lr.staff_profile_id] =
              (unpaidMap[lr.staff_profile_id] || 0) +
              parseFloat(lr.days_requested || 0);
          }
        });

        // ── Build rows ──
        const rows = (staffData || []).map((staff) =>
          buildPayrollRow(
            staff,
            contractMap[staff.id] || null,
            tsMap[staff.id] || null,
            loanMap[staff.id] || [],
            unpaidMap[staff.id] || 0,
          ),
        );

        // Sort: warnings first, then alphabetical
        rows.sort((a, b) => {
          if (a.issues.length > 0 && b.issues.length === 0) return -1;
          if (a.issues.length === 0 && b.issues.length > 0) return 1;
          return a.fullName.localeCompare(b.fullName);
        });

        setPayrollRows(rows);
      } catch (e) {
        console.error("HRPayroll build error:", e);
        setError(e.message || "Failed to build payroll.");
      } finally {
        setLoading(false);
      }
    },
    [tenantId],
  );

  useEffect(() => {
    buildPayroll(selectedPeriod);
  }, [selectedPeriod, buildPayroll]);

  // ── CSV Export ───────────────────────────────────────────────────────────────
  function handleExport() {
    const period = periods.find((p) => p.value === selectedPeriod);
    const filename = `payroll_${period?.periodStart || "export"}_to_${period?.periodEnd || ""}.csv`;

    const headers = [
      "Employee Number",
      "Full Name",
      "Job Title",
      "Department",
      "Pay Basis",
      "Regular Hours",
      "Overtime Hours",
      "PH Hours",
      "Late Count",
      "Absent Count",
      "Gross Pay (ZAR)",
      "Unpaid Leave Deduction (ZAR)",
      "Loan Deduction (ZAR)",
      "Total Deductions (ZAR)",
      "Net Pay (ZAR)",
      ...(showBanking
        ? [
            "Bank Name",
            "Account Number",
            "Branch Code",
            "Account Type",
            "Tax Number",
          ]
        : []),
      "Timesheet Status",
      "Warnings",
    ];

    const dataRows = payrollRows.map((r) => [
      r.employeeNumber,
      r.fullName,
      r.jobTitle,
      r.department,
      r.payBasis,
      r.regularHours,
      r.overtimeHours,
      r.phHours,
      r.lateCount,
      r.absentCount,
      r.grossPay.toFixed(2),
      r.unpaidDeduction.toFixed(2),
      r.loanDeduction.toFixed(2),
      r.totalDeductions.toFixed(2),
      r.netPay.toFixed(2),
      ...(showBanking
        ? [
            r.bankName,
            r.bankAccount,
            r.bankBranch,
            r.bankAccountType,
            r.taxNumber,
          ]
        : []),
      r.tsStatus,
      r.issues.join(" | "),
    ]);

    downloadCSV([headers, ...dataRows], filename);
  }

  // ── Summary totals ────────────────────────────────────────────────────────
  const totalGross = payrollRows.reduce((s, r) => s + r.grossPay, 0);
  const totalDeductions = payrollRows.reduce(
    (s, r) => s + r.totalDeductions,
    0,
  );
  const totalNet = payrollRows.reduce((s, r) => s + r.netPay, 0);
  const warningCount = payrollRows.filter((r) => r.issues.length > 0).length;
  const selectedPeriodObj = periods.find((p) => p.value === selectedPeriod);

  return (
    <div style={{ fontFamily: FONTS.body }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontFamily: FONTS.heading,
            fontSize: 22,
            color: C.green,
            margin: "0 0 6px",
          }}
        >
          Payroll Export
        </h2>
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
          Generates a payroll CSV from approved timesheets, active contracts,
          loan deductions and unpaid leave. No data is written to the database —
          export only.
        </p>
      </div>

      {/* Period selector */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          padding: "20px 22px",
          marginBottom: 20,
        }}
      >
        {loadingPeriods ? (
          <div style={{ color: C.muted, fontSize: 13 }}>
            Loading pay periods…
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <PeriodSelector
              periods={periods}
              selected={selectedPeriod}
              onSelect={setSelectedPeriod}
            />
            {selectedPeriod && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "#555",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={showBanking}
                  onChange={(e) => setShowBanking(e.target.checked)}
                  style={{ width: 14, height: 14 }}
                />
                Include banking details in export
              </label>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: "#fce4ec",
            border: "1px solid #ef9a9a",
            borderRadius: 4,
            padding: "10px 14px",
            color: C.red,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div
          style={{
            color: C.muted,
            textAlign: "center",
            padding: 48,
            fontSize: 13,
          }}
        >
          Building payroll…
        </div>
      )}

      {/* Payroll preview */}
      {!loading && payrollRows.length > 0 && (
        <>
          {/* Summary tiles */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {[
              {
                label: "Staff on Payroll",
                value: payrollRows.length,
                color: "#1565c0",
              },
              { label: "Total Gross", value: zar(totalGross), color: C.green },
              {
                label: "Total Deductions",
                value: zar(totalDeductions),
                color: warningCount > 0 ? "#e65100" : C.muted,
              },
              { label: "Total Net Pay", value: zar(totalNet), color: C.green },
              {
                label: "Warnings",
                value: warningCount,
                color: warningCount > 0 ? C.red : C.muted,
              },
            ].map((tile) => (
              <div
                key={tile.label}
                style={{
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderTop: `3px solid ${tile.color}`,
                  borderRadius: 2,
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: C.muted,
                    marginBottom: 4,
                  }}
                >
                  {tile.label}
                </div>
                <div
                  style={{
                    fontFamily: FONTS.heading,
                    fontSize: typeof tile.value === "number" ? 26 : 18,
                    color: tile.color,
                    lineHeight: 1.2,
                  }}
                >
                  {tile.value}
                </div>
              </div>
            ))}
          </div>

          {/* Warnings panel */}
          {warningCount > 0 && (
            <div
              style={{
                background: "#fff8e1",
                border: "1px solid #ffe082",
                borderRadius: 4,
                padding: "14px 16px",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#f57f17",
                  marginBottom: 8,
                }}
              >
                ⚠ {warningCount} staff member{warningCount > 1 ? "s" : ""} with
                warnings — review before exporting
              </div>
              {payrollRows
                .filter((r) => r.issues.length > 0)
                .map((r) => (
                  <div
                    key={r.staffId}
                    style={{ fontSize: 12, color: "#555", marginBottom: 4 }}
                  >
                    <strong style={{ color: "#333" }}>{r.fullName}</strong> —{" "}
                    {r.issues.join(" · ")}
                  </div>
                ))}
            </div>
          )}

          {/* Export button */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 12, color: C.muted }}>
              Period:{" "}
              <strong style={{ color: "#333" }}>
                {selectedPeriodObj?.label}
              </strong>
            </div>
            <button
              onClick={handleExport}
              style={{
                padding: "10px 28px",
                background: C.green,
                color: C.white,
                border: "none",
                borderRadius: 2,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: FONTS.body,
                letterSpacing: "0.1em",
              }}
            >
              ↓ Export CSV
            </button>
          </div>

          {/* Preview table */}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
                fontFamily: FONTS.body,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: C.bg,
                    borderBottom: `2px solid ${C.border}`,
                  }}
                >
                  {[
                    "",
                    "Staff",
                    "Emp #",
                    "Pay Basis",
                    "Reg Hrs",
                    "OT Hrs",
                    "Gross Pay",
                    "Deductions",
                    "Net Pay",
                    "Status",
                    "",
                  ].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        padding: "9px 10px",
                        textAlign: "left",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: C.muted,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payrollRows.map((r) => (
                  <tr
                    key={r.staffId}
                    style={{
                      borderBottom: `1px solid ${C.border}`,
                      background:
                        r.issues.length > 0 ? "#fffbf0" : "transparent",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        r.issues.length > 0 ? "#fff8e1" : C.bg)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        r.issues.length > 0 ? "#fffbf0" : "transparent")
                    }
                  >
                    <td style={{ padding: "9px 10px" }}>
                      <ValidationBadge issues={r.issues} />
                    </td>
                    <td
                      style={{
                        padding: "9px 10px",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <div>{r.fullName}</div>
                      <div
                        style={{
                          fontSize: 11,
                          color: C.muted,
                          fontWeight: 400,
                        }}
                      >
                        {r.department}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "9px 10px",
                        color: C.muted,
                        fontSize: 11,
                      }}
                    >
                      {r.employeeNumber}
                    </td>
                    <td style={{ padding: "9px 10px", fontSize: 11 }}>
                      <span
                        style={{
                          background: "#f5f5f5",
                          border: "1px solid #ddd",
                          borderRadius: 20,
                          padding: "2px 8px",
                          color: "#555",
                          fontWeight: 600,
                        }}
                      >
                        {r.payBasis}
                      </span>
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "right" }}>
                      {r.regularHours}h
                    </td>
                    <td
                      style={{
                        padding: "9px 10px",
                        textAlign: "right",
                        color: r.overtimeHours > 0 ? "#1565c0" : C.muted,
                      }}
                    >
                      {r.overtimeHours > 0 ? `${r.overtimeHours}h` : "—"}
                    </td>
                    <td
                      style={{
                        padding: "9px 10px",
                        textAlign: "right",
                        fontWeight: 600,
                        color: C.green,
                      }}
                    >
                      {zar(r.grossPay)}
                    </td>
                    <td
                      style={{
                        padding: "9px 10px",
                        textAlign: "right",
                        color: r.totalDeductions > 0 ? C.red : C.muted,
                      }}
                    >
                      {r.totalDeductions > 0 ? (
                        <div>
                          <div>{zar(r.totalDeductions)}</div>
                          <div style={{ fontSize: 10, color: C.muted }}>
                            {r.unpaidDeduction > 0
                              ? `Leave: ${zar(r.unpaidDeduction)}`
                              : ""}
                            {r.unpaidDeduction > 0 && r.loanDeduction > 0
                              ? " · "
                              : ""}
                            {r.loanDeduction > 0
                              ? `Loan: ${zar(r.loanDeduction)}`
                              : ""}
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td
                      style={{
                        padding: "9px 10px",
                        textAlign: "right",
                        fontWeight: 700,
                        color: r.netPay > 0 ? C.green : C.red,
                        fontSize: 13,
                      }}
                    >
                      {zar(r.netPay)}
                    </td>
                    <td style={{ padding: "9px 10px" }}>
                      <span
                        style={{
                          background:
                            r.tsStatus === "locked" ? "#e8f5e9" : "#fff8e1",
                          color:
                            r.tsStatus === "locked" ? "#2e7d32" : "#f57f17",
                          border: `1px solid ${r.tsStatus === "locked" ? "#a5d6a7" : "#ffe082"}`,
                          borderRadius: 20,
                          padding: "2px 8px",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {r.tsStatus.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={{ padding: "9px 10px" }}>
                      {showBanking && (
                        <div
                          style={{
                            fontSize: 10,
                            color: C.muted,
                            lineHeight: 1.5,
                          }}
                        >
                          <div>{r.bankName}</div>
                          <div>{r.bankAccount}</div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr
                  style={{
                    background: C.bg,
                    borderTop: `2px solid ${C.border}`,
                  }}
                >
                  <td
                    colSpan={6}
                    style={{
                      padding: "10px",
                      fontWeight: 700,
                      fontSize: 12,
                      color: C.green,
                    }}
                  >
                    TOTALS
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      textAlign: "right",
                      fontWeight: 700,
                      color: C.green,
                    }}
                  >
                    {zar(totalGross)}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      textAlign: "right",
                      fontWeight: 700,
                      color: C.red,
                    }}
                  >
                    {zar(totalDeductions)}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      textAlign: "right",
                      fontWeight: 800,
                      color: C.green,
                      fontSize: 14,
                    }}
                  >
                    {zar(totalNet)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !selectedPeriod && periods.length > 0 && (
        <div
          style={{
            color: C.muted,
            textAlign: "center",
            padding: 60,
            fontSize: 13,
          }}
        >
          Select a pay period above to preview and export payroll.
        </div>
      )}
    </div>
  );
}
