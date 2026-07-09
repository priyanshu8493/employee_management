import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireRole, getAuthSession } from "@/lib/api-utils";
import { projectSchema } from "@/lib/validations";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getAuthSession();
    if (!session?.user?.id) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        projectTeams: {
          include: {
            team: {
              select: { id: true, name: true, members: { select: { id: true, name: true, avatarUrl: true } } },
            },
          },
        },
        subTasks: {
          orderBy: { createdAt: "asc" },
          include: {
            assignments: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
          },
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

    const { teamIds, startDate, endDate, ...projectFields } = parsed;

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...projectFields,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        projectTeams: teamIds
          ? {
              deleteMany: {},
              create: teamIds.map((teamId) => ({ teamId })),
            }
          : undefined,
      },
      include: {
        projectTeams: {
          include: { team: { select: { id: true, name: true } } },
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

    const existing = await prisma.project.findUnique({
      where: { id },
      include: { _count: { select: { timeEntries: true, subTasks: true } } },
    });
    if (!existing) return apiError("Project not found", "NOT_FOUND", 404);

    if (existing._count.timeEntries > 0) {
      await prisma.project.update({
        where: { id },
        data: { status: "ARCHIVED" },
      });
      return apiSuccess({ message: "Project archived (has time entries)" });
    }

    await prisma.projectTeam.deleteMany({ where: { projectId: id } });
    await prisma.subTask.deleteMany({ where: { projectId: id } });
    await prisma.project.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
