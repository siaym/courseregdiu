"use client";

import * as React from "react";
import Link from "next/link";
import {
  MOCK_STUDENT_CART_SECTIONS,
  MOCK_SECTIONS,
  MOCK_STUDENT_PROFILE,
  MOCK_ADVISOR_PROFILE,
  type ExtendedSection,
} from "@/lib/mock/data";
import {
  getCreditLimitByCgpa,
  formatScheduleSlot,
} from "@/lib/mock/helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ClipboardCheck,
  Trash2,
  Send,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  User,
  Plus,
} from "lucide-react";

export function RegistrationCartView() {
  const [cart, setCart] = React.useState<ExtendedSection[]>(MOCK_STUDENT_CART_SECTIONS);
  const [studentRemarks, setStudentRemarks] = React.useState("");
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [submittedTimestamp, setSubmittedTimestamp] = React.useState<string | null>(null);

  // Credit limits
  const totalCredits = cart.reduce((sum, s) => sum + (s.credits || 0), 0);
  const creditRules = getCreditLimitByCgpa(MOCK_STUDENT_PROFILE.cgpa);
  const isCreditOverload = totalCredits > creditRules.maxCredits;

  // Handle remove
  const handleRemoveSection = (sectionId: string) => {
    setCart((prev) => prev.filter((s) => s.id !== sectionId));
  };

  // Handle switch section
  const handleSwitchSection = (currentSectionId: string, newSectionId: string) => {
    const newSection = MOCK_SECTIONS.find((s) => s.id === newSectionId);
    if (!newSection) return;

    setCart((prev) =>
      prev.map((s) => (s.id === currentSectionId ? newSection : s))
    );
  };

  // Handle finalize submission
  const handleConfirmSubmission = () => {
    setIsSubmitted(true);
    setSubmittedTimestamp(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    setIsSubmitDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-[#006a4e]" />
            <span>Advising Registration Cart</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Review proposed course sections, verify credit limits, and submit for Faculty Academic Advisor approval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link href="/courses">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Browse More Courses
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link href="/schedule">
              <Calendar className="h-3.5 w-3.5 mr-1" />
              View Timetable Grid
            </Link>
          </Button>
        </div>
      </div>

      {/* Success State if submitted */}
      {isSubmitted && (
        <Alert variant="success" className="animate-in fade-in">
          <CheckCircle2 className="h-5 w-5" />
          <AlertTitle className="text-sm font-bold">
            Application Submitted to Academic Advisor
          </AlertTitle>
          <AlertDescription className="text-xs space-y-2 mt-1">
            <p>
              Your advising application for <strong>Spring 2026</strong> ({totalCredits} Credits, {cart.length} Courses) was successfully submitted at <strong>{submittedTimestamp}</strong> and assigned to <strong>{MOCK_ADVISOR_PROFILE.full_name}</strong>.
            </p>
            <div className="pt-1 flex gap-2">
              <Button asChild size="sm" className="bg-[#006a4e] hover:bg-[#00553e] text-white text-xs h-8">
                <Link href="/student/tracking">
                  Track Application Status
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSubmitted(false)}
                className="text-xs h-8"
              >
                Modify Draft Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Credit & Standing Policy Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-muted-foreground mb-1">Total Selected Credits</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {totalCredits.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">
              / max {creditRules.maxCredits.toFixed(1)} Cr
            </span>
          </div>
          <div className="mt-2">
            <Progress
              value={totalCredits}
              max={creditRules.maxCredits}
              variant={isCreditOverload ? "destructive" : "diu"}
              size="sm"
            />
          </div>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-muted-foreground mb-1">Academic Standing</div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-900 dark:text-white">
              CGPA {MOCK_STUDENT_PROFILE.cgpa?.toFixed(2)}
            </span>
            <Badge variant={creditRules.isProbation ? "destructive" : "success"} className="text-[10px]">
              {creditRules.isProbation ? "Academic Probation" : "Good Standing"}
            </Badge>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
            {creditRules.policyNote}
          </p>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-muted-foreground mb-1">Assigned Faculty Advisor</div>
          <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
            {MOCK_ADVISOR_PROFILE.full_name}
          </div>
          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
            {MOCK_ADVISOR_PROFILE.email}
          </div>
        </Card>
      </div>

      {/* Overload Alert Warning */}
      {isCreditOverload && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Credit Limit Exceeded</AlertTitle>
          <AlertDescription className="text-xs">
            You have enrolled in {totalCredits} credits, which exceeds your maximum allowable semester limit of {creditRules.maxCredits} credits. You must drop at least one course before submitting.
          </AlertDescription>
        </Alert>
      )}

      {/* Cart Sections List */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <span>Selected Course Sections ({cart.length})</span>
            </CardTitle>
            <Badge variant="outline" className="text-xs font-mono">
              Spring 2026 Term
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Verify timeslots, section instructor, and room assignments before submitting.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {cart.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-lg">
              <ClipboardCheck className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Your registration cart is empty
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Explore the department course catalog to choose your required courses for Spring 2026.
              </p>
              <Button asChild size="sm" className="mt-4 bg-[#006a4e] text-white text-xs">
                <Link href="/courses">Browse Catalog</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {cart.map((sec) => {
                const alternateSections = MOCK_SECTIONS.filter(
                  (s) => s.course_id === sec.course_id && s.id !== sec.id
                );

                return (
                  <div
                    key={sec.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#006a4e] dark:text-emerald-400">
                          {sec.course_code}
                        </span>
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">
                          {sec.course_title}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {sec.credits?.toFixed(1)} Cr
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Section: {sec.section_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {sec.instructor_name}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {sec.schedule.map(formatScheduleSlot).join(" | ")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      {/* Section Switcher */}
                      {alternateSections.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <select
                            onChange={(e) => handleSwitchSection(sec.id, e.target.value)}
                            value={sec.id}
                            className="h-8 text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2 bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none"
                            title="Switch to alternate section"
                          >
                            <option value={sec.id}>Sec {sec.section_name} (Current)</option>
                            {alternateSections.map((alt) => (
                              <option key={alt.id} value={alt.id}>
                                Sec {alt.section_name} ({alt.instructor_name})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSection(sec.id)}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs h-8 px-2"
                        title="Remove course from cart"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>

        {cart.length > 0 && (
          <CardFooter className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Total: <strong>{cart.length}</strong> Course(s) • <strong>{totalCredits.toFixed(1)}</strong> Credits
            </div>

            <Button
              disabled={isCreditOverload || isSubmitted}
              onClick={() => setIsSubmitDialogOpen(true)}
              className="bg-[#006a4e] hover:bg-[#00553e] text-white text-xs font-semibold px-6"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {isSubmitted ? "Submitted to Advisor" : "Submit Advising Request"}
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={isSubmitDialogOpen} onClose={() => setIsSubmitDialogOpen(false)} maxWidth="md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-[#006a4e]" />
            <span>Confirm Advising Submission</span>
          </DialogTitle>
          <DialogDescription>
            Spring 2026 Course Registration Form • Department of CSE
          </DialogDescription>
        </DialogHeader>

        <DialogContent className="space-y-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Enrolled Courses:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{cart.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Credit Load:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100 font-mono">{totalCredits} Cr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reviewing Advisor:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{MOCK_ADVISOR_PROFILE.full_name}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Optional Student Remarks for Advisor:
            </label>
            <Textarea
              placeholder="e.g., Requested evening section due to internship; retaking CSE221 for grade improvement."
              value={studentRemarks}
              onChange={(e) => setStudentRemarks(e.target.value)}
              className="text-xs"
              rows={3}
            />
          </div>

          <p className="text-[11px] text-muted-foreground">
            Once submitted, your course draft will lock for review. You will receive an automated email notification when your advisor reviews your schedule.
          </p>
        </DialogContent>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setIsSubmitDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmSubmission}
            className="bg-[#006a4e] hover:bg-[#00553e] text-white font-semibold"
          >
            Confirm & Send Application
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
