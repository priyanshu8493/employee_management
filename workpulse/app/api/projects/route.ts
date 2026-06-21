import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireRole } from "@/lib/api-utils";
import { projectSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole("OWNER");
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const teamId = searchParams.get("teamId");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (teamId) {
      where.projectTeams = { some: { teamId } };
    }
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
