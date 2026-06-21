"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  color?: "green" | "amber" | "red" | "default";
  showLabel?: boolean;
  className?: string;
}

const colorClasses = {
  green: "bg-success",
  amber: "bg-warning",
  red: "bg-danger",
  default: "bg-primary",
};

function getColor(value: number, max: number): "green" | "amber" | "red" | "default" {
  if (max === 0) return "default";
  const pct = (value / max) * 100;
  if (pct >= 100) return "red";
  if (pct >= 75) return "amber";
  return "green";
}

export function ProgressBar({ value, max, color: forcedColor, showLabel = true, className }: ProgressBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 999) : 0;
  const color = forcedColor || getColor(value, max);

  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{value}h</span>
          <span>{max > 0 ? `${Math.round(pct)}%` : "--"}</span>
        </div>
      )}
      <div className="h-2 bg-surface-raised rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            colorClasses[color]
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}
