"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { CalendarOff, Search, MessageSquare, Save, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export default function OwnerLeavesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [remarksLeave, setRemarksLeave] = useState<any>(null);
  const [remarksText, setRemarksText] = useState("");
  const [monthFilter, setMonthFilter] = useState("thisMonth");
  const [deleteLeaveId, setDeleteLeaveId] = useState<string | null>(null);

  const { data: leaves, isLoading } = useQuery({
    queryKey: ["all-leaves"],
    queryFn: async () => {
      const res = await fetch("/api/leaves");
      const { data } = await res.json();
      return data || [];
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const monthOptions = useMemo(() => {
    const options: { label: string; start: Date; end: Date }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      options.push({ label, start, end });
    }
    return options;
  }, []);

  const filteredLeaves = useMemo(() => {
    let items = leaves || [];

    if (monthFilter === "all") {
      // no date filter
    } else if (monthFilter === "today") {
      items = items.filter((l: any) => new Date(l.date).getTime() === todayStart.getTime());
    } else if (monthFilter === "upcoming") {
      items = items.filter((l: any) => new Date(l.date) > todayStart);
    } else if (monthFilter === "past") {
      items = items.filter((l: any) => new Date(l.date) < todayStart);
    } else {
      const opt = monthOptions[parseInt(monthFilter)];
      if (opt) {
        items = items.filter((l: any) => {
          const d = new Date(l.date);
          return d >= opt.start && d <= opt.end;
        });
      }
    }

    if (search) {
      items = items.filter((l: any) =>
        l.user?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    items.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return items;
  }, [leaves, monthFilter, search, todayStart, monthOptions]);

  const remarksMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leaves/${remarksLeave.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks: remarksText || null }),
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-leaves"] });
      toast.success(remarksText ? "Remarks saved" : "Remarks removed");
      setRemarksLeave(null);
      setRemarksText("");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteLeaveMutation = useMutation({
    mutationFn: async (leaveId: string) => {
      const res = await fetch(`/api/leaves/${leaveId}`, { method: "DELETE" });
      const { data, error } = await res.json();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-leaves"] });
      toast.success("Leave record deleted");
      setDeleteLeaveId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Leaves</h1>
        <p className="text-muted-foreground mt-1">
          View all leaves across the organisation
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by employee name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-surface border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <Select
          value={monthFilter}
          onValueChange={(v) => v && setMonthFilter(v)}
        >
          <SelectTrigger className="w-52 bg-surface border-border text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-surface-raised border-border max-h-72">
            <SelectItem value="thisMonth">This Month</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="all">All Leaves</SelectItem>
            <SelectItem value="past">All Past Leaves</SelectItem>
            <div className="border-t border-border my-1" />
            {monthOptions.map((opt, i) => (
              <SelectItem key={i} value={String(i)}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface-raised rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredLeaves.length === 0 ? (
        <Card className="border border-border p-8 rounded-xl">
          <div className="text-center">
            <CalendarOff className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No leaves match your filter</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                {monthFilter === "thisMonth" ? "This Month" :
                 monthFilter === "today" ? "Today" :
                 monthFilter === "upcoming" ? "Upcoming" :
                 monthFilter === "all" ? "All Leaves" :
                 monthFilter === "past" ? "All Past Leaves" :
                 monthOptions[parseInt(monthFilter)]?.label || "Leaves"}
              </h2>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                {filteredLeaves.length}
              </Badge>
            </div>
          </div>
          {filteredLeaves.map((leave: any) => (
                  <Card
                    key={leave.id}
                    className="border border-border p-4 rounded-xl hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                          {leave.user?.name?.split(" ").map((n: string) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">{leave.user?.name}</p>
                        </div>
                        <p className="text-sm text-foreground mt-0.5">
                          {formatDate(leave.date)}
                        </p>
                        {leave.reason && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {leave.reason}
                          </p>
                        )}
                        {leave.remarks && (
                          <div className="mt-2 p-2 rounded-md bg-primary/5 border border-primary/10">
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                              <MessageSquare className="h-3 w-3" /> Owner Remarks
                            </p>
                            <p className="text-sm text-foreground">{leave.remarks}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={
                            new Date(leave.date) > now
                              ? "border-primary/30 text-primary"
                              : new Date(leave.date).toDateString() === now.toDateString()
                              ? "border-warning/30 text-warning"
                              : "border-border text-muted-foreground"
                          }
                        >
                          {new Date(leave.date) > now
                            ? "Upcoming"
                            : new Date(leave.date).toDateString() === now.toDateString()
                            ? "Today"
                            : "Past"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground hover:text-danger"
                          onClick={() => setDeleteLeaveId(leave.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setRemarksLeave(leave);
                            setRemarksText(leave.remarks || "");
                          }}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {leave.remarks ? "Edit Remarks" : "Add Remarks"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}

      {!isLoading && leaves?.length === 0 && (
        <Card className="border border-border p-8 rounded-xl">
          <div className="text-center">
            <CalendarOff className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No Leaves Recorded</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Employees can mark their leaves from their Leaves page.
            </p>
          </div>
        </Card>
      )}

      <Dialog open={!!remarksLeave} onOpenChange={(o) => { if (!o) { setRemarksLeave(null); setRemarksText(""); } }}>
        <DialogContent className="bg-surface-raised border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              {remarksLeave?.remarks ? "Edit Remarks" : "Add Remarks"}
            </DialogTitle>
          </DialogHeader>
          {remarksLeave && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-surface border border-border">
                <p className="text-sm font-medium text-foreground">{remarksLeave.user?.name}</p>
                <p className="text-xs text-muted-foreground">{formatDate(remarksLeave.date)}</p>
                {remarksLeave.reason && (
                  <p className="text-xs text-muted-foreground mt-1">Reason: {remarksLeave.reason}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Remarks</Label>
                <Textarea
                  placeholder="Add your remarks about this leave..."
                  value={remarksText}
                  onChange={(e) => setRemarksText(e.target.value)}
                  className="bg-surface border-border text-foreground placeholder:text-muted-foreground min-h-[100px]"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {remarksLeave?.remarks && (
              <Button
                variant="outline"
                onClick={() => {
                  setRemarksText("");
                  remarksMutation.mutate();
                }}
                disabled={remarksMutation.isPending}
                className="border-danger text-danger hover:bg-danger/10"
              >
                Remove
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => { setRemarksLeave(null); setRemarksText(""); }}
              className="border-border text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={() => remarksMutation.mutate()}
              disabled={remarksMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {remarksMutation.isPending ? "Saving..." : (
                <><Save className="h-4 w-4 mr-2" /> Save</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteLeaveId}
        onOpenChange={() => setDeleteLeaveId(null)}
        title="Delete Leave Record"
        description="Are you sure you want to delete this leave record? This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteLeaveId && deleteLeaveMutation.mutate(deleteLeaveId)}
      />
    </div>
  );
}
