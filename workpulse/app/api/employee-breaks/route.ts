import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireRole } from "@/lib/api-utils";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireRole("OWNER");

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) return apiError("userId is required", "VALIDATION_ERROR", 400);

    const timeEntries = await prisma.timeEntry.findMany({
      where: { userId },
      select: {
        id: true,
        checkInAt: true,
        checkOutAt: true,
        totalPauseMs: true,
        project: { select: { id: true, name: true, color: true } },
        pauses: {
          where: { resumedAt: { not: null } },
          orderBy: { pausedAt: "desc" },
          select: {
            id: true,
            pausedAt: true,
            resumedAt: true,
            pauseNote: true,
            resumeNote: true,
            durationMs: true,
          },
        },
      },
      orderBy: { checkInAt: "desc" },
      take: 200,
    });

    const breaks = timeEntries
      .filter((entry) => entry.pauses.length > 0)
      .flatMap((entry) =>
        entry.pauses.map((pause) => ({
          id: pause.id,
          date: pause.pausedAt.toISOString().split("T")[0],
          pausedAt: pause.pausedAt.toISOString(),
          resumedAt: pause.resumedAt!.toISOString(),
          pauseNote: pause.pauseNote,
          resumeNote: pause.resumeNote,
          durationMs: pause.durationMs,
          projectName: entry.project?.name || null,
          projectColor: entry.project?.color || null,
        }))
      );

    breaks.sort((a, b) => new Date(b.pausedAt).getTime() - new Date(a.pausedAt).getTime());

    return apiSuccess(breaks);
  } catch (error) {
    return handleApiError(error);
  }
}
