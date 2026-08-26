"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { BarChart3, Loader2 } from "lucide-react";

export default function ProjectProgressPage() {
  const { data: session } = useSession();

  const isTeamLeader = session?.user?.role === "TEAM_LEADER";

  const { data: projects, isLoading } = useQuery({
    queryKey: ["employee-projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      const { data } = await res.json();
      return data?.projects || [];
    },
    staleTime: 30000,
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
        <BarChart3 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Project Progress</h1>
          <p className="text-sm text-muted-foreground">Track time logged vs estimated hours</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : activeProjects.length === 0 ? (
        <Card className="border border-border p-8 rounded-xl">
          <div className="text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No Active Projects</h3>
            <p className="text-sm text-muted-foreground">No active projects are assigned to you.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeProjects.map((project: any) => {
            const hoursLogged = Math.round((project.totalMinutes || 0) / 60 * 10) / 10;
            const estimated = project.estimatedHours || 0;
            const percent = estimated > 0 ? Math.round((hoursLogged / estimated) * 100) : 0;

            return (
              <Card
                key={project.id}
                className="border border-border p-5 rounded-xl hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <div>
                      <p className="font-semibold text-foreground">{project.name}</p>
                      {project.clientName && (
                        <p className="text-xs text-muted-foreground mt-0.5">{project.clientName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        percent >= 100
                          ? "border-danger/30 text-danger"
                          : percent >= 75
                          ? "border-warning/30 text-warning"
                          : "border-success/30 text-success"
                      }`}
                    >
                      {percent}%
                    </Badge>
                    <Badge variant="outline" className="border-border text-muted-foreground text-xs">
                      {project._count?.subTasks || 0} subtasks
                    </Badge>
                  </div>
                </div>

                <div className="mb-2">
                  <ProgressBar
                    value={hoursLogged}
                    max={estimated || 1}
                    showLabel={false}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{hoursLogged}h logged</span>
                  <span>{estimated > 0 ? `${estimated}h estimated` : "No estimate set"}</span>
                </div>

                {project.projectLeaders?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Leaders:</span>
                      {project.projectLeaders.map((pl: any) => (
                        <span key={pl.user?.id} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {pl.user?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
