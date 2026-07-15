import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireRole, getAuthSession } from "@/lib/api-utils";
import { subTaskSchema } from "@/lib/validations";
export const runtime = "nodejs";


export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getAuthSession();
    if (!session?.user?.id) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const where: Record<string, unknown> = { projectId: id };

    const subtasks = await prisma.subTask.findMany({
      where,
      include: {
        _count: { select: { timeEntries: true } },
        assignments: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    return apiSuccess(subtasks);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return apiError("Unauthorized", "UNAUTHORIZED", 401);
    if (session.user.role !== "OWNER" && session.user.role !== "TEAM_LEADER") {
      return apiError("Forbidden", "FORBIDDEN", 403);
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = subTaskSchema.parse(body);

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return apiError("Project not found", "NOT_FOUND", 404);

    // Team leaders can only add subtasks to projects their team is assigned to
    if (session.user.role === "TEAM_LEADER") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { teamId: true },
      });
      const teamAssigned = await prisma.projectTeam.findFirst({
        where: { projectId: id, teamId: user?.teamId || "" },
      });
      if (!teamAssigned) return apiError("Your team is not assigned to this project", "FORBIDDEN", 403);
    }

    const subtask = await prisma.subTask.create({
      data: {
        name: parsed.name,
        description: parsed.description,
        estimatedHours: parsed.estimatedHours,
        projectId: id,
        assignments: parsed.assignedToIds?.length
          ? { create: parsed.assignedToIds.map((userId) => ({ userId })) }
          : undefined,
      },
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
