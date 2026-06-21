import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireRole, getAuthSession } from "@/lib/api-utils";
import { subTaskSchema } from "@/lib/validations";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getAuthSession();
    if (!session?.user?.id) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const subtasks = await prisma.subTask.findMany({
      where: { projectId: id },
      include: { _count: { select: { timeEntries: true } } },
      orderBy: { createdAt: "asc" },
    });

    return apiSuccess(subtasks);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("OWNER");
    const { id } = await params;
    const body = await request.json();
    const parsed = subTaskSchema.parse(body);

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return apiError("Project not found", "NOT_FOUND", 404);

    const subtask = await prisma.subTask.create({
      data: {
        name: parsed.name,
        description: parsed.description,
        estimatedHours: parsed.estimatedHours,
        projectId: id,
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
