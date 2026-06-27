import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireRole } from "@/lib/api-utils";
import { teamSchema } from "@/lib/validations";

export async function GET() {
  try {
    await requireRole("OWNER");

    const teams = await prisma.team.findMany({
      include: {
        _count: { select: { members: true, projectTeams: true } },
        members: { select: { id: true, name: true, avatarUrl: true, role: true } },
        teamLead: { select: { id: true, name: true, avatarUrl: true } },
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

    const team = await prisma.team.create({
      data: {
        name: parsed.name,
        description: parsed.description,
        teamLeadId: parsed.teamLeadId || null,
        members: parsed.memberIds?.length
          ? { connect: parsed.memberIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        _count: { select: { members: true, projectTeams: true } },
        teamLead: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return apiSuccess(team);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return apiError("Validation failed", "VALIDATION_ERROR", 400);
    }
    return handleApiError(error);
  }
}
