import { prisma } from "@/lib/prisma";
import { apiSuccess, handleApiError, requireRole } from "@/lib/api-utils";
export const runtime = "nodejs";


export async function GET() {
  try {
    await requireRole("OWNER");

    const activeEntries = await prisma.timeEntry.findMany({
      where: { checkOutAt: null },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, team: { select: { id: true, name: true } } } },
        project: { select: { id: true, name: true, color: true } },
        subTask: { select: { id: true, name: true } },
      },
      orderBy: { checkInAt: "desc" },
    });

    return apiSuccess(activeEntries);
  } catch (error) {
    return handleApiError(error);
  }
}
