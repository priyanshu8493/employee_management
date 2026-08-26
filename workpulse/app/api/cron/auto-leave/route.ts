import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

const WEEKEND_DAYS = [0, 6]; // Sunday=0, Saturday=6

export async function POST(request: NextRequest) {
  try {
    if (CRON_SECRET) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return apiError("Unauthorized", "UNAUTHORIZED", 401);
      }
    }

    const body = await request.json().catch(() => ({}));
    const targetDateStr: string | undefined = body.date;

    const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();

    const startOfDay = new Date(year, month, day);
    const endOfDay = new Date(year, month, day + 1);

    if (WEEKEND_DAYS.includes(startOfDay.getDay())) {
      return apiSuccess({
        message: "Weekend - skipping auto-leave",
        date: startOfDay.toISOString(),
        marked: 0,
      });
    }

    const activeEmployees = await prisma.user.findMany({
      where: { isActive: true, role: { in: ["EMPLOYEE", "TEAM_LEADER"] } },
      select: { id: true, name: true },
    });

    if (activeEmployees.length === 0) {
      return apiSuccess({
        message: "No active employees found",
        date: startOfDay.toISOString(),
        marked: 0,
      });
    }

    const employeeIds = activeEmployees.map((e) => e.id);

    const employeesWithEntries = await prisma.timeEntry.findMany({
      where: {
        userId: { in: employeeIds },
        checkInAt: { gte: startOfDay, lt: endOfDay },
      },
      select: { userId: true },
      distinct: ["userId"],
    });

    const employeesWithEntriesSet = new Set(
      employeesWithEntries.map((e) => e.userId).filter(Boolean) as string[]
    );

    const employeesWithLeaves = await prisma.leave.findMany({
      where: {
        userId: { in: employeeIds },
        date: { gte: startOfDay, lt: endOfDay },
      },
      select: { userId: true },
    });

    const employeesWithLeavesSet = new Set(
      employeesWithLeaves.map((l) => l.userId).filter(Boolean) as string[]
    );

    const employeesToMark = activeEmployees.filter(
      (emp) =>
        !employeesWithEntriesSet.has(emp.id) &&
        !employeesWithLeavesSet.has(emp.id)
    );

    if (employeesToMark.length === 0) {
      return apiSuccess({
        message: "All employees have activity or existing leave",
        date: startOfDay.toISOString(),
        marked: 0,
        totalActive: activeEmployees.length,
        withActivity: employeesWithEntriesSet.size,
        withExistingLeave: employeesWithLeavesSet.size,
      });
    }

    const result = await prisma.leave.createMany({
      data: employeesToMark.map((emp) => ({
        userId: emp.id,
        date: startOfDay,
        type: "AUTO" as const,
        reason: "No activity detected for the day",
      })),
      skipDuplicates: true,
    });

    return apiSuccess({
      message: `Auto-marked ${result.count} leave(s)`,
      date: startOfDay.toISOString(),
      marked: result.count,
      employees: employeesToMark.map((e) => ({ id: e.id, name: e.name })),
      totalActive: activeEmployees.length,
      withActivity: employeesWithEntriesSet.size,
      withExistingLeave: employeesWithLeavesSet.size,
    });
  } catch (error) {
    console.error("[auto-leave] Error:", error);
    return apiError(
      "Failed to process auto-leave",
      "INTERNAL_ERROR",
      500
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    if (CRON_SECRET) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return apiError("Unauthorized", "UNAUTHORIZED", 401);
      }
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();

    const startOfDay = new Date(year, month, day);
    const endOfDay = new Date(year, month, day + 1);

    const activeEmployees = await prisma.user.findMany({
      where: { isActive: true, role: { in: ["EMPLOYEE", "TEAM_LEADER"] } },
      select: { id: true, name: true },
    });

    const employeeIds = activeEmployees.map((e) => e.id);

    const [entries, leaves] = await Promise.all([
      prisma.timeEntry.findMany({
        where: {
          userId: { in: employeeIds },
          checkInAt: { gte: startOfDay, lt: endOfDay },
        },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.leave.findMany({
        where: {
          userId: { in: employeeIds },
          date: { gte: startOfDay, lt: endOfDay },
        },
        select: { userId: true, type: true },
      }),
    ]);

    const withActivity = new Set(entries.map((e) => e.userId).filter(Boolean));
    const withLeave = new Set(leaves.map((l) => l.userId).filter(Boolean));

    const noActivity = activeEmployees.filter(
      (emp) => !withActivity.has(emp.id) && !withLeave.has(emp.id)
    );

    return apiSuccess({
      date: startOfDay.toISOString(),
      isWeekend: WEEKEND_DAYS.includes(startOfDay.getDay()),
      totalActive: activeEmployees.length,
      withActivity: withActivity.size,
      withExistingLeave: withLeave.size,
      wouldBeMarked: noActivity.map((e) => ({ id: e.id, name: e.name })),
    });
  } catch (error) {
    console.error("[auto-leave] Preview error:", error);
    return apiError("Failed to preview auto-leave", "INTERNAL_ERROR", 500);
  }
}
