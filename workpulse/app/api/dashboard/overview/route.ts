import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, handleApiError, requireRole } from "@/lib/api-utils";

export async function GET() {
  try {
    await requireRole("OWNER");

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const activeEmployees = await prisma.timeEntry.count({
      where: { checkOutAt: null },
    });

    const weekEntries = await prisma.timeEntry.aggregate({
      where: { checkInAt: { gte: startOfWeek }, durationMinutes: { not: null } },
      _sum: { durationMinutes: true },
    });

    const projectsOverEstimate = await prisma.project.findMany({
      where: { status: "ACTIVE", estimatedHours: { gt: 0 } },
      include: {
        _count: { select: { timeEntries: true } },
        timeEntries: { where: { durationMinutes: { not: null } }, select: { durationMinutes: true } },
      },
    });

    const overEstimateCount = projectsOverEstimate.filter((p) => {
      const totalHours = p.timeEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0) / 60;
      return totalHours >= p.estimatedHours;
    }).length;

    const completedThisMonth = await prisma.project.count({
      where: {
        status: "COMPLETED",
        updatedAt: { gte: startOfMonth },
      },
    });

    const projects = await prisma.project.findMany({
      where: { status: { not: "ARCHIVED" } },
      include: {
        _count: { select: { subTasks: true } },
        projectTeams: {
          include: { team: { select: { id: true, name: true, members: { select: { id: true, name: true, avatarUrl: true } } } } },
        },
        timeEntries: {
          where: { durationMinutes: { not: null } },
          select: { durationMinutes: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const projectsWithHealth = projects.map((p) => {
      const totalMinutes = p.timeEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
      const totalHours = totalMinutes / 60;
      const progressPercent = p.estimatedHours > 0 ? Math.min((totalHours / p.estimatedHours) * 100, 999) : 0;
      return {
        ...p,
        totalHoursLogged: Math.round(totalHours * 10) / 10,
        progressPercent: Math.round(progressPercent * 10) / 10,
        activeWorkers: 0,
      };
    });

    const todayEntries = await prisma.timeEntry.findMany({
      where: { checkInAt: { gte: startOfDay } },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, team: { select: { id: true, name: true } } } },
        project: { select: { id: true, name: true, color: true } },
        subTask: { select: { id: true, name: true } },
      },
      orderBy: { checkInAt: "desc" },
    });

    const todayMap = new Map<string, typeof todayEntries[0] & { hoursToday: number; isActive: boolean }>();
    for (const entry of todayEntries) {
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

    const todayLeaves = await prisma.leave.findMany({
      where: { date: startOfDay },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, team: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Weekly data for chart
    const weekDays: { date: Date; dayName: string; hours: Record<string, number> }[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const dayEntries = await prisma.timeEntry.findMany({
        where: {
          checkInAt: { gte: day, lte: dayEnd },
          durationMinutes: { not: null },
        },
        select: { durationMinutes: true, project: { select: { id: true, name: true, color: true } } },
      });

      const projectHours: Record<string, number> = {};
      for (const e of dayEntries) {
        const key = e.project.id;
        projectHours[key] = (projectHours[key] || 0) + (e.durationMinutes || 0);
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
