import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireRole, getAuthSession } from "@/lib/api-utils";
import { projectSchema } from "@/lib/validations";
export const runtime = "nodejs";


export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getAuthSession();
    if (!session?.user?.id) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        projectLeaders: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, role: true } },
          },
        },
        subTasks: {
          orderBy: { createdAt: "asc" },
          include: {
            assignments: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
          },
        },
        timeEntries: {
          where: { durationMinutes: { not: null } },
          select: { durationMinutes: true },
        },
        _count: { select: { timeEntries: true } },
      },
    });

    if (!project) return apiError("Project not found", "NOT_FOUND", 404);

    return apiSuccess(project);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("OWNER");
    const { id } = await params;
    const body = await request.json();
    const parsed = projectSchema.partial().parse(body);

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return apiError("Project not found", "NOT_FOUND", 404);

    const { leaderIds, startDate, endDate, ...projectFields } = parsed;

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...projectFields,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        projectLeaders: leaderIds !== undefined
          ? {
              deleteMany: {},
              create: leaderIds.map((userId) => ({ userId })),
            }
          : undefined,
      },
      include: {
        projectLeaders: {
          include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } },
        },
      },
    });

    return apiSuccess(project);
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

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return apiError("Project not found", "NOT_FOUND", 404);

    await prisma.timeEntry.deleteMany({ where: { projectId: id } });
    await prisma.subTaskAssignment.deleteMany({ where: { subTask: { projectId: id } } });
    await prisma.subTask.deleteMany({ where: { projectId: id } });
    await prisma.projectLeader.deleteMany({ where: { projectId: id } });
    await prisma.project.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
