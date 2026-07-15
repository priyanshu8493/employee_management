import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireRole } from "@/lib/api-utils";
import { teamSchema } from "@/lib/validations";
import { mergeMemberIds, promoteTeamLeads } from "@/lib/team-sync";

export async function GET() {
  try {
    await requireRole("OWNER");

    const teams = await prisma.team.findMany({
      include: {
        _count: { select: { members: true, projectTeams: true } },
        members: { select: { id: true, name: true, avatarUrl: true, role: true } },
        teamLeads: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      },
      orderBy: { name: "asc" },
    });

    return apiSuccess(teams);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole("OWNER");
    const body = await request.json();
    const parsed = teamSchema.parse(body);
    const memberIds = mergeMemberIds(parsed.memberIds, parsed.teamLeadIds);

    const team = await prisma.team.create({
      data: {
        name: parsed.name,
        description: parsed.description,
        teamLeads: parsed.teamLeadIds?.length
          ? { create: parsed.teamLeadIds.map((userId) => ({ userId })) }
          : undefined,
        members: memberIds.length
          ? { connect: memberIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        _count: { select: { members: true, projectTeams: true } },
        teamLeads: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      },
    });

    if (parsed.teamLeadIds?.length) {
      await promoteTeamLeads(team.id, parsed.teamLeadIds);
    }

    return apiSuccess(team);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return apiError("Validation failed", "VALIDATION_ERROR", 400);
    }
    return handleApiError(error);
  }
}
