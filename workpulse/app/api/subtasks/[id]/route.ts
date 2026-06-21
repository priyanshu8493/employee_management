import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireRole } from "@/lib/api-utils";
import { subTaskSchema } from "@/lib/validations";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("OWNER");
    const { id } = await params;
    const body = await request.json();
    const parsed = subTaskSchema.partial().parse(body);

    const existing = await prisma.subTask.findUnique({ where: { id } });
    if (!existing) return apiError("SubTask not found", "NOT_FOUND", 404);

    const subtask = await prisma.subTask.update({
      where: { id },
      data: parsed,
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
