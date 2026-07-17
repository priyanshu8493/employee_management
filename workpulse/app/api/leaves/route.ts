import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireAuth } from "@/lib/api-utils";
export const runtime = "nodejs";


export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const upcoming = searchParams.get("upcoming");

    const where: Record<string, unknown> = {};

    if (session.user.role === "EMPLOYEE" || session.user.role === "TEAM_LEADER") {
      where.userId = session.user.id;
    }

    if (dateParam) {
      const date = new Date(dateParam);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
      where.date = { gte: startOfDay, lt: endOfDay };
    } else if (upcoming === "true") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.date = { gte: today };
    }

    const leaves = await prisma.leave.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { date: "desc" },
    });

    return apiSuccess(leaves.filter((l) => l.user));
  } catch (error) {
    return handleApiError(error);
  }
}

function getDaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    if (session.user.role === "OWNER") {
      return apiError("Owners cannot mark leave", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const { date, startDate, endDate, reason } = body;

    if (date) {
      const leaveDate = new Date(date);
      if (isNaN(leaveDate.getTime())) {
        return apiError("Invalid date", "VALIDATION_ERROR", 400);
      }

      const startOfDay = new Date(leaveDate.getFullYear(), leaveDate.getMonth(), leaveDate.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const existing = await prisma.leave.findFirst({
        where: {
          userId: session.user.id,
          date: { gte: startOfDay, lt: endOfDay },
        },
      });

      if (existing) {
        return apiError("You already have a leave marked for this date", "CONFLICT", 409);
      }

      const leave = await prisma.leave.create({
        data: {
          userId: session.user.id,
          date: startOfDay,
          reason: reason || null,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });

      return apiSuccess(leave);
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return apiError("Invalid date range", "VALIDATION_ERROR", 400);
      }

      const startNormalized = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endNormalized = new Date(end.getFullYear(), end.getMonth(), end.getDate());

      if (startNormalized > endNormalized) {
        return apiError("Start date must be before end date", "VALIDATION_ERROR", 400);
      }

      const days = getDaysInRange(startNormalized, endNormalized);

      if (days.length > 31) {
        return apiError("Cannot mark more than 31 days of leave at once", "VALIDATION_ERROR", 400);
      }

      const existingLeaves = await prisma.leave.findMany({
        where: {
          userId: session.user.id,
          date: { gte: startNormalized, lte: endNormalized },
        },
        select: { date: true },
      });

      const existingDates = new Set(
        existingLeaves.map((l) => new Date(l.date).toISOString().split("T")[0])
      );

      const newDays = days.filter(
        (d) => !existingDates.has(d.toISOString().split("T")[0])
      );

      if (newDays.length === 0) {
        return apiError("All dates in this range already have leaves marked", "CONFLICT", 409);
      }

      const created = await prisma.leave.createMany({
        data: newDays.map((d) => ({
          userId: session.user.id,
          date: d,
          reason: reason || null,
        })),
      });

      return apiSuccess({
        created: created.count,
        skipped: existingDates.size,
        total: days.length,
      });
    }

    return apiError("Provide either 'date' or 'startDate' and 'endDate'", "VALIDATION_ERROR", 400);
  } catch (error) {
    return handleApiError(error);
  }
}
