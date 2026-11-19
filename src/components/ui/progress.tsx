import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: "default" | "success" | "warning" | "destructive" | "diu";
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
  label?: string;
}

export function Progress({
  value,
  max = 100,
  variant = "diu",
  size = "default",
  showLabel = false,
  label,
  className,
  ...props
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const sizeClasses = {
    sm: "h-1.5",
    default: "h-2.5",
    lg: "h-4",
  }[size];

  const variantFills = {
    default: "bg-slate-700 dark:bg-slate-300",
    diu: "bg-[#006a4e] dark:bg-emerald-500",
    success: "bg-emerald-600",
    warning: "bg-amber-500",
    destructive: "bg-rose-600",
  }[variant];

  return (
    <div className={cn("w-full space-y-1.5", className)} {...props}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center text-xs">
          {label && <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>}
          {showLabel && <span className="text-muted-foreground font-mono">{percentage}%</span>}
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800",
          sizeClasses
        )}
      >
        <div
          className={cn("h-full transition-all duration-300 ease-in-out rounded-full", variantFills)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
