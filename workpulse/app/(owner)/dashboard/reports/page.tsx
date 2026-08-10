"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Download, FileBarChart } from "lucide-react";
import * as XLSX from "xlsx-js-style";
import { formatDurationShort, formatDuration } from "@/lib/utils";
import { useChartColors } from "@/lib/chartColors";

const PRESETS: Record<string, { label: string; getRange: () => { start: string; end: string } }> = {
  today: {
    label: "Today",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { start: start.toISOString(), end: now.toISOString() };
    },
  },
  thisWeek: {
    label: "This Week",
    getRange: () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      start.setHours(0, 0, 0, 0);
      return { start: start.toISOString(), end: now.toISOString() };
    },
  },
  thisMonth: {
    label: "This Month",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: start.toISOString(), end: now.toISOString() };
    },
  },
  lastMonth: {
    label: "Last Month",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { start: start.toISOString(), end: end.toISOString() };
    },
  },
};

export default function ReportsPage() {
  const [preset, setPreset] = useState("thisMonth");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [employeeId, setEmployeeId] = useState("all");
  const chartColors = useChartColors();

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await fetch("/api/employees");
      const { data } = await res.json();
      return data;
    },
    staleTime: 60000,
  });

  const range = useMemo(() => preset === "custom"
    ? { start: customStart ? new Date(customStart).toISOString() : "", end: customEnd ? new Date(customEnd + "T23:59:59").toISOString() : "" }
    : PRESETS[preset]?.getRange() || { start: "", end: "" },
  [preset, customStart, customEnd]);

  const { data, isLoading } = useQuery({
    queryKey: ["reports", range.start, range.end, employeeId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (range.start) params.set("startDate", range.start);
      if (range.end) params.set("endDate", range.end);
      if (employeeId && employeeId !== "all") params.set("employeeId", employeeId);
      const res = await fetch(`/api/reports?${params}`);
      const { data } = await res.json();
      return data;
    },
    staleTime: 60000,
    enabled: !!range.start,
  });

  const csvEscape = (value: string | number | null | undefined) => {
    const str = String(value ?? "");
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  type EmployeeReport = {
    employee?: { id: string; name?: string; email?: string; phone?: string; designation?: string };
    totalWorkingDays: number;
    totalLeaves: number;
    totalWorkingHours: number;
    totalIdleHours: number;
    projectSummary: Array<{ project: string; client: string; hours: number }>;
    qcFlags: number;
  };

  type CellKind = "section" | "label" | "value" | "header" | "data";

  const buildReportRows = (r: EmployeeReport): Array<{ cells: Array<string | number>; kinds: CellKind[] }> => [
    { cells: ["Employee Details"], kinds: ["section"] },
    { cells: ["Employee Name", r.employee?.name || ""], kinds: ["label", "value"] },
    { cells: ["Designation", r.employee?.designation || ""], kinds: ["label", "value"] },
    { cells: ["Ph No", r.employee?.phone || ""], kinds: ["label", "value"] },
    { cells: [], kinds: [] },
    { cells: ["1. Attendance & Time Utilization"], kinds: ["section"] },
    { cells: ["Total Working Days", r.totalWorkingDays], kinds: ["label", "value"] },
    { cells: ["Total Leave", r.totalLeaves], kinds: ["label", "value"] },
    { cells: ["Total Working Hours", `${r.totalWorkingHours}h`], kinds: ["label", "value"] },
    { cells: ["Total Idle Hours/breaks", `${r.totalIdleHours}h`], kinds: ["label", "value"] },
    { cells: [], kinds: [] },
    { cells: ["2. Project-wise Work Summary"], kinds: ["section"] },
    { cells: ["Project", "Client", "Hours"], kinds: ["header", "header", "header"] },
    ...(r.projectSummary || []).map((p) => ({
      cells: [p.project, p.client, `${p.hours}h`],
      kinds: ["data", "data", "data"] as CellKind[],
    })),
    { cells: [], kinds: [] },
    { cells: ["4. Quality Metrics"], kinds: ["section"] },
    { cells: ["Total number of QC flag", r.qcFlags], kinds: ["label", "value"] },
  ];

  const INDIGO = "6C63FF";
  const DARK_TEXT = "2D2A43";
  const BODY_TEXT = "444444";
  const BORDER_LIGHT = "DDD8F0";

  const cellStyle = (kind: CellKind): XLSX.CellStyle => {
    const base: XLSX.CellStyle = { alignment: { vertical: "center" } };
    switch (kind) {
      case "section":
        return {
          ...base,
          font: { bold: true, sz: 13, color: { rgb: "FFFFFF" } },
          fill: { patternType: "solid", fgColor: { rgb: INDIGO } },
          alignment: { horizontal: "left", vertical: "center" },
        };
      case "label":
        return {
          ...base,
          font: { bold: true, sz: 11, color: { rgb: DARK_TEXT } },
          border: { bottom: { style: "thin", color: { rgb: BORDER_LIGHT } } },
          alignment: { horizontal: "left", vertical: "center" },
        };
      case "value":
        return {
          ...base,
          font: { sz: 11, color: { rgb: BODY_TEXT } },
          border: { bottom: { style: "thin", color: { rgb: BORDER_LIGHT } } },
          alignment: { horizontal: "left", vertical: "center" },
        };
      case "header":
        return {
          ...base,
          font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
          fill: { patternType: "solid", fgColor: { rgb: INDIGO } },
          border: {
            top: { style: "thin", color: { rgb: INDIGO } },
            bottom: { style: "thin", color: { rgb: INDIGO } },
          },
          alignment: { horizontal: "left", vertical: "center" },
        };
      case "data":
        return {
          ...base,
          font: { sz: 11, color: { rgb: BODY_TEXT } },
          border: {
            top: { style: "hair", color: { rgb: BORDER_LIGHT } },
            bottom: { style: "hair", color: { rgb: BORDER_LIGHT } },
          },
          alignment: { horizontal: "left", vertical: "center" },
        };
    }
  };

  const buildStyledSheet = (r: EmployeeReport) => {
    const rows = buildReportRows(r);
    const ws = XLSX.utils.aoa_to_sheet(rows.map((row) => row.cells));
    ws["!cols"] = [{ wch: 36 }, { wch: 24 }, { wch: 16 }];
    ws["!rows"] = [];
    ws["!merges"] = [];

    rows.forEach((row, i) => {
      row.cells.forEach((_, c) => {
        const cell = ws[XLSX.utils.encode_cell({ r: i, c })];
        if (cell) cell.s = cellStyle(row.kinds[c] || "data");
      });

      if (row.kinds[0] === "section") {
        ws["!merges"]!.push({ s: { r: i, c: 0 }, e: { r: i, c: 2 } });
        ws["!rows"]![i] = { hpt: 26 };
      } else if (row.kinds[0] === "header") {
        ws["!rows"]![i] = { hpt: 22 };
      } else if (row.kinds.includes("label")) {
        ws["!rows"]![i] = { hpt: 20 };
      }
    });

    return ws;
  };

  const exportCSV = () => {
    const reports: EmployeeReport[] = data?.employeeReports || [];
    if (!reports.length) return;

    if (employeeId !== "all") {
      const report = reports[0];
      if (!report) return;
      const rows = buildReportRows(report).map((row) => row.cells);
      const csv = `\uFEFF${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const name = (report.employee?.name || "employee").replace(/\s+/g, "-").toLowerCase();
      a.href = url;
      a.download = `employee-report-${name}-${preset}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const wb = XLSX.utils.book_new();
    const usedNames = new Set<string>();
    reports.forEach((report, i) => {
      const ws = buildStyledSheet(report);
      let sheetName = (report.employee?.name || `Employee ${i + 1}`).replace(/[\\/?*[\]:]/g, " ").slice(0, 31);
      let unique = sheetName;
      let n = 2;
      while (usedNames.has(unique)) {
        const suffix = ` (${n})`;
        unique = `${sheetName.slice(0, 31 - suffix.length)}${suffix}`;
        n++;
      }
      usedNames.add(unique);
      XLSX.utils.book_append_sheet(wb, ws, unique);
    });
    XLSX.writeFile(wb, `employee-reports-${preset}.xlsx`);
  };

  const employeeColumns = [
    { key: "name", header: "Employee", sortable: true, render: (e: any) => <span className="font-medium">{e.name}</span> },
    { key: "totalHours", header: "Total Hours", sortable: true, render: (e: any) => <span>{e.totalHours}h</span> },
    {
      key: "breakdown",
      header: "Projects",
      render: (e: any) => (
        <div className="flex gap-1 flex-wrap">
          {(e.projectBreakdown || []).map((p: any) => (
            <span key={p.id} className="text-xs bg-surface-raised px-2 py-0.5 rounded flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
              {p.hours}h
            </span>
          ))}
        </div>
      ),
    },
  ];

  const projectColumns = [
    { key: "name", header: "Project", sortable: true, render: (p: any) => (
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
        <span className="font-medium">{p.name}</span>
      </div>
    )},
    { key: "totalHours", header: "Total Hours", sortable: true, render: (p: any) => <span>{p.totalHours}h</span> },
    { key: "percentOfEstimate", header: "% of Estimate", sortable: true, render: (p: any) => (
      <span>{p.percentOfEstimate}%</span>
    )},
    { key: "status", header: "Status", render: (p: any) => (
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        p.status === "ACTIVE" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
      }`}>{p.status}</span>
    )},
  ];

  const subtaskColumns = [
    { key: "project", header: "Project", render: (s: any) => <span>{s.project?.name}</span> },
    { key: "subtask", header: "SubTask", render: (s: any) => <span>{s.subtask?.name}</span> },
    { key: "employee", header: "Employee", render: (s: any) => <span>{s.employee?.name}</span> },
    { key: "totalHours", header: "Hours", sortable: true, render: (s: any) => <span>{s.totalHours}h</span> },
    { key: "status", header: "Status", render: (s: any) => (
      <span className="text-muted-foreground">{s.subtask?.status?.replace("_", " ") || "--"}</span>
    )},
  ];

  const heatmapEntries = Object.entries(data?.heatmap || {}) as [string, number][];
  const heatmapData = heatmapEntries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, minutes]) => ({
      date,
      hours: Math.round((minutes / 60) * 10) / 10,
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Analyze time across your organization</p>
        </div>
        <Button
          variant="outline"
          className="border-border text-foreground"
          onClick={exportCSV}
          disabled={!data || (!data.employeeReports?.length && !data.employeeHours?.length)}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card className="border border-border p-5 rounded-xl">
        <div className="flex items-center gap-4 flex-wrap">
          <Select value={preset} onValueChange={(v) => v && setPreset(v)}>
            <SelectTrigger className="w-40 bg-surface border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface-raised border-border">
              {Object.entries(PRESETS).map(([key, p]) => (
                <SelectItem key={key} value={key}>{p.label}</SelectItem>
              ))}
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          {preset === "custom" && (
            <>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              />
            </>
          )}
          <Select value={employeeId} onValueChange={(v) => v != null && setEmployeeId(v)}>
            <SelectTrigger className="w-48 bg-surface border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface-raised border-border">
              <SelectItem value="all">All Employees</SelectItem>
              {(employees || []).map((e: { id: string; name: string }) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-surface-raised rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !data ? (
        <EmptyState
          icon={<FileBarChart className="h-10 w-10 text-primary" />}
          title="No data"
          description="Select a date range to view reports"
        />
      ) : (
        <>
          <Card className="border border-border p-5 rounded-xl">
            <h3 className="text-sm font-medium text-foreground mb-4">Hours by Employee</h3>
            <div className="h-56 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(data.employeeHours || []).map((e: any) => ({
                    name: e.name?.split(" ")[0],
                    hours: e.totalHours,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="name" stroke={chartColors.axis} fontSize={12} />
                  <YAxis stroke={chartColors.axis} fontSize={12} unit="h" />
                  <Tooltip
                    contentStyle={{ background: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: "8px", color: chartColors.tooltipText }}
                  />
                  <Bar dataKey="hours" fill="#6C63FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <DataTable columns={employeeColumns} data={data.employeeHours || []} pageSize={10} emptyMessage="No data" />
          </Card>

          <Card className="border border-border p-5 rounded-xl">
            <h3 className="text-sm font-medium text-foreground mb-4">Hours by Project</h3>
            <div className="h-96 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(data.projectHours || []).map((p: any) => ({
                    name: p.name,
                    hours: p.totalHours,
                  }))}
                  margin={{ bottom: 20, left: 10, right: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis
                    dataKey="name"
                    stroke={chartColors.axis}
                    fontSize={11}
                    interval={0}
                    tick={(props) => {
                      const { x, y, payload } = props;
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text x={0} y={0} dy={8} textAnchor="end" fill={chartColors.axis} fontSize={11} transform="rotate(-90)">
                            {payload.value}
                          </text>
                        </g>
                      );
                    }}
                    height={0}
                  />
                  <YAxis stroke={chartColors.axis} fontSize={12} unit="h" />
                  <Tooltip
                    contentStyle={{ background: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: "8px", color: chartColors.tooltipText }}
                  />
                  <Bar dataKey="hours" fill="#22C55E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <DataTable columns={projectColumns} data={data.projectHours || []} pageSize={10} emptyMessage="No data" />
          </Card>

          <Card className="border border-border p-5 rounded-xl">
            <h3 className="text-sm font-medium text-foreground mb-4">Hours by SubTask</h3>
            <DataTable columns={subtaskColumns} data={data.subTaskHours || []} pageSize={15} emptyMessage="No data" />
          </Card>

          {heatmapData.length > 0 && (
            <Card className="border border-border p-5 rounded-xl">
              <h3 className="text-sm font-medium text-foreground mb-4">Daily Heatmap</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={heatmapData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="date" stroke={chartColors.axis} fontSize={10} angle={-45} textAnchor="end" height={60} />
                    <YAxis stroke={chartColors.axis} fontSize={11} unit="h" />
                    <Tooltip
                      contentStyle={{ background: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: "8px", color: chartColors.tooltipText }}
                    />
                    <Bar dataKey="hours" fill="#F59E0B" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
