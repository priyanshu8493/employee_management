"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProgressBar } from "@/components/shared/ProgressBar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, LayoutGrid, List, Archive, Edit3, Trash2, Users, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

const PRESET_COLORS = ["#6C63FF", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#14B8A6"];

export default function ProjectsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editProject, setEditProject] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    clientName: "",
    color: "#6C63FF",
    estimatedHours: 0,
    startDate: "",
    endDate: "",
    leaderIds: [] as string[],
  });

  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    clientName: "",
    color: "#6C63FF",
    estimatedHours: 0,
    startDate: "",
    endDate: "",
    leaderIds: [] as string[],
  });

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ["projects", statusFilter, clientFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (clientFilter !== "ALL") params.set("clientName", clientFilter);
      const res = await fetch(`/api/projects?${params}`);
      const { data } = await res.json();
      return data || { projects: [], clientNames: [] };
    },
    staleTime: 30000,
  });

  const projects = projectsData?.projects || [];

  const { data: allClientNames = [] } = useQuery({
    queryKey: ["project-client-names"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      const { data } = await res.json();
      return data?.clientNames || [];
    },
    staleTime: 60000,
  });

  const clientNames = allClientNames;

  useEffect(() => {
    if (clientFilter !== "ALL" && clientNames.length > 0 && !clientNames.includes(clientFilter)) {
      setClientFilter("ALL");
    }
  }, [clientNames, clientFilter]);

  const { data: employees } = useQuery({
    queryKey: ["employees-all"],
    queryFn: async () => {
      const res = await fetch("/api/employees");
      const { data } = await res.json();
      return data || [];
    },
    staleTime: 60000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-client-names"] });
      toast.success("Project created");
      setShowCreate(false);
      setForm({ name: "", description: "", clientName: "", color: "#6C63FF", estimatedHours: 0, startDate: "", endDate: "", leaderIds: [] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-client-names"] });
      toast.success("Project archived");
      setArchiveId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
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
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-client-names"] });
      toast.success("Project updated");
      setEditProject(null);
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
      queryClient.invalidateQueries({ queryKey: ["project-client-names"] });
      toast.success("Project deleted");
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openEdit = (project: any) => {
    setEditForm({
      name: project.name,
      description: project.description || "",
      clientName: project.clientName || "",
      color: project.color,
      estimatedHours: project.estimatedHours,
      startDate: project.startDate?.split("T")[0] || "",
      endDate: project.endDate?.split("T")[0] || "",
      leaderIds: (project.projectLeaders || []).map((pl: any) => pl.user.id),
    });
    setEditProject(project);
  };

  const columns = [
    {
      key: "name",
      header: "Project",
      sortable: true,
      render: (p: any) => (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="font-medium">{p.name}</span>
        </div>
      ),
    },
    {
      key: "clientName",
      header: "Client",
      render: (p: any) => <span className="text-muted-foreground text-sm">{p.clientName || "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (p: any) => (
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          p.status === "ACTIVE" ? "bg-success/10 text-success" :
          p.status === "ON_HOLD" ? "bg-warning/10 text-warning" :
          p.status === "COMPLETED" ? "bg-primary/10 text-primary" :
          "bg-muted text-muted-foreground"
        }`}>{p.status}</span>
      ),
    },
    {
      key: "leaders",
      header: "Leaders",
      render: (p: any) => (
        <div className="flex gap-1 flex-wrap">
          {p.projectLeaders?.map((pl: any) => (
            <span key={pl.user.id} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
              {pl.user.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "progress",
      header: "Progress",
      render: (p: any) => {
        const totalHours = ((p as any).totalMinutes || 0) / 60;
        return (
          <div className="w-32">
            <ProgressBar value={Math.round(totalHours * 10) / 10} max={p.estimatedHours || 1} />
          </div>
        );
      },
    },
    {
      key: "subtasks",
      header: "Tasks",
      render: (p: any) => <span className="text-muted-foreground">{p._count?.subTasks || 0}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (p: any) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); openEdit(p); }}
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
          {p.status !== "ARCHIVED" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-danger"
              onClick={(e) => { e.stopPropagation(); setArchiveId(p.id); }}
            >
              <Archive className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-danger"
            onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your projects and tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
            <SelectTrigger className="w-36 bg-surface border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface-raised border-border">
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ON_HOLD">On Hold</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={clientFilter} onValueChange={(v) => v && setClientFilter(v)}>
            <SelectTrigger className="w-40 bg-surface border-border text-foreground">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent className="bg-surface-raised border-border">
              <SelectItem value="ALL">All Clients</SelectItem>
              {clientNames.map((name: string) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(statusFilter !== "ALL" || clientFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-9 px-2"
              onClick={() => { setStatusFilter("ALL"); setClientFilter("ALL"); }}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          )}
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={`p-2 ${view === "grid" ? "bg-surface-raised text-foreground" : "text-muted-foreground"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-2 ${view === "list" ? "bg-surface-raised text-foreground" : "text-muted-foreground"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 bg-surface-raised rounded-xl animate-pulse" />
            ))
          ) : projects.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title="No projects yet"
                description="Create your first project to start tracking time"
                action={
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Create Project
                  </Button>
                }
              />
            </div>
          ) : (
            projects.map((project: any) => {
              const totalHours = ((project as any).totalMinutes || 0) / 60;
              return (
                <Card
                  key={project.id}
                  className="border border-border p-5 rounded-xl cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                  style={{ borderLeft: `3px solid ${project.color}` }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-foreground">{project.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      project.status === "ACTIVE" ? "bg-success/10 text-success" :
                      project.status === "ON_HOLD" ? "bg-warning/10 text-warning" :
                      "bg-muted text-muted-foreground"
                    }`}>{project.status}</span>
                  </div>
                  {project.clientName && (
                    <p className="text-xs text-muted-foreground mb-3">Client: {project.clientName}</p>
                  )}
                  <ProgressBar
                    value={Math.round(totalHours * 10) / 10}
                    max={project.estimatedHours || 1}
                    className="mb-3"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{project._count?.subTasks || 0} tasks</span>
                    <span>{project.projectLeaders?.length || 0} leaders</span>
                  </div>
                  <div className="flex justify-end gap-1 mt-3 pt-2 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground h-7 w-7 p-0"
                      onClick={(e) => { e.stopPropagation(); openEdit(project); }}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    {project.status !== "ARCHIVED" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground h-7 w-7 p-0 hover:text-danger"
                        onClick={(e) => { e.stopPropagation(); setArchiveId(project.id); }}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground h-7 w-7 p-0 hover:text-danger"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(project.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={projects || []}
          loading={isLoading}
          searchable
          searchPlaceholder="Search projects..."
          onRowClick={(p: any) => router.push(`/dashboard/projects/${p.id}`)}
          emptyMessage="No projects found"
        />
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-surface-raised border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="bg-surface border-border text-foreground"
                placeholder="Project name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="bg-surface border-border text-foreground placeholder:text-muted-foreground"
                placeholder="Brief description..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Client Name</Label>
              <Input
                value={form.clientName}
                onChange={(e) => setForm((p) => ({ ...p, clientName: e.target.value }))}
                className="bg-surface border-border text-foreground"
                placeholder="Client or organization"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Color</Label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      form.color === c ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm((p) => ({ ...p, color: c }))}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Estimated Hours</Label>
                <Input
                  type="number"
                  value={form.estimatedHours}
                  onChange={(e) => setForm((p) => ({ ...p, estimatedHours: Number(e.target.value) }))}
                  className="bg-surface border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  className="bg-surface border-border text-foreground"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">
                Team Leaders ({form.leaderIds.length} selected)
              </Label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border border-border p-2">
                {(employees || []).filter((e: any) => e.role === "TEAM_LEADER").length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">No team leaders available</p>
                ) : (
                  (employees || []).filter((e: any) => e.role === "TEAM_LEADER").map((emp: any) => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-2.5 p-2 rounded-md hover:bg-surface cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={form.leaderIds.includes(emp.id)}
                        onCheckedChange={() => {
                          setForm((p) => ({
                            ...p,
                            leaderIds: p.leaderIds.includes(emp.id)
                              ? p.leaderIds.filter((id) => id !== emp.id)
                              : [...p.leaderIds, emp.id],
                          }));
                        }}
                      />
                      <span className="text-foreground">{emp.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-border text-foreground">
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!form.name || createMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {createMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editProject} onOpenChange={() => setEditProject(null)}>
        <DialogContent className="bg-surface-raised border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Project</DialogTitle>
          </DialogHeader>
          {editProject && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Name *</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="bg-surface border-border text-foreground"
                  placeholder="Project name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Description</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className="bg-surface border-border text-foreground placeholder:text-muted-foreground"
                  placeholder="Brief description..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Client Name</Label>
                <Input
                  value={editForm.clientName}
                  onChange={(e) => setEditForm((p) => ({ ...p, clientName: e.target.value }))}
                  className="bg-surface border-border text-foreground"
                  placeholder="Client or organization"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Color</Label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        editForm.color === c ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setEditForm((p) => ({ ...p, color: c }))}
                    />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Estimated Hours</Label>
                  <Input
                    type="number"
                    value={editForm.estimatedHours}
                    onChange={(e) => setEditForm((p) => ({ ...p, estimatedHours: Number(e.target.value) }))}
                    className="bg-surface border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Start Date</Label>
                  <Input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))}
                    className="bg-surface border-border text-foreground"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">
                  Team Leaders ({editForm.leaderIds.length} selected)
                </Label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border border-border p-2">
                  {(employees || []).filter((e: any) => e.role === "TEAM_LEADER").length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No team leaders available</p>
                  ) : (
                    (employees || []).filter((e: any) => e.role === "TEAM_LEADER").map((emp: any) => (
                      <label
                        key={emp.id}
                        className="flex items-center gap-2.5 p-2 rounded-md hover:bg-surface cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={editForm.leaderIds.includes(emp.id)}
                          onCheckedChange={() => {
                            setEditForm((p) => ({
                              ...p,
                              leaderIds: p.leaderIds.includes(emp.id)
                                ? p.leaderIds.filter((id) => id !== emp.id)
                                : [...p.leaderIds, emp.id],
                            }));
                          }}
                        />
                        <span className="text-foreground">{emp.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setEditProject(null)} className="border-border text-foreground">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!editForm.name) return;
                    updateMutation.mutate({
                      id: editProject.id,
                      data: {
                        name: editForm.name,
                        description: editForm.description || undefined,
                        clientName: editForm.clientName || undefined,
                        color: editForm.color,
                        estimatedHours: editForm.estimatedHours,
                        startDate: editForm.startDate || undefined,
                        leaderIds: editForm.leaderIds,
                      },
                    });
                  }}
                  disabled={!editForm.name || updateMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!archiveId}
        onOpenChange={() => setArchiveId(null)}
        title="Archive Project"
        description="This will archive the project. Time entries will be preserved."
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiveId && archiveMutation.mutate(archiveId)}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Project"
        description="Are you sure? This will permanently delete the project. If it has time entries, it will be archived instead."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
