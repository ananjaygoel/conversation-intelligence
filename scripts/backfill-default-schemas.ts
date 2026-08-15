import { PrismaClient } from "@prisma/client";
import { ensureGeneralConversationSchema } from "../src/lib/default-schema";

const db = new PrismaClient();

async function main() {
  try {
    const users = await db.user.findMany({ select: { id: true } });
    for (const user of users) {
      await ensureGeneralConversationSchema(db, user.id);
    }
    console.log(`Ensured General Conversation for ${users.length} user(s).`);
  } finally {
    await db.$disconnect();
  }
}

void main();
