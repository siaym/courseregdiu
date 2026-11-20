"use client";

import * as React from "react";
import Link from "next/link";
import {
  Layers,
  Search,
  Plus,
  Trash2,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MOCK_COURSES,
  ACTIVE_MOCK_SEMESTER_LABEL,
  type ExtendedCourse,
} from "@/lib/mock/data";
import {
  addCourseToBatchAction,
  removeCourseFromBatchAction,
  getBatchCoursesAction,
} from "@/app/admin/actions";
import type { BatchSemesterCourseRecord } from "@/lib/curriculum/batch-course-service";

interface AdminBatchCourseStudioProps {
  initialRecords: BatchSemesterCourseRecord[];
  initialBatch: string;
  initialSemesterId: string;
}

export function AdminBatchCourseStudio({
  initialRecords,
  initialBatch = "69",
  initialSemesterId = "sem-spring-2027",
}: AdminBatchCourseStudioProps) {
  const [selectedSemester, setSelectedSemester] = React.useState(initialSemesterId);
  const [selectedBatch, setSelectedBatch] = React.useState(initialBatch);
  const [configuredCourses, setConfiguredCourses] = React.useState<BatchSemesterCourseRecord[]>(initialRecords);

  const [catalogSearch, setCatalogSearch] = React.useState("");
  const [feedback, setFeedback] = React.useState<{ text: string; type: "success" | "warning" } | null>(null);
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Available batches to configure
  const batches = ["69", "60", "70", "59", "58"];

  // Fetch configured courses when batch or semester changes
  const handleBatchOrSemesterChange = async (newSem: string, newBatch: string) => {
    setSelectedSemester(newSem);
    setSelectedBatch(newBatch);
    setIsUpdating(true);
    try {
      const res = await getBatchCoursesAction(newSem, newBatch);
      if (res.success && res.records) {
        setConfiguredCourses(res.records);
      }
    } catch {
      setFeedback({ text: "Failed to reload batch configuration.", type: "warning" });
    } finally {
      setIsUpdating(false);
    }
  };

  // Add course to batch configuration
  const handleAddCourse = async (course: ExtendedCourse) => {
    setIsUpdating(true);
    setFeedback(null);
    try {
      const res = await addCourseToBatchAction(selectedSemester, selectedBatch, course.id);
      if (!res.success) {
        setFeedback({ text: res.error || "Failed to add course to batch.", type: "warning" });
        return;
      }

      setFeedback({
        text: `Successfully added ${course.code} to Batch ${selectedBatch} course offerings.`,
        type: "success",
      });

      // Refresh list
      const reload = await getBatchCoursesAction(selectedSemester, selectedBatch);
      if (reload.success && reload.records) {
        setConfiguredCourses(reload.records);
      }
    } catch {
      setFeedback({ text: "Server error occurred while configuring course.", type: "warning" });
    } finally {
      setIsUpdating(false);
    }
  };

  // Remove course from batch configuration
  const handleRemoveCourse = async (courseId: string, courseCode: string) => {
    setIsUpdating(true);
    setFeedback(null);
    try {
      const res = await removeCourseFromBatchAction(selectedSemester, selectedBatch, courseId);
      if (!res.success) {
        setFeedback({ text: res.error || "Failed to remove course.", type: "warning" });
        return;
      }

      setFeedback({
        text: `Removed ${courseCode} from Batch ${selectedBatch} offerings.`,
        type: "success",
      });

      // Update state
      setConfiguredCourses((prev) => prev.filter((r) => r.courseId !== courseId && r.course.id !== courseId));
    } catch {
      setFeedback({ text: "Server error occurred while removing course.", type: "warning" });
    } finally {
      setIsUpdating(false);
    }
  };

  // Total credits configured
  const totalConfiguredCredits = React.useMemo(() => {
    return configuredCourses.reduce((sum, r) => sum + (r.course.credits || 3.0), 0);
  }, [configuredCourses]);

  // Catalog filtered for adding
  const catalogFiltered = React.useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return MOCK_COURSES.filter((c) => {
      if (!q) return true;
      return c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q);
    });
  }, [catalogSearch]);

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto py-2">
      {/* Top Header */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-950/80 border border-blue-800 text-blue-400">
              <Layers className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Batch & Semester Course Configuration
            </h1>
          </div>
          <p className="text-xs text-[#8e9db2]">
            Configure fixed course offerings available for student cohorts. Students only see and register for courses assigned to their batch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="text-xs text-[#8e9db2] hover:text-white inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1c263c] hover:bg-[#1a233a] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Admin Center</span>
          </Link>
          <Link
            href="/admin/payments"
            className="text-xs text-[#8e9db2] hover:text-white inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1c263c] hover:bg-[#1a233a] transition-colors"
          >
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span>Payment Clearances</span>
          </Link>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
            feedback.type === "success"
              ? "bg-[#121827] border-emerald-800 text-emerald-300"
              : "bg-[#121827] border-amber-800 text-amber-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Controls Bar: Semester & Batch Selectors */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Semester Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#8e9db2] font-semibold">Active Term:</span>
            <select
              value={selectedSemester}
              onChange={(e) => handleBatchOrSemesterChange(e.target.value, selectedBatch)}
              className="bg-[#0b0f19] border border-[#1c263c] rounded-lg px-3 py-1.5 text-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="sem-spring-2027">Spring 2027 (Active Term)</option>
              <option value="sem-summer-2027">Summer 2027 (Upcoming)</option>
              <option value="sem-fall-2026">Fall 2026 (Historical)</option>
            </select>
          </div>

          {/* Batch Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#8e9db2] font-semibold">Student Batch:</span>
            <div className="inline-flex rounded-lg bg-[#0b0f19] p-0.5 border border-[#1c263c]">
              {batches.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleBatchOrSemesterChange(selectedSemester, b)}
                  className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-all ${
                    selectedBatch === b
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Batch {b}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Configuration Metrics */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="px-2.5 py-1 rounded bg-[#0b0f19] border border-[#1c263c]">
            <span className="text-[#8e9db2] text-[11px] mr-1.5">Assigned Courses:</span>
            <strong className="text-white">{configuredCourses.length}</strong>
          </div>
          <div className="px-2.5 py-1 rounded bg-[#0b0f19] border border-[#1c263c]">
            <span className="text-[#8e9db2] text-[11px] mr-1.5">Total Credits:</span>
            <strong className="text-emerald-400">{totalConfiguredCredits.toFixed(1)} Cr</strong>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Assigned Courses (Left 7) vs Add from Catalog (Right 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Currently Configured Courses */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1c263c] pb-3">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Courses Assigned to Batch {selectedBatch}
                </h2>
                <p className="text-[11px] text-[#8e9db2]">
                  These {configuredCourses.length} courses are the only courses students in Batch {selectedBatch} can enroll in for {ACTIVE_MOCK_SEMESTER_LABEL}.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold bg-[#0b0f19] px-2 py-0.5 rounded border border-[#1c263c]">
                {totalConfiguredCredits.toFixed(1)} Credits
              </span>
            </div>

            {configuredCourses.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-[#0b0f19] rounded-xl border border-[#1c263c] space-y-2">
                <BookOpen className="h-6 w-6 text-slate-600 mx-auto" />
                <div>No courses configured for Batch {selectedBatch} yet.</div>
                <p className="text-[11px] text-[#8e9db2]">
                  Select courses from the Master Catalog on the right to assign them to this batch.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {configuredCourses.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-xl bg-[#0b0f19] border border-[#1c263c] flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-400">
                          {r.course.code}
                        </span>
                        <span className="text-slate-200 font-medium truncate">
                          {r.course.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          ({r.course.credits.toFixed(1)} Cr)
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8e9db2] flex items-center gap-2">
                        <span>Dept: {r.course.department_code}</span>
                        <span>•</span>
                        <span>Level: {r.course.level || 1}</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => handleRemoveCourse(r.courseId, r.course.code)}
                      className="h-7 text-xs text-rose-400 border-rose-900/50 hover:bg-rose-950/40 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      <span>Remove</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Master Course Catalog to Add Courses */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-4 sm:p-5 space-y-4">
            <div className="space-y-1 border-b border-[#1c263c] pb-3">
              <h2 className="text-sm font-bold text-white">
                Add from Master Catalog
              </h2>
              <p className="text-[11px] text-[#8e9db2]">
                Search all 20 DIU courses and assign them to Batch {selectedBatch}.
              </p>
            </div>

            {/* Catalog Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search course code or title..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0b0f19] border border-[#1c263c] rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Catalog List */}
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {catalogFiltered.map((course) => {
                const isAlreadyConfigured = configuredCourses.some(
                  (r) => r.courseId === course.id || r.course.code === course.code
                );

                return (
                  <div
                    key={course.id}
                    className="p-2.5 rounded-lg bg-[#0b0f19] border border-[#1c263c] flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-blue-400">
                          {course.code}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          ({course.credits.toFixed(1)} Cr)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 truncate">
                        {course.title}
                      </div>
                    </div>

                    {isAlreadyConfigured ? (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded shrink-0">
                        Configured
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => handleAddCourse(course)}
                        className="h-7 text-xs bg-white hover:bg-slate-100 text-[#0b0f19] font-medium shrink-0"
                      >
                        <Plus className="h-3 w-3 mr-1 text-[#0b0f19]" />
                        <span>Add</span>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
