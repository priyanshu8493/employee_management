import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireAuth, getAuthSession } from "@/lib/api-utils";
import { qcReportSchema } from "@/lib/validations";
export const runtime = "nodejs";


export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};

    if (session.user.role === "TEAM_LEADER") {
      where.teamLeadId = session.user.id;
    } else if (session.user.role === "EMPLOYEE") {
      return apiError("Forbidden", "FORBIDDEN", 403);
    }

    if (teamId) where.teamId = teamId;
    if (startDate) where.date = { gte: new Date(startDate) };
    if (endDate) {
      where.date = { ...(where.date as Record<string, unknown>), lte: new Date(endDate) };
    }

    const reports = await prisma.qcReport.findMany({
      where,
      include: {
        team: { select: { id: true, name: true } },
        teamLead: { select: { id: true, name: true, avatarUrl: true } },
        mistakes: {
          include: {
            employee: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return apiSuccess(reports);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    if (session.user.role !== "TEAM_LEADER" && session.user.role !== "OWNER") {
      return apiError("Only team leaders can submit QC reports", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const parsed = qcReportSchema.parse(body);

    const teamLead = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    if (!teamLead?.teamId) {
      return apiError("You are not assigned to a team", "NO_TEAM", 400);
    }

    const isTeamLead = await prisma.teamLead.findUnique({
      where: { teamId_userId: { teamId: teamLead.teamId, userId: session.user.id } },
    });

    if (!isTeamLead && session.user.role !== "OWNER") {
      return apiError("You are not a team leader of your team", "NOT_TEAM_LEADER", 403);
    }

    const team = await prisma.team.findUnique({ where: { id: teamLead.teamId } });
    if (!team) return apiError("Team not found", "NOT_FOUND", 404);

    const report = await prisma.qcReport.create({
      data: {
        teamId: teamLead.teamId,
        teamLeadId: session.user.id,
        summary: parsed.summary,
        date: parsed.date ? new Date(parsed.date) : new Date(),
        mistakes: parsed.mistakes?.length
          ? {
              create: parsed.mistakes.map((m) => ({
                employeeId: m.employeeId,
                description: m.description,
              })),
            }
          : undefined,
      },
      include: {
        team: { select: { id: true, name: true } },
        teamLead: { select: { id: true, name: true } },
        mistakes: {
          include: {
            employee: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    return apiSuccess(report);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return apiError("Validation failed", "VALIDATION_ERROR", 400);
    }
    return handleApiError(error);
  }
}
