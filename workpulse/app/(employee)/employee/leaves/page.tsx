"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { CalendarOff, Plus, Trash2, CalendarCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function EmployeeLeavesPage() {
  const queryClient = useQueryClient();
  const [showMarkDialog, setShowMarkDialog] = useState(false);
  const [leaveDate, setLeaveDate] = useState("");
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
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: leaveDate, reason: leaveReason || undefined }),
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leaves"] });
      queryClient.invalidateQueries({ queryKey: ["past-leaves"] });
      toast.success("Leave marked successfully!");
      setShowMarkDialog(false);
      setLeaveDate("");
      setLeaveReason("");
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

  const upcomingLeaves = (leaves || []).filter(
    (l: any) => new Date(l.date) >= new Date(new Date().toDateString())
  );

  const today = new Date().toISOString().split("T")[0];

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

      <Dialog open={showMarkDialog} onOpenChange={(o) => { if (!o) { setShowMarkDialog(false); setLeaveDate(""); setLeaveReason(""); } }}>
        <DialogContent className="bg-surface-raised border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <CalendarOff className="h-5 w-5 text-primary" />
              Mark Leave
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              onClick={() => { setShowMarkDialog(false); setLeaveDate(""); setLeaveReason(""); }}
              className="border-border text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={() => markMutation.mutate()}
              disabled={!leaveDate || markMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {markMutation.isPending ? "Marking..." : "Mark Leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
