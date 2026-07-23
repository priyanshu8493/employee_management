"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function QcFlagsPage() {
  const { data: mistakes, isLoading } = useQuery({
    queryKey: ["my-qc-mistakes"],
    queryFn: async () => {
      const res = await fetch("/api/qc/mistakes");
      const { data } = await res.json();
      return data || [];
    },
    staleTime: 15000,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">QC Flags</h1>
        <p className="text-muted-foreground mt-1">
          Quality control flags raised against your work
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-surface-raised rounded-xl animate-pulse" />
          ))}
        </div>
      ) : mistakes?.length > 0 ? (
        <div className="space-y-3">
          {mistakes.map((m: any) => (
            <Card key={m.id} className="border border-danger/20 bg-danger/5 p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-danger mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{m.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span>Reported by {m.qcReport?.teamLead?.name}</span>
                    <span>·</span>
                    <span>{formatDate(m.qcReport?.date)}</span>
                    <span>·</span>
                    <span>Team: {m.qcReport?.team?.name}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border border-border p-8 rounded-xl">
          <div className="text-center">
            <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-success" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No Flags</h3>
            <p className="text-sm text-muted-foreground">
              No quality control flags have been raised against your work.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
