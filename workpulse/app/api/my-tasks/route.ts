import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, getAuthSession } from "@/lib/api-utils";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {
      assignments: {
        some: { userId: session.user.id },
      },
      project: {
        status: "ACTIVE",
      },
    };

    if (status) {
      where.status = status;
    }

    const subtasks = await prisma.subTask.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, color: true, status: true },
        },
        assignments: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        _count: { select: { timeEntries: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(subtasks);
  } catch (error) {
    return handleApiError(error);
  }
}
