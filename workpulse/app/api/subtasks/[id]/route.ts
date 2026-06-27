import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireAuth, requireRole } from "@/lib/api-utils";
import { subTaskSchema } from "@/lib/validations";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = subTaskSchema.partial().parse(body);

    const existing = await prisma.subTask.findUnique({
      where: { id },
      include: { project: { include: { projectTeams: { select: { teamId: true } } } } },
    });
    if (!existing) return apiError("SubTask not found", "NOT_FOUND", 404);

    // Employees can only mark their own assigned subtasks as DONE
    if (session.user.role === "EMPLOYEE") {
      if (existing.assignedToId !== session.user.id) {
        return apiError("This task is not assigned to you", "FORBIDDEN", 403);
      }
      if (Object.keys(parsed).length !== 1 || parsed.status !== "DONE") {
        return apiError("Employees can only mark tasks as complete", "FORBIDDEN", 403);
      }
      const subtask = await prisma.subTask.update({
        where: { id },
        data: { status: "DONE" },
        include: {
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        },
      });
      return apiSuccess(subtask);
    }

    // TEAM_LEADER can update assignedToId and status (scoped to their team's projects)
    if (session.user.role === "TEAM_LEADER") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { teamId: true },
      });
      const teamIds = existing.project.projectTeams.map((pt) => pt.teamId);
      if (!user?.teamId || !teamIds.includes(user.teamId)) {
        return apiError("Your team is not assigned to this project", "FORBIDDEN", 403);
      }
      const allowedFields: Record<string, unknown> = {};
      if (parsed.assignedToId !== undefined) allowedFields.assignedToId = parsed.assignedToId;
      if (parsed.status !== undefined) allowedFields.status = parsed.status;
      if (Object.keys(allowedFields).length === 0) {
        return apiError("Not allowed to update these fields", "FORBIDDEN", 403);
      }
      const subtask = await prisma.subTask.update({
        where: { id },
        data: allowedFields,
        include: {
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        },
      });
      return apiSuccess(subtask);
    }

    // OWNER can update everything
    if (session.user.role !== "OWNER") {
      return apiError("Forbidden", "FORBIDDEN", 403);
    }

    const subtask = await prisma.subTask.update({
      where: { id },
      data: parsed,
      include: {
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
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
