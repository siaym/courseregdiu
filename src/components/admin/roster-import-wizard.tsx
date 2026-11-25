"use client";

import * as React from "react";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Ban,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  inspectRosterWorkbookAction,
  parseRosterWorksheetAction,
  previewRosterCommitAction,
  commitRosterImportAction,
  type AssignmentStrategyMode,
  type RosterCommitMode,
  type RosterCommitPreview,
} from "@/app/admin/import/actions";
import {
  revalidateParsedRosterRows,
  type ParsedRosterRow,
  type RosterColumnKey,
} from "@/lib/import/roster-revalidator";
import type {
  DepartmentRow,
  RosterImportRow,
  SemesterRow,
} from "@/lib/admin/admin-service";

interface RosterImportWizardProps {
  semesters: SemesterRow[];
  departments: DepartmentRow[];
  recentImports: RosterImportRow[];
}

const STEPS = [
  "1. Upload File",
  "2. Select Worksheet",
  "3. Map Columns",
  "4. Semester & Dept",
  "5. Parse & Validate",
  "6. Correct Exceptions",
  "7. Assignment Strategy",
  "8. Preview Affected",
  "9. Confirm Import",
  "10. Import Result",
] as const;

const COLUMN_FIELDS: { key: RosterColumnKey; label: string }[] = [
  { key: "semester_code", label: "Semester Code / Batch" },
  { key: "serial_number", label: "SL" },
  { key: "advisor_name", label: "Adviser Name" },
  { key: "designation", label: "Designation" },
  { key: "student_id_range_raw", label: "From ID - To ID" },
  { key: "room_number", label: "Room Number" },
  { key: "schedule", label: "Schedule" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
];

export function RosterImportWizard({
  semesters,
  departments,
  recentImports,
}: RosterImportWizardProps) {
  const [step, setStep] = React.useState<number>(1);
  const [file, setFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [worksheets, setWorksheets] = React.useState<string[]>([]);
  const [suggestedWorksheet, setSuggestedWorksheet] = React.useState<string | null>(null);
  const [selectedWorksheet, setSelectedWorksheet] = React.useState<string>("");

  const [semesterId, setSemesterId] = React.useState<string>(
    semesters.find((s) => s.is_active)?.id || semesters[0]?.id || ""
  );
  const [departmentCode, setDepartmentCode] = React.useState<string>(departments[0]?.code || "");

  const [headers, setHeaders] = React.useState<{ colIndex: number; colLetter: string; label: string }[]>([]);
  const [columnMapping, setColumnMapping] = React.useState<Partial<Record<RosterColumnKey, number>>>({});
  const [rows, setRows] = React.useState<ParsedRosterRow[]>([]);

  const [assignmentMode, setAssignmentMode] = React.useState<AssignmentStrategyMode>("range");
  const [commitMode, setCommitMode] = React.useState<RosterCommitMode>("add_only");
  const [preview, setPreview] = React.useState<RosterCommitPreview | null>(null);

  const [allRuleConfirmed, setAllRuleConfirmed] = React.useState(false);
  const [replaceConfirmed, setReplaceConfirmed] = React.useState(false);
  const [commitResult, setCommitResult] = React.useState<{
    importBatchId: string;
    advisorsProcessed: number;
    assignmentsCreated: number;
  } | null>(null);

  const selectedSemesterObj = semesters.find((s) => s.id === semesterId);

  const handleFileSelect = (chosen: File | null) => {
    setError(null);
    if (!chosen) return;
    const lower = chosen.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".csv")) {
      setError("Only .xlsx and .csv files are supported.");
      return;
    }
    if (chosen.size > 10 * 1024 * 1024) {
      setError("File exceeds 10 MB limit.");
      return;
    }
    setFile(chosen);
  };

  const handleInspectFile = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    if (selectedSemesterObj) {
      fd.append(
        "targetSemesterName",
        selectedSemesterObj.name || `${selectedSemesterObj.season} ${selectedSemesterObj.year}`
      );
    }

    const res = await inspectRosterWorkbookAction(fd);
    setLoading(false);
    if (!res.success || !res.data) {
      setError(res.error || "Failed to inspect workbook.");
      return;
    }

    setWorksheets(res.data.worksheets);
    setSuggestedWorksheet(res.data.suggestedWorksheet);
    setSelectedWorksheet(res.data.suggestedWorksheet || res.data.worksheets[0] || "");
    setStep(2);
  };

  const handleParseWorksheet = async (overrideMapping?: Partial<Record<RosterColumnKey, number>>, targetStep = 3) => {
    if (!file || !selectedWorksheet) return;
    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("worksheetName", selectedWorksheet);
    if (overrideMapping) {
      fd.append("columnMapping", JSON.stringify(overrideMapping));
    }
    if (selectedSemesterObj?.code) {
      fd.append("semesterCode", selectedSemesterObj.code);
    }

    const res = await parseRosterWorksheetAction(fd);
    setLoading(false);
    if (!res.success || !res.data) {
      setError(res.error || "Failed to parse worksheet.");
      return;
    }

    setHeaders(res.data.headers);
    setColumnMapping(res.data.columnMapping);
    setRows(res.data.rows);
    setStep(targetStep);
  };

  const handleRowEdit = (
    rowId: string,
    field: "advisorName" | "email" | "batchLabel" | "studentIdRangeRaw" | "phone" | "roomNumber" | "schedule",
    value: string
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r))
    );
  };

  const handleToggleExclude = (rowId: string) => {
    setRows((prev) =>
      revalidateParsedRosterRows(
        prev.map((r) => (r.rowId === rowId ? { ...r, excluded: !r.excluded } : r))
      )
    );
  };

  const handleRevalidate = () => {
    setRows((prev) => revalidateParsedRosterRows(prev));
  };

  const handleRunPreview = async () => {
    if (!semesterId) {
      setError("Please select a target semester.");
      return;
    }
    setLoading(true);
    setError(null);

    const revalidated = revalidateParsedRosterRows(rows);
    setRows(revalidated);

    const res = await previewRosterCommitAction({
      rows: revalidated,
      semesterId,
      departmentCode: departmentCode || undefined,
      assignmentMode,
      commitMode,
    });

    setLoading(false);
    if (!res.success || !res.data) {
      setError(res.error || "Failed to generate import preview.");
      return;
    }

    setPreview(res.data);
    setStep(8);
  };

  const handleCommit = async () => {
    if (!file || !preview) return;
    setLoading(true);
    setError(null);

    const res = await commitRosterImportAction({
      fileName: file.name,
      worksheetName: selectedWorksheet,
      semesterId,
      departmentCode: departmentCode || undefined,
      assignmentMode,
      commitMode,
      rows,
      matchedStudents: preview.matchedStudents,
      replaceConfirmed,
      allRuleConfirmed,
    });

    setLoading(false);
    if (!res.success || !res.data) {
      setError(res.error || "Import commit failed.");
      return;
    }

    setCommitResult(res.data);
    setStep(10);
  };

  const counts = React.useMemo(() => {
    return {
      valid: rows.filter((r) => r.validationStatus === "valid").length,
      warning: rows.filter((r) => r.validationStatus === "warning").length,
      duplicate: rows.filter((r) => r.validationStatus === "duplicate").length,
      needsReview: rows.filter((r) => r.validationStatus === "needs_review").length,
      error: rows.filter((r) => r.validationStatus === "error").length,
      excluded: rows.filter((r) => r.validationStatus === "excluded").length,
    };
  }, [rows]);

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto py-2">
      {/* Header */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[#062822] border border-[#064e3b] text-[#10b981]">
              <FileSpreadsheet className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Advisor Roster Import (.xlsx / .csv)
            </h1>
          </div>
          <p className="text-xs text-[#8e9db2]">
            Local-only workbook parser supporting merged batch cells, multi-range student IDs, leading-zero preservation, and transactional assignment preview.
          </p>
        </div>
      </div>

      {/* 10-Step Progress Bar */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-3 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {STEPS.map((label, idx) => {
            const num = idx + 1;
            const active = num === step;
            const done = num < step;
            return (
              <button
                key={label}
                type="button"
                disabled={num > step || step === 10}
                onClick={() => num < step && setStep(num)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer disabled:cursor-default ${
                  active
                    ? "bg-[#008764] text-white font-semibold"
                    : done
                    ? "bg-[#172136] text-emerald-300 hover:text-white"
                    : "bg-[#0b0f19] text-slate-500"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-[#881337] bg-[#2e1014] p-4 flex items-start gap-2.5 text-xs text-rose-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Upload File */}
      {step === 1 && (
        <div className="rounded-xl border border-[#1c263c] bg-[#121827] p-6 space-y-5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFileSelect(e.dataTransfer.files?.[0] || null);
            }}
            className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
              dragOver
                ? "border-emerald-400 bg-[#062822]/40"
                : "border-[#1c263c] bg-[#0b0f19]"
            }`}
          >
            <UploadCloud className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">
              Drag and drop your advisor roster workbook here
            </p>
            <p className="text-xs text-[#8e9db2] mt-1">
              Supports .xlsx and .csv up to 10 MB. Files are parsed strictly on your server and never sent to third-party services.
            </p>
            <label className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#172136] border border-[#1c263c] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1e2b45] cursor-pointer">
              <span>Browse Files</span>
              <input
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          {file && (
            <div className="flex items-center justify-between rounded-lg border border-[#1c263c] bg-[#0b0f19] px-4 py-3 text-xs">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="font-semibold text-white">{file.name}</p>
                  <p className="text-slate-400 font-mono">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)}>
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
                <Button type="button" variant="institution" isLoading={loading} onClick={handleInspectFile}>
                  Inspect Workbook
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Worksheet */}
      {step === 2 && (
        <div className="rounded-xl border border-[#1c263c] bg-[#121827] p-6 space-y-5 text-xs">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white">Select Worksheet to Import</h2>
            <p className="text-[#8e9db2]">
              Choose the exact worksheet from <span className="font-mono text-white">{file?.name}</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {worksheets.map((ws) => {
              const selected = ws === selectedWorksheet;
              const isSuggested = ws === suggestedWorksheet;
              return (
                <button
                  key={ws}
                  type="button"
                  onClick={() => setSelectedWorksheet(ws)}
                  className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                    selected
                      ? "border-emerald-500 bg-[#062822]"
                      : "border-[#1c263c] bg-[#0b0f19] hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white">{ws}</span>
                    {isSuggested && (
                      <span className="rounded bg-[#2b200b] border border-[#78350f] px-1.5 py-0.5 text-[10px] text-amber-300 font-mono">
                        Suggested
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between pt-2 border-t border-[#1c263c]">
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button
              type="button"
              variant="institution"
              isLoading={loading}
              disabled={!selectedWorksheet}
              onClick={() => handleParseWorksheet(undefined, 3)}
            >
              Detect Columns <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Map Columns */}
      {step === 3 && (
        <div className="rounded-xl border border-[#1c263c] bg-[#121827] p-6 space-y-5 text-xs">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white">Verify &amp; Map Columns</h2>
            <p className="text-[#8e9db2]">
              Auto-detected headers from worksheet <span className="font-mono text-white">{selectedWorksheet}</span>. Adjust any column mapping if headers differ.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {COLUMN_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1">
                <label htmlFor={`map-${field.key}`} className="font-medium text-slate-200">
                  {field.label}
                </label>
                <select
                  id={`map-${field.key}`}
                  value={columnMapping[field.key] ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    setColumnMapping((prev) => ({ ...prev, [field.key]: val }));
                  }}
                  className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
                >
                  <option value="">-- Not Mapped --</option>
                  {headers.map((h) => (
                    <option key={h.colIndex} value={h.colIndex}>
                      Col {h.colLetter}: {h.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-2 border-t border-[#1c263c]">
            <Button type="button" variant="secondary" onClick={() => setStep(2)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button
              type="button"
              variant="institution"
              isLoading={loading}
              onClick={() => handleParseWorksheet(columnMapping, 4)}
            >
              Apply Mapping &amp; Configure Semester <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Configure Semester & Department */}
      {step === 4 && (
        <div className="rounded-xl border border-[#1c263c] bg-[#121827] p-6 space-y-5 text-xs">
          <h2 className="text-base font-bold text-white">Target Semester &amp; Department</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="imp-sem" className="font-medium text-slate-200">
                Target Semester *
              </label>
              <select
                id="imp-sem"
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
              >
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || `${s.season} ${s.year}`} {s.is_active ? "(Active)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="imp-dept" className="font-medium text-slate-200">
                Department Scope
              </label>
              <select
                id="imp-dept"
                value={departmentCode}
                onChange={(e) => setDepartmentCode(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-between pt-2 border-t border-[#1c263c]">
            <Button type="button" variant="secondary" onClick={() => setStep(3)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button type="button" variant="institution" onClick={() => setStep(5)}>
              Review Validation Summary <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 5 & 6: Parse, Validate & Correct Exceptions */}
      {(step === 5 || step === 6) && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
            <div className="rounded-lg border border-[#064e3b] bg-[#062822] p-3">
              <div className="text-emerald-300">Valid</div>
              <div className="font-mono text-lg font-bold text-white">{counts.valid}</div>
            </div>
            <div className="rounded-lg border border-[#78350f] bg-[#2b200b] p-3">
              <div className="text-amber-300">Warnings</div>
              <div className="font-mono text-lg font-bold text-white">{counts.warning}</div>
            </div>
            <div className="rounded-lg border border-[#0369a1] bg-[#0c223d] p-3">
              <div className="text-sky-300">Duplicates</div>
              <div className="font-mono text-lg font-bold text-white">{counts.duplicate}</div>
            </div>
            <div className="rounded-lg border border-[#78350f] bg-[#2b200b] p-3">
              <div className="text-amber-300">Needs Review</div>
              <div className="font-mono text-lg font-bold text-white">{counts.needsReview}</div>
            </div>
            <div className="rounded-lg border border-[#881337] bg-[#2e1014] p-3">
              <div className="text-rose-300">Errors</div>
              <div className="font-mono text-lg font-bold text-white">{counts.error}</div>
            </div>
            <div className="rounded-lg border border-[#1c263c] bg-[#121827] p-3">
              <div className="text-slate-400">Excluded</div>
              <div className="font-mono text-lg font-bold text-white">{counts.excluded}</div>
            </div>
          </div>

          <div className="rounded-xl border border-[#1c263c] bg-[#121827] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c263c]">
              <h2 className="text-sm font-bold text-white">
                {step === 5 ? "Parsed Roster Validation Table" : "Inline Exception Correction"}
              </h2>
              <Button type="button" size="sm" variant="secondary" onClick={handleRevalidate}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Re-run Validation
              </Button>
            </div>
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#0f1523] border-b border-[#1c263c] sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 text-slate-400">Row</th>
                    <th className="px-3 py-2.5 text-slate-400">Batch</th>
                    <th className="px-3 py-2.5 text-slate-400">Advisor Name</th>
                    <th className="px-3 py-2.5 text-slate-400">Email</th>
                    <th className="px-3 py-2.5 text-slate-400">Student ID Range</th>
                    <th className="px-3 py-2.5 text-slate-400">Phone</th>
                    <th className="px-3 py-2.5 text-slate-400">Status &amp; Details</th>
                    <th className="px-3 py-2.5 text-slate-400 text-right">Row Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c263c]">
                  {rows.map((r) => (
                    <tr
                      key={r.rowId}
                      className={r.excluded ? "opacity-45 bg-[#0b0f19]" : "hover:bg-[#172136]/40"}
                    >
                      <td className="px-3 py-2.5 font-mono text-slate-400">{r.sourceRowNumber}</td>
                      <td className="px-3 py-2.5">
                        <input
                          value={r.batchLabel}
                          disabled={r.excluded}
                          onChange={(e) => handleRowEdit(r.rowId, "batchLabel", e.target.value)}
                          aria-label={`Batch for row ${r.sourceRowNumber}`}
                          className="w-28 rounded border border-[#1c263c] bg-[#0b0f19] px-2 py-1 text-white"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          value={r.advisorName}
                          disabled={r.excluded}
                          onChange={(e) => handleRowEdit(r.rowId, "advisorName", e.target.value)}
                          aria-label={`Advisor name for row ${r.sourceRowNumber}`}
                          className="w-40 rounded border border-[#1c263c] bg-[#0b0f19] px-2 py-1 text-white"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          value={r.email}
                          disabled={r.excluded}
                          onChange={(e) => handleRowEdit(r.rowId, "email", e.target.value)}
                          aria-label={`Email for row ${r.sourceRowNumber}`}
                          className="w-44 rounded border border-[#1c263c] bg-[#0b0f19] px-2 py-1 text-white font-mono"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          value={r.studentIdRangeRaw}
                          disabled={r.excluded}
                          onChange={(e) => handleRowEdit(r.rowId, "studentIdRangeRaw", e.target.value)}
                          aria-label={`Student ID range for row ${r.sourceRowNumber}`}
                          className="w-52 rounded border border-[#1c263c] bg-[#0b0f19] px-2 py-1 text-white font-mono"
                        />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-300">{r.phone || "—"}</td>
                      <td className="px-3 py-2.5 space-y-1 max-w-xs">
                        <span className="inline-block rounded px-2 py-0.5 font-mono text-[11px] border border-[#1c263c] bg-[#0b0f19] text-white">
                          {r.validationStatus}
                        </span>
                        {r.errors.map((err, i) => (
                          <div key={i} className="text-rose-400">
                            {err}
                          </div>
                        ))}
                        {r.warnings.map((w, i) => (
                          <div key={i} className="text-amber-300">
                            {w}
                          </div>
                        ))}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleExclude(r.rowId)}
                        >
                          {r.excluded ? (
                            <>
                              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore
                            </>
                          ) : (
                            <>
                              <Ban className="h-3.5 w-3.5 mr-1" /> Exclude
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="secondary" onClick={() => setStep(4)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex gap-2">
              {step === 5 && (
                <Button type="button" variant="outline" onClick={() => setStep(6)}>
                  Correct Exceptions
                </Button>
              )}
              <Button
                type="button"
                variant="institution"
                disabled={counts.error > 0 || counts.needsReview > 0}
                onClick={() => {
                  handleRevalidate();
                  setStep(7);
                }}
              >
                Configure Assignment Strategy <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 7: Assignment Strategy & Commit Mode */}
      {step === 7 && (
        <div className="rounded-xl border border-[#1c263c] bg-[#121827] p-6 space-y-6 text-xs">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-white">Assignment Strategy</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: "range", title: "Assign by Parsed Student ID Ranges", desc: "Matches exact stored student IDs against parsed ranges and individual exceptions." },
                { id: "batch", title: "Assign Eligible Students by Batch", desc: "Assigns existing student profiles in each row's batch to the advisor." },
                { id: "advisors_only", title: "Import Advisors Only (No Assignments)", desc: "Creates/updates advisor directory records without creating student assignments." },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAssignmentMode(opt.id as AssignmentStrategyMode)}
                  className={`p-4 rounded-xl border text-left cursor-pointer ${
                    assignmentMode === opt.id
                      ? "border-emerald-500 bg-[#062822]"
                      : "border-[#1c263c] bg-[#0b0f19]"
                  }`}
                >
                  <div className="font-semibold text-white">{opt.title}</div>
                  <div className="text-[#8e9db2] mt-1">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-bold text-white">Conflict &amp; Update Policy</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "add_only", title: "Add New Assignments Only", desc: "Retains existing advisor details and existing student assignments." },
                { id: "update_and_add", title: "Update Advisors & Add New", desc: "Updates matching advisor contact info and adds only unassigned students." },
                { id: "replace_batches", title: "Replace Selected Batch Assignments", desc: "Replaces conflicting assignments for matched students (requires confirmation)." },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCommitMode(opt.id as RosterCommitMode)}
                  className={`p-4 rounded-xl border text-left cursor-pointer ${
                    commitMode === opt.id
                      ? "border-amber-500 bg-[#2b200b]"
                      : "border-[#1c263c] bg-[#0b0f19]"
                  }`}
                >
                  <div className="font-semibold text-white">{opt.title}</div>
                  <div className="text-[#8e9db2] mt-1">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-2 border-t border-[#1c263c]">
            <Button type="button" variant="secondary" onClick={() => setStep(6)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button type="button" variant="institution" isLoading={loading} onClick={handleRunPreview}>
              Preview Affected Students <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 8 & 9: Preview Affected & Confirm */}
      {(step === 8 || step === 9) && preview && (
        <div className="space-y-5 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-[#1c263c] bg-[#121827] p-4">
              <div className="text-[#8e9db2]">Advisors Create / Update</div>
              <div className="mt-1 font-mono text-xl font-bold text-white">
                {preview.advisorsToCreate} / {preview.advisorsToUpdate}
              </div>
            </div>
            <div className="rounded-xl border border-[#064e3b] bg-[#062822] p-4">
              <div className="text-emerald-300">New Assignments</div>
              <div className="mt-1 font-mono text-xl font-bold text-white">
                {preview.newAssignmentsCount}
              </div>
            </div>
            <div className="rounded-xl border border-[#78350f] bg-[#2b200b] p-4">
              <div className="text-amber-300">Existing / Conflicts</div>
              <div className="mt-1 font-mono text-xl font-bold text-white">
                {preview.conflictsCount}
              </div>
            </div>
            <div className="rounded-xl border border-[#1c263c] bg-[#121827] p-4">
              <div className="text-[#8e9db2]">Unmatched Explicit IDs</div>
              <div className="mt-1 font-mono text-xl font-bold text-rose-400">
                {preview.unmatchedIndividualIds.length}
              </div>
            </div>
          </div>

          {preview.unmatchedIndividualIds.length > 0 && (
            <div className="rounded-xl border border-[#78350f] bg-[#2b200b] p-4 text-amber-200">
              <strong>Unmatched Individual IDs (no student profile exists; will NOT be created):</strong>{" "}
              <span className="font-mono">{preview.unmatchedIndividualIds.join(", ")}</span>
            </div>
          )}

          {step === 9 && (
            <div className="rounded-xl border border-[#1c263c] bg-[#121827] p-5 space-y-3">
              <h2 className="text-base font-bold text-white">Explicit Confirmation Required</h2>
              {preview.hasAllBatchRule && assignmentMode !== "advisors_only" && (
                <label className="flex items-start gap-2.5 text-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allRuleConfirmed}
                    onChange={(e) => setAllRuleConfirmed(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    I confirm the batch-scoped &ldquo;All&rdquo; assignment rule applies only to matched students in those specific batches.
                  </span>
                </label>
              )}
              {commitMode === "replace_batches" && (
                <label className="flex items-start gap-2.5 text-rose-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceConfirmed}
                    onChange={(e) => setReplaceConfirmed(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    I confirm replacing {preview.overwrittenAssignmentsCount} existing student assignment(s) for the selected batches (history will be retained).
                  </span>
                </label>
              )}
            </div>
          )}

          <div className="flex justify-between">
            <Button type="button" variant="secondary" onClick={() => setStep(step === 9 ? 8 : 7)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            {step === 8 ? (
              <Button type="button" variant="institution" onClick={() => setStep(9)}>
                Proceed to Confirmation <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="institution"
                isLoading={loading}
                disabled={
                  preview.blockingRowsCount > 0 ||
                  (preview.hasAllBatchRule && assignmentMode !== "advisors_only" && !allRuleConfirmed) ||
                  (commitMode === "replace_batches" && !replaceConfirmed)
                }
                onClick={handleCommit}
              >
                Commit Import to Database
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Step 10: Result */}
      {step === 10 && commitResult && (
        <div className="rounded-xl border border-[#064e3b] bg-[#062822] p-6 space-y-4 text-xs">
          <div className="flex items-center gap-2.5 text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
            <h2 className="text-base font-bold text-white">Roster Import Completed</h2>
          </div>
          <p className="text-emerald-100">
            Import Batch <span className="font-mono">{commitResult.importBatchId}</span> recorded cleanly.{" "}
            {commitResult.advisorsProcessed} advisor(s) processed and {commitResult.assignmentsCreated} assignment(s) created.
          </p>
          <Button type="button" variant="institution" onClick={() => setStep(1)}>
            Import Another Workbook
          </Button>
        </div>
      )}

      {/* Import History */}
      {recentImports.length > 0 && (
        <div className="rounded-xl border border-[#1c263c] bg-[#121827] p-5 space-y-3 text-xs">
          <h2 className="text-sm font-bold text-white">Recent Roster Import History</h2>
          <div className="divide-y divide-[#1c263c]">
            {recentImports.map((imp) => (
              <div key={imp.id} className="py-2.5 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-white">{imp.file_name}</div>
                  <div className="text-slate-400 font-mono">
                    Worksheet: {imp.worksheet_name} • Mode: {imp.assignment_mode} ({imp.commit_mode})
                  </div>
                </div>
                <div className="text-right font-mono text-slate-400">
                  <div>{imp.status}</div>
                  <div>{new Date(imp.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
