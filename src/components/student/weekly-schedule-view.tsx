"use client";

import * as React from "react";
import {
  MOCK_STUDENT_CART_SECTIONS,
  type ExtendedSection,
} from "@/lib/mock/data";
import { formatScheduleSlot } from "@/lib/mock/helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  Printer,
  MapPin,
  User,
} from "lucide-react";

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"] as const;
const TIME_SLOTS = [
  { start: "08:30", end: "10:00", label: "08:30 - 10:00 AM" },
  { start: "10:00", end: "11:30", label: "10:00 - 11:30 AM" },
  { start: "11:30", end: "13:00", label: "11:30 - 01:00 PM" },
  { start: "13:00", end: "14:30", label: "01:00 - 02:30 PM (Break)" },
  { start: "14:30", end: "16:00", label: "02:30 - 04:00 PM" },
  { start: "16:00", end: "17:30", label: "04:00 - 05:30 PM" },
];

// Color palette for classes
const COURSE_COLORS = [
  "bg-emerald-100/90 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800",
  "bg-blue-100/90 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-800",
  "bg-amber-100/90 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800",
  "bg-purple-100/90 text-purple-900 border-purple-300 dark:bg-purple-950/80 dark:text-purple-200 dark:border-purple-800",
  "bg-rose-100/90 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800",
];

export function WeeklyScheduleView() {
  const sections = MOCK_STUDENT_CART_SECTIONS;
  const [selectedClass, setSelectedClass] = React.useState<ExtendedSection | null>(null);

  // Map each course code to a unique color
  const colorMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    let colorIdx = 0;
    sections.forEach((sec) => {
      const code = sec.course_code || sec.id;
      if (!map[code]) {
        map[code] = COURSE_COLORS[colorIdx % COURSE_COLORS.length];
        colorIdx++;
      }
    });
    return map;
  }, [sections]);

  // Find classes for a specific day and time slot
  const getClassesForSlot = (day: string, slotStart: string, slotEnd: string) => {
    return sections.filter((sec) =>
      sec.schedule.some((s) => s.day === day && s.start_time <= slotStart && s.end_time >= slotEnd)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-7 w-7 text-[#006a4e]" />
            <span>Weekly Class Timetable</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Visual routine schedule for Spring 2026 semester • Saturday to Thursday • Daffodil Smart City
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs"
          >
            <Printer className="h-3.5 w-3.5 mr-1" />
            Print Timetable
          </Button>
        </div>
      </div>

      {/* Timetable Grid Container */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#006a4e]" />
              <CardTitle className="text-sm font-semibold">
                Class Routine Matrix ({sections.length} Enrolled Sections)
              </CardTitle>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Zero schedule collisions detected</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[760px]">
            {/* Grid Header: Days */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-center text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/70">
              <div className="p-3 border-r border-slate-200 dark:border-slate-800 text-left pl-4 text-muted-foreground">
                Time Slot
              </div>
              {DAYS.map((day) => (
                <div key={day} className="p-3 border-r last:border-r-0 border-slate-200 dark:border-slate-800">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid Rows: Time Slots */}
            {TIME_SLOTS.map((slot) => {
              const isBreak = slot.start === "13:00";

              return (
                <div
                  key={slot.start}
                  className={`grid grid-cols-7 border-b last:border-b-0 border-slate-200 dark:border-slate-800 min-h-[90px] ${
                    isBreak ? "bg-slate-50/80 dark:bg-slate-950/40" : ""
                  }`}
                >
                  {/* Slot label */}
                  <div className="p-3 border-r border-slate-200 dark:border-slate-800 font-mono text-[11px] text-muted-foreground flex items-center">
                    {slot.label}
                  </div>

                  {/* Day Cells */}
                  {DAYS.map((day) => {
                    const matchedClasses = getClassesForSlot(day, slot.start, slot.end);
                    const hasClash = matchedClasses.length > 1;

                    return (
                      <div
                        key={day}
                        className={`p-1.5 border-r last:border-r-0 border-slate-200 dark:border-slate-800 flex flex-col gap-1 relative ${
                          hasClash ? "bg-rose-50 dark:bg-rose-950/30" : ""
                        }`}
                      >
                        {isBreak && matchedClasses.length === 0 && (
                          <div className="h-full flex items-center justify-center text-[10px] text-slate-400 italic">
                            Prayer & Lunch Break
                          </div>
                        )}

                        {matchedClasses.map((item) => {
                          const color = colorMap[item.course_code || item.id] || "bg-slate-100";

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setSelectedClass(item)}
                              className={`w-full text-left p-2 rounded-lg border text-xs transition-transform hover:scale-[1.02] shadow-2xs ${color}`}
                            >
                              <div className="font-mono font-bold leading-none">
                                {item.course_code}
                              </div>
                              <div className="font-semibold text-[11px] truncate mt-0.5">
                                Sec {item.section_name}
                              </div>
                              <div className="text-[10px] opacity-80 mt-1 flex items-center gap-1">
                                <MapPin className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate">{item.room || "Lab/Room"}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Course Legend Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {sections.map((sec) => (
          <div
            key={sec.id}
            className={`p-3 rounded-lg border text-xs ${colorMap[sec.course_code || sec.id]}`}
          >
            <div className="font-mono font-bold">{sec.course_code}</div>
            <div className="font-medium text-[11px] truncate mt-0.5">{sec.course_title}</div>
            <div className="text-[10px] mt-1 opacity-80">
              Sec {sec.section_name} • {sec.instructor_name}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Class Detail Modal */}
      {selectedClass && (
        <Dialog open={Boolean(selectedClass)} onClose={() => setSelectedClass(null)} maxWidth="sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-[#006a4e]">{selectedClass.course_code}</span>
              <span>- Sec {selectedClass.section_name}</span>
            </DialogTitle>
            <DialogDescription>
              {selectedClass.course_title} ({selectedClass.credits} Credits)
            </DialogDescription>
          </DialogHeader>

          <DialogContent className="space-y-3 text-xs">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
              <User className="h-4 w-4 text-slate-500" />
              <div>
                <span className="text-muted-foreground block text-[10px]">Instructor:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedClass.instructor_name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
              <MapPin className="h-4 w-4 text-slate-500" />
              <div>
                <span className="text-muted-foreground block text-[10px]">Assigned Room:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedClass.room || "DSC Campus"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
              <Clock className="h-4 w-4 text-slate-500" />
              <div>
                <span className="text-muted-foreground block text-[10px]">Weekly Routine:</span>
                <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                  {selectedClass.schedule.map(formatScheduleSlot).join(" | ")}
                </span>
              </div>
            </div>
          </DialogContent>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setSelectedClass(null)}>
              Close
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
