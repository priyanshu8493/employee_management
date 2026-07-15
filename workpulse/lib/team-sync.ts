import { prisma } from "@/lib/prisma";

/** Promote users to TEAM_LEADER and assign them to the team. */
export async function promoteTeamLeads(teamId: string, leadIds: string[]) {
  if (leadIds.length === 0) return;

  await prisma.user.updateMany({
    where: { id: { in: leadIds }, role: { not: "OWNER" } },
    data: { role: "TEAM_LEADER", teamId },
  });
}

/** Reconcile user roles after team-lead assignments change. */
export async function reconcileTeamLeadRoles(userIds: string[]) {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return;

  for (const userId of uniqueIds) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user || user.role === "OWNER") continue;

    const leadCount = await prisma.teamLead.count({ where: { userId } });
    await prisma.user.update({
      where: { id: userId },
      data: { role: leadCount > 0 ? "TEAM_LEADER" : "EMPLOYEE" },
    });
  }
}

/** Ensure team leads are also team members. */
export function mergeMemberIds(memberIds: string[] = [], leadIds: string[] = []): string[] {
  return [...new Set([...memberIds, ...leadIds])];
}
