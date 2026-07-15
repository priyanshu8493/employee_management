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
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { teamId: true },
      });

      if (session.user.role === "TEAM_LEADER" && user?.teamId) {
        const teamMemberIds = await prisma.user.findMany({
          where: { teamId: user.teamId, isActive: true },
          select: { id: true },
        });
        where.userId = {
          in: [...teamMemberIds.map((m) => m.id), session.user.id],
        };
      } else {
        where.userId = session.user.id;
      }
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
          select: { id: true, name: true, email: true, avatarUrl: true, team: { select: { id: true, name: true } } },
        },
      },
      orderBy: { date: "desc" },
    });

    return apiSuccess(leaves);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    if (session.user.role === "OWNER") {
      return apiError("Owners cannot mark leave", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const { date, reason } = body;

    if (!date) {
      return apiError("Date is required", "VALIDATION_ERROR", 400);
    }

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
          select: { id: true, name: true, email: true, avatarUrl: true, team: { select: { id: true, name: true } } },
        },
      },
    });

    return apiSuccess(leave);
  } catch (error) {
    return handleApiError(error);
  }
}
