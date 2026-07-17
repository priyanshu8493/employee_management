import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireAuth, requireRole } from "@/lib/api-utils";
import { subTaskSchema } from "@/lib/validations";
export const runtime = "nodejs";


export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = subTaskSchema.partial().parse(body);

    const existing = await prisma.subTask.findUnique({
      where: { id },
      include: {
        assignments: { select: { userId: true } },
        project: { include: { projectLeaders: { select: { userId: true } } } },
      },
    });
    if (!existing) return apiError("SubTask not found", "NOT_FOUND", 404);

    const assignedUserIds = existing.assignments.map((a) => a.userId);

    // Employees can mark their assigned subtasks, or any subtask they have logged time on, as DONE
    if (session.user.role === "EMPLOYEE") {
      const hasWorkedOn = await prisma.timeEntry.findFirst({
        where: { userId: session.user.id, subTaskId: id },
        select: { id: true },
      });
      if (!assignedUserIds.includes(session.user.id) && !hasWorkedOn) {
        return apiError("This task is not assigned to you", "FORBIDDEN", 403);
      }
      if (Object.keys(parsed).length !== 1 || parsed.status !== "DONE") {
        return apiError("Employees can only mark tasks as complete", "FORBIDDEN", 403);
      }
      const subtask = await prisma.subTask.update({
        where: { id },
        data: { status: "DONE" },
        include: {
          assignments: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        },
      });
      return apiSuccess(subtask);
    }

    // TEAM_LEADER can update assignments and status (scoped to their assigned projects)
    if (session.user.role === "TEAM_LEADER") {
      const leaderIds = existing.project.projectLeaders.map((pl) => pl.userId);
      if (!leaderIds.includes(session.user.id)) {
        return apiError("You are not assigned to this project", "FORBIDDEN", 403);
      }

      const updateData: Record<string, unknown> = {};
      if (parsed.assignedToIds !== undefined) {
        updateData.assignments = {
          deleteMany: {},
          create: parsed.assignedToIds.map((userId: string) => ({ userId })),
        };
      }
      if (parsed.status !== undefined) updateData.status = parsed.status;
      if (Object.keys(updateData).length === 0) {
        return apiError("Not allowed to update these fields", "FORBIDDEN", 403);
      }

      const subtask = await prisma.subTask.update({
        where: { id },
        data: updateData,
        include: {
          assignments: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        },
      });
      return apiSuccess(subtask);
    }

    // OWNER can update everything
    if (session.user.role !== "OWNER") {
      return apiError("Forbidden", "FORBIDDEN", 403);
    }

    const ownerData: Record<string, unknown> = {};
    if (parsed.name !== undefined) ownerData.name = parsed.name;
    if (parsed.description !== undefined) ownerData.description = parsed.description;
    if (parsed.status !== undefined) ownerData.status = parsed.status;
    if (parsed.estimatedHours !== undefined) ownerData.estimatedHours = parsed.estimatedHours;
    if (parsed.assignedToIds !== undefined) {
      ownerData.assignments = {
        deleteMany: {},
        create: parsed.assignedToIds.map((userId: string) => ({ userId })),
      };
    }

    const subtask = await prisma.subTask.update({
      where: { id },
      data: ownerData,
      include: {
        assignments: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      },
    });

    return apiSuccess(subtask);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return apiError("Validation failed", "VALIDATION_ERROR", 400);
    }
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("OWNER");
    const { id } = await params;

    const existing = await prisma.subTask.findUnique({
      where: { id },
      include: { _count: { select: { timeEntries: true } } },
    });

    if (!existing) return apiError("SubTask not found", "NOT_FOUND", 404);

    if (existing._count.timeEntries > 0) {
      return apiError(
        "Cannot delete subtask with time entries. Archive it instead.",
        "ORPHAN_PROTECTION",
        400
      );
    }

    await prisma.subTask.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
