"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Plus,
  Search,
  Edit3,
  Copy,
  Power,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  DatabaseZap,
  Layers,
  Calendar,
  Sparkles,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  COURSE_CATEGORIES,
  SPECIALIZATION_GROUPS,
  CATEGORY_LABELS,
  SPECIALIZATION_LABELS,
  computeAuthoritativeCredits,
} from "@/lib/validations/curriculum";
import {
  createMasterCourseAction,
  updateMasterCourseAction,
  toggleMasterCourseActiveAction,
  importOfficialCseDatasetAction,
  inspectCourseImportAction,
  parseCourseImportAction,
  commitCourseImportAction,
  toggleSemesterCourseAction,
  toggleBatchCourseAction,
  upsertSpecializationOfferingAction,
  type MasterCourseRow,
} from "@/app/admin/curriculum/actions";
import type { ParsedCourseImportRow } from "@/lib/curriculum/course-import-parser";
import type { BatchRow, DepartmentRow, SemesterRow } from "@/lib/admin/admin-service";

interface SemesterCourseMapping {
  id: string;
  semester_id: string;
  course_id: string;
  is_active: boolean;
}

interface BatchCourseMapping {
  id: string;
  semester_id: string;
  batch: string;
  course_id: string;
}

interface SpecializationOfferingMapping {
  id: string;
  semester_id: string;
  batch: string;
  specialization_group: string;
  required_courses: number | null;
  required_credits: number | null;
  is_active: boolean;
}

interface ImportHistoryItem {
  id: string;
  file_name: string;
  source_worksheet: string | null;
  imported_count: number;
  failed_count: number;
  status: string;
  created_at: string;
}

interface CurriculumManagementViewProps {
  available: boolean;
  errorMessage?: string;
  courses: MasterCourseRow[];
  semesters: SemesterRow[];
  batches: BatchRow[];
  departments: DepartmentRow[];
  semesterCourses: SemesterCourseMapping[];
  batchCourses: BatchCourseMapping[];
  specializationOfferings: SpecializationOfferingMapping[];
  importHistory: ImportHistoryItem[];
}

type TabId = "catalog" | "semester" | "batch" | "specialization" | "import";

