import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureGeneralConversationSchema } from "@/lib/default-schema";

function invalid(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^\S+@\S+\.\S+$/.test(email)) return invalid("Enter a valid email address.");
    if (password.length < 8) return invalid("Use a password with at least 8 characters.");

    const exists = await db.user.findUnique({ where: { email } });
    if (exists) return invalid("An account with that email already exists.", 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: { email, passwordHash },
      });
      await ensureGeneralConversationSchema(transaction, createdUser.id);
      return createdUser;
    });
    await createSession(user.id);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Sign-up failed", error);
    return invalid("We couldn't create your account. Please try again.", 500);
  }
}
