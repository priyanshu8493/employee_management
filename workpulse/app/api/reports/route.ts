import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, handleApiError, requireRole } from "@/lib/api-utils";
export const runtime = "nodejs";


export async function GET(request: NextRequest) {
  try {
    await requireRole("OWNER");
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const projectIds = searchParams.get("projectIds")?.split(",").filter(Boolean);
    const employeeIds = searchParams.get("employeeIds")?.split(",").filter(Boolean);
    const employeeId = searchParams.get("employeeId");

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
    if (employeeId) timeEntryWhere.userId = employeeId;

    const [allEmployeeHours, allProjectHours, allSubTaskHours, allUsers, allProjects, allSubTasks] = await Promise.all([
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
        select: { id: true, name: true, email: true, avatarUrl: true },
      }),
      prisma.project.findMany({
        select: { id: true, name: true, clientName: true, color: true, estimatedHours: true, status: true },
      }),
      prisma.subTask.findMany({
        select: { id: true, name: true, status: true },
      }),
    ]);

    const employeeHours = allEmployeeHours.filter((e) => !!e.userId);
    const projectHours = allProjectHours.filter((p) => !!p.projectId);
    const subTaskHours = allSubTaskHours.filter((s) => !!s.userId && !!s.projectId && !!s.subTaskId);

    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const projectMap = new Map(allProjects.map((p) => [p.id, p]));
    const subTaskMap = new Map(allSubTasks.map((s) => [s.id, s]));

    const employeesWithTime: Array<{
      id: string; name: string; email?: string; avatarUrl?: string | null;
      totalHours: number;
      projectBreakdown: Array<{ id?: string; name?: string; color?: string; hours: number }>;
    }> = employeeHours
      .map((e) => {
        const user = userMap.get(e.userId!);
        if (!user) return null;
        return {
          ...user,
          totalHours: Math.round(((e._sum?.durationMinutes || 0) / 60) * 10) / 10,
          projectBreakdown: [] as Array<{ id?: string; name?: string; color?: string; hours: number }>,
        };
      })
      .filter(Boolean) as any;

    const empProjectBreakdowns = await prisma.timeEntry.groupBy({
      by: ["userId", "projectId"],
      where: { ...timeEntryWhere, durationMinutes: { not: null } },
      _sum: { durationMinutes: true },
    });

    for (const emp of employeesWithTime) {
      if (!emp?.id) continue;
      emp.projectBreakdown = empProjectBreakdowns
        .filter((pb) => pb.userId === emp.id && !!pb.projectId)
        .map((pb) => {
          const proj = projectMap.get(pb.projectId);
          return { ...proj, hours: Math.round(((pb._sum?.durationMinutes || 0) / 60) * 10) / 10 };
        });
    }

    const projectsWithTime: Array<{
      id?: string; name?: string; color?: string; estimatedHours?: number; status?: string;
      totalHours: number; percentOfEstimate: number;
      employeeBreakdown: Array<{ id?: string; name?: string; hours: number }>;
    }> = projectHours.map((p) => {
      const proj = projectMap.get(p.projectId);
      const totalHours = (p._sum?.durationMinutes || 0) / 60;
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
        .filter((pb) => pb.projectId === proj.id && !!pb.userId)
        .map((pb) => {
          const user = userMap.get(pb.userId!);
          return { id: user?.id, name: user?.name, hours: Math.round(((pb._sum?.durationMinutes || 0) / 60) * 10) / 10 };
        });
    }

    const subTasksWithTime = subTaskHours
      .map((s) => ({
        project: projectMap.get(s.projectId),
        subtask: subTaskMap.get(s.subTaskId),
        employee: userMap.get(s.userId!),
        totalHours: Math.round(((s._sum?.durationMinutes || 0) / 60) * 10) / 10,
      }));

    const heatmapMinutes = await prisma.timeEntry.groupBy({
      by: ["checkInAt"],
      where: { ...timeEntryWhere, durationMinutes: { not: null } },
      _sum: { durationMinutes: true },
    });

    const heatmap: Record<string, number> = {};
    for (const entry of heatmapMinutes) {
      const day = new Date(entry.checkInAt).toISOString().split("T")[0];
      heatmap[day] = (heatmap[day] || 0) + (entry._sum?.durationMinutes || 0);
    }

    const reportUsers = employeeId
      ? await prisma.user.findMany({
          where: { id: employeeId },
          select: { id: true, name: true, email: true, phone: true, designation: true },
        })
      : await prisma.user.findMany({
          where: { role: { in: ["EMPLOYEE", "TEAM_LEADER"] } },
          select: { id: true, name: true, email: true, phone: true, designation: true },
          orderBy: { name: "asc" },
        });

    const employeeReports: Array<Record<string, unknown>> = [];
    if (reportUsers.length) {
      const userIds = reportUsers.map((u) => u.id);

      const reportEntryWhere: Record<string, unknown> = { ...timeEntryWhere, durationMinutes: { not: null } };
      if (!employeeId) reportEntryWhere.userId = { in: userIds };

      const leaveWhere: { userId: { in: string[] }; date?: Record<string, unknown> } = { userId: { in: userIds } };
      if (startDate || endDate) {
        leaveWhere.date = {};
        if (startDate) leaveWhere.date.gte = new Date(startDate);
        if (endDate) leaveWhere.date.lte = new Date(endDate);
      }

      const qcWhere: { employeeId: { in: string[] }; qcReport?: Record<string, unknown> } = { employeeId: { in: userIds } };
      if (startDate || endDate) {
        qcWhere.qcReport = {};
        if (startDate) qcWhere.qcReport.date = { gte: new Date(startDate) };
        if (endDate) {
          qcWhere.qcReport.date = {
            ...(qcWhere.qcReport.date || {}),
            lte: new Date(endDate),
          };
        }
      }

      const [entries, leaveGroups, qcGroups] = await Promise.all([
        prisma.timeEntry.findMany({
          where: reportEntryWhere,
          select: { userId: true, checkInAt: true, durationMinutes: true, totalPauseMs: true, projectId: true },
        }),
        prisma.leave.groupBy({ by: ["userId"], where: leaveWhere, _count: { _all: true } }),
        prisma.qcMistake.groupBy({ by: ["employeeId"], where: qcWhere, _count: { _all: true } }),
      ]);

      const leaveMap = new Map(leaveGroups.map((g) => [g.userId, g._count._all]));
      const qcMap = new Map(qcGroups.map((g) => [g.employeeId, g._count._all]));

      const perUser = new Map(
        userIds.map((id) => [
          id,
          { totalWorkingMinutes: 0, totalIdleMs: 0, workingDays: new Set<string>(), perProject: new Map<string, number>() },
        ])
      );

      for (const e of entries) {
        const agg = e.userId ? perUser.get(e.userId) : undefined;
        if (!agg) continue;
        agg.totalWorkingMinutes += e.durationMinutes || 0;
        agg.totalIdleMs += e.totalPauseMs || 0;
        agg.workingDays.add(new Date(e.checkInAt).toISOString().split("T")[0]);
        if (e.projectId) {
          agg.perProject.set(e.projectId, (agg.perProject.get(e.projectId) || 0) + (e.durationMinutes || 0));
        }
      }

      employeeReports.push(
        ...reportUsers.map((u) => {
          const agg = perUser.get(u.id)!;
          const projectSummary = [...agg.perProject.entries()]
            .map(([projectId, minutes]) => {
              const proj = projectMap.get(projectId);
              return {
                project: proj?.name || "Unknown",
                client: proj?.clientName || "",
                hours: Math.round((minutes / 60) * 10) / 10,
              };
            })
            .sort((a, b) => b.hours - a.hours);

          return {
            employee: u,
            totalWorkingDays: agg.workingDays.size,
            totalLeaves: leaveMap.get(u.id) || 0,
            totalWorkingHours: Math.round((agg.totalWorkingMinutes / 60) * 10) / 10,
            totalIdleHours: Math.round((agg.totalIdleMs / 3600000) * 10) / 10,
            projectSummary,
            qcFlags: qcMap.get(u.id) || 0,
          };
        })
      );
    }

    return apiSuccess({
      employeeHours: employeesWithTime,
      projectHours: projectsWithTime,
      subTaskHours: subTasksWithTime,
      heatmap,
      employeeReports,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