export function CurriculumManagementView({
  available,
  errorMessage,
  courses,
  semesters,
  batches,
  departments,
  semesterCourses,
  batchCourses,
  specializationOfferings,
  importHistory,
}: CurriculumManagementViewProps) {
  const router = useRouter();
  const [tab, setTab] = React.useState<TabId>("catalog");
  const [notice, setNotice] = React.useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Catalog state
  const [search, setSearch] = React.useState("");
  const [catFilter, setCatFilter] = React.useState("all");
  const [specFilter, setSpecFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = React.useState<"code" | "title" | "category" | "credits">("code");
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  // Course Modal
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingCourse, setEditingCourse] = React.useState<MasterCourseRow | null>(null);
  const [formState, setFormState] = React.useState({
    code: "",
    title: "",
    category: "CORE" as (typeof COURSE_CATEGORIES)[number],
    theoryCredits: "",
    labCredits: "",
    totalCredits: "",
    specializationGroup: "" as "" | (typeof SPECIALIZATION_GROUPS)[number],
    variant: "",
    description: "",
    departmentCode: "CSE",
    isActive: true,
  });
  const [formError, setFormError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Deactivate Dialog
  const [toggleCourse, setToggleCourse] = React.useState<MasterCourseRow | null>(null);
  const [toggleReason, setToggleReason] = React.useState("");
  const [toggling, setToggling] = React.useState(false);

  // Semester & Batch Config state
  const defaultSemId = semesters.find((s) => s.is_active)?.id || semesters[0]?.id || "";
  const [configSemId, setConfigSemId] = React.useState(defaultSemId);
  const [configBatch, setConfigBatch] = React.useState(
    batches[0]?.batch_number || batches[0]?.batch_label || "69"
  );
  const [configDept, setConfigDept] = React.useState(departments[0]?.code || "CSE");
  const [configSearch, setConfigSearch] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  // Bulk Import state
  const [impFile, setImpFile] = React.useState<File | null>(null);
  const [impSheets, setImpSheets] = React.useState<string[]>([]);
  const [impSheet, setImpSheet] = React.useState("");
  const [impRows, setImpRows] = React.useState<ParsedCourseImportRow[]>([]);
  const [impUpdateExisting, setImpUpdateExisting] = React.useState(false);
  const [impBusy, setImpBusy] = React.useState(false);

  const filteredCourses = React.useMemo(() => {
    const q = search.trim().toLowerCase().replace(/[-\s]+/g, "");
    const list = courses.filter((c) => {
      if (catFilter !== "all" && (c.category || "CORE") !== catFilter) return false;
      if (specFilter !== "all" && (c.specialization_group || "") !== specFilter) return false;
      if (activeFilter === "active" && c.is_active === false) return false;
      if (activeFilter === "inactive" && c.is_active !== false) return false;
      if (!q) return true;
      const normCode = c.code.toLowerCase().replace(/[-\s]+/g, "");
      const normTitle = c.title.toLowerCase().replace(/[-\s]+/g, "");
      return normCode.includes(q) || normTitle.includes(q);
    });

    list.sort((a, b) => {
      if (sortBy === "code") return a.code.localeCompare(b.code);
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "category") return (a.category || "").localeCompare(b.category || "");
      return a.credits - b.credits;
    });
    return list;
  }, [courses, search, catFilter, specFilter, activeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
  const pagedCourses = filteredCourses.slice((page - 1) * pageSize, page * pageSize);

  const openAddModal = () => {
    setEditingCourse(null);
    setFormState({
      code: "",
      title: "",
      category: "CORE",
      theoryCredits: "",
      labCredits: "",
      totalCredits: "",
      specializationGroup: "",
      variant: "",
      description: "",
      departmentCode: "CSE",
      isActive: true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (c: MasterCourseRow, asVariant = false) => {
    setEditingCourse(asVariant ? null : c);
    setFormState({
      code: c.code,
      title: c.title,
      category: ((c.category as (typeof COURSE_CATEGORIES)[number]) || "CORE"),
      theoryCredits: c.theory_credits !== null && c.theory_credits !== undefined ? String(c.theory_credits) : "",
      labCredits: c.lab_credits !== null && c.lab_credits !== undefined ? String(c.lab_credits) : "",
      totalCredits: String(c.credits),
      specializationGroup: (c.specialization_group as (typeof SPECIALIZATION_GROUPS)[number]) || "",
      variant: asVariant ? `${c.variant ? `${c.variant} ` : ""}Variant` : c.variant || "",
      description: c.description || "",
      departmentCode: c.department_code || "CSE",
      isActive: c.is_active !== false,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const computedPreviewCredits = React.useMemo(() => {
    const th = formState.theoryCredits.trim() ? Number(formState.theoryCredits) : null;
    const lb = formState.labCredits.trim() ? Number(formState.labCredits) : null;
    const tot = formState.totalCredits.trim() ? Number(formState.totalCredits) : null;
    return computeAuthoritativeCredits(th, lb, tot);
  }, [formState.theoryCredits, formState.labCredits, formState.totalCredits]);

  const matchingDuplicates = React.useMemo(() => {
    const norm = formState.code.trim().toUpperCase();
    if (!norm) return [];
    return courses.filter((c) => c.code.trim().toUpperCase() === norm && c.id !== editingCourse?.id);
  }, [courses, formState.code, editingCourse]);

  const handleSaveCourse = async (addAnother: boolean) => {
    setFormError(null);
    setSaving(true);

    const payload = {
      code: formState.code,
      title: formState.title,
      category: formState.category,
      theoryCredits: formState.theoryCredits.trim() ? Number(formState.theoryCredits) : null,
      labCredits: formState.labCredits.trim() ? Number(formState.labCredits) : null,
      totalCredits: formState.totalCredits.trim() ? Number(formState.totalCredits) : null,
      specializationGroup: formState.specializationGroup || null,
      variant: formState.variant || null,
      description: formState.description || null,
      departmentCode: formState.departmentCode || "CSE",
      isActive: formState.isActive,
    };

    const res = editingCourse
      ? await updateMasterCourseAction({ id: editingCourse.id, ...payload })
      : await createMasterCourseAction(payload);

    setSaving(false);
    if (!res.success) {
      setFormError(res.error || "Failed to save course.");
      return;
    }

    if (addAnother && !editingCourse) {
      setFormState((prev) => ({
        ...prev,
        code: "",
        title: "",
        variant: "",
        description: "",
      }));
      setNotice({ type: "ok", text: "Course saved to master catalog. Ready for next course." });
      router.refresh();
      return;
    }

    setModalOpen(false);
    setNotice({
      type: "ok",
      text: editingCourse ? "Course updated successfully." : "Course created in master catalog.",
    });
    router.refresh();
  };

  const handleToggleActive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toggleCourse) return;
    setToggling(true);
    const res = await toggleMasterCourseActiveAction({
      id: toggleCourse.id,
      isActive: toggleCourse.is_active === false,
      reason: toggleReason,
    });
    setToggling(false);
    if (!res.success) {
      setNotice({ type: "err", text: res.error || "Failed to update status." });
      return;
    }
    setToggleCourse(null);
    setToggleReason("");
    router.refresh();
  };

  const handleImportOfficialDataset = async () => {
    setNotice(null);
    setImpBusy(true);
    const res = await importOfficialCseDatasetAction();
    setImpBusy(false);
    if (!res.success || !res.data) {
      setNotice({ type: "err", text: res.error || "Official dataset import failed." });
      return;
    }
    setNotice({
      type: "ok",
      text: `Imported ${res.data.inserted} official CSE course(s); skipped ${res.data.skippedDuplicates} existing record(s).`,
    });
    router.refresh();
  };

  const handleExportCsv = () => {
    const header = [
      "Code",
      "Title",
      "Category",
      "Theory Credits",
      "Lab Credits",
      "Total Credits",
      "Specialization",
      "Variant",
      "Status",
    ];
    const lines = [
      header.join(","),
      ...filteredCourses.map((c) =>
        [
          `"${c.code}"`,
          `"${c.title.replace(/"/g, '""')}"`,
          `"${c.category || "CORE"}"`,
          c.theory_credits ?? "",
          c.lab_credits ?? "",
          c.credits,
          `"${c.specialization_group || ""}"`,
          `"${c.variant || ""}"`,
          c.is_active === false ? "Inactive" : "Active",
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diu-cse-master-catalog.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const semConfiguredIds = React.useMemo(() => {
    return new Map(
      semesterCourses
        .filter((sc) => sc.semester_id === configSemId)
        .map((sc) => [sc.course_id, sc])
    );
  }, [semesterCourses, configSemId]);

  const batchConfiguredIds = React.useMemo(() => {
    return new Set(
      batchCourses
        .filter((bc) => bc.semester_id === configSemId && bc.batch === configBatch)
        .map((bc) => bc.course_id)
    );
  }, [batchCourses, configSemId, configBatch]);

  const configFilteredCatalog = React.useMemo(() => {
    const q = configSearch.trim().toLowerCase().replace(/[-\s]+/g, "");
    return courses.filter((c) => {
      if (c.is_active === false) return false;
      if (configDept && c.department_code !== configDept && tab === "batch") return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().replace(/[-\s]+/g, "").includes(q) ||
        c.title.toLowerCase().replace(/[-\s]+/g, "").includes(q)
      );
    });
  }, [courses, configSearch, configDept, tab]);

  const handleInspectImport = async (file: File) => {
    setImpFile(file);
    setImpBusy(true);
    setNotice(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await inspectCourseImportAction(fd);
    setImpBusy(false);
    if (!res.success || !res.data) {
      setNotice({ type: "err", text: res.error || "Failed to inspect file." });
      return;
    }
    setImpSheets(res.data.worksheets);
    const firstSheet = res.data.worksheets[0] || "";
    setImpSheet(firstSheet);
    if (firstSheet) {
      await handleParseImport(file, firstSheet);
    }
  };

  const handleParseImport = async (file: File, sheet: string) => {
    setImpBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("worksheetName", sheet);
    const res = await parseCourseImportAction(fd);
    setImpBusy(false);
    if (!res.success || !res.data) {
      setNotice({ type: "err", text: res.error || "Failed to parse worksheet." });
      return;
    }
    setImpRows(res.data.rows);
  };

  const handleCommitCourseImport = async () => {
    if (!impFile) return;
    setImpBusy(true);
    const res = await commitCourseImportAction({
      fileName: impFile.name,
      worksheetName: impSheet,
      rows: impRows,
      updateExisting: impUpdateExisting,
    });
    setImpBusy(false);
    if (!res.success || !res.data) {
      setNotice({ type: "err", text: res.error || "Import commit failed." });
      return;
    }
    setNotice({
      type: "ok",
      text: `Bulk import complete: ${res.data.importedCount} imported, ${res.data.skippedCount} skipped.`,
    });
    setImpRows([]);
    setImpFile(null);
    router.refresh();
  };

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto py-2">
      {/* Header */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[#062822] border border-[#064e3b] text-[#10b981]">
              <BookOpen className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">
              CSE Curriculum &amp; Master Course Catalog
            </h1>
          </div>
          <p className="text-xs text-[#8e9db2]">
            Manage the centralized DIU CSE course catalog, variants, semester offerings, batch eligibility, and specialization rules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleExportCsv}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            isLoading={impBusy}
            onClick={handleImportOfficialDataset}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
            Import Official CSE Catalog
          </Button>
          <Button type="button" variant="institution" size="sm" onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-1" />
            Add Course
          </Button>
        </div>
      </div>

      {!available && (
        <div role="alert" className="rounded-xl border border-[#881337] bg-[#2e1014] p-4 flex items-start gap-3 text-xs text-rose-200">
          <DatabaseZap className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <p className="font-semibold text-white">Curriculum Database Unavailable</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className={`rounded-xl border p-3.5 text-xs flex items-center gap-2 ${
            notice.type === "ok"
              ? "border-[#064e3b] bg-[#062822] text-emerald-200"
              : "border-[#881337] bg-[#2e1014] text-rose-200"
          }`}
        >
          {notice.type === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "catalog", label: `Master Course Catalog (${courses.length})`, icon: BookOpen },
          { id: "semester", label: "Semester Configuration", icon: Calendar },
          { id: "batch", label: "Batch Configuration", icon: Layers },
          { id: "specialization", label: "Specialization Management", icon: Sparkles },
          { id: "import", label: "Bulk Import & History", icon: FileSpreadsheet },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as TabId)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                active
                  ? "bg-[#172136] border-emerald-500/60 text-white"
                  : "bg-[#121827] border-[#1c263c] text-[#8e9db2] hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: MASTER COURSE CATALOG */}
      {tab === "catalog" && (
        <div className="space-y-4">
          <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search code or title..."
                aria-label="Search master courses"
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#1c263c] bg-[#0b0f19] text-xs text-white"
              />
            </div>

            <select
              value={catFilter}
              onChange={(e) => {
                setCatFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by category"
              className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-xs text-white"
            >
              <option value="all">All Categories</option>
              {COURSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>

            <select
              value={specFilter}
              onChange={(e) => {
                setSpecFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by specialization"
              className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-xs text-white"
            >
              <option value="all">All Specializations</option>
              {SPECIALIZATION_GROUPS.map((s) => (
                <option key={s} value={s}>
                  {SPECIALIZATION_LABELS[s]}
                </option>
              ))}
            </select>

            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value as "all" | "active" | "inactive");
                setPage(1);
              }}
              aria-label="Filter by status"
              className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-xs text-white"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "code" | "title" | "category" | "credits")}
              aria-label="Sort courses"
              className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-xs text-white"
            >
              <option value="code">Sort: Code</option>
              <option value="title">Sort: Title</option>
              <option value="category">Sort: Category</option>
              <option value="credits">Sort: Credits</option>
            </select>
          </div>

          <div className="rounded-xl border border-[#1c263c] bg-[#121827] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#0f1523] border-b border-[#1c263c]">
                  <tr>
                    <th className="px-4 py-3 text-slate-400 font-semibold uppercase">Code</th>
                    <th className="px-4 py-3 text-slate-400 font-semibold uppercase">Course Title &amp; Variant</th>
                    <th className="px-4 py-3 text-slate-400 font-semibold uppercase">Category</th>
                    <th className="px-4 py-3 text-slate-400 font-semibold uppercase">Th / Lab / Total</th>
                    <th className="px-4 py-3 text-slate-400 font-semibold uppercase">Status</th>
                    <th className="px-4 py-3 text-slate-400 font-semibold uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c263c]">
                  {pagedCourses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-[#8e9db2]">
                        No courses match your filters. Click &ldquo;Import Official CSE Catalog&rdquo; or &ldquo;+ Add Course&rdquo;.
                      </td>
                    </tr>
                  ) : (
                    pagedCourses.map((c) => (
                      <tr key={c.id} className="hover:bg-[#172136]/50">
                        <td className="px-4 py-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {c.code}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">{c.title}</div>
                          {(c.variant || c.specialization_group) && (
                            <div className="text-slate-400 mt-0.5">
                              {c.variant ? `Variant: ${c.variant}` : ""}
                              {c.variant && c.specialization_group ? " • " : ""}
                              {c.specialization_group
                                ? SPECIALIZATION_LABELS[c.specialization_group as (typeof SPECIALIZATION_GROUPS)[number]] ||
                                  c.specialization_group
                                : ""}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {CATEGORY_LABELS[(c.category as (typeof COURSE_CATEGORIES)[number]) || "CORE"] || c.category}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-200 whitespace-nowrap">
                          {c.theory_credits ?? "—"} / {c.lab_credits ?? "—"} /{" "}
                          <span className="font-bold text-white">{c.credits}</span>
                        </td>
                        <td className="px-4 py-3">
                          {c.is_active !== false ? (
                            <span className="rounded border border-[#064e3b] bg-[#062822] px-2 py-0.5 text-[#10b981]">
                              Active
                            </span>
                          ) : (
                            <span className="rounded border border-[#881337] bg-[#2e1014] px-2 py-0.5 text-rose-400">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                          <Button type="button" size="sm" variant="outline" onClick={() => openEditModal(c, false)} title="Edit course">
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" size="sm" variant="secondary" onClick={() => openEditModal(c, true)} title="Duplicate as variant">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={c.is_active !== false ? "destructive" : "default"}
                            onClick={() => {
                              setToggleCourse(c);
                              setToggleReason("");
                            }}
                            title={c.is_active !== false ? "Deactivate" : "Activate"}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#1c263c] text-xs text-[#8e9db2]">
                <span>
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredCourses.length)} of{" "}
                  {filteredCourses.length}
                </span>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Prev
                  </Button>
                  <Button type="button" size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SEMESTER CONFIGURATION */}
      {tab === "semester" && (
        <div className="space-y-4 text-xs">
          <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={configSemId}
              onChange={(e) => setConfigSemId(e.target.value)}
              aria-label="Select semester"
              className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || `${s.season} ${s.year}`} {s.is_active ? "(Active)" : ""}
                </option>
              ))}
            </select>
            <input
              type="search"
              value={configSearch}
              onChange={(e) => setConfigSearch(e.target.value)}
              placeholder="Search catalog to add/remove semester offerings..."
              className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
            />
          </div>

          <div className="rounded-xl border border-[#1c263c] bg-[#121827] divide-y divide-[#1c263c] max-h-[520px] overflow-y-auto">
            {configFilteredCatalog.map((c) => {
              const mapping = semConfiguredIds.get(c.id);
              return (
                <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-emerald-400 mr-2">{c.code}</span>
                    <span className="font-medium text-white">{c.title}</span>
                    <span className="ml-2 font-mono text-slate-400">({c.credits} Cr)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {mapping ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          isLoading={busyId === c.id}
                          onClick={async () => {
                            setBusyId(c.id);
                            await toggleSemesterCourseAction({
                              semesterId: configSemId,
                              courseId: c.id,
                              action: mapping.is_active ? "deactivate" : "activate",
                            });
                            setBusyId(null);
                            router.refresh();
                          }}
                        >
                          {mapping.is_active ? "Active Offering" : "Paused"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          isLoading={busyId === c.id}
                          onClick={async () => {
                            setBusyId(c.id);
                            await toggleSemesterCourseAction({
                              semesterId: configSemId,
                              courseId: c.id,
                              action: "remove",
                            });
                            setBusyId(null);
                            router.refresh();
                          }}
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="institution"
                        isLoading={busyId === c.id}
                        onClick={async () => {
                          setBusyId(c.id);
                          await toggleSemesterCourseAction({
                            semesterId: configSemId,
                            courseId: c.id,
                            action: "add",
                          });
                          setBusyId(null);
                          router.refresh();
                        }}
                      >
                        Add to Semester
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: BATCH CONFIGURATION */}
      {tab === "batch" && (
        <div className="space-y-4 text-xs">
          <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              value={configSemId}
              onChange={(e) => setConfigSemId(e.target.value)}
              aria-label="Semester for batch config"
              className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || `${s.season} ${s.year}`}
                </option>
              ))}
            </select>
            <select
              value={configDept}
              onChange={(e) => setConfigDept(e.target.value)}
              aria-label="Department for batch config"
              className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
            >
              {departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code}
                </option>
              ))}
            </select>
            <input
              value={configBatch}
              onChange={(e) => setConfigBatch(e.target.value)}
              placeholder="Batch number (e.g. 69, 72)"
              aria-label="Batch number"
              className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white font-mono"
            />
            <input
              type="search"
              value={configSearch}
              onChange={(e) => setConfigSearch(e.target.value)}
              placeholder="Search catalog..."
              aria-label="Search catalog for batch"
              className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
            />
          </div>

          <div className="rounded-xl border border-[#1c263c] bg-[#121827] p-4 flex items-center justify-between">
            <span className="font-semibold text-white">
              Batch {configBatch} Configured Courses: {batchConfiguredIds.size}
            </span>
            <span className="font-mono text-emerald-400">
              Total Credits:{" "}
              {courses
                .filter((c) => batchConfiguredIds.has(c.id))
                .reduce((acc, c) => acc + c.credits, 0)
                .toFixed(1)}
            </span>
          </div>

          <div className="rounded-xl border border-[#1c263c] bg-[#121827] divide-y divide-[#1c263c] max-h-[500px] overflow-y-auto">
            {configFilteredCatalog.map((c) => {
              const configured = batchConfiguredIds.has(c.id);
              return (
                <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-emerald-400 mr-2">{c.code}</span>
                    <span className="font-medium text-white">{c.title}</span>
                    <span className="ml-2 font-mono text-slate-400">({c.credits} Cr)</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={configured ? "destructive" : "institution"}
                    isLoading={busyId === c.id}
                    onClick={async () => {
                      setBusyId(c.id);
                      await toggleBatchCourseAction({
                        semesterId: configSemId,
                        batch: configBatch,
                        courseId: c.id,
                        action: configured ? "remove" : "add",
                      });
                      setBusyId(null);
                      router.refresh();
                    }}
                  >
                    {configured ? "Remove from Batch" : "Add to Batch"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: SPECIALIZATION MANAGEMENT */}
      {tab === "specialization" && (
        <div className="space-y-4 text-xs">
          <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-4 flex flex-wrap items-center gap-3">
            <select
              value={configSemId}
              onChange={(e) => setConfigSemId(e.target.value)}
              className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || `${s.season} ${s.year}`}
                </option>
              ))}
            </select>
            <input
              value={configBatch}
              onChange={(e) => setConfigBatch(e.target.value)}
              placeholder="Batch (e.g. 69)"
              className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white font-mono"
            />
            <span className="text-[#8e9db2]">
              Source rule: Any 1 group, 6 courses, 18 credits (configurable per batch/semester).
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SPECIALIZATION_GROUPS.map((group) => {
              const groupCourses = courses.filter((c) => c.specialization_group === group);
              const offering = specializationOfferings.find(
                (o) =>
                  o.semester_id === configSemId &&
                  o.batch === configBatch &&
                  o.specialization_group === group
              );
              const isEnabled = offering ? offering.is_active : false;

              return (
                <div key={group} className="rounded-xl border border-[#1c263c] bg-[#121827] p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">{SPECIALIZATION_LABELS[group]}</h3>
                      <p className="text-slate-400 font-mono">
                        {groupCourses.length} catalog courses
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={isEnabled ? "destructive" : "institution"}
                      onClick={async () => {
                        await upsertSpecializationOfferingAction({
                          semesterId: configSemId,
                          batch: configBatch,
                          specializationGroup: group,
                          requiredCourses: 6,
                          requiredCredits: 18,
                          isActive: !isEnabled,
                        });
                        router.refresh();
                      }}
                    >
                      {isEnabled ? "Disable for Batch" : "Enable for Batch"}
                    </Button>
                  </div>
                  <div className="divide-y divide-[#1c263c] border-t border-[#1c263c] max-h-40 overflow-y-auto">
                    {groupCourses.map((gc) => (
                      <div key={gc.id} className="py-1.5 flex justify-between">
                        <span>
                          <span className="font-mono text-emerald-400 mr-2">{gc.code}</span>
                          <span className="text-slate-200">{gc.title}</span>
                        </span>
                        <span className="font-mono text-slate-400">{gc.credits} Cr</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: BULK IMPORT & HISTORY */}
      {tab === "import" && (
        <div className="space-y-5 text-xs">
          <div className="rounded-xl border border-[#1c263c] bg-[#121827] p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Bulk Course Import (.xlsx / .csv)</h2>
            <label className="inline-flex items-center gap-2 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-4 py-2.5 text-white hover:bg-[#172136] cursor-pointer">
              <UploadCloud className="h-4 w-4 text-emerald-400" />
              <span>{impFile ? impFile.name : "Choose .xlsx or .csv file"}</span>
              <input
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleInspectImport(f);
                }}
              />
            </label>

            {impSheets.length > 1 && impFile && (
              <div className="flex items-center gap-2">
                <span className="text-slate-300">Worksheet:</span>
                <select
                  value={impSheet}
                  onChange={(e) => {
                    setImpSheet(e.target.value);
                    handleParseImport(impFile, e.target.value);
                  }}
                  className="h-8 rounded border border-[#1c263c] bg-[#0b0f19] px-2 text-white"
                >
                  {impSheets.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {impRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-white">
                    Parsed: {impRows.length} • Valid: {impRows.filter((r) => r.status === "valid").length} •
                    Errors: {impRows.filter((r) => r.status === "error" && !r.excluded).length}
                  </span>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={impUpdateExisting}
                      onChange={(e) => setImpUpdateExisting(e.target.checked)}
                    />
                    <span>Explicitly update matching existing courses</span>
                  </label>
                </div>

                <div className="max-h-72 overflow-y-auto rounded-lg border border-[#1c263c] bg-[#0b0f19]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#0f1523] border-b border-[#1c263c]">
                      <tr>
                        <th className="px-3 py-2 text-slate-400">Code</th>
                        <th className="px-3 py-2 text-slate-400">Title</th>
                        <th className="px-3 py-2 text-slate-400">Category</th>
                        <th className="px-3 py-2 text-slate-400">Credits</th>
                        <th className="px-3 py-2 text-slate-400">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1c263c]">
                      {impRows.map((r) => (
                        <tr key={r.rowId}>
                          <td className="px-3 py-2 font-mono text-emerald-400">{r.code}</td>
                          <td className="px-3 py-2 text-white">{r.title}</td>
                          <td className="px-3 py-2 text-slate-300">{r.category}</td>
                          <td className="px-3 py-2 font-mono text-white">{r.totalCredits}</td>
                          <td className="px-3 py-2 text-slate-300">
                            {r.status} {r.errors.join("; ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button
                  type="button"
                  variant="institution"
                  isLoading={impBusy}
                  onClick={handleCommitCourseImport}
                >
                  Commit Bulk Course Import
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#1c263c] bg-[#121827] p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Course Import History</h3>
            {importHistory.length === 0 ? (
              <p className="text-[#8e9db2]">No bulk course imports recorded yet.</p>
            ) : (
              <div className="divide-y divide-[#1c263c]">
                {importHistory.map((h) => (
                  <div key={h.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">{h.file_name}</div>
                      <div className="font-mono text-slate-400">
                        {h.imported_count} imported • {h.failed_count} failed • {h.status}
                      </div>
                    </div>
                    <span className="font-mono text-slate-400">
                      {new Date(h.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD / EDIT COURSE MODAL */}
      {modalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-xl rounded-xl border border-[#1c263c] bg-[#121827] shadow-2xl overflow-hidden text-xs">
            <div className="flex items-center justify-between border-b border-[#1c263c] px-5 py-4">
              <h2 className="text-base font-bold text-white">
                {editingCourse ? `Edit Course (${editingCourse.code})` : "Add Master Course"}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="rounded-lg border border-[#881337] bg-[#2e1014] p-3 text-rose-200">
                  {formError}
                </div>
              )}

              {matchingDuplicates.length > 0 && (
                <div className="rounded-lg border border-[#78350f] bg-[#2b200b] p-3 text-amber-200">
                  <strong>Matching course code already exists:</strong>{" "}
                  {matchingDuplicates.map((d) => `${d.code}${d.variant ? ` (${d.variant})` : ""} — ${d.title}`).join("; ")}.
                  Provide a distinct <strong>Variant / Phase</strong> if creating a legitimate variant (like CSE-499).
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="c-code" className="font-medium text-slate-200">Course Code *</label>
                  <input
                    id="c-code"
                    required
                    value={formState.code}
                    onChange={(e) => setFormState({ ...formState, code: e.target.value })}
                    placeholder="e.g. CSE-215"
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white font-mono"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="c-title" className="font-medium text-slate-200">Course Title *</label>
                  <input
                    id="c-title"
                    required
                    value={formState.title}
                    onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                    placeholder="e.g. Electronic Devices and Circuits"
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="c-cat" className="font-medium text-slate-200">Category *</label>
                  <select
                    id="c-cat"
                    value={formState.category}
                    onChange={(e) =>
                      setFormState({ ...formState, category: e.target.value as (typeof COURSE_CATEGORIES)[number] })
                    }
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
                  >
                    {COURSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="c-spec" className="font-medium text-slate-200">Specialization Group</label>
                  <select
                    id="c-spec"
                    value={formState.specializationGroup}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        specializationGroup: e.target.value as "" | (typeof SPECIALIZATION_GROUPS)[number],
                      })
                    }
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
                  >
                    <option value="">None</option>
                    {SPECIALIZATION_GROUPS.map((s) => (
                      <option key={s} value={s}>
                        {SPECIALIZATION_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="c-th" className="font-medium text-slate-200">Theory Credits</label>
                  <input
                    id="c-th"
                    type="number"
                    step="0.5"
                    min="0"
                    value={formState.theoryCredits}
                    onChange={(e) => setFormState({ ...formState, theoryCredits: e.target.value })}
                    placeholder="Optional"
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="c-lb" className="font-medium text-slate-200">Lab Credits</label>
                  <input
                    id="c-lb"
                    type="number"
                    step="0.5"
                    min="0"
                    value={formState.labCredits}
                    onChange={(e) => setFormState({ ...formState, labCredits: e.target.value })}
                    placeholder="Optional"
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="c-tot" className="font-medium text-slate-200">Total Credits *</label>
                  <input
                    id="c-tot"
                    type="number"
                    step="0.5"
                    min="0.5"
                    disabled={Boolean(formState.theoryCredits.trim() || formState.labCredits.trim())}
                    value={
                      formState.theoryCredits.trim() || formState.labCredits.trim()
                        ? computedPreviewCredits.ok
                          ? String(computedPreviewCredits.totalCredits)
                          : ""
                        : formState.totalCredits
                    }
                    onChange={(e) => setFormState({ ...formState, totalCredits: e.target.value })}
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white font-mono disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="c-var" className="font-medium text-slate-200">Variant / Phase</label>
                  <input
                    id="c-var"
                    value={formState.variant}
                    onChange={(e) => setFormState({ ...formState, variant: e.target.value })}
                    placeholder="e.g. Title Defense, Phase-I"
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="c-dept" className="font-medium text-slate-200">Department</label>
                  <input
                    id="c-dept"
                    value={formState.departmentCode}
                    onChange={(e) => setFormState({ ...formState, departmentCode: e.target.value })}
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="c-desc" className="font-medium text-slate-200">Description (Optional)</label>
                <textarea
                  id="c-desc"
                  rows={2}
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  className="w-full rounded-lg border border-[#1c263c] bg-[#0b0f19] p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1c263c]">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                {!editingCourse && (
                  <Button
                    type="button"
                    variant="outline"
                    isLoading={saving}
                    onClick={() => handleSaveCourse(true)}
                  >
                    Save and Add Another
                  </Button>
                )}
                <Button
                  type="button"
                  variant="institution"
                  isLoading={saving}
                  onClick={() => handleSaveCourse(false)}
                >
                  Save Course
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEACTIVATE / ACTIVATE DIALOG */}
      {toggleCourse && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#1c263c] bg-[#121827] shadow-2xl p-5 space-y-4 text-xs">
            <h2 className="text-base font-bold text-white">
              {toggleCourse.is_active !== false ? "Deactivate Course" : "Activate Course"}
            </h2>
            <p className="text-[#8e9db2]">
              {toggleCourse.code} — {toggleCourse.title}. Historical registrations remain untouched.
            </p>
            <form onSubmit={handleToggleActive} className="space-y-3">
              <textarea
                required
                rows={2}
                value={toggleReason}
                onChange={(e) => setToggleReason(e.target.value)}
                placeholder="Audit reason..."
                className="w-full rounded-lg border border-[#1c263c] bg-[#0b0f19] p-2.5 text-white"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setToggleCourse(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant={toggleCourse.is_active !== false ? "destructive" : "institution"} isLoading={toggling}>
                  Confirm
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
