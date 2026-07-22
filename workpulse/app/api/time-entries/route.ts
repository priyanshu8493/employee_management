import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireAuth, getAuthSession } from "@/lib/api-utils";
import { checkInSchema, checkOutSchema } from "@/lib/validations";
export const runtime = "nodejs";


export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { searchParams } = new URL(request.url);
    const paramUserId = searchParams.get("userId");
    const projectId = searchParams.get("projectId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {};

    if (session.user.role === "EMPLOYEE") {
      // Employees can only see their own entries
      where.userId = session.user.id;
    } else if (paramUserId) {
      where.userId = paramUserId;
    }
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
          user: { select: { id: true, name: true } },
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

      const subtask = await prisma.subTask.findUnique({
        where: { id: parsed.subTaskId },
        select: {
          id: true,
          projectId: true,
          status: true,
          _count: { select: { assignments: true } },
          assignments: { where: { userId: session.user.id }, select: { userId: true } },
        },
      });
      if (!subtask) {
        return apiError("SubTask not found", "NOT_FOUND", 404);
      }

      // Auto-set subtask to IN_PROGRESS if the user is assigned to it
      const isAssigned = subtask.assignments.length > 0;
      if (isAssigned && subtask.status === "TODO") {
        await prisma.subTask.update({
          where: { id: parsed.subTaskId },
          data: { status: "IN_PROGRESS" },
        });
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
      const totalPauseMs = entry.totalPauseMs || 0;
      const rawDurationMs = now.getTime() - entry.checkInAt.getTime();
      const activeDurationMs = Math.max(rawDurationMs - totalPauseMs, 0);
      const durationMinutes = Math.round(activeDurationMs / 60000);

      // Close any still-open pause
      const openPause = await prisma.timeEntryPause.findFirst({
        where: { timeEntryId: entry.id, resumedAt: null },
        orderBy: { pausedAt: "desc" },
      });
      if (openPause) {
        const openDurationMs = now.getTime() - openPause.pausedAt.getTime();
        await prisma.timeEntryPause.update({
          where: { id: openPause.id },
          data: { resumedAt: now, durationMs: openDurationMs },
        });
      }

      const updated = await prisma.timeEntry.update({
        where: { id: parsed.timeEntryId },
        data: {
          checkOutAt: now,
          durationMinutes,
          totalPauseMs: totalPauseMs + (openPause ? (now.getTime() - openPause.pausedAt.getTime()) : 0),
          pausedAt: null,
          notes: parsed.notes !== undefined ? parsed.notes : entry.notes,
        },
        include: {
          project: { select: { id: true, name: true, color: true } },
          subTask: { select: { id: true, name: true, status: true } },
        },
      });

      if (parsed.markDone) {
        await prisma.subTask.update({
          where: { id: entry.subTaskId },
          data: { status: "DONE" },
        });
        updated.subTask = { ...updated.subTask, status: "DONE" };
      }

      return apiSuccess(updated);
    }

    if (body.action === "pause") {
      const entry = await prisma.timeEntry.findFirst({
        where: { id: body.timeEntryId, userId: session.user.id, checkOutAt: null, pausedAt: null },
      });
      if (!entry) {
        return apiError("Active unpaused time entry not found", "NOT_FOUND", 404);
      }

      const pause = await prisma.timeEntryPause.create({
        data: {
          timeEntryId: entry.id,
          pausedAt: new Date(),
          pauseNote: body.pauseNote || null,
        },
      });

      await prisma.timeEntry.update({
        where: { id: entry.id },
        data: { pausedAt: pause.pausedAt },
      });

      return apiSuccess({ pause, pausedAt: pause.pausedAt });
    }

    if (body.action === "resume") {
      const entry = await prisma.timeEntry.findFirst({
        where: { id: body.timeEntryId, userId: session.user.id, checkOutAt: null, pausedAt: { not: null } },
      });
      if (!entry) {
        return apiError("No paused session found", "NOT_FOUND", 404);
      }

      const now = new Date();
      const pause = await prisma.timeEntryPause.findFirst({
        where: { timeEntryId: entry.id, resumedAt: null },
        orderBy: { pausedAt: "desc" },
      });
      if (!pause) {
        return apiError("No pause record found", "NOT_FOUND", 404);
      }

      const durationMs = now.getTime() - pause.pausedAt.getTime();
      const totalPauseMs = (entry.totalPauseMs || 0) + durationMs;

      await prisma.timeEntryPause.update({
        where: { id: pause.id },
        data: {
          resumedAt: now,
          durationMs,
          resumeNote: body.resumeNote || null,
        },
      });

      await prisma.timeEntry.update({
        where: { id: entry.id },
        data: { pausedAt: null, totalPauseMs },
      });

      return apiSuccess({ resumedAt: now, durationMs, totalPauseMs });
    }

    return apiError("Invalid action", "INVALID_ACTION", 400);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return apiError("Validation failed", "VALIDATION_ERROR", 400);
    }
    return handleApiError(error);
  }
}
