import "dotenv/config";
import pg from "pg";
import bcrypt from "bcryptjs";
const { Pool } = pg;

const cleanUrl = process.env.DATABASE_URL.split("?")[0];
const pool = new Pool({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false }, max: 1 });

try {
  const { rows } = await pool.query(
    `SELECT email, "passwordHash" AS hash, "isActive", role, name FROM users WHERE email = $1`,
    ["rabi@smcadservices.com"]
  );
  const owner = rows[0];
  console.log("Owner:", owner.name, "active:", owner.isActive, "role:", owner.role);
  console.log("Hash starts with:", owner.hash?.substring(0, 10));

  const match = await bcrypt.compare("Admin@1234", owner.hash);
  console.log("Password match:", match);

  // Also test the Prisma adapter path
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const pool2 = new Pool({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false }, max: 1 });
  const adapter = new PrismaPg(pool2);
  const prisma = new PrismaClient({ adapter });
  const user = await prisma.user.findUnique({ where: { email: "rabi@smcadservices.com" } });
  console.log("Prisma query success:", !!user, "email:", user?.email);
  const match2 = await bcrypt.compare("Admin@1234", user.passwordHash);
  console.log("Prisma password match:", match2);
  await prisma.$disconnect();
  await pool2.end();
} catch (e) {
  console.error("Error:", e.message, e.stack);
}
await pool.end();
