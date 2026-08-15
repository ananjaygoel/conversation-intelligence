import { PrismaClient } from "@prisma/client";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run make-admin -- user@example.com");
  process.exit(1);
}

const db = new PrismaClient();

async function main() {
  try {
    const result = await db.user.updateMany({ where: { email }, data: { role: "ADMIN" } });
    if (!result.count) {
      console.error("No user was found with that email.");
      process.exitCode = 1;
    } else {
      console.log(`Promoted ${email} to ADMIN.`);
    }
  } finally {
    await db.$disconnect();
  }
}

void main();
