"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatCard } from "@/components/shared/StatCard";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { useRouter } from "next/navigation";
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatDurationShort } from "@/lib/utils";

const COLORS = ["#6C63FF", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

export default function DashboardOverviewPage() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/overview");
      const { data } = await res.json();
      return data;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const kpi = data?.kpi;
  const projects = data?.projectHealth || [];
  const todayActivity = data?.todayActivity || [];
  const weeklyChart = data?.weeklyChart || [];

  // Aggregate weekly data for stacked chart
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const chartData = weekDays.map((day, i) => {
    const dayData = weeklyChart[i]?.hours || {};
    const entry: Record<string, any> = { day };
    let total = 0;
    Object.entries(dayData).forEach(([projectId, minutes]) => {
      const project = projects.find((p: any) => p.id === projectId);
      const name = project?.name || projectId;
      const hours = Math.round(((minutes as number) / 60) * 10) / 10;
      entry[name] = hours;
      total += hours;
    });
    entry.total = Math.round(total * 10) / 10;
    return entry;
  });

  const projectNames: string[] = Array.from(new Set((projects || []).map((p: any) => p.name as string)));

  const activityColumns = [
    {
      key: "user",
      header: "Employee",
      sortable: true,
      render: (entry: any) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {entry.user?.name?.split(" ").map((n: string) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{entry.user?.name}</span>
        </div>
      ),
    },
    {
      key: "team",
      header: "Team",
      render: (entry: any) => (
        <span className="text-muted-foreground">{entry.user?.team?.name || "--"}</span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (entry: any) => (
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              !entry.checkOutAt ? "bg-success" : "bg-muted-foreground"
            }`}
          />
          <span className={!entry.checkOutAt ? "text-success" : "text-muted-foreground"}>
            {!entry.checkOutAt ? "Active" : "Offline"}
          </span>
        </div>
      ),
    },
    {
      key: "project",
      header: "Project",
      render: (entry: any) => (
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.project?.color }}
          />
          <span>{entry.project?.name || "--"}</span>
        </div>
      ),
    },
    {
      key: "subTask",
      header: "Task",
      render: (entry: any) => (
        <span className="text-muted-foreground">{entry.subTask?.name || "--"}</span>
      ),
    },
    {
      key: "hoursToday",
      header: "Hours Today",
      sortable: true,
      render: (entry: any) => (
        <span className="font-medium">{formatDurationShort(entry.hoursToday)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">Real-time view of your organization</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-surface-raised rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Now"
            value={kpi?.activeEmployeesNow || 0}
            icon={Users}
            description="Employees currently working"
          />
          <StatCard
            title="Hours This Week"
            value={`${kpi?.weekHours || 0}h`}
            icon={Clock}
            description="Across all projects"
          />
          <StatCard
            title="Over Estimate"
            value={kpi?.projectsOverEstimate || 0}
            icon={AlertTriangle}
            description="Projects exceeding budget"
            trend={kpi?.projectsOverEstimate > 0 ? { value: 12, positive: false } : undefined}
          />
          <StatCard
            title="Completed This Month"
            value={kpi?.projectsCompletedThisMonth || 0}
            icon={CheckCircle2}
            description="Projects finished"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border p-5 rounded-xl">
          <h3 className="text-sm font-medium text-foreground mb-4">Project Health</h3>
          <div className="space-y-4">
            {projects.length === 0 ? (
              <EmptyState title="No projects" description="Create your first project to get started" />
            ) : (
              projects.slice(0, 6).map((project: any) => {
                const hoursLogged = project.totalHoursLogged || 0;
                return (
                  <div
                    key={project.id}
                    className="p-4 rounded-lg bg-surface-raised hover:bg-surface-raised/80 cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                    style={{ borderLeft: `3px solid ${project.color}` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{project.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          project.status === "ACTIVE" ? "bg-success/10 text-success" :
                          project.status === "ON_HOLD" ? "bg-warning/10 text-warning" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {project.status}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {hoursLogged}h / {project.estimatedHours}h
                      </span>
                    </div>
                    <ProgressBar
                      value={hoursLogged}
                      max={project.estimatedHours || 1}
                      showLabel={false}
                    />
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card className="border border-border p-5 rounded-xl">
          <h3 className="text-sm font-medium text-foreground mb-4">Weekly Hours</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
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
                <Legend wrapperStyle={{ color: "#94A3B8", fontSize: "12px" }} />
                {projectNames.slice(0, 6).map((name, i) => (
                  <Bar
                    key={name}
                    dataKey={name}
                    stackId="a"
                    fill={COLORS[i % COLORS.length]}
                    radius={[0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="border border-border p-5 rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Today's Activity</h3>
        </div>
        <DataTable
          columns={activityColumns}
          data={todayActivity}
          searchable
          searchPlaceholder="Search employees..."
          emptyMessage="No activity recorded today"
        />
      </Card>
    </div>
  );
}
