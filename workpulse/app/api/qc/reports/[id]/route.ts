import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, getAuthSession } from "@/lib/api-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await params;

    const report = await prisma.qcReport.findUnique({
      where: { id },
      include: {
        team: { select: { id: true, name: true } },
        teamLead: { select: { id: true, name: true, avatarUrl: true } },
        mistakes: {
          include: {
            employee: { select: { id: true, name: true, avatarUrl: true, teamId: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!report) return apiError("QC report not found", "NOT_FOUND", 404);

    if (session.user.role === "EMPLOYEE" && report.mistakes.every((m) => m.employeeId !== session.user.id)) {
      return apiError("Forbidden", "FORBIDDEN", 403);
    }

    if (session.user.role === "TEAM_LEADER" && report.teamLeadId !== session.user.id) {
      return apiError("Forbidden", "FORBIDDEN", 403);
    }

    return apiSuccess(report);
  } catch (error) {
    return handleApiError(error);
  }
}
