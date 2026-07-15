import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireRole } from "@/lib/api-utils";
import { teamSchema } from "@/lib/validations";
import { mergeMemberIds, promoteTeamLeads, reconcileTeamLeadRoles } from "@/lib/team-sync";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("OWNER");
    const { id } = await params;
    const body = await request.json();
    const parsed = teamSchema.partial().parse(body);

    const existing = await prisma.team.findUnique({
      where: { id },
      include: { teamLeads: { select: { userId: true } } },
    });
    if (!existing) return apiError("Team not found", "NOT_FOUND", 404);

    const previousLeadIds = existing.teamLeads.map((tl) => tl.userId);
    const newLeadIds = parsed.teamLeadIds ?? previousLeadIds;
    const memberIds = parsed.memberIds
      ? mergeMemberIds(parsed.memberIds, newLeadIds)
      : undefined;

    const data: Record<string, unknown> = {};
    if (parsed.name !== undefined) data.name = parsed.name;
    if (parsed.description !== undefined) data.description = parsed.description;

    const team = await prisma.team.update({
      where: { id },
      data: {
        ...data,
        teamLeads: parsed.teamLeadIds
          ? {
              deleteMany: {},
              create: parsed.teamLeadIds.map((userId) => ({ userId })),
            }
          : undefined,
        members: memberIds
          ? { set: memberIds.map((memberId) => ({ id: memberId })) }
          : undefined,
      },
      include: {
        _count: { select: { members: true, projectTeams: true } },
        members: { select: { id: true, name: true, avatarUrl: true } },
        teamLeads: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      },
    });

    if (parsed.teamLeadIds) {
      await promoteTeamLeads(id, parsed.teamLeadIds);
      await reconcileTeamLeadRoles([...previousLeadIds, ...parsed.teamLeadIds]);
    }

    return apiSuccess(team);
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

    const existing = await prisma.team.findUnique({
      where: { id },
      include: { _count: { select: { projectTeams: true } } },
    });
    if (!existing) return apiError("Team not found", "NOT_FOUND", 404);

    if (existing._count.projectTeams > 0) {
      return apiError(
        "Cannot delete team with assigned projects. Remove team from projects first.",
        "ORPHAN_PROTECTION",
        400
      );
    }

    await prisma.team.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
