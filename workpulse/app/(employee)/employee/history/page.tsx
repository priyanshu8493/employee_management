"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { formatDateTime, formatDuration, formatDurationShort } from "@/lib/utils";
import { Download } from "lucide-react";

export default function EmployeeHistoryPage() {
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const startDate = dateRange.start || thirtyDaysAgo.toISOString().split("T")[0];
  const endDate = dateRange.end || today.toISOString().split("T")[0];

  const { data: entries, isLoading } = useQuery({
    queryKey: ["time-entries", "history", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate + "T23:59:59").toISOString(),
        limit: "500",
      });
      const res = await fetch(`/api/time-entries?${params}`);
      const { data } = await res.json();
      return data || [];
    },
    staleTime: 30000,
  });

  const exportCSV = () => {
    if (!entries?.length) return;
    const headers = ["Project", "SubTask", "Check In", "Check Out", "Duration (min)", "Notes"];
    const rows = entries.map((e: any) => [
      e.project?.name,
      e.subTask?.name,
      new Date(e.checkInAt).toLocaleString(),
      e.checkOutAt ? new Date(e.checkOutAt).toLocaleString() : "Active",
      e.durationMinutes || 0,
      e.notes || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `time-entries-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      key: "checkInAt",
      header: "Date",
      sortable: true,
      render: (entry: any) => (
        <div>
          <p className="text-sm">{formatDateTime(entry.checkInAt)}</p>
        </div>
      ),
    },
    {
      key: "project",
      header: "Project",
      sortable: true,
      render: (entry: any) => (
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.project?.color }}
          />
          <span>{entry.project?.name}</span>
        </div>
      ),
    },
    {
      key: "subTask",
      header: "SubTask",
      render: (entry: any) => <span className="text-muted-foreground">{entry.subTask?.name}</span>,
    },
    {
      key: "durationMinutes",
      header: "Duration",
      sortable: true,
      render: (entry: any) => (
        <span className="font-medium">{formatDuration(entry.durationMinutes)}</span>
      ),
    },
    {
      key: "notes",
      header: "Notes",
      render: (entry: any) => (
        <span className="text-muted-foreground text-sm truncate max-w-[250px] block">
          {entry.notes || "--"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">History</h1>
          <p className="text-muted-foreground mt-1">View your past time entries</p>
        </div>
        <Button
          variant="outline"
          className="border-border text-foreground"
          onClick={exportCSV}
          disabled={!entries?.length}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card className="border border-border p-5 rounded-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))}
              className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))}
              className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div className="pt-5 text-sm text-muted-foreground">
            {entries?.length || 0} entries ·{" "}
            {formatDurationShort(entries?.reduce((s: number, e: any) => s + (e.durationMinutes || 0), 0))} total
          </div>
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={entries || []}
        loading={isLoading}
        searchable
        searchPlaceholder="Search entries..."
        pageSize={20}
        emptyMessage="No time entries found in this date range"
      />
    </div>
  );
}
