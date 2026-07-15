"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/EmptyState";
import { Radio } from "lucide-react";

function LiveTimerDisplay({ checkInAt }: { checkInAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(checkInAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [checkInAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const display = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

  return (
    <span className="font-mono tabular-nums text-success">
      {display}
    </span>
  );
}

export default function LiveActivityPage() {
  const { data: activeEntries, isLoading } = useQuery({
    queryKey: ["live-activity"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/live");
      const { data } = await res.json();
      return data || [];
    },
    refetchInterval: 30000,
    staleTime: 5000,
  });

  const count = activeEntries?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Live Activity</h1>
            {count > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-success/10 text-success">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                {count} active
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1">Employees currently working</p>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Radio className="h-3 w-3" />
          Auto-refreshes every 30s
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface-raised rounded-xl animate-pulse" />
          ))}
        </div>
      ) : count === 0 ? (
        <Card className="border border-border p-5 rounded-xl">
          <EmptyState
            icon={<Radio className="h-10 w-10 text-primary" />}
            title="All quiet"
            description="No one is currently checked in"
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {activeEntries.map((entry: any) => (
            <Card
              key={entry.id}
              className="border border-border p-5 rounded-xl hover:border-primary/20 transition-colors"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {entry.user?.name?.split(" ").map((n: string) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-surface" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{entry.user?.name}</p>
                    <p className="text-xs text-muted-foreground">{entry.user?.team?.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 flex-wrap">
                  <div>
                    <p className="text-xs text-muted-foreground">Project</p>
                    <div className="flex items-center gap-1.5 text-sm">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: entry.project?.color }}
                      />
                      <span>{entry.project?.name}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Task</p>
                    <p className="text-sm text-foreground">{entry.subTask?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Started</p>
                    <p className="text-sm text-foreground">
                      {new Date(entry.checkInAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <LiveTimerDisplay checkInAt={entry.checkInAt} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
