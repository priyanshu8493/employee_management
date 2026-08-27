import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireRole } from "@/lib/api-utils";
import { dateToUTCDate } from "@/lib/utils";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await requireRole("OWNER");

    const body = await request.json();
    const { userId, date, reason } = body;

    if (!userId) return apiError("userId is required", "VALIDATION_ERROR", 400);
    if (!date) return apiError("date is required", "VALIDATION_ERROR", 400);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return apiError("Employee not found", "NOT_FOUND", 404);

    const startOfDay = dateToUTCDate(String(date));
    if (!startOfDay) return apiError("Invalid date", "VALIDATION_ERROR", 400);

    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const existing = await prisma.leave.findFirst({
      where: {
        userId,
        date: { gte: startOfDay, lt: endOfDay },
      },
    });

    if (existing) {
      return apiError(`${user.name} already has a leave on ${startOfDay.toISOString().split("T")[0]}`, "CONFLICT", 409);
    }

    const leave = await prisma.leave.create({
      data: {
        userId,
        date: startOfDay,
        type: "MANUAL",
        reason: reason || null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    return apiSuccess(leave);
  } catch (error) {
    return handleApiError(error);
  }
}
