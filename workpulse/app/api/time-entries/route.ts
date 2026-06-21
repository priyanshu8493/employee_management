import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireAuth, getAuthSession } from "@/lib/api-utils";
import { checkInSchema, checkOutSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || session.user.id;
    const projectId = searchParams.get("projectId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Employees can only see their own entries
    if (session.user.role === "EMPLOYEE" && userId !== session.user.id) {
      return apiError("Forbidden", "FORBIDDEN", 403);
    }

    const where: Record<string, unknown> = { userId };
    if (projectId) where.projectId = projectId;
    if (startDate) where.checkInAt = { gte: new Date(startDate) };
    if (endDate) {
      where.checkInAt = { ...(where.checkInAt as Record<string, unknown>), lte: new Date(endDate) };
    }

    const [entries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, color: true, status: true } },
          subTask: { select: { id: true, name: true, status: true } },
        },
        orderBy: { checkInAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.timeEntry.count({ where }),
    ]);

    return apiSuccess(entries, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    if (body.action === "checkin") {
      const parsed = checkInSchema.parse(body);

      const activeEntry = await prisma.timeEntry.findFirst({
        where: { userId: session.user.id, checkOutAt: null },
      });
      if (activeEntry) {
        return apiError("You already have an active session. Check out first.", "DOUBLE_CHECKIN", 400);
      }

      const entry = await prisma.timeEntry.create({
        data: {
          userId: session.user.id,
          projectId: parsed.projectId,
          subTaskId: parsed.subTaskId,
          notes: parsed.notes,
          checkInAt: new Date(),
        },
        include: {
          project: { select: { id: true, name: true, color: true } },
          subTask: { select: { id: true, name: true, status: true } },
        },
      });

      return apiSuccess(entry);
    }

    if (body.action === "checkout") {
      const parsed = checkOutSchema.parse(body);

      const entry = await prisma.timeEntry.findFirst({
        where: { id: parsed.timeEntryId, userId: session.user.id, checkOutAt: null },
      });
      if (!entry) {
        return apiError("Active time entry not found", "NOT_FOUND", 404);
      }

      const now = new Date();
      const durationMinutes = Math.round((now.getTime() - entry.checkInAt.getTime()) / 60000);

      const updated = await prisma.timeEntry.update({
        where: { id: parsed.timeEntryId },
        data: {
          checkOutAt: now,
          durationMinutes,
          notes: parsed.notes !== undefined ? parsed.notes : entry.notes,
        },
        include: {
          project: { select: { id: true, name: true, color: true } },
          subTask: { select: { id: true, name: true, status: true } },
        },
      });

      return apiSuccess(updated);
    }

    return apiError("Invalid action", "INVALID_ACTION", 400);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return apiError("Validation failed", "VALIDATION_ERROR", 400);
    }
    return handleApiError(error);
  }
}
