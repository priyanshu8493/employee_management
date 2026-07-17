"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { CalendarOff, Plus, Trash2, CalendarCheck, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function getDaysInRange(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diff = e.getTime() - s.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

export default function EmployeeLeavesPage() {
  const queryClient = useQueryClient();
  const [showMarkDialog, setShowMarkDialog] = useState(false);
  const [leaveMode, setLeaveMode] = useState<"single" | "range">("single");
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  const { data: leaves, isLoading } = useQuery({
    queryKey: ["my-leaves"],
    queryFn: async () => {
      const res = await fetch("/api/leaves?upcoming=true");
      const { data } = await res.json();
      return data || [];
    },
    staleTime: 10000,
  });

  const { data: pastLeaves } = useQuery({
    queryKey: ["past-leaves"],
    queryFn: async () => {
      const res = await fetch("/api/leaves");
      const { data } = await res.json();
      return data || [];
    },
    staleTime: 10000,
  });

  const markMutation = useMutation({
    mutationFn: async () => {
      const body =
        leaveMode === "single"
          ? { date: leaveDate, reason: leaveReason || undefined }
          : { startDate: leaveStartDate, endDate: leaveEndDate, reason: leaveReason || undefined };

      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-leaves"] });
      queryClient.invalidateQueries({ queryKey: ["past-leaves"] });
      if (data?.created && data?.total) {
        const msg = data.skipped > 0
          ? `Marked ${data.created} day(s) of leave (${data.skipped} already existed)`
          : `Marked ${data.created} day(s) of leave`;
        toast.success(msg);
      } else {
        toast.success("Leave marked successfully!");
      }
      resetDialog();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leaves/${id}`, { method: "DELETE" });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leaves"] });
      queryClient.invalidateQueries({ queryKey: ["past-leaves"] });
      toast.success("Leave cancelled");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const resetDialog = () => {
    setShowMarkDialog(false);
    setLeaveMode("single");
    setLeaveDate("");
    setLeaveStartDate("");
    setLeaveEndDate("");
    setLeaveReason("");
  };

  const upcomingLeaves = (leaves || []).filter(
    (l: any) => new Date(l.date) >= new Date(new Date().toDateString())
  );

  const today = new Date().toISOString().split("T")[0];

  const previewDays = useMemo(() => {
    if (leaveMode === "single") return leaveDate ? 1 : 0;
    return getDaysInRange(leaveStartDate, leaveEndDate);
  }, [leaveMode, leaveDate, leaveStartDate, leaveEndDate]);

  const canSubmit =
    leaveMode === "single"
      ? !!leaveDate
      : !!leaveStartDate && !!leaveEndDate && leaveStartDate <= leaveEndDate;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Leaves</h1>
          <p className="text-muted-foreground mt-1">
            Mark leaves and inform your organisation
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => setShowMarkDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Mark Leave
        </Button>
      </div>

      <Card className="border border-border p-5 rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <CalendarCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Upcoming Leaves</h2>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 bg-surface-raised rounded-lg animate-pulse" />
            ))}
          </div>
        ) : upcomingLeaves.length === 0 ? (
          <div className="text-center py-8">
            <CalendarOff className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No upcoming leaves planned</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingLeaves.map((leave: any) => (
              <div
                key={leave.id}
                className="flex items-center justify-between p-4 rounded-lg bg-surface-raised border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarOff className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{formatDate(leave.date)}</p>
                    {leave.reason && (
                      <p className="text-sm text-muted-foreground">{leave.reason}</p>
                    )}
                    {leave.remarks && (
                      <div className="mt-1.5 p-2 rounded-md bg-primary/5 border border-primary/10">
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                          <MessageSquare className="h-3 w-3" /> Owner Remarks
                        </p>
                        <p className="text-sm text-foreground">{leave.remarks}</p>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:text-danger hover:bg-danger/10"
                  onClick={() => cancelMutation.mutate(leave.id)}
                  disabled={cancelMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="border border-border p-5 rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <CalendarOff className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Leave History</h2>
        </div>
        {pastLeaves && pastLeaves.length > 0 ? (
          <div className="space-y-2">
            {(pastLeaves || []).map((leave: any) => (
              <div
                key={leave.id}
                className="flex items-center justify-between p-4 rounded-lg bg-surface-raised border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <CalendarOff className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{formatDate(leave.date)}</p>
                    {leave.reason && (
                      <p className="text-sm text-muted-foreground">{leave.reason}</p>
                    )}
                    {leave.remarks && (
                      <div className="mt-1.5 p-2 rounded-md bg-primary/5 border border-primary/10">
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                          <MessageSquare className="h-3 w-3" /> Owner Remarks
                        </p>
                        <p className="text-sm text-foreground">{leave.remarks}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CalendarOff className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No leave history</p>
          </div>
        )}
      </Card>

      <Dialog open={showMarkDialog} onOpenChange={(o) => { if (!o) resetDialog(); }}>
        <DialogContent className="bg-surface-raised border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <CalendarOff className="h-5 w-5 text-primary" />
              Mark Leave
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 p-1 bg-surface rounded-lg border border-border">
              <button
                className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  leaveMode === "single"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setLeaveMode("single")}
              >
                Single Day
              </button>
              <button
                className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  leaveMode === "range"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setLeaveMode("range")}
              >
                Date Range
              </button>
            </div>

            {leaveMode === "single" ? (
              <div className="space-y-2">
                <Label className="text-foreground">Date</Label>
                <Input
                  type="date"
                  value={leaveDate}
                  min={today}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  className="bg-surface border-border text-foreground"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-foreground">From</Label>
                  <Input
                    type="date"
                    value={leaveStartDate}
                    min={today}
                    onChange={(e) => {
                      setLeaveStartDate(e.target.value);
                      if (e.target.value > leaveEndDate) setLeaveEndDate("");
                    }}
                    className="bg-surface border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">To</Label>
                  <Input
                    type="date"
                    value={leaveEndDate}
                    min={leaveStartDate || today}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="bg-surface border-border text-foreground"
                  />
                </div>
              </div>
            )}

            {leaveMode === "range" && previewDays > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                {previewDays} day{previewDays > 1 ? "s" : ""} will be marked as leave
              </p>
            )}

            <div className="space-y-2">
              <Label className="text-foreground">Reason (optional)</Label>
              <Textarea
                placeholder="e.g., Sick leave, personal work..."
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="bg-surface border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={resetDialog}
              className="border-border text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={() => markMutation.mutate()}
              disabled={!canSubmit || markMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {markMutation.isPending
                ? "Marking..."
                : leaveMode === "range" && previewDays > 1
                ? `Mark ${previewDays} Days`
                : "Mark Leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
