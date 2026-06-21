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

    // Hours by employee
    const employeeHours = await prisma.timeEntry.groupBy({
      by: ["userId"],
      where: { ...timeEntryWhere, durationMinutes: { not: null } },
      _sum: { durationMinutes: true },
    });

    const employeesWithTime = await Promise.all(
      employeeHours.map(async (e) => {
        const user = await prisma.user.findUnique({
          where: { id: e.userId },
          select: { id: true, name: true, email: true, avatarUrl: true, team: { select: { id: true, name: true } } },
        });
        const projectBreakdown = await prisma.timeEntry.groupBy({
          by: ["projectId"],
          where: { userId: e.userId, ...timeEntryWhere, durationMinutes: { not: null } },
          _sum: { durationMinutes: true },
        });
        const projects = await Promise.all(
          projectBreakdown.map(async (p) => {
            const proj = await prisma.project.findUnique({
              where: { id: p.projectId },
              select: { id: true, name: true, color: true },
            });
            return { ...proj, hours: Math.round(((p._sum.durationMinutes || 0) / 60) * 10) / 10 };
          })
        );
        return {
          ...user,
          totalHours: Math.round(((e._sum.durationMinutes || 0) / 60) * 10) / 10,
          projectBreakdown: projects,
        };
      })
    );

    // Hours by project
    const projectHours = await prisma.timeEntry.groupBy({
      by: ["projectId"],
      where: { ...timeEntryWhere, durationMinutes: { not: null } },
      _sum: { durationMinutes: true },
    });

    const projectsWithTime = await Promise.all(
      projectHours.map(async (p) => {
        const proj = await prisma.project.findUnique({
          where: { id: p.projectId },
          select: { id: true, name: true, color: true, estimatedHours: true, status: true },
        });
        const empBreakdown = await prisma.timeEntry.groupBy({
          by: ["userId"],
          where: { projectId: p.projectId, durationMinutes: { not: null } },
          _sum: { durationMinutes: true },
        });
        const employees = await Promise.all(
          empBreakdown.map(async (e) => {
            const user = await prisma.user.findUnique({
              where: { id: e.userId },
              select: { id: true, name: true },
            });
            return { ...user, hours: Math.round(((e._sum.durationMinutes || 0) / 60) * 10) / 10 };
          })
        );
        const totalHours = (p._sum.durationMinutes || 0) / 60;
        return {
          ...proj,
          totalHours: Math.round(totalHours * 10) / 10,
          percentOfEstimate: proj?.estimatedHours && proj.estimatedHours > 0
            ? Math.round((totalHours / proj.estimatedHours) * 100)
            : 0,
          employeeBreakdown: employees,
        };
      })
    );

    // Hours by subtask
    const subTaskHours = await prisma.timeEntry.groupBy({
      by: ["subTaskId", "projectId", "userId"],
      where: { ...timeEntryWhere, durationMinutes: { not: null } },
      _sum: { durationMinutes: true },
    });

    const subTasksWithTime = await Promise.all(
      subTaskHours.map(async (s) => {
        const [subtask, user, proj] = await Promise.all([
          prisma.subTask.findUnique({ where: { id: s.subTaskId }, select: { id: true, name: true, status: true } }),
          prisma.user.findUnique({ where: { id: s.userId }, select: { id: true, name: true } }),
          prisma.project.findUnique({ where: { id: s.projectId }, select: { id: true, name: true } }),
        ]);
        return {
          project: proj,
          subtask,
          employee: user,
          totalHours: Math.round(((s._sum.durationMinutes || 0) / 60) * 10) / 10,
        };
      })
    );

    // Daily heatmap data
    const dailyData = await prisma.timeEntry.groupBy({
      by: ["checkInAt"],
      where: { durationMinutes: { not: null } },
      _sum: { durationMinutes: true },
    });

    const heatmap: Record<string, number> = {};
    for (const d of dailyData) {
      const dateKey = new Date(d.checkInAt).toISOString().split("T")[0];
      heatmap[dateKey] = (heatmap[dateKey] || 0) + (d._sum.durationMinutes || 0);
    }

    return apiSuccess({
      employeeHours: employeesWithTime,
      projectHours: projectsWithTime,
      subTaskHours: subTasksWithTime,
      heatmap,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
