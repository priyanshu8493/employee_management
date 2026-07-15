import { prisma } from "@/lib/prisma";
import { apiSuccess, handleApiError, requireRole } from "@/lib/api-utils";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireRole("OWNER");

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const dayEnd = new Date(startOfDay);
    dayEnd.setHours(23, 59, 59, 999);

    const weekEnd = new Date(startOfWeek);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const [activeEmployees, weekEntries, projectsOverEstimate, completedThisMonth, projects, todayEntries, todayLeaves, weekTimeEntries] = await Promise.all([
      prisma.timeEntry.count({
        where: { checkOutAt: null },
      }),

      prisma.timeEntry.aggregate({
        where: { checkInAt: { gte: startOfWeek }, durationMinutes: { not: null } },
        _sum: { durationMinutes: true },
      }),

      prisma.project.findMany({
        where: { status: "ACTIVE", estimatedHours: { gt: 0 } },
        select: {
          id: true,
          estimatedHours: true,
        },
      }),

      prisma.project.count({
        where: {
          status: "COMPLETED",
          updatedAt: { gte: startOfMonth },
        },
      }),

      prisma.project.findMany({
        where: { status: { not: "ARCHIVED" } },
        select: {
          id: true,
          name: true,
          color: true,
          status: true,
          estimatedHours: true,
          updatedAt: true,
          _count: { select: { subTasks: true } },
          projectTeams: {
            select: {
              team: { select: { id: true, name: true, members: { select: { id: true, name: true, avatarUrl: true } } } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),

      prisma.timeEntry.findMany({
        where: { checkInAt: { gte: startOfDay } },
        select: {
          id: true,
          checkInAt: true,
          checkOutAt: true,
          durationMinutes: true,
          user: { select: { id: true, name: true, email: true, avatarUrl: true, team: { select: { id: true, name: true } } } },
          project: { select: { id: true, name: true, color: true } },
          subTask: { select: { id: true, name: true } },
        },
        orderBy: { checkInAt: "desc" },
      }),

      prisma.leave.findMany({
        where: { date: { gte: startOfDay, lt: dayEnd } },
        select: {
          id: true,
          user: { select: { id: true, name: true, email: true, avatarUrl: true, team: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),

      prisma.timeEntry.findMany({
        where: {
          checkInAt: { gte: startOfWeek, lte: weekEnd },
          durationMinutes: { not: null },
        },
        select: {
          checkInAt: true,
          durationMinutes: true,
          project: { select: { id: true, name: true, color: true } },
        },
      }),
    ]);

    const projectsWithTime = await prisma.timeEntry.groupBy({
      by: ["projectId"],
      where: { durationMinutes: { not: null } },
      _sum: { durationMinutes: true },
    });
    const timeByProject = new Map<string, number>();
    for (const agg of projectsWithTime) {
      timeByProject.set(agg.projectId, agg._sum.durationMinutes || 0);
    }

    const overEstimateCount = projectsOverEstimate.filter((p) => {
      const totalHours = (timeByProject.get(p.id) || 0) / 60;
      return totalHours >= p.estimatedHours;
    }).length;

    const projectsWithHealth = projects.map((p) => {
      const totalMinutes = timeByProject.get(p.id) || 0;
      const totalHours = totalMinutes / 60;
      const progressPercent = p.estimatedHours > 0 ? Math.min((totalHours / p.estimatedHours) * 100, 999) : 0;
      return {
        ...p,
        totalHoursLogged: Math.round(totalHours * 10) / 10,
        progressPercent: Math.round(progressPercent * 10) / 10,
        activeWorkers: 0,
      };
    });

    const todayMap = new Map<string, typeof todayEntries[0] & { hoursToday: number; isActive: boolean }>();
    for (const entry of todayEntries) {
      if (!entry.user) continue;
      const existing = todayMap.get(entry.user.id);
      if (existing) {
        existing.hoursToday += entry.durationMinutes || 0;
      } else {
        todayMap.set(entry.user.id, {
          ...entry,
          hoursToday: entry.durationMinutes || 0,
          isActive: !entry.checkOutAt,
        });
      }
    }

    const weekDays: { date: Date; dayName: string; hours: Record<string, number> }[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      const dayStr = day.toISOString().split("T")[0];

      const projectHours: Record<string, number> = {};
      for (const entry of weekTimeEntries) {
        const entryDay = new Date(entry.checkInAt).toISOString().split("T")[0];
        if (entryDay === dayStr) {
          const key = entry.project.id;
          projectHours[key] = (projectHours[key] || 0) + (entry.durationMinutes || 0);
        }
      }

      weekDays.push({
        date: day,
        dayName: day.toLocaleDateString("en-US", { weekday: "short" }),
        hours: projectHours,
      });
    }

    return apiSuccess({
      kpi: {
        activeEmployeesNow: activeEmployees,
        weekHours: Math.round(((weekEntries._sum.durationMinutes || 0) / 60) * 10) / 10,
        projectsOverEstimate: overEstimateCount,
        projectsCompletedThisMonth: completedThisMonth,
      },
      projectHealth: projectsWithHealth,
      todayActivity: Array.from(todayMap.values()),
      todayLeaves,
      weeklyChart: weekDays,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
