"use client";

import { useState } from "react";
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
import { Plus, LayoutGrid, List, Archive } from "lucide-react";

const PRESET_COLORS = ["#6C63FF", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#14B8A6"];

export default function ProjectsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [archiveId, setArchiveId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    color: "#6C63FF",
    estimatedHours: 0,
    startDate: "",
    endDate: "",
    teamIds: [] as string[],
  });

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/projects?${params}`);
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
      toast.success("Project created");
      setShowCreate(false);
      setForm({ name: "", description: "", color: "#6C63FF", estimatedHours: 0, startDate: "", endDate: "", teamIds: [] });
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
      toast.success("Project archived");
      setArchiveId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

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
      key: "teams",
      header: "Teams",
      render: (p: any) => (
        <div className="flex gap-1 flex-wrap">
          {p.projectTeams?.map((pt: any) => (
            <span key={pt.team.id} className="text-xs bg-surface-raised px-2 py-0.5 rounded">
              {pt.team.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "progress",
      header: "Progress",
      render: (p: any) => {
        const totalHours = p.timeEntries?.reduce((s: number, e: any) => s + (e.durationMinutes || 0), 0) / 60 || 0;
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
        p.status !== "ARCHIVED" && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-danger"
            onClick={(e) => { e.stopPropagation(); setArchiveId(p.id); }}
          >
            <Archive className="h-4 w-4" />
          </Button>
        )
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
              const totalHours = project.timeEntries?.reduce((s: number, e: any) => s + (e.durationMinutes || 0), 0) / 60 || 0;
              return (
                <Card
                  key={project.id}
                  className="border border-border p-5 rounded-xl cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                  style={{ borderLeft: `3px solid ${project.color}` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground">{project.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      project.status === "ACTIVE" ? "bg-success/10 text-success" :
                      project.status === "ON_HOLD" ? "bg-warning/10 text-warning" :
                      "bg-muted text-muted-foreground"
                    }`}>{project.status}</span>
                  </div>
                  <ProgressBar
                    value={Math.round(totalHours * 10) / 10}
                    max={project.estimatedHours || 1}
                    className="mb-3"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{project._count?.subTasks || 0} tasks</span>
                    <span>{project.projectTeams?.length || 0} teams</span>
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
              <Label className="text-foreground">Teams</Label>
              <Select
                value={form.teamIds[0] || ""}
                onValueChange={(v) => setForm((p) => ({ ...p, teamIds: v ? [v] : [] }))}
              >
                <SelectTrigger className="bg-surface border-border text-foreground">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent className="bg-surface-raised border-border">
                  {(teams || []).map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      <ConfirmDialog
        open={!!archiveId}
        onOpenChange={() => setArchiveId(null)}
        title="Archive Project"
        description="This will archive the project. Time entries will be preserved."
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiveId && archiveMutation.mutate(archiveId)}
      />
    </div>
  );
}
