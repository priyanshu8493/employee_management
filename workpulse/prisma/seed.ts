import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.qcMistake.deleteMany();
  await prisma.qcReport.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.subTask.deleteMany();
  await prisma.projectTeam.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();

  const passwordHash = await bcrypt.hash("Admin@1234", 12);

  // Owner
  const owner = await prisma.user.create({
    data: {
      email: "owner@workpulse.com",
      passwordHash,
      name: "Alex Turner",
      role: "OWNER",
      isActive: true,
    },
  });
  console.log("Created owner:", owner.email);

  // Teams
  const designTeam = await prisma.team.create({
    data: { name: "Design Team", description: "UI/UX and graphic design" },
  });
  const engineeringTeam = await prisma.team.create({
    data: { name: "Engineering", description: "Backend and frontend development" },
  });
  console.log("Teams created");

  // Employees
  const employees = await Promise.all([
    prisma.user.create({
      data: {
        email: "sarah@workpulse.com",
        passwordHash,
        name: "Sarah Chen",
        role: "EMPLOYEE",
        teamId: designTeam.id,
        avatarUrl: null,
        phone: "+1-555-0101",
      },
    }),
    prisma.user.create({
      data: {
        email: "alex@workpulse.com",
        passwordHash,
        name: "Alex Rivera",
        role: "EMPLOYEE",
        teamId: engineeringTeam.id,
        avatarUrl: null,
        phone: "+1-555-0102",
      },
    }),
    prisma.user.create({
      data: {
        email: "priya@workpulse.com",
        passwordHash,
        name: "Priya Patel",
        role: "EMPLOYEE",
        teamId: engineeringTeam.id,
        avatarUrl: null,
        phone: "+1-555-0103",
      },
    }),
  ]);
  console.log("Employees created");

  // Team Leaders
  const teamLeaders = await Promise.all([
    prisma.user.create({
      data: {
        email: "maya@workpulse.com",
        passwordHash,
        name: "Maya Johnson",
        role: "TEAM_LEADER",
        teamId: designTeam.id,
        avatarUrl: null,
        phone: "+1-555-0104",
      },
    }),
    prisma.user.create({
      data: {
        email: "james@workpulse.com",
        passwordHash,
        name: "James Wilson",
        role: "TEAM_LEADER",
        teamId: engineeringTeam.id,
        avatarUrl: null,
        phone: "+1-555-0105",
      },
    }),
  ]);

  // Assign team leaders to their teams
  await prisma.team.update({
    where: { id: designTeam.id },
    data: { teamLeadId: teamLeaders[0].id },
  });
  await prisma.team.update({
    where: { id: engineeringTeam.id },
    data: { teamLeadId: teamLeaders[1].id },
  });
  console.log("Team leaders created");

  // Projects
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: "Website Redesign",
        description: "Complete overhaul of the company website with new branding",
        color: "#6C63FF",
        status: "ACTIVE",
        estimatedHours: 200,
        startDate: new Date("2026-05-01"),
        endDate: new Date("2026-08-30"),
      },
    }),
    prisma.project.create({
      data: {
        name: "Mobile App v2",
        description: "Version 2 of the mobile application with offline support",
        color: "#22C55E",
        status: "ACTIVE",
        estimatedHours: 350,
        startDate: new Date("2026-04-15"),
        endDate: new Date("2026-09-30"),
      },
    }),
    prisma.project.create({
      data: {
        name: "Internal Analytics Dashboard",
        description: "Real-time analytics dashboard for business intelligence",
        color: "#F59E0B",
        status: "ACTIVE",
        estimatedHours: 120,
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-07-31"),
      },
    }),
  ]);
  console.log("Projects created");

  // Assign teams to projects
  await Promise.all([
    prisma.projectTeam.create({ data: { projectId: projects[0].id, teamId: designTeam.id } }),
    prisma.projectTeam.create({ data: { projectId: projects[0].id, teamId: engineeringTeam.id } }),
    prisma.projectTeam.create({ data: { projectId: projects[1].id, teamId: engineeringTeam.id } }),
    prisma.projectTeam.create({ data: { projectId: projects[2].id, teamId: designTeam.id } }),
    prisma.projectTeam.create({ data: { projectId: projects[2].id, teamId: engineeringTeam.id } }),
  ]);
  console.log("Project-team assignments created");

  // SubTasks — pre-assigned so employees see work out of the box
  const subtasks = await Promise.all([
    // Website Redesign subtasks (Design + Engineering teams)
    prisma.subTask.create({ data: { name: "Design new homepage mockups", projectId: projects[0].id, status: "DONE", estimatedHours: 30, assignedToId: employees[0].id } }),           // Sarah Chen (Design)
    prisma.subTask.create({ data: { name: "Implement responsive header", projectId: projects[0].id, status: "IN_PROGRESS", estimatedHours: 20, assignedToId: teamLeaders[0].id } }), // Maya Johnson (Design TL)
    prisma.subTask.create({ data: { name: "Build product gallery component", projectId: projects[0].id, status: "TODO", estimatedHours: 25, assignedToId: null } }),                  // unassigned
    prisma.subTask.create({ data: { name: "Optimize images and assets", projectId: projects[0].id, status: "TODO", estimatedHours: 15, assignedToId: employees[0].id } }),           // Sarah Chen (Design)
    // Mobile App v2 subtasks (Engineering team)
    prisma.subTask.create({ data: { name: "Offline data sync module", projectId: projects[1].id, status: "IN_PROGRESS", estimatedHours: 60, assignedToId: employees[1].id } }),       // James Wilson (Eng)
    prisma.subTask.create({ data: { name: "Push notifications setup", projectId: projects[1].id, status: "TODO", estimatedHours: 30, assignedToId: employees[2].id } }),              // Priya Patel (Eng)
    prisma.subTask.create({ data: { name: "User profile redesign", projectId: projects[1].id, status: "DONE", estimatedHours: 25, assignedToId: employees[1].id } }),                // James Wilson (Eng)
    prisma.subTask.create({ data: { name: "Performance optimization", projectId: projects[1].id, status: "TODO", estimatedHours: 40, assignedToId: teamLeaders[1].id } }),            // Alex Rivera (Eng TL)
    // Internal Analytics Dashboard subtasks (Design + Engineering teams)
    prisma.subTask.create({ data: { name: "Data pipeline setup", projectId: projects[2].id, status: "DONE", estimatedHours: 25, assignedToId: teamLeaders[1].id } }),                // Alex Rivera (Eng TL)
    prisma.subTask.create({ data: { name: "Chart components library", projectId: projects[2].id, status: "IN_PROGRESS", estimatedHours: 30, assignedToId: null } }),                  // unassigned
    prisma.subTask.create({ data: { name: "User permission system", projectId: projects[2].id, status: "TODO", estimatedHours: 15, assignedToId: null } }),                          // unassigned
  ]);
  console.log("SubTasks created");

  // Time entries - spread across last 30 days
  const now = new Date();
  const timeEntries: { userId: string; projectId: string; subTaskId: string; checkInAt: Date; checkOutAt: Date; durationMinutes: number; notes: string | null }[] = [];

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);
    if (date.getDay() === 0 || date.getDay() === 6) continue; // Skip weekends

    // Each employee logs time on most weekdays
    for (const employee of employees) {
      // Not every employee works every day
      if (Math.random() > 0.75) continue;

      const startHour = 8 + Math.floor(Math.random() * 3); // 8-10 AM
      const checkIn = new Date(date);
      checkIn.setHours(startHour, Math.floor(Math.random() * 60), 0, 0);

      const hoursWorked = 2 + Math.floor(Math.random() * 6); // 2-7 hours
      const checkOut = new Date(checkIn);
      checkOut.setHours(checkIn.getHours() + hoursWorked, Math.floor(Math.random() * 60), 0, 0);

      // Pick a project & subtask based on team
      const teamProjects = employee.teamId === designTeam.id
        ? [projects[0], projects[2]]
        : [projects[0], projects[1], projects[2]];
      const project = teamProjects[Math.floor(Math.random() * teamProjects.length)];

      const projectSubtasks = subtasks.filter((s) => s.projectId === project.id);
      const subtask = projectSubtasks[Math.floor(Math.random() * projectSubtasks.length)];

      const durationMinutes = Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);

      timeEntries.push({
        userId: employee.id,
        projectId: project.id,
        subTaskId: subtask.id,
        checkInAt: checkIn,
        checkOutAt: checkOut,
        durationMinutes,
        notes: Math.random() > 0.5 ? ["Working on task", "Reviewing PR", "Team sync", "Bug fixes", "Code review"][Math.floor(Math.random() * 5)] : null,
      });
    }
  }

  // Ensure recent entries for live display
  const today = new Date();
  today.setHours(8, 0, 0, 0);
  for (const employee of employees) {
    const project = employee.teamId === designTeam.id ? projects[0] : projects[1];
    const entry = {
      userId: employee.id,
      projectId: project.id,
      subTaskId: employee.teamId === designTeam.id ? subtasks[1].id : subtasks[4].id,
      checkInAt: today,
      checkOutAt: new Date(today.getTime() + 4 * 60 * 60 * 1000 + 30 * 60 * 1000),
      durationMinutes: 270,
      notes: "Morning work session",
    };
    timeEntries.push(entry);
  }

  await prisma.timeEntry.createMany({ data: timeEntries });
  console.log(`Created ${timeEntries.length} time entries`);

  // Create one active (checked in) session — Priya on her assigned push notifications task
  const activeEntry = {
    userId: employees[2].id, // Priya
    projectId: projects[1].id,
    subTaskId: subtasks[5].id, // Push notifications setup (assigned to Priya)
    checkInAt: new Date(now.getTime() - 45 * 60 * 1000), // 45 min ago
    checkOutAt: null,
    durationMinutes: null,
    notes: "Working on push notification integration",
  };
  await prisma.timeEntry.create({ data: activeEntry });
  console.log("Created active session for demo");

  console.log("\nSeed completed successfully!");
  console.log("\nLogin credentials:");
  console.log("  Owner:        owner@workpulse.com / Admin@1234");
  console.log("  Employee:     sarah@workpulse.com / Admin@1234");
  console.log("  Employee:     alex@workpulse.com / Admin@1234");
  console.log("  Employee:     priya@workpulse.com / Admin@1234");
  console.log("  Team Leader:  maya@workpulse.com / Admin@1234");
  console.log("  Team Leader:  james@workpulse.com / Admin@1234");
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
