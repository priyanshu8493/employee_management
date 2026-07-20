import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireRole } from "@/lib/api-utils";
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

    const leaveDate = new Date(date);
    if (isNaN(leaveDate.getTime())) return apiError("Invalid date", "VALIDATION_ERROR", 400);

    const startOfDay = new Date(leaveDate.getFullYear(), leaveDate.getMonth(), leaveDate.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const existing = await prisma.leave.findFirst({
      where: {
        userId,
        date: { gte: startOfDay, lt: endOfDay },
      },
    });

    if (existing) {
      return apiError(`${user.name} already has a leave on ${startOfDay.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, "CONFLICT", 409);
    }

    const leave = await prisma.leave.create({
      data: {
        userId,
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
  } catch (error) {
    return handleApiError(error);
  }
}
