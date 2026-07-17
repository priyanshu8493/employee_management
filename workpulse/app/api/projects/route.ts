import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireRole, getAuthSession } from "@/lib/api-utils";
import { projectSchema } from "@/lib/validations";
export const runtime = "nodejs";


export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const clientName = searchParams.get("clientName");

    const where: Record<string, unknown> = {};

    if (session.user.role !== "OWNER") {
      where.projectLeaders = { some: { userId: session.user.id } };
    }

    if (status) where.status = status;
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    if (clientName) {
      where.clientName = clientName;
    }

    const [projects, timeAggregates, clientNames] = await Promise.all([
      prisma.project.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          clientName: true,
          color: true,
          status: true,
          estimatedHours: true,
          startDate: true,
          endDate: true,
          updatedAt: true,
          _count: { select: { subTasks: true, timeEntries: true } },
          projectLeaders: {
            select: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.timeEntry.groupBy({
        by: ["projectId"],
        where: { durationMinutes: { not: null } },
        _sum: { durationMinutes: true },
      }),
      prisma.project.findMany({
        where: { clientName: { not: null } },
        select: { clientName: true },
        distinct: ["clientName"],
      }),
    ]);

    const timeByProject = new Map<string, number>();
    for (const agg of timeAggregates) {
      timeByProject.set(agg.projectId, agg._sum.durationMinutes || 0);
    }

    const projectsWithTime = projects.map((p) => ({
      ...p,
      totalMinutes: timeByProject.get(p.id) || 0,
    }));

    return apiSuccess({ projects: projectsWithTime, clientNames: clientNames.map((c) => c.clientName).filter(Boolean) as string[] });
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
        clientName: parsed.clientName,
        color: parsed.color,
        estimatedHours: parsed.estimatedHours,
        startDate: parsed.startDate ? new Date(parsed.startDate) : new Date(),
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
        projectLeaders: parsed.leaderIds?.length
          ? {
              create: parsed.leaderIds.map((userId) => ({ userId })),
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
