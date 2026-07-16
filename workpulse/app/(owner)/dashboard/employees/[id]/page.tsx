"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, UserCheck, UserX, AlertTriangle, Trash2, CalendarDays } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatDurationShort, formatDuration, formatDate } from "@/lib/utils";

const COLORS = ["#6C63FF", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6"];

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: employee, isLoading } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${id}`);
      const { data } = await res.json();
      return data;
    },
    staleTime: 30000,
  });

  const { data: mistakes } = useQuery({
    queryKey: ["employee-mistakes", id],
    queryFn: async () => {
      const res = await fetch(`/api/qc/mistakes?employeeId=${id}`);
      const { data } = await res.json();
      return data || [];
    },
    staleTime: 30000,
  });

  const { data: timeEntries } = useQuery({
    queryKey: ["employee-time-entries", id],
    queryFn: async () => {
      const res = await fetch(`/api/time-entries?userId=${id}&limit=500`);
      const { data } = await res.json();
      return data || [];
    },
    staleTime: 30000,
  });

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      const { data } = await res.json();
      return data || [];
    },
    staleTime: 60000,
  });

  const [leaveYear, setLeaveYear] = useState(new Date().getFullYear());

  const { data: leaveStats } = useQuery({
    queryKey: ["employee-leave-stats", id, leaveYear],
    queryFn: async () => {
      const res = await fetch(`/api/leaves/stats?userId=${id}&year=${leaveYear}`);
      const { data } = await res.json();
      return data;
    },
    staleTime: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee deleted");
      setDeleteId(null);
      router.push("/dashboard/employees");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const { data: result, error } = await res.json();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
      toast.success("Employee updated");
      setEditing(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const monthlyChartData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - 11 + i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      return { key, label: d.toLocaleDateString("en-US", { month: "short" }), hours: 0 };
    });
    if (timeEntries) {
      for (const entry of timeEntries) {
        const d = new Date(entry.checkInAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const m = months.find((m) => m.key === key);
        if (m) m.hours += (entry.durationMinutes || 0) / 60;
      }
    }
    return months.map((m) => ({ month: m.label, hours: Math.round(m.hours * 10) / 10 }));
  }, [timeEntries]);

  if (isLoading) {
    return <div className="space-y-6">
      <div className="h-8 w-48 bg-surface-raised rounded animate-pulse" />
      <div className="h-48 bg-surface-raised rounded-xl animate-pulse" />
    </div>;
  }

  if (!employee) {
    return <div className="text-center py-16 text-muted-foreground">Employee not found</div>;
  }

  const stats = employee.stats || {};
  const projectBreakdown = stats.projectBreakdown || [];

  const timeColumns = [
    { key: "checkInAt", header: "Date", sortable: true, render: (e: any) => formatDate(e.checkInAt) },
    { key: "project", header: "Project", render: (e: any) => (
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: e.project?.color }} />
        <span>{e.project?.name}</span>
      </div>
    )},
    { key: "subTask", header: "Task", render: (e: any) => <span className="text-muted-foreground">{e.subTask?.name}</span> },
    { key: "durationMinutes", header: "Duration", sortable: true, render: (e: any) => formatDuration(e.durationMinutes) },
    { key: "notes", header: "Notes", render: (e: any) => <span className="text-muted-foreground text-sm truncate max-w-[200px] block">{e.notes || "--"}</span> },
  ];

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/dashboard/employees")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Employees
      </button>

      <Card className="border border-border p-6 rounded-xl">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {employee.name?.split(" ").map((n: string) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{employee.name}</h1>
              <p className="text-muted-foreground">{employee.email}</p>
              <div className="flex items-center gap-2 mt-1">
                {employee.designation && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{employee.designation}</span>}
                <span className="text-xs bg-surface-raised px-2 py-0.5 rounded">{employee.team?.name || "No team"}</span>
                <div className="flex items-center gap-1 text-xs">
                  <div className={`w-2 h-2 rounded-full ${employee.isActive ? "bg-success" : "bg-muted-foreground"}`} />
                  <span className={employee.isActive ? "text-success" : "text-muted-foreground"}>
                    {employee.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                {employee.joinedAt && (
                  <span>Joined: <span className="text-foreground">{formatDate(employee.joinedAt)}</span></span>
                )}
                {employee.leftAt && (
                  <span>Left: <span className="text-foreground">{formatDate(employee.leftAt)}</span></span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-border text-foreground"
              onClick={() => setEditing(!editing)}
            >
              Edit Profile
            </Button>
            <Button
              variant="outline"
              className={employee.isActive ? "border-danger text-danger" : "border-success text-success"}
              onClick={() => updateMutation.mutate({ isActive: !employee.isActive })}
            >
              {employee.isActive ? <UserX className="h-4 w-4 mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
              {employee.isActive ? "Deactivate" : "Reactivate"}
            </Button>
            <Button
              variant="outline"
              className="border-danger text-danger"
              onClick={() => setDeleteId(employee.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-lg bg-surface-raised text-center">
            <p className="text-2xl font-bold text-foreground">{formatDurationShort(stats.todayMinutes)}</p>
            <p className="text-xs text-muted-foreground">Today</p>
          </div>
          <div className="p-4 rounded-lg bg-surface-raised text-center">
            <p className="text-2xl font-bold text-foreground">{formatDurationShort(stats.weekMinutes)}</p>
            <p className="text-xs text-muted-foreground">This Week</p>
          </div>
          <div className="p-4 rounded-lg bg-surface-raised text-center">
            <p className="text-2xl font-bold text-foreground">{formatDurationShort(stats.monthMinutes)}</p>
            <p className="text-xs text-muted-foreground">This Month</p>
          </div>
        </div>
      </Card>

      {editing && (
        <Card className="border border-border p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-foreground mb-4">Edit Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Name</Label>
              <Input defaultValue={employee.name} id="edit-name" className="bg-surface border-border text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Email</Label>
              <Input defaultValue={employee.email} id="edit-email" className="bg-surface border-border text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Designation</Label>
              <Input defaultValue={employee.designation || ""} id="edit-designation" className="bg-surface border-border text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Phone</Label>
              <Input defaultValue={employee.phone || ""} id="edit-phone" className="bg-surface border-border text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Team</Label>
              <Select defaultValue={employee.teamId || ""} onValueChange={(v) => {
                const el = document.getElementById("edit-teamId") as HTMLInputElement;
                if (el) el.value = v;
              }}>
                <SelectTrigger className="bg-surface border-border text-foreground">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent className="bg-surface-raised border-border">
                  <SelectItem value="">No team</SelectItem>
                  {(teams || []).map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" id="edit-teamId" defaultValue={employee.teamId || ""} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setEditing(false)} className="border-border text-foreground">Cancel</Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => {
                const name = (document.getElementById("edit-name") as HTMLInputElement)?.value;
                const email = (document.getElementById("edit-email") as HTMLInputElement)?.value;
                const designation = (document.getElementById("edit-designation") as HTMLInputElement)?.value;
                const phone = (document.getElementById("edit-phone") as HTMLInputElement)?.value;
                const teamId = (document.getElementById("edit-teamId") as HTMLInputElement)?.value;
                if (name) updateMutation.mutate({ name, email: email || undefined, designation, phone, teamId: teamId || null });
              }}
            >
              Save
            </Button>
          </div>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="bg-surface border-border">
          <TabsTrigger value="overview" className="data-[state=active]:bg-surface-raised">Overview</TabsTrigger>
          <TabsTrigger value="timelog" className="data-[state=active]:bg-surface-raised">Time Log</TabsTrigger>
          <TabsTrigger value="qcmistakes" className="data-[state=active]:bg-surface-raised relative">
            QC Flags
            {(mistakes?.length || 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-[10px] text-white flex items-center justify-center">
                {mistakes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="leaves" className="data-[state=active]:bg-surface-raised">
            <CalendarDays className="h-3.5 w-3.5 mr-1.5" /> Leaves
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-border p-5 rounded-xl">
              <h3 className="text-sm font-medium text-foreground mb-4">Monthly Hours</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2E3147" />
                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} />
                    <Tooltip contentStyle={{ background: "#232640", border: "1px solid #2E3147", borderRadius: "8px", color: "#F1F5F9" }} />
                    <Bar dataKey="hours" fill="#6C63FF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="border border-border p-5 rounded-xl">
              <h3 className="text-sm font-medium text-foreground mb-4">Project Breakdown</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectBreakdown.map((p: any) => ({ name: p.name, value: Math.round(p.totalMinutes / 60) }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}h`}
                    >
                      {projectBreakdown.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#232640", border: "1px solid #2E3147", borderRadius: "8px", color: "#F1F5F9" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timelog" className="pt-6">
          <DataTable
            columns={timeColumns}
            data={timeEntries || []}
            searchable
            pageSize={20}
            emptyMessage="No time entries"
          />
        </TabsContent>

        <TabsContent value="qcmistakes" className="pt-6">
          {mistakes?.length > 0 ? (
            <div className="space-y-3">
              {mistakes.map((m: any) => (
                <div key={m.id} className="p-4 rounded-lg bg-danger/5 border border-danger/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-danger mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{m.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>Reported by {m.qcReport?.teamLead?.name}</span>
                        <span>·</span>
                        <span>{formatDate(m.createdAt)}</span>
                        <span>·</span>
                        <span>Team: {m.qcReport?.team?.name}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No QC flags for this employee</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="leaves" className="pt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Leave History</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-border text-foreground"
                onClick={() => setLeaveYear((y) => y - 1)}
              >
                &larr;
              </Button>
              <span className="text-sm font-medium text-foreground min-w-[60px] text-center">{leaveYear}</span>
              <Button
                variant="outline"
                size="sm"
                className="border-border text-foreground"
                onClick={() => setLeaveYear((y) => y + 1)}
                disabled={leaveYear >= new Date().getFullYear()}
              >
                &rarr;
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-surface-raised text-center">
              <p className="text-2xl font-bold text-foreground">{leaveStats?.totalLeaves || 0}</p>
              <p className="text-xs text-muted-foreground">Total Leaves ({leaveYear})</p>
            </div>
            <div className="p-4 rounded-lg bg-surface-raised text-center">
              <p className="text-2xl font-bold text-foreground">{leaveStats?.monthlyBreakdown?.[new Date().getMonth()]?.count || 0}</p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </div>
            <div className="p-4 rounded-lg bg-surface-raised text-center">
              <p className="text-2xl font-bold text-foreground">
                {leaveStats?.monthlyBreakdown
                  ?.slice(0, new Date().getMonth() + 1)
                  .reduce((sum: number, m: any) => sum + m.count, 0) || 0}
              </p>
              <p className="text-xs text-muted-foreground">Year to Date</p>
            </div>
          </div>

          <Card className="border border-border p-5 rounded-xl">
            <h3 className="text-sm font-medium text-foreground mb-4">Monthly Breakdown ({leaveYear})</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leaveStats?.monthlyBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2E3147" />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#232640", border: "1px solid #2E3147", borderRadius: "8px", color: "#F1F5F9" }} />
                  <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Leaves" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {leaveStats?.leaves && leaveStats.leaves.length > 0 ? (
            <Card className="border border-border rounded-xl overflow-hidden">
              <div className="divide-y divide-border">
                {leaveStats.leaves.map((leave: any) => (
                  <div key={leave.id} className="flex items-center justify-between p-4 hover:bg-surface-raised/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-4 w-4 text-warning shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(leave.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        {leave.reason && (
                          <p className="text-xs text-muted-foreground mt-0.5">{leave.reason}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No leaves recorded for {leaveYear}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Employee"
        description="This will permanently delete this employee and all their data. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
