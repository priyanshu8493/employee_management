"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
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
import { AlertTriangle, Eye, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function QcReportsPage() {
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["qc-reports"],
    queryFn: async () => {
      const res = await fetch(`/api/qc/reports`);
      const { data } = await res.json();
      return data || [];
    },
    staleTime: 15000,
  });

  const columns = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (r: any) => <span className="font-medium">{formatDate(r.date)}</span>,
    },
    {
      key: "teamLead",
      header: "Team Leader",
      render: (r: any) => <span>{r.teamLead?.name}</span>,
    },
    {
      key: "summary",
      header: "Summary",
      render: (r: any) => (
        <span className="text-muted-foreground text-sm truncate max-w-[300px] block">
          {r.summary}
        </span>
      ),
    },
    {
      key: "mistakes",
      header: "Issues",
      render: (r: any) => {
        const count = r.mistakes?.length || 0;
        return count > 0 ? (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {count} flag{count !== 1 ? "s" : ""}
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            Clear
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (r: any) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setSelectedReport(r)}
        >
          <Eye className="h-3.5 w-3.5 mr-1" /> View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">QC Reports</h1>
          <p className="text-muted-foreground mt-1">
            Quality control reports submitted by team leaders
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={reports || []}
        loading={isLoading}
        searchable
        searchPlaceholder="Search reports..."
        emptyMessage="No QC reports yet"
      />

      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="bg-surface-raised border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  QC Report - {formatDate(selectedReport.date)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="flex gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-surface border border-border flex-1">
                    <p className="text-muted-foreground text-xs mb-1">Team Leader</p>
                    <p className="font-medium">{selectedReport.teamLead?.name}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Summary</h4>
                  <div className="p-4 rounded-lg bg-surface border border-border text-sm text-foreground whitespace-pre-wrap">
                    {selectedReport.summary}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">
                    Flagged Issues ({selectedReport.mistakes?.length || 0})
                  </h4>
                  {selectedReport.mistakes?.length > 0 ? (
                    <div className="space-y-2">
                      {selectedReport.mistakes.map((m: any) => (
                        <div
                          key={m.id}
                          className="p-3 rounded-lg bg-danger/5 border border-danger/20"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-danger" />
                            <span className="font-medium text-sm text-foreground">
                              {m.employee?.name}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground ml-4">
                            {m.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-surface border border-border text-center">
                      <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-success" />
                      <p className="text-sm text-muted-foreground">
                        No issues flagged for this report
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
