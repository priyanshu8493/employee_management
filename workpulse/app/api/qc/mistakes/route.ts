import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, getAuthSession } from "@/lib/api-utils";
export const runtime = "nodejs";


export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    const where: Record<string, unknown> = {};

    if (session.user.role === "EMPLOYEE" || session.user.role === "TEAM_LEADER") {
      where.employeeId = employeeId || session.user.id;
    } else if (session.user.role === "OWNER" && employeeId) {
      where.employeeId = employeeId;
    }

    if (session.user.role === "EMPLOYEE" && employeeId && employeeId !== session.user.id) {
      return apiError("Forbidden", "FORBIDDEN", 403);
    }

    const mistakes = await prisma.qcMistake.findMany({
      where,
      include: {
        qcReport: {
          select: {
            id: true,
            date: true,
            summary: true,
            teamLead: { select: { id: true, name: true } },
          },
        },
        employee: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(mistakes);
  } catch (error) {
    return handleApiError(error);
  }
}
