import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireRole, getAuthSession } from "@/lib/api-utils";
import { projectSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const teamId = searchParams.get("teamId");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    // Non-OWNER roles can only see projects assigned to their team
    if (session.user.role !== "OWNER") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { teamId: true },
      });
      if (!user?.teamId) return apiSuccess([]);
      where.projectTeams = { some: { teamId: user.teamId } };
    } else if (teamId) {
      where.projectTeams = { some: { teamId } };
    }

    if (status) where.status = status;
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        _count: { select: { subTasks: true, timeEntries: true } },
        projectTeams: {
          include: { team: { select: { id: true, name: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return apiSuccess(projects);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole("OWNER");
    const body = await request.json();
    const parsed = projectSchema.parse(body);

    const project = await prisma.project.create({
      data: {
        name: parsed.name,
        description: parsed.description,
        color: parsed.color,
        estimatedHours: parsed.estimatedHours,
        startDate: parsed.startDate ? new Date(parsed.startDate) : new Date(),
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
        projectTeams: parsed.teamIds?.length
          ? {
              create: parsed.teamIds.map((teamId) => ({ teamId })),
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
