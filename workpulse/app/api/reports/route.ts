import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, handleApiError, requireRole } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    await requireRole("OWNER");
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const projectIds = searchParams.get("projectIds")?.split(",").filter(Boolean);
    const teamIds = searchParams.get("teamIds")?.split(",").filter(Boolean);
    const employeeIds = searchParams.get("employeeIds")?.split(",").filter(Boolean);

    const timeEntryWhere: Record<string, unknown> = {};
    if (startDate) timeEntryWhere.checkInAt = { gte: new Date(startDate) };
    if (endDate) {
      timeEntryWhere.checkInAt = {
        ...(timeEntryWhere.checkInAt as Record<string, unknown> || {}),
        lte: new Date(endDate),
      };
    }
    if (projectIds?.length) timeEntryWhere.projectId = { in: projectIds };
    if (employeeIds?.length) timeEntryWhere.userId = { in: employeeIds };
    if (teamIds?.length) {
      timeEntryWhere.user = { teamId: { in: teamIds } };
    }

    const [employeeHours, projectHours, subTaskHours, allUsers, allProjects, allSubTasks] = await Promise.all([
      prisma.timeEntry.groupBy({
        by: ["userId"],
        where: { ...timeEntryWhere, durationMinutes: { not: null } },
        _sum: { durationMinutes: true },
      }),
      prisma.timeEntry.groupBy({
        by: ["projectId"],
        where: { ...timeEntryWhere, durationMinutes: { not: null } },
        _sum: { durationMinutes: true },
      }),
      prisma.timeEntry.groupBy({
        by: ["subTaskId", "projectId", "userId"],
        where: { ...timeEntryWhere, durationMinutes: { not: null } },
        _sum: { durationMinutes: true },
      }),
      prisma.user.findMany({
        select: { id: true, name: true, email: true, avatarUrl: true, team: { select: { id: true, name: true } } },
      }),
      prisma.project.findMany({
        select: { id: true, name: true, color: true, estimatedHours: true, status: true },
      }),
      prisma.subTask.findMany({
        select: { id: true, name: true, status: true },
      }),
    ]);

    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const projectMap = new Map(allProjects.map((p) => [p.id, p]));
    const subTaskMap = new Map(allSubTasks.map((s) => [s.id, s]));

    const employeesWithTime: Array<{
      id?: string; name?: string; email?: string; avatarUrl?: string | null;
      team?: { id: string; name: string } | null;
      totalHours: number;
      projectBreakdown: Array<{ id?: string; name?: string; color?: string; hours: number }>;
    }> = employeeHours.map((e) => {
      const user = userMap.get(e.userId);
      return {
        ...user,
        totalHours: Math.round(((e._sum.durationMinutes || 0) / 60) * 10) / 10,
        projectBreakdown: [] as Array<{ id?: string; name?: string; color?: string; hours: number }>,
      };
    });

    const empProjectBreakdowns = await prisma.timeEntry.groupBy({
      by: ["userId", "projectId"],
      where: { ...timeEntryWhere, durationMinutes: { not: null } },
      _sum: { durationMinutes: true },
    });

    for (const emp of employeesWithTime) {
      if (!emp?.id) continue;
      emp.projectBreakdown = empProjectBreakdowns
        .filter((pb) => pb.userId === emp.id)
        .map((pb) => {
          const proj = projectMap.get(pb.projectId);
          return { ...proj, hours: Math.round(((pb._sum.durationMinutes || 0) / 60) * 10) / 10 };
        });
    }

    const projectsWithTime: Array<{
      id?: string; name?: string; color?: string; estimatedHours?: number; status?: string;
      totalHours: number; percentOfEstimate: number;
      employeeBreakdown: Array<{ id?: string; name?: string; hours: number }>;
    }> = projectHours.map((p) => {
      const proj = projectMap.get(p.projectId);
      const totalHours = (p._sum.durationMinutes || 0) / 60;
      return {
        ...proj,
        totalHours: Math.round(totalHours * 10) / 10,
        percentOfEstimate: proj?.estimatedHours && proj.estimatedHours > 0
          ? Math.round((totalHours / proj.estimatedHours) * 100)
          : 0,
        employeeBreakdown: [] as Array<{ id?: string; name?: string; hours: number }>,
      };
    });

    const projEmpBreakdowns = await prisma.timeEntry.groupBy({
      by: ["projectId", "userId"],
      where: { ...timeEntryWhere, durationMinutes: { not: null } },
      _sum: { durationMinutes: true },
    });

    for (const proj of projectsWithTime) {
      if (!proj?.id) continue;
      proj.employeeBreakdown = projEmpBreakdowns
        .filter((pb) => pb.projectId === proj.id)
        .map((pb) => {
          const user = userMap.get(pb.userId);
          return { id: user?.id, name: user?.name, hours: Math.round(((pb._sum.durationMinutes || 0) / 60) * 10) / 10 };
        });
    }

    const subTasksWithTime = subTaskHours.map((s) => ({
      project: projectMap.get(s.projectId),
      subtask: subTaskMap.get(s.subTaskId),
      employee: userMap.get(s.userId),
      totalHours: Math.round(((s._sum.durationMinutes || 0) / 60) * 10) / 10,
    }));

    return apiSuccess({
      employeeHours: employeesWithTime,
      projectHours: projectsWithTime,
      subTaskHours: subTasksWithTime,
      heatmap: {},
    });
  } catch (error) {
    return handleApiError(error);
  }
}
