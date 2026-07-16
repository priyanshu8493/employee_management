"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Plus, Copy, Check, Trash2 } from "lucide-react";
import { formatDurationShort } from "@/lib/utils";

export default function EmployeesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [teamFilter, setTeamFilter] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [form, setForm] = useState({ name: "", email: "", teamId: "", designation: "" });
  const [createdPassword, setCreatedPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees", teamFilter, activeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (teamFilter !== "ALL") params.set("teamId", teamFilter);
      if (activeFilter !== "ALL") params.set("isActive", activeFilter);
      const res = await fetch(`/api/employees?${params}`);
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
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setCreatedPassword(data.tempPassword);
      toast.success("Employee created");
      setForm({ name: "", email: "", teamId: "", designation: "" });
    },
    onError: (err: Error) => toast.error(err.message),
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
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns = [
    {
      key: "sno",
      header: "#",
      render: (_emp: any, index: number) => (
        <span className="text-muted-foreground font-mono text-sm">{index}</span>
      ),
    },
    {
      key: "name",
      header: "Employee",
      sortable: true,
      render: (emp: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {emp.name?.split(" ").map((n: string) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{emp.name}</p>
            <p className="text-xs text-muted-foreground">{emp.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "designation",
      header: "Designation",
      sortable: true,
      render: (emp: any) => <span className="text-muted-foreground">{emp.designation || "--"}</span>,
    },
    {
      key: "team",
      header: "Team",
      sortable: true,
      render: (emp: any) => <span className="text-muted-foreground">{emp.team?.name || "--"}</span>,
    },
    {
      key: "isActive",
      header: "Status",
      sortable: true,
      render: (emp: any) => (
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${emp.isActive ? "bg-success" : "bg-muted-foreground"}`} />
          <span className={emp.isActive ? "text-success" : "text-muted-foreground"}>
            {emp.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      ),
    },
    {
      key: "hoursThisWeek",
      header: "Hours This Week",
      sortable: true,
      render: (emp: any) => (
        <span className="font-medium">{formatDurationShort(emp.hoursThisWeek)}</span>
      ),
    },
    {
      key: "activeEntry",
      header: "Currently Working",
      render: (emp: any) => (
        <span className="text-muted-foreground text-sm">
          {emp.timeEntries?.length > 0 ? emp.timeEntries[0]?.project?.name || "Yes" : "--"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (emp: any) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-danger"
            onClick={(e) => { e.stopPropagation(); setDeleteId(emp.id); }}
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Employees</h1>
            {employees && (
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                {employees.length}
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1">Manage your workforce</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={teamFilter} onValueChange={(v) => v && setTeamFilter(v)}>
            <SelectTrigger className="w-36 bg-surface border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface-raised border-border">
              <SelectItem value="ALL">All Teams</SelectItem>
              {(teams || []).map((t: any) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={activeFilter} onValueChange={(v) => v && setActiveFilter(v)}>
            <SelectTrigger className="w-36 bg-surface border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface-raised border-border">
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Employee
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={employees || []}
        loading={isLoading}
        searchable
        searchPlaceholder="Search by name or email..."
        onRowClick={(emp: any) => router.push(`/dashboard/employees/${emp.id}`)}
        emptyMessage="No employees found"
      />

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-surface-raised border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="bg-surface border-border text-foreground"
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Designation</Label>
              <Input
                value={form.designation}
                onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
                className="bg-surface border-border text-foreground"
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="bg-surface border-border text-foreground"
                placeholder="email@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Team</Label>
              <Select
                value={form.teamId}
                onValueChange={(v) => setForm((p) => ({ ...p, teamId: v || "" }))}
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
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => createMutation.mutate()}
              disabled={!form.name || !form.email || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Employee"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdPassword} onOpenChange={() => { setCreatedPassword(""); setCopied(false); }}>
        <DialogContent className="bg-surface-raised border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Employee Created</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share the temporary password with the employee. They can change it after logging in.
            </p>
            <div className="p-4 rounded-lg bg-surface border border-border">
              <p className="text-xs text-muted-foreground mb-1">Temporary Password</p>
              <p className="text-lg font-mono font-bold text-foreground">{createdPassword}</p>
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => {
                navigator.clipboard.writeText(createdPassword);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied!" : "Copy Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Employee"
        description="Are you sure? This will permanently delete this employee. If they have existing records, they will be deactivated instead."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
