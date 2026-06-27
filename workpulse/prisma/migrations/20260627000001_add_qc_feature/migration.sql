-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TEAM_LEADER';

-- AlterTable
ALTER TABLE "teams" ADD COLUMN "teamLeadId" TEXT;

-- CreateTable
CREATE TABLE "qc_reports" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "teamLeadId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qc_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qc_mistakes" (
    "id" TEXT NOT NULL,
    "qcReportId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qc_mistakes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_teamLeadId_key" ON "teams"("teamLeadId");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_teamLeadId_fkey" FOREIGN KEY ("teamLeadId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qc_reports" ADD CONSTRAINT "qc_reports_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qc_reports" ADD CONSTRAINT "qc_reports_teamLeadId_fkey" FOREIGN KEY ("teamLeadId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qc_mistakes" ADD CONSTRAINT "qc_mistakes_qcReportId_fkey" FOREIGN KEY ("qcReportId") REFERENCES "qc_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qc_mistakes" ADD CONSTRAINT "qc_mistakes_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
