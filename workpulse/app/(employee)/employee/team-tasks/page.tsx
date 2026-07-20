"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, Loader2, ChevronDown, ChevronRight, Edit3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function TeamTasksPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [assignSubtask, setAssignSubtask] = useState<any>(null);
  const [assignSelectedIds, setAssignSelectedIds] = useState<string[]>([]);

  const isTeamLeader = session?.user?.role === "TEAM_LEADER";

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["employee-projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      const { data } = await res.json();
      return data?.projects || [];
    },
    staleTime: 30000,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const res = await fetch(`/api/employees`);
      const { data } = await res.json();
      return data || [];
    },
    enabled: isTeamLeader,
    staleTime: 30000,
  });

  const { data: subtasksMap } = useQuery({
    queryKey: ["team-tasks-subtasks", expandedProject],
    queryFn: async () => {
      if (!expandedProject) return {};
      const res = await fetch(`/api/projects/${expandedProject}/subtasks?all=true`);
      const { data } = await res.json();
      return { [expandedProject]: data || [] };
    },
    enabled: !!expandedProject,
    staleTime: 15000,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ subtaskId, assignedToIds }: { subtaskId: string; assignedToIds: string[] }) => {
      const res = await fetch(`/api/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToIds }),
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-tasks-subtasks"] });
      toast.success("Assignments updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!isTeamLeader) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Only team leaders can access this page.</p>
      </div>
    );
  }

  const activeProjects = (projects || []).filter((p: any) => p.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Task Assignments</h1>
          <p className="text-sm text-muted-foreground">Assign subtasks to your team members</p>
        </div>
      </div>

      {projectsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : activeProjects.length === 0 ? (
        <Card className="border border-border p-8 rounded-xl">
          <div className="text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No Active Projects</h3>
            <p className="text-sm text-muted-foreground">Your team has no active projects assigned.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeProjects.map((project: any) => {
            const isExpanded = expandedProject === project.id;
            const subtasks = subtasksMap?.[project.id] || [];

            return (
              <Card key={project.id} className="border border-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-surface-raised transition-colors text-left"
                  onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <div>
                      <p className="font-semibold text-foreground">{project.name}</p>
                      {project.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{project.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-border text-muted-foreground text-xs">
                      {project._count?.subTasks || 0} subtasks
                    </Badge>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    {subtasks.length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-sm text-muted-foreground">No subtasks for this project.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {subtasks.map((subtask: any) => (
                          <div key={subtask.id} className="flex items-center justify-between p-3.5 px-4 hover:bg-surface-raised/50 transition-colors">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <Badge
                                variant="outline"
                                className={`text-[10px] shrink-0 ${
                                  subtask.status === "DONE"
                                    ? "border-success text-success"
                                    : subtask.status === "IN_PROGRESS"
                                    ? "border-primary text-primary"
                                    : "border-border text-muted-foreground"
                                }`}
                              >
                                {subtask.status?.replace("_", " ")}
                              </Badge>
                              <span className="text-sm font-medium text-foreground truncate">
                                {subtask.name}
                              </span>
                              {subtask.estimatedHours && (
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {subtask.estimatedHours}h
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              <div className="flex flex-wrap gap-1">
                                {(subtask.assignments || []).map((a: any) => (
                                  <span key={a.userId} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                    {a.user?.name?.split(" ")[0]}
                                  </span>
                                ))}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground"
                                onClick={() => {
                                  setAssignSubtask(subtask);
                                  setAssignSelectedIds((subtask.assignments || []).map((a: any) => a.userId));
                                }}
                              >
                                <Edit3 className="h-3 w-3 mr-1" />
                                Assign
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!assignSubtask} onOpenChange={() => setAssignSubtask(null)}>
        <DialogContent className="bg-surface-raised border-border max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-foreground">Assign Members</DialogTitle>
          </DialogHeader>
          {assignSubtask && (
            <div className="flex flex-col min-h-0 flex-1">
              <p className="text-sm text-muted-foreground mb-3">{assignSubtask.name}</p>
              <div className="overflow-y-auto flex-1 min-h-0 -mx-6 px-6">
                {(!teamMembers || teamMembers.length === 0) ? (
                  <p className="text-muted-foreground text-sm text-center py-4">No team members available</p>
                ) : (
                  <div className="space-y-1">
                    {teamMembers.map((m: any) => (
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
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-border -mx-6 px-6">
                <Button variant="outline" onClick={() => setAssignSubtask(null)} className="border-border text-foreground">
                  Cancel
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => {
                    assignMutation.mutate({
                      subtaskId: assignSubtask.id,
                      assignedToIds: assignSelectedIds,
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
    </div>
  );
}
