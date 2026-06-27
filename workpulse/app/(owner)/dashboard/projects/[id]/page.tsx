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
import { ArrowLeft, Plus, Trash2, Edit3, Users } from "lucide-react";
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
  const [newSubtask, setNewSubtask] = useState({ name: "", description: "", estimatedHours: 0 });
  const [newTeamIds, setNewTeamIds] = useState<string[]>([]);
  const [showTeamAssignment, setShowTeamAssignment] = useState(false);

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

  const { data: allTeams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
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

  const { data: timeEntries } = useQuery({
    queryKey: ["project-time-entries", id],
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
      setNewSubtask({ name: "", description: "", estimatedHours: 0 });
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

  const assignTeamsMutation = useMutation({
    mutationFn: async (teamIds: string[]) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamIds }),
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      toast.success("Teams updated");
      setShowTeamAssignment(false);
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

  const totalMinutes = (timeEntries || []).reduce((s: number, e: any) => s + (e.durationMinutes || 0), 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const progressPercent = project.estimatedHours > 0
    ? Math.min((totalHours / project.estimatedHours) * 100, 999)
    : 0;

  // Daily hours for burndown chart
  const dailyHours: Record<string, number> = {};
  (timeEntries || []).forEach((e: any) => {
    const day = new Date(e.checkInAt).toISOString().split("T")[0];
    dailyHours[day] = (dailyHours[day] || 0) + (e.durationMinutes || 0);
  });
  const burndownData = Object.entries(dailyHours)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, minutes]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      hours: Math.round((minutes / 60) * 10) / 10,
    }));

  const teamMembers = (project?.projectTeams || []).flatMap((pt: any) => pt.team?.members || []);

  const subtaskColumns = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (s: any) => <span className="font-medium">{s.name}</span>,
    },
    {
      key: "assignedTo",
      header: "Assigned To",
      render: (s: any) => {
        if (s.assignedTo) {
          return <span className="text-sm">{s.assignedTo.name}</span>;
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
      render: (s: any) => (
        <Select
          value={s.assignedTo?.id || ""}
          onValueChange={(v) => {
            if (v) updateSubtaskMutation.mutate({ subtaskId: s.id, data: { assignedToId: v } });
          }}
        >
          <SelectTrigger className="w-36 h-7 bg-surface border-border text-xs">
            <SelectValue placeholder="Assign..." />
          </SelectTrigger>
          <SelectContent className="bg-surface-raised border-border">
            <SelectItem value="">Unassign</SelectItem>
            {teamMembers.map((m: any) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
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
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Start: {formatDate(project.startDate)}</span>
              {project.endDate && <span>End: {formatDate(project.endDate)}</span>}
              <span>Est: {project.estimatedHours}h</span>
            </div>
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
              <Label className="text-foreground">Estimated Hours</Label>
              <Input
                type="number"
                defaultValue={project.estimatedHours}
                id="edit-hours"
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
                const hours = parseFloat((document.getElementById("edit-hours") as HTMLInputElement)?.value || "0");
                const color = (document.getElementById("edit-color") as HTMLInputElement)?.value;
                if (name) updateMutation.mutate({ name, estimatedHours: hours, color });
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
              <h3 className="text-sm font-medium text-foreground">Assigned Teams</h3>
              <Button
                variant="outline"
                size="sm"
                className="border-border text-foreground"
                onClick={() => {
                  setNewTeamIds((project.projectTeams || []).map((pt: any) => pt.team.id));
                  setShowTeamAssignment(true);
                }}
              >
                <Users className="h-3.5 w-3.5 mr-1.5" /> Manage Teams
              </Button>
            </div>
            <div className="space-y-3">
              {project.projectTeams?.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">No teams assigned</p>
              ) : (
                project.projectTeams?.map((pt: any) => (
                  <div key={pt.team.id} className="p-4 rounded-lg bg-surface-raised">
                    <p className="font-medium text-foreground">{pt.team.name}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {pt.team.members?.map((m: any) => (
                        <Badge key={m.id} variant="outline" className="border-border text-muted-foreground">
                          {m.name}
                        </Badge>
                      ))}
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
            data={timeEntries || []}
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
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setEditSubtask(null)} className="border-border text-foreground">
                  Cancel
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => {
                    const name = (document.getElementById("edit-st-name") as HTMLInputElement)?.value;
                    const description = (document.getElementById("edit-st-desc") as HTMLTextAreaElement)?.value;
                    if (name) updateSubtaskMutation.mutate({ subtaskId: editSubtask.id, data: { name, description } });
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showTeamAssignment} onOpenChange={setShowTeamAssignment}>
        <DialogContent className="bg-surface-raised border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Assign Teams to Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {(allTeams || []).length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No teams available</p>
            ) : (
              (allTeams || []).map((t: any) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-surface cursor-pointer"
                >
                  <Checkbox
                    checked={newTeamIds.includes(t.id)}
                    onCheckedChange={(checked) => {
                      setNewTeamIds((prev) =>
                        checked
                          ? [...prev, t.id]
                          : prev.filter((tid) => tid !== t.id)
                      );
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t._count?.members || 0} members</p>
                  </div>
                </label>
              ))
            )}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowTeamAssignment(false)} className="border-border text-foreground">
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => assignTeamsMutation.mutate(newTeamIds)}
              disabled={assignTeamsMutation.isPending}
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
    </div>
  );
}
