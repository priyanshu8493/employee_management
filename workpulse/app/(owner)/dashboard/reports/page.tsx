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
import { formatDurationShort, formatDuration } from "@/lib/utils";

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

  const range = preset === "custom"
    ? { start: customStart ? new Date(customStart).toISOString() : "", end: customEnd ? new Date(customEnd + "T23:59:59").toISOString() : "" }
    : PRESETS[preset]?.getRange() || { start: "", end: "" };

  const { data, isLoading } = useQuery({
    queryKey: ["reports", range.start, range.end],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (range.start) params.set("startDate", range.start);
      if (range.end) params.set("endDate", range.end);
      const res = await fetch(`/api/reports?${params}`);
      const { data } = await res.json();
      return data;
    },
    staleTime: 60000,
    enabled: !!range.start,
  });

  const exportCSV = () => {
    const employeeData = data?.employeeHours || [];
    if (!employeeData.length) return;
    const headers = ["Employee", "Total Hours", "Project Breakdown"];
    const rows = employeeData.map((e: any) => [
      e.name,
      e.totalHours,
      (e.projectBreakdown || []).map((p: any) => `${p.name}: ${p.hours}h`).join("; "),
    ]);
    const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${preset}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const employeeColumns = [
    { key: "name", header: "Employee", sortable: true, render: (e: any) => <span className="font-medium">{e.name}</span> },
    { key: "team", header: "Team", render: (e: any) => <span className="text-muted-foreground">{e.team?.name || "--"}</span> },
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Analyze time across your organization</p>
        </div>
        <Button
          variant="outline"
          className="border-border text-foreground"
          onClick={exportCSV}
          disabled={!data?.employeeHours?.length}
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#2E3147" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
                  <YAxis stroke="#94A3B8" fontSize={12} unit="h" />
                  <Tooltip
                    contentStyle={{ background: "#232640", border: "1px solid #2E3147", borderRadius: "8px", color: "#F1F5F9" }}
                  />
                  <Bar dataKey="hours" fill="#6C63FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <DataTable columns={employeeColumns} data={data.employeeHours || []} pageSize={10} emptyMessage="No data" />
          </Card>

          <Card className="border border-border p-5 rounded-xl">
            <h3 className="text-sm font-medium text-foreground mb-4">Hours by Project</h3>
            <div className="h-56 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(data.projectHours || []).map((p: any) => ({
                    name: p.name,
                    hours: p.totalHours,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2E3147" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
                  <YAxis stroke="#94A3B8" fontSize={12} unit="h" />
                  <Tooltip
                    contentStyle={{ background: "#232640", border: "1px solid #2E3147", borderRadius: "8px", color: "#F1F5F9" }}
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#2E3147" />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} angle={-45} textAnchor="end" height={60} />
                    <YAxis stroke="#94A3B8" fontSize={11} unit="h" />
                    <Tooltip
                      contentStyle={{ background: "#232640", border: "1px solid #2E3147", borderRadius: "8px", color: "#F1F5F9" }}
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
