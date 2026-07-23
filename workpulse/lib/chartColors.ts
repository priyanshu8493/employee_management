"use client";

import { useTheme } from "next-themes";
import { useMemo } from "react";

export function useChartColors() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return useMemo(
    () => ({
      grid: isDark ? "#2E3147" : "#E2E8F0",
      axis: isDark ? "#94A3B8" : "#64748B",
      tooltipBg: isDark ? "#232640" : "#FFFFFF",
      tooltipBorder: isDark ? "#2E3147" : "#E2E8F0",
      tooltipText: isDark ? "#F1F5F9" : "#0F172A",
      legendText: isDark ? "#94A3B8" : "#64748B",
      emptyBar: isDark ? "#2E3147" : "#E2E8F0",
    }),
    [isDark]
  );
}
