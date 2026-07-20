"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Play, Square, AlertTriangle, Plus, Trash2, Clock, BarChart3, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Label,
} from "@/components/ui/label";
import { format } from "date-fns";
import { formatDurationShort } from "@/lib/utils";

function LiveTimer({ checkInAt }: { checkInAt: string }) {
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    const start = new Date(checkInAt).getTime();
    const tick = () => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [checkInAt]);

  return (
    <span className="font-mono text-2xl tabular-nums">{elapsed}</span>
  );
}

export default function EmployeeHomePage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [markTaskDone, setMarkTaskDone] = useState(false);
  const [showQcModal, setShowQcModal] = useState(false);
  const [qcSummary, setQcSummary] = useState("");
  const [qcMistakes, setQcMistakes] = useState<{ employeeId: string; description: string }[]>([]);
  const [checkinProject, setCheckinProject] = useState<any>(null);
  const [checkinSubTask, setCheckinSubTask] = useState("");
  const [checkinNotes, setCheckinNotes] = useState("");
  const [greeting, setGreeting] = useState("");

  const isTeamLeader = session?.user?.role === "TEAM_LEADER";

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const { data: activeSession, isLoading: loadingActive } = useQuery({
    queryKey: ["active-session"],
    queryFn: async () => {
      const res = await fetch("/api/time-entries/active");
      const { data } = await res.json();
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: projects } = useQuery({
    queryKey: ["employee-projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      const { data } = await res.json();
      return data?.projects || [];
    },
    staleTime: 60000,
  });

  const { data: todayEntries } = useQuery({
    queryKey: ["today-entries"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const res = await fetch(`/api/time-entries?startDate=${today.toISOString()}&limit=200`);
      const { data } = await res.json();
      return data || [];
    },
    staleTime: 30000,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const res = await fetch("/api/employees");
      const { data } = await res.json();
      return data || [];
    },
    enabled: isTeamLeader,
    staleTime: 30000,
  });

  const { data: myTasks } = useQuery({
    queryKey: ["my-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/my-tasks");
      const { data } = await res.json();
      return data || [];
    },
    staleTime: 30000,
  });

  const { data: subtasks } = useQuery({
    queryKey: ["project-subtasks", checkinProject?.id],
    queryFn: async () => {
      if (!checkinProject?.id) return [];
      const res = await fetch(`/api/projects/${checkinProject.id}/subtasks`);
      const { data } = await res.json();
      return data || [];
    },
    enabled: !!checkinProject?.id,
  });

  const activeProjects = (projects || []).filter(
    (p: any) => p.status === "ACTIVE"
  );

  const availableProjects = activeProjects;

  const filteredSubtasks = (subtasks || []).filter(
    (s: any) => s.status === "TODO" || s.status === "IN_PROGRESS"
  );

  const todayTotal = (todayEntries || []).reduce(
    (sum: number, e: any) => sum + (e.durationMinutes || 0),
    0
  );

  const checkoutMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checkout",
          timeEntryId: entryId,
          notes: checkoutNotes || undefined,
          markTaskDone: markTaskDone || undefined,
        }),
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-session"] });
      queryClient.invalidateQueries({ queryKey: ["today-entries"] });
      queryClient.invalidateQueries({ queryKey: ["project-subtasks"] });
      toast.success(markTaskDone ? "Task marked complete! Checked out." : "Checked out successfully!");
      setShowCheckoutModal(false);
      setCheckoutNotes("");
      setMarkTaskDone(false);
      if (isTeamLeader) {
        setQcSummary("");
        setQcMistakes([]);
        setShowQcModal(true);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const qcMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/qc/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: qcSummary,
          mistakes: qcMistakes.filter((m) => m.employeeId && m.description),
        }),
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success("QC report submitted!");
      setShowQcModal(false);
      setQcSummary("");
      setQcMistakes([]);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checkin",
          projectId: checkinProject.id,
          subTaskId: checkinSubTask,
          notes: checkinNotes || undefined,
        }),
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-session"] });
      toast.success("Checked in! Time tracking started.");
      setCheckinProject(null);
      setCheckinSubTask("");
      setCheckinNotes("");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const addMistake = () => {
    setQcMistakes((prev) => [...prev, { employeeId: "", description: "" }]);
  };

  const updateMistake = (index: number, field: string, value: string) => {
    setQcMistakes((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeMistake = (index: number) => {
    setQcMistakes((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, {session?.user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-surface-raised px-3 py-1.5 rounded-lg">
            <Clock className="h-3.5 w-3.5" />
            <span>Today: {formatDurationShort(todayTotal)}</span>
          </div>
        </div>
      </div>

      {myTasks && myTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">My Assigned Tasks</h2>
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
              {myTasks.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {myTasks.map((task: any) => (
              <Card
                key={task.id}
                className="border border-border p-4 rounded-xl hover:border-primary/40 transition-all cursor-pointer group"
                onClick={() => {
                  if (!activeSession) {
                    setCheckinProject(task.project);
                    setCheckinSubTask(task.id);
                    setCheckinNotes("");
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: task.project?.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{task.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {task.project?.name}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {task.status === "DONE" ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : task.status === "IN_PROGRESS" ? (
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      task.status === "DONE"
                        ? "border-success text-success"
                        : task.status === "IN_PROGRESS"
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {task.status?.replace("_", " ")}
                  </Badge>
                  {task.estimatedHours && (
                    <span className="text-[10px] text-muted-foreground">
                      {task.estimatedHours}h est.
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {loadingActive ? (
        <div className="h-32 bg-surface-raised rounded-xl animate-pulse" />
      ) : activeSession ? (
        <Card className="border border-primary/30 bg-primary/5 p-6 rounded-xl">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-sm font-medium">Active Session</span>
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {activeSession.project?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activeSession.subTask?.name}
                </p>
              </div>
              <LiveTimer checkInAt={activeSession.checkInAt} />
              <p className="text-xs text-muted-foreground">
                Since {format(new Date(activeSession.checkInAt), "h:mm a")}
              </p>
            </div>
            <Button
              size="lg"
              className="bg-danger hover:bg-danger/90 text-white"
              onClick={() => setShowCheckoutModal(true)}
            >
              <Square className="h-4 w-4 mr-2" />
              Check Out
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {availableProjects.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Your Projects</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {availableProjects.map((project: any) => (
                  <Card
                    key={project.id}
                    className="border border-border p-5 rounded-xl hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer group"
                    onClick={() => {
                      setCheckinProject(project);
                      setCheckinSubTask("");
                      setCheckinNotes("");
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-3 h-3 rounded-full mt-1 shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <Badge
                            variant="outline"
                            className="text-[11px] border-border text-muted-foreground"
                          >
                            {project.estimatedHours}h est.
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="text-[11px] bg-primary/10 text-primary border-0"
                          >
                            {project.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Click to start working</span>
                      <Play className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {availableProjects.length === 0 && (
            <Card className="border border-border p-8 rounded-xl">
              <div className="text-center">
                <div className="p-3 rounded-full bg-surface-raised w-fit mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">No Projects Assigned</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  You are not assigned to any active projects yet. Contact your team leader or admin to get started.
                </p>
              </div>
            </Card>
          )}
        </>
      )}

      <Dialog open={!!checkinProject} onOpenChange={(o) => { if (!o) { setCheckinProject(null); setCheckinSubTask(""); setCheckinNotes(""); } }}>
        <DialogContent className="bg-surface-raised border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: checkinProject?.color }} />
              Start Working &mdash; {checkinProject?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">SubTask</Label>
              <Select
                value={checkinSubTask}
                onValueChange={(v) => { if (v) setCheckinSubTask(v); }}
              >
                <SelectTrigger className="bg-surface border-border text-foreground">
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent className="bg-surface-raised border-border">
                  {filteredSubtasks.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No available subtasks
                    </SelectItem>
                  ) : (
                    filteredSubtasks.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Notes (optional)</Label>
              <Textarea
                placeholder="What are you working on?"
                value={checkinNotes}
                onChange={(e) => setCheckinNotes(e.target.value)}
                className="bg-surface border-border text-foreground placeholder:text-muted-foreground min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setCheckinProject(null); setCheckinSubTask(""); setCheckinNotes(""); }}
              className="border-border text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={() => checkinMutation.mutate()}
              disabled={!checkinSubTask || checkinMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {checkinMutation.isPending ? "Starting..." : (
                <><Play className="h-4 w-4 mr-2" /> Start Working</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCheckoutModal} onOpenChange={(o) => { if (!o) setShowCheckoutModal(false); }}>
        <DialogContent className="bg-surface-raised border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Check Out</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add any notes about what you accomplished:
            </p>
            <Textarea
              placeholder="Completed tasks, blockers, notes..."
              value={checkoutNotes}
              onChange={(e) => setCheckoutNotes(e.target.value)}
              className="bg-surface border-border text-foreground placeholder:text-muted-foreground"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={markTaskDone}
                onChange={(e) => setMarkTaskDone(e.target.checked)}
                className="rounded border-border bg-surface text-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">Mark this task as completed</span>
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCheckoutModal(false)}
              className="border-border text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={() => checkoutMutation.mutate(activeSession.id)}
              disabled={checkoutMutation.isPending}
              className="bg-danger hover:bg-danger/90 text-white"
            >
              {checkoutMutation.isPending ? "Checking out..." : "Confirm Check Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showQcModal} onOpenChange={setShowQcModal}>
        <DialogContent className="bg-surface-raised border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Quality Control Report
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-foreground">Day Summary</Label>
              <p className="text-sm text-muted-foreground">
                Summarize the work done today by your team, potential fail points, and overall quality observations.
              </p>
              <Textarea
                placeholder="Today's summary, potential fail points, overall observations..."
                value={qcSummary}
                onChange={(e) => setQcSummary(e.target.value)}
                className="bg-surface border-border text-foreground placeholder:text-muted-foreground min-h-[100px]"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">Flagged Mistakes</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addMistake}
                  className="border-border text-foreground"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Mistake
                </Button>
              </div>

              {qcMistakes.map((mistake, index) => (
                <div key={index} className="flex gap-3 items-start p-3 rounded-lg bg-surface border border-border">
                  <div className="flex-1 space-y-2">
                    <Select
                      value={mistake.employeeId}
                      onValueChange={(v) => { if (v) updateMistake(index, "employeeId", v); }}
                    >
                      <SelectTrigger className="bg-surface-raised border-border text-foreground">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-raised border-border">
                        {(teamMembers || []).map((m: any) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Describe the mistake or fail point..."
                      value={mistake.description}
                      onChange={(e) => updateMistake(index, "description", e.target.value)}
                      className="bg-surface-raised border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMistake(index)}
                    className="text-danger mt-1 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {qcMistakes.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No mistakes flagged. You can submit the report without flagging any mistakes.
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowQcModal(false)}
              className="border-border text-foreground"
            >
              Skip
            </Button>
            <Button
              onClick={() => qcMutation.mutate()}
              disabled={!qcSummary || qcMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {qcMutation.isPending ? "Submitting..." : "Submit QC Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
