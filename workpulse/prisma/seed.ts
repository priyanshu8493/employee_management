import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("Seeding database...");

  await prisma.qcMistake.deleteMany();
  await prisma.qcReport.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.subTaskAssignment.deleteMany();
  await prisma.teamLead.deleteMany();
  await prisma.subTask.deleteMany();
  await prisma.projectTeam.deleteMany();
  await prisma.project.deleteMany();
  await prisma.leave.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();

  console.log("Creating owner...");

  const ownerHash = await bcrypt.hash("Admin@1234", 12);
  const owner = await prisma.user.upsert({
    where: { email: "rabi@smcadservices.com" },
    update: { passwordHash: ownerHash, isActive: true, role: "OWNER" },
    create: {
      email: "rabi@smcadservices.com",
      name: "Rabi Mondal",
      passwordHash: ownerHash,
      isActive: true,
      role: "OWNER",
    },
  });
  console.log(`Created owner: ${owner.email}`);

  const team1 = await prisma.team.create({ data: { name: "Development", description: "Software development team" } });
  const team2 = await prisma.team.create({ data: { name: "Design", description: "Design and creative team" } });
  console.log("Teams created");

  type EmployeeEntry = {
    name: string;
    email: string;
    password: string;
  };

  const employeeList: EmployeeEntry[] = [
    { name: "Mithun Kundu", email: "mithun.kundu74@gmail.com", password: "zefqla4t4tAa1!" },
    { name: "Bijoy Das", email: "bijoydas.mbc@gmail.com", password: "r21io01nppAa1!" },
    { name: "Soma Biswas", email: "somabiswas938@gmail.com", password: ".v7a5inu1fAa1!" },
    { name: "Jayanta Chatterjee", email: "chatterjeejayanta219@gmail.com", password: "goe3hqfqkdAa1!" },
    { name: "Biswajit Sharma", email: "biswajitsharma031@gmail.com", password: "t65msyxrlbAa1!" },
    { name: "Birendra Krishna Agasty", email: "agastybirendra@gmail.com", password: "3efe7igd23Aa1!" },
    { name: "Kankan Bhadra", email: "kankan.bhadra@gmail.com", password: "ao10b637pgAa1!" },
    { name: "Ujjwal Paramanik", email: "paramanikujjwal56@gmail.com", password: "zg70jivwvaAa1!" },
    { name: "Timir Mahata", email: "timirmahata332@gmail.com", password: "ykgew9ckm9Aa1!" },
    { name: "Sourav Chakraborty", email: "bsouravchakraborty0804@gmail.com", password: "aig1fan46dAa1!" },
    { name: "Suvansu Khan", email: "adhikaripriya327@gmail.com", password: "v7reqow5clAa1!" },
    { name: "Biswanath Karmakar", email: "rupam.karmakar007@gmail.com", password: "rhr9puh6tvAa1!" },
    { name: "Pabitra Das", email: "rkrabin222@gmail.com", password: "sbj95ldf59Aa1!" },
    { name: "Somnath Mandal", email: "Somnathmandal084@gmail.com", password: "m8qccbacneAa1!" },
    { name: "Hemanta Mandal", email: "hemantamandal596@gmail.com", password: "6pq7ylvgyzAa1!" },
    { name: "Anita Kundu", email: "anitakundu645@gmail.com", password: "aow51wpaamAa1!" },
    { name: "Jaydip Chatterjee", email: "joydipc997@gmail.com", password: "vc2seepbanAa1!" },
    { name: "Sourav Halder", email: "8389090610sou@gmail.com", password: "Admin@1234" },
  ];

  const hashPromises = employeeList.map((e) => bcrypt.hash(e.password, 12));
  const hashes = await Promise.all(hashPromises);

  const employees = await Promise.all(
    employeeList.map((e, i) =>
      prisma.user.create({
        data: {
          name: e.name,
          email: e.email.toLowerCase(),
          passwordHash: hashes[i],
          role: "EMPLOYEE",
          teamId: i < 9 ? team1.id : team2.id,
          isActive: true,
        },
      })
    )
  );
  console.log(`Created ${employees.length} employees`);

  await prisma.project.createMany({
    data: [
      { name: "SMC Portal", description: "Main employee management portal", clientName: "SMC", color: "#6C63FF", status: "ACTIVE", estimatedHours: 500, startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") },
      { name: "Client Dashboard", description: "Client-facing analytics dashboard", clientName: "SMC", color: "#22C55E", status: "ACTIVE", estimatedHours: 300, startDate: new Date("2026-03-01"), endDate: new Date("2026-09-30") },
    ],
  });
  const projects = await prisma.project.findMany();

  await prisma.projectTeam.createMany({
    data: [
      { projectId: projects[0].id, teamId: team1.id },
      { projectId: projects[0].id, teamId: team2.id },
      { projectId: projects[1].id, teamId: team1.id },
      { projectId: projects[1].id, teamId: team2.id },
    ],
  });
  console.log("Projects created");

  const subtasks = await Promise.all([
    prisma.subTask.create({ data: { name: "User management module", projectId: projects[0].id, status: "IN_PROGRESS", estimatedHours: 80, assignments: { create: { userId: employees[0].id } } } }),
    prisma.subTask.create({ data: { name: "Time tracking feature", projectId: projects[0].id, status: "TODO", estimatedHours: 60 } }),
    prisma.subTask.create({ data: { name: "Leave management system", projectId: projects[0].id, status: "TODO", estimatedHours: 40, assignments: { create: { userId: employees[1].id } } } }),
    prisma.subTask.create({ data: { name: "UI/UX improvements", projectId: projects[0].id, status: "IN_PROGRESS", estimatedHours: 50, assignments: { create: { userId: employees[9].id } } } }),
    prisma.subTask.create({ data: { name: "Report generation", projectId: projects[1].id, status: "TODO", estimatedHours: 45, assignments: { create: { userId: employees[2].id } } } }),
    prisma.subTask.create({ data: { name: "Data visualization", projectId: projects[1].id, status: "TODO", estimatedHours: 35 } }),
  ]);
  console.log("SubTasks created");

  const now = new Date();
  const timeEntryData: { userId: string; projectId: string; subTaskId: string; checkInAt: Date; checkOutAt: Date; durationMinutes: number; notes: string | null }[] = [];

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    for (const employee of employees) {
      if (Math.random() > 0.7) continue;

      const startHour = 9 + Math.floor(Math.random() * 3);
      const checkIn = new Date(date);
      checkIn.setHours(startHour, Math.floor(Math.random() * 60), 0, 0);

      const hoursWorked = 4 + Math.floor(Math.random() * 5);
      const checkOut = new Date(checkIn);
      checkOut.setHours(checkIn.getHours() + hoursWorked, Math.floor(Math.random() * 60), 0, 0);

      const proj = projects[Math.floor(Math.random() * projects.length)];
      const projSubtasks = subtasks.filter((s) => s.projectId === proj.id);
      const subtask = projSubtasks[Math.floor(Math.random() * projSubtasks.length)];

      timeEntryData.push({
        userId: employee.id,
        projectId: proj.id,
        subTaskId: subtask.id,
        checkInAt: checkIn,
        checkOutAt: checkOut,
        durationMinutes: Math.round((checkOut.getTime() - checkIn.getTime()) / 60000),
        notes: Math.random() > 0.5 ? ["Working on assigned task", "Code review", "Team meeting", "Bug fixes", "Feature implementation"][Math.floor(Math.random() * 5)] : null,
      });
    }
  }

  await prisma.timeEntry.createMany({ data: timeEntryData });
  console.log(`Created ${timeEntryData.length} time entries`);

  const activeEntry = {
    userId: employees[0].id,
    projectId: projects[0].id,
    subTaskId: subtasks[0].id,
    checkInAt: new Date(now.getTime() - 60 * 60 * 1000),
    checkOutAt: null,
    durationMinutes: null,
    notes: "Working on user management module",
  };
  await prisma.timeEntry.create({ data: activeEntry });
  console.log("Created active session for demo");

  console.log("\nSeed completed successfully!");
  console.log("\nLogin credentials:");
  console.log("  Owner: rabi@smcadservices.com / Admin@1234");
  for (const e of employeeList) {
    console.log(`  ${e.name}: ${e.email.toLowerCase()} / ${e.password}`);
  }
}

main()
  .then(() => {
    console.log("Seed done!");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  });
