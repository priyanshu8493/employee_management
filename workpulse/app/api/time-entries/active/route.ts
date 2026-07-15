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
      },
      orderBy: { checkInAt: "desc" },
    });

    return apiSuccess(activeEntry);
  } catch (error) {
    return handleApiError(error);
  }
}
