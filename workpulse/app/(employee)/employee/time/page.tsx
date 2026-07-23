"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { Clock, CalendarDays } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DataTable } from "@/components/shared/DataTable";
import { formatDuration, formatTime, formatDurationShort } from "@/lib/utils";
import { startOfWeek } from "date-fns";

export default function EmployeeTimePage() {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const { data: todayEntries } = useQuery({
    queryKey: ["time-entries", "today"],
    queryFn: async () => {
      const res = await fetch(
        `/api/time-entries?startDate=${todayStart.toISOString()}&limit=100`
      );
      const { data } = await res.json();
      return data || [];
    },
    staleTime: 30000,
  });

  const totalMinutesToday = (todayEntries || []).reduce(
    (sum: number, e: any) => sum + (e.durationMinutes || 0),
    0
  );

  const weekStart = startOfWeek(today);
  const weekEnd = new Date(today);
  weekEnd.setHours(23, 59, 59, 999);

  const { data: weekData } = useQuery({
    queryKey: ["time-entries", "week"],
    queryFn: async () => {
      const res = await fetch(
        `/api/time-entries?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}&limit=500`
      );
      const { data } = await res.json();
      return data || [];
    },
    staleTime: 60000,
  });

  const weekChartData = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const dayEntries = (weekData || []).filter((e: any) => {
      const eDate = new Date(e.checkInAt);
      return (
        eDate.getDate() === day.getDate() &&
        eDate.getMonth() === day.getMonth() &&
        eDate.getFullYear() === day.getFullYear()
      );
    });
    const totalMin = dayEntries.reduce((sum: number, e: any) => sum + (e.durationMinutes || 0), 0);
    return {
      day: format(day, "EEE"),
      hours: Math.round((totalMin / 60) * 10) / 10,
    };
  });

  const columns = [
    {
      key: "project",
      header: "Project",
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
      key: "checkInAt",
      header: "Check-in",
      sortable: true,
      render: (entry: any) => formatTime(entry.checkInAt),
    },
    {
      key: "checkOutAt",
      header: "Check-out",
      sortable: true,
      render: (entry: any) => formatTime(entry.checkOutAt),
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
        <span className="text-muted-foreground text-sm truncate max-w-[200px] block">
          {entry.notes || "--"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">My Time</h1>
        <p className="text-muted-foreground mt-1">Track your work hours</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-border p-5 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Today</p>
              <p className="text-2xl font-bold text-foreground">
                {formatDurationShort(totalMinutesToday)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="border border-border p-5 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-success/10">
              <CalendarDays className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className="text-2xl font-bold text-foreground">
                {formatDurationShort(
                  (weekData || []).reduce((s: number, e: any) => s + (e.durationMinutes || 0), 0)
                )}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border border-border p-4 sm:p-5 rounded-xl">
        <h3 className="text-sm font-medium text-foreground mb-4">Weekly Hours</h3>
        <div className="h-48 sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2E3147" />
              <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} />
              <YAxis stroke="#94A3B8" fontSize={12} unit="h" />
              <Tooltip
                contentStyle={{
                  background: "#232640",
                  border: "1px solid #2E3147",
                  borderRadius: "8px",
                  color: "#F1F5F9",
                }}
              />
              <Bar dataKey="hours" fill="#6C63FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Today's Entries</h3>
        <DataTable
          columns={columns}
          data={todayEntries || []}
          searchable
          searchPlaceholder="Search entries..."
          emptyMessage="No time entries for today"
        />
      </div>
    </div>
  );
}
