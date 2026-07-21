"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/DataTable";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Legend,
} from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Trash2, Edit3, Users, Archive } from "lucide-react";
import { formatDuration, formatTime, formatDate, formatDurationShort } from "@/lib/utils";

const STATUS_ORDER = ["TODO", "IN_PROGRESS", "DONE"] as const;
const PRESET_COLORS = ["#6C63FF", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#14B8A6"];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [editSubtask, setEditSubtask] = useState<any>(null);
  const [deleteSubtaskId, setDeleteSubtaskId] = useState<string | null>(null);
  const [newSubtask, setNewSubtask] = useState({ name: "", description: "", estimatedHours: 0, assignedToIds: [] as string[] });
  const [newLeaderIds, setNewLeaderIds] = useState<string[]>([]);
  const [showLeaderAssignment, setShowLeaderAssignment] = useState(false);
  const [assignSubtask, setAssignSubtask] = useState<any>(null);
  const [assignSelectedIds, setAssignSelectedIds] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: project, isLoading, error } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    staleTime: 30000,
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-all"],
    queryFn: async () => {
      const res = await fetch("/api/employees");
      const { data } = await res.json();
      return data || [];
    },
    staleTime: 30000,
  });

  const { data: allEmployees } = useQuery({
    queryKey: ["employees-all"],
    queryFn: async () => {
      const res = await fetch("/api/employees");
      const { data } = await res.json();
      return data || [];
    },
    staleTime: 30000,
  });

  const { data: timeLogEntries } = useQuery({
    queryKey: ["project-time-log", id],
    queryFn: async () => {
      const res = await fetch(`/api/time-entries?projectId=${id}&limit=500`);
      const { data } = await res.json();
      return data || [];
    },
    staleTime: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const { data: result, error } = await res.json();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      toast.success("Project updated");
      setEditing(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
      setDeleteId(null);
      router.push("/dashboard/projects");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createSubtaskMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${id}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSubtask),
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      toast.success("Subtask created");
      setShowAddSubtask(false);
      setNewSubtask({ name: "", description: "", estimatedHours: 0, assignedToIds: [] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: async (subtaskId: string) => {
      const res = await fetch(`/api/subtasks/${subtaskId}`, { method: "DELETE" });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      toast.success("Subtask deleted");
      setDeleteSubtaskId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const assignLeadersMutation = useMutation({
    mutationFn: async (leaderIds: string[]) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaderIds }),
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      toast.success("Leaders updated");
      setShowLeaderAssignment(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: async ({ subtaskId, data }: { subtaskId: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const { data: result, error } = await res.json();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      setEditSubtask(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-surface-raised rounded animate-pulse" />
        <div className="h-64 bg-surface-raised rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Project not found</p>
        {error && <p className="text-danger text-sm mt-2">{(error as Error).message}</p>}
      </div>
    );
  }

  const completedEntries = (project.timeEntries || []) as { durationMinutes: number }[];
  const totalMinutes = completedEntries.reduce((s, e) => s + (e.durationMinutes || 0), 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const progressPercent = project.estimatedHours > 0
    ? Math.min((totalHours / project.estimatedHours) * 100, 999)
    : 0;

  // Daily hours for burndown chart (use timeLogEntries for full date info)
  const dailyHours: Record<string, number> = {};
  (timeLogEntries || []).forEach((e: any) => {
    const day = new Date(e.checkInAt).toISOString().split("T")[0];
    dailyHours[day] = (dailyHours[day] || 0) + (e.durationMinutes || 0);
  });
  const burndownData = Object.entries(dailyHours)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, minutes]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      hours: Math.round((minutes / 60) * 10) / 10,
    }));

  const allMembers = employees || [];

  const subtaskColumns = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (s: any) => <span className="font-medium">{s.name}</span>,
    },
    {
      key: "assignments",
      header: "Assigned To",
      render: (s: any) => {
        const assignees = s.assignments || [];
        if (assignees.length > 0) {
          return (
            <div className="flex flex-wrap gap-1">
              {assignees.map((a: any) => (
                <span key={a.userId} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {a.user?.name}
                </span>
              ))}
            </div>
          );
        }
        return <span className="text-muted-foreground text-sm italic">Unassigned</span>;
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (s: any) => (
        <Select
          value={s.status}
          onValueChange={(v) => updateSubtaskMutation.mutate({ subtaskId: s.id, data: { status: v } })}
        >
          <SelectTrigger className="w-32 h-7 bg-surface border-border text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-surface-raised border-border">
            {STATUS_ORDER.map((st) => (
              <SelectItem key={st} value={st}>{st.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "estimatedHours",
      header: "Est. Hours",
      render: (s: any) => <span className="text-muted-foreground">{s.estimatedHours || "--"}</span>,
    },
    {
      key: "entries",
      header: "Time Entries",
      render: (s: any) => <span className="text-muted-foreground">{s._count?.timeEntries || 0}</span>,
    },
    {
      key: "assign",
      header: "Assign",
      render: (s: any) => {
        const assignedIds = (s.assignments || []).map((a: any) => a.userId);
        return (
          <div className="flex items-center gap-1">
            <div className="flex flex-wrap gap-1">
              {assignedIds.slice(0, 2).map((id: string) => {
                const member = allMembers.find((m: any) => m.id === id);
                return member ? (
                  <span key={id} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {member.name?.split(" ")[0]}
                  </span>
                ) : null;
              })}
              {assignedIds.length > 2 && (
                <span className="text-xs text-muted-foreground">+{assignedIds.length - 2}</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground"
              onClick={() => {
                setAssignSubtask(s);
                setAssignSelectedIds(assignedIds);
              }}
            >
              <Edit3 className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (s: any) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); setEditSubtask(s); }}
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-danger"
            onClick={(e) => { e.stopPropagation(); setDeleteSubtaskId(s.id); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const timeColumns = [
    { key: "user", header: "Employee", render: (e: any) => <span>{e.user?.name || "N/A"}</span> },
    { key: "subTask", header: "SubTask", render: (e: any) => <span className="text-muted-foreground">{e.subTask?.name}</span> },
    { key: "checkInAt", header: "Date", sortable: true, render: (e: any) => formatDate(e.checkInAt) },
    { key: "durationMinutes", header: "Duration", sortable: true, render: (e: any) => formatDuration(e.durationMinutes) },
    { key: "notes", header: "Notes", render: (e: any) => <span className="text-muted-foreground text-sm truncate max-w-[200px] block">{e.notes || "--"}</span> },
  ];

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/dashboard/projects")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Projects
      </button>

      <Card className="border border-border p-6 rounded-xl" style={{ borderLeft: `4px solid ${project.color}` }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
              <span className={`text-xs px-2 py-1 rounded-full ${
                project.status === "ACTIVE" ? "bg-success/10 text-success" :
                project.status === "ON_HOLD" ? "bg-warning/10 text-warning" :
                project.status === "COMPLETED" ? "bg-primary/10 text-primary" :
                "bg-muted text-muted-foreground"
              }`}>{project.status}</span>
            </div>
            {project.description && (
              <p className="text-muted-foreground">{project.description}</p>
            )}
            {project.clientName && (
              <p className="text-sm text-muted-foreground">Client: {project.clientName}</p>
            )}
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Start: {formatDate(project.startDate)}</span>
              {project.endDate && <span>End: {formatDate(project.endDate)}</span>}
              <span>Est: {project.estimatedHours}h</span>
            </div>
            {(() => {
              const teamLeaders = (project.projectLeaders || [])
                .map((pl: any) => pl.user)
                .filter((u: any) => u);
              if (teamLeaders.length === 0) return null;
              return (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">Team Lead{teamLeaders.length > 1 ? "s" : ""}:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {teamLeaders.map((tl: any) => (
                      <span key={tl.id} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {tl.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="flex gap-2">
            <Select
              value={project.status}
              onValueChange={(v) => updateMutation.mutate({ status: v })}
            >
              <SelectTrigger className="w-32 bg-surface border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-raised border-border">
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="border-border text-foreground" onClick={() => setEditing(!editing)}>
              <Edit3 className="h-4 w-4 mr-2" /> Edit
            </Button>
            <Button
              variant="outline"
              className="border-danger text-danger"
              onClick={() => setDeleteId(project.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <ProgressBar value={totalHours} max={project.estimatedHours || 1} />
          <p className="text-xs text-muted-foreground mt-1">
            {totalHours}h logged of {project.estimatedHours}h estimated ({Math.round(progressPercent)}%)
          </p>
        </div>
      </Card>

      {editing && (
        <Card className="border border-border p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-foreground mb-4">Edit Project</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Name</Label>
              <Input
                defaultValue={project.name}
                id="edit-name"
                className="bg-surface border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Client Name</Label>
              <Input
                defaultValue={project.clientName}
                id="edit-clientName"
                className="bg-surface border-border text-foreground"
                placeholder="Client or organization"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label className="text-foreground">Description</Label>
              <Textarea
                defaultValue={project.description || ""}
                id="edit-description"
                className="bg-surface border-border text-foreground placeholder:text-muted-foreground"
                placeholder="Brief description..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Estimated Hours</Label>
              <Input
                type="number"
                defaultValue={project.estimatedHours}
                id="edit-hours"
                className="bg-surface border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Start Date</Label>
              <Input
                type="date"
                defaultValue={project.startDate?.split("T")[0] || ""}
                id="edit-startDate"
                className="bg-surface border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">End Date</Label>
              <Input
                type="date"
                defaultValue={project.endDate?.split("T")[0] || ""}
                id="edit-endDate"
                className="bg-surface border-border text-foreground"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label className="text-foreground">Color</Label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    className="w-8 h-8 rounded-full border-2 border-transparent"
                    style={{ backgroundColor: c }}
                    onClick={() => {
                      const el = document.getElementById("edit-color") as HTMLInputElement;
                      if (el) el.value = c;
                    }}
                  />
                ))}
                <input type="color" id="edit-color" defaultValue={project.color} className="w-8 h-8 rounded cursor-pointer" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setEditing(false)} className="border-border text-foreground">
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => {
                const name = (document.getElementById("edit-name") as HTMLInputElement)?.value;
                const clientName = (document.getElementById("edit-clientName") as HTMLInputElement)?.value;
                const description = (document.getElementById("edit-description") as HTMLTextAreaElement)?.value;
                const hours = parseFloat((document.getElementById("edit-hours") as HTMLInputElement)?.value || "0");
                const startDate = (document.getElementById("edit-startDate") as HTMLInputElement)?.value;
                const endDate = (document.getElementById("edit-endDate") as HTMLInputElement)?.value;
                const color = (document.getElementById("edit-color") as HTMLInputElement)?.value;
                if (name) updateMutation.mutate({
                  name,
                  clientName: clientName || undefined,
                  description: description || undefined,
                  estimatedHours: hours,
                  startDate: startDate || undefined,
                  endDate: endDate || undefined,
                  color,
                });
              }}
            >
              Save
            </Button>
          </div>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-surface border-border">
          <TabsTrigger value="overview" className="data-[state=active]:bg-surface-raised">Overview</TabsTrigger>
          <TabsTrigger value="subtasks" className="data-[state=active]:bg-surface-raised">Sub Tasks</TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-surface-raised">Team</TabsTrigger>
          <TabsTrigger value="timelog" className="data-[state=active]:bg-surface-raised">Time Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-border p-5 rounded-xl">
              <h3 className="text-sm font-medium text-foreground mb-4">Hours Per Day</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={burndownData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2E3147" />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} unit="h" />
                    <Tooltip
                      contentStyle={{ background: "#232640", border: "1px solid #2E3147", borderRadius: "8px", color: "#F1F5F9" }}
                    />
                    <Bar dataKey="hours" fill={project.color} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="border border-border p-5 rounded-xl">
              <h3 className="text-sm font-medium text-foreground mb-4">Hours vs Estimate</h3>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Logged", value: totalHours },
                        { name: "Remaining", value: Math.max(project.estimatedHours - totalHours, 0) },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill={project.color} />
                      <Cell fill="#2E3147" />
                    </Pie>
                    <Legend wrapperStyle={{ color: "#94A3B8", fontSize: "12px" }} />
                    <Tooltip
                      contentStyle={{ background: "#232640", border: "1px solid #2E3147", borderRadius: "8px", color: "#F1F5F9" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subtasks">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => setShowAddSubtask(true)}
              >
                <Plus className="h-4 w-4 mr-2" /> Add SubTask
              </Button>
            </div>
            <DataTable
              columns={subtaskColumns}
              data={project.subTasks || []}
              emptyMessage="No subtasks yet"
            />
          </div>
        </TabsContent>

        <TabsContent value="team">
          <Card className="border border-border p-5 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground">Assigned Leaders</h3>
              <Button
                variant="outline"
                size="sm"
                className="border-border text-foreground"
                onClick={() => {
                  setNewLeaderIds((project.projectLeaders || []).map((pl: any) => pl.user.id));
                  setShowLeaderAssignment(true);
                }}
              >
                <Users className="h-3.5 w-3.5 mr-1.5" /> Manage Leaders
              </Button>
            </div>
            <div className="space-y-3">
              {project.projectLeaders?.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">No leaders assigned</p>
              ) : (
                project.projectLeaders?.map((pl: any) => (
                  <div key={pl.user.id} className="p-4 rounded-lg bg-surface-raised">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium text-primary">
                          {pl.user.name?.split(" ").map((n: string) => n[0]).join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{pl.user.name}</p>
                        <p className="text-xs text-muted-foreground">{pl.user.role?.replace("_", " ")}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="timelog">
          <DataTable
            columns={timeColumns}
            data={timeLogEntries || []}
            searchable
            searchPlaceholder="Search entries..."
            pageSize={20}
            emptyMessage="No time entries for this project"
          />
        </TabsContent>
      </Tabs>

      <Dialog open={showAddSubtask} onOpenChange={setShowAddSubtask}>
        <DialogContent className="bg-surface-raised border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add SubTask</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Name *</Label>
              <Input
                value={newSubtask.name}
                onChange={(e) => setNewSubtask((p) => ({ ...p, name: e.target.value }))}
                className="bg-surface border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Description</Label>
              <Textarea
                value={newSubtask.description}
                onChange={(e) => setNewSubtask((p) => ({ ...p, description: e.target.value }))}
                className="bg-surface border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Estimated Hours</Label>
              <Input
                type="number"
                value={newSubtask.estimatedHours}
                onChange={(e) => setNewSubtask((p) => ({ ...p, estimatedHours: Number(e.target.value) }))}
                className="bg-surface border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">
                Assign To ({newSubtask.assignedToIds.length} selected)
              </Label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border border-border p-2">
                {allMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">No team members available</p>
                ) : (
                  allMembers.map((m: any) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-2.5 p-2 rounded-md hover:bg-surface cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={newSubtask.assignedToIds.includes(m.id)}
                        onCheckedChange={() => {
                          setNewSubtask((p) => ({
                            ...p,
                            assignedToIds: p.assignedToIds.includes(m.id)
                              ? p.assignedToIds.filter((id) => id !== m.id)
                              : [...p.assignedToIds, m.id],
                          }));
                        }}
                      />
                      <span className="text-foreground">{m.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddSubtask(false)} className="border-border text-foreground">
                Cancel
              </Button>
              <Button
                onClick={() => createSubtaskMutation.mutate()}
                disabled={!newSubtask.name || createSubtaskMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit subtask dialog */}
      <Dialog open={!!editSubtask} onOpenChange={() => setEditSubtask(null)}>
        <DialogContent className="bg-surface-raised border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit SubTask</DialogTitle>
          </DialogHeader>
          {editSubtask && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Name</Label>
                <Input
                  defaultValue={editSubtask.name}
                  id="edit-st-name"
                  className="bg-surface border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Description</Label>
                <Textarea
                  defaultValue={editSubtask.description || ""}
                  id="edit-st-desc"
                  className="bg-surface border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Estimated Hours</Label>
                <Input
                  type="number"
                  defaultValue={editSubtask.estimatedHours || ""}
                  id="edit-st-hours"
                  className="bg-surface border-border text-foreground"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setEditSubtask(null)} className="border-border text-foreground">
                  Cancel
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => {
                    const name = (document.getElementById("edit-st-name") as HTMLInputElement)?.value;
                    const description = (document.getElementById("edit-st-desc") as HTMLTextAreaElement)?.value;
                    const estimatedHours = parseFloat((document.getElementById("edit-st-hours") as HTMLInputElement)?.value || "0");
                    if (name) updateSubtaskMutation.mutate({ subtaskId: editSubtask.id, data: { name, description, estimatedHours } });
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign members to subtask */}
      <Dialog open={!!assignSubtask} onOpenChange={() => setAssignSubtask(null)}>
        <DialogContent className="bg-surface-raised border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Assign Members</DialogTitle>
          </DialogHeader>
          {assignSubtask && (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              <p className="text-sm text-muted-foreground">{assignSubtask.name}</p>
              {allMembers.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No team members available</p>
              ) : (
                allMembers.map((m: any) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-surface cursor-pointer"
                  >
                    <Checkbox
                      checked={assignSelectedIds.includes(m.id)}
                      onCheckedChange={(checked) => {
                        setAssignSelectedIds((prev) =>
                          checked ? [...prev, m.id] : prev.filter((id) => id !== m.id)
                        );
                      }}
                    />
                    <span className="text-sm font-medium text-foreground">{m.name}</span>
                  </label>
                ))
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setAssignSubtask(null)} className="border-border text-foreground">
                  Cancel
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => {
                    updateSubtaskMutation.mutate({
                      subtaskId: assignSubtask.id,
                      data: { assignedToIds: assignSelectedIds },
                    });
                    setAssignSubtask(null);
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showLeaderAssignment} onOpenChange={setShowLeaderAssignment}>
        <DialogContent className="bg-surface-raised border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Assign Leaders to Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {(!employees || employees.length === 0) ? (
              <p className="text-muted-foreground text-sm text-center py-4">No employees available</p>
            ) : (
              (employees || []).filter((e: any) => e.role === "TEAM_LEADER").map((emp: any) => (
                <label
                  key={emp.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-surface cursor-pointer"
                >
                  <Checkbox
                    checked={newLeaderIds.includes(emp.id)}
                    onCheckedChange={(checked) => {
                      setNewLeaderIds((prev) =>
                        checked
                          ? [...prev, emp.id]
                          : prev.filter((lid) => lid !== emp.id)
                      );
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.designation || "Team Leader"}</p>
                  </div>
                </label>
              ))
            )}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowLeaderAssignment(false)} className="border-border text-foreground">
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => assignLeadersMutation.mutate(newLeaderIds)}
              disabled={assignLeadersMutation.isPending}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteSubtaskId}
        onOpenChange={() => setDeleteSubtaskId(null)}
        title="Delete SubTask"
        description="Are you sure? This cannot be undone if no time entries reference it."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteSubtaskId && deleteSubtaskMutation.mutate(deleteSubtaskId)}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Project"
        description="Are you sure? This will permanently delete the project and all associated time entries, subtasks, and assignments. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
