import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireAuth } from "@/lib/api-utils";
export const runtime = "nodejs";


export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const activeEntry = await prisma.timeEntry.findFirst({
      where: { userId: session.user.id, checkOutAt: null },
      include: {
        project: { select: { id: true, name: true, color: true, status: true } },
        subTask: { select: { id: true, name: true, status: true } },
        pauses: {
          where: { resumedAt: null },
          orderBy: { pausedAt: "desc" },
          take: 1,
          select: { id: true, pausedAt: true, pauseNote: true },
        },
      },
      orderBy: { checkInAt: "desc" },
    });

    // Also include all pause records for the current entry for history display
    if (activeEntry) {
      const allPauses = await prisma.timeEntryPause.findMany({
        where: { timeEntryId: activeEntry.id, resumedAt: { not: null } },
        orderBy: { pausedAt: "desc" },
        take: 20,
        select: { id: true, pausedAt: true, resumedAt: true, pauseNote: true, resumeNote: true, durationMs: true },
      });
      (activeEntry as any).pauseHistory = allPauses;
    }

    return apiSuccess(activeEntry);
  } catch (error) {
    return handleApiError(error);
  }
}
