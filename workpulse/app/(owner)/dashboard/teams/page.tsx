"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit3, Trash2, Users, Briefcase } from "lucide-react";
import { formatDurationShort } from "@/lib/utils";

export default function TeamsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editTeam, setEditTeam] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", memberIds: [] as string[] });

  const { data: teams, isLoading } = useQuery({
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
    staleTime: 60000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Team created");
      setShowCreate(false);
      setForm({ name: "", description: "", memberIds: [] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/teams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const { data: result, error } = await res.json();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Team updated");
      setEditTeam(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/teams/${id}`, { method: "DELETE" });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Team deleted");
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns = [
    {
      key: "name",
      header: "Team",
      sortable: true,
      render: (t: any) => <span className="font-medium">{t.name}</span>,
    },
    {
      key: "description",
      header: "Description",
      render: (t: any) => <span className="text-muted-foreground text-sm">{t.description || "--"}</span>,
    },
    {
      key: "members",
      header: "Members",
      render: (t: any) => (
        <div className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{t._count?.members || 0}</span>
        </div>
      ),
    },
    {
      key: "projects",
      header: "Projects",
      render: (t: any) => (
        <div className="flex items-center gap-1">
          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{t._count?.projectTeams || 0}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (t: any) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); setEditTeam(t); }}
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-danger"
            onClick={(e) => { e.stopPropagation(); setDeleteId(t.id); }}
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
          <h1 className="text-2xl font-bold text-foreground">Teams</h1>
          <p className="text-muted-foreground mt-1">Organize your teams</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-4 w-4 mr-2" /> Create Team
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={teams || []}
        loading={isLoading}
        searchable
        searchPlaceholder="Search teams..."
        emptyMessage="No teams found"
      />

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-surface-raised border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="bg-surface border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="bg-surface border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Members</Label>
              <Select
                value={form.memberIds[0] || ""}
                onValueChange={(v) => setForm((p) => ({ ...p, memberIds: v ? [v] : [] }))}
              >
                <SelectTrigger className="bg-surface border-border text-foreground">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent className="bg-surface-raised border-border">
                  {(allEmployees || []).map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => createMutation.mutate()}
              disabled={!form.name || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Team"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTeam} onOpenChange={() => setEditTeam(null)}>
        <DialogContent className="bg-surface-raised border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Team</DialogTitle>
          </DialogHeader>
          {editTeam && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Name</Label>
                <Input defaultValue={editTeam.name} id="edit-team-name" className="bg-surface border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Description</Label>
                <Textarea defaultValue={editTeam.description || ""} id="edit-team-desc" className="bg-surface border-border text-foreground" />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setEditTeam(null)} className="border-border text-foreground">Cancel</Button>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => {
                    const name = (document.getElementById("edit-team-name") as HTMLInputElement)?.value;
                    const description = (document.getElementById("edit-team-desc") as HTMLTextAreaElement)?.value;
                    if (name) updateMutation.mutate({ id: editTeam.id, data: { name, description } });
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Team"
        description="Are you sure? This team must not have any active projects assigned."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
