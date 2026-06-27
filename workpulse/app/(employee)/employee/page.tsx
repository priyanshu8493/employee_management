"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Play, Square, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  const [showQcModal, setShowQcModal] = useState(false);
  const [qcSummary, setQcSummary] = useState("");
  const [qcMistakes, setQcMistakes] = useState<{ employeeId: string; description: string }[]>([]);
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
      return data || [];
    },
    staleTime: 60000,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      if (!session?.user?.teamId) return [];
      const res = await fetch(`/api/employees?teamId=${session.user.teamId}`);
      const { data } = await res.json();
      return data || [];
    },
    enabled: isTeamLeader,
    staleTime: 30000,
  });

  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedSubTask, setSelectedSubTask] = useState<string>("");
  const [notes, setNotes] = useState("");

  const { data: subtasks } = useQuery({
    queryKey: ["project-subtasks", selectedProject],
    queryFn: async () => {
      if (!selectedProject) return [];
      const res = await fetch(`/api/projects/${selectedProject}/subtasks`);
      const { data } = await res.json();
      return data || [];
    },
    enabled: !!selectedProject,
  });

  const activeProjects = (projects || []).filter(
    (p: any) => p.status === "ACTIVE"
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
        }),
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-session"] });
      toast.success("Checked out successfully!");
      setShowCheckoutModal(false);
      setCheckoutNotes("");
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
          projectId: selectedProject,
          subTaskId: selectedSubTask,
          notes: notes || undefined,
        }),
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-session"] });
      toast.success("Checked in! Time tracking started.");
      setSelectedProject("");
      setSelectedSubTask("");
      setNotes("");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const formatProjectOptions = (project: any) => {
    return activeProjects.filter((p: any) => {
      if (!session?.user?.teamId) return false;
      return p.projectTeams?.some((pt: any) => pt.teamId === session.user.teamId);
    });
  };

  const availableProjects = formatProjectOptions(activeProjects);
  const filteredSubtasks = (subtasks || []).filter(
    (s: any) => s.status === "TODO" || s.status === "IN_PROGRESS"
  );

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
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}, {session?.user?.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground mt-1">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

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
        <Card className="border border-border p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Play className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Start Working</h2>
              <p className="text-sm text-muted-foreground">Select a project and task to begin tracking</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Project</Label>
              <Select
                value={selectedProject}
                onValueChange={(v) => { if (v) setSelectedProject(v); setSelectedSubTask(""); }}
              >
                <SelectTrigger className="bg-surface border-border text-foreground">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent className="bg-surface-raised border-border">
                  {availableProjects.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No projects assigned
                    </SelectItem>
                  ) : (
                    availableProjects.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          {p.name}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">SubTask</Label>
              <Select
                value={selectedSubTask}
                onValueChange={(v) => { if (v) setSelectedSubTask(v); }}
                disabled={!selectedProject}
              >
                <SelectTrigger className="bg-surface border-border text-foreground">
                  <SelectValue placeholder={selectedProject ? "Select a task" : "Choose a project first"} />
                </SelectTrigger>
                <SelectContent className="bg-surface-raised border-border">
                  {filteredSubtasks.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Notes (optional)</Label>
              <Textarea
                placeholder="What are you working on?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-surface border-border text-foreground placeholder:text-muted-foreground min-h-[80px]"
              />
            </div>

            <Button
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={!selectedProject || !selectedSubTask || checkinMutation.isPending}
              onClick={() => checkinMutation.mutate()}
            >
              {checkinMutation.isPending ? (
                "Starting..."
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Working
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
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
