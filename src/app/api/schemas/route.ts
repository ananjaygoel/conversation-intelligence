import { NextResponse } from "next/server";
import { AuthenticationError, requireUser } from "@/lib/auth";
import { parseSchemaDefinition } from "@/lib/custom-schema";
import { db } from "@/lib/db";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!name || name.length > 64) return error("Give this schema a name of 64 characters or fewer.", 400);
    if (description.length > 400) return error("Description must be 400 characters or fewer.", 400);
    let definition;
    try {
      definition = parseSchemaDefinition({ fields: body.fields });
    } catch (caught) {
      return error(caught instanceof Error ? caught.message : "The schema fields are invalid.", 400);
    }

    try {
      const schema = await db.extractionSchema.create({
        data: { userId: user.id, name, description: description || null, schemaDefinition: JSON.stringify(definition) },
      });
      return NextResponse.json({ schema }, { status: 201 });
    } catch (caught) {
      console.error("Schema persistence failed", caught);
      return error("We couldn't save this schema. A schema with that name may already exist.", 409);
    }
  } catch (caught) {
    if (caught instanceof AuthenticationError) return error("Sign in to manage schemas.", 401);
    console.error("Schema creation failed", caught);
    return error("We couldn't save this schema. Please try again.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return error("Schema not found.", 404);
    const schema = await db.extractionSchema.findFirst({ where: { id, userId: user.id }, select: { isDefault: true } });
    if (!schema) return error("Schema not found.", 404);
    if (schema.isDefault) return error("General Conversation is built in and cannot be deleted.", 403);
    const deleted = await db.extractionSchema.deleteMany({ where: { id, userId: user.id, isDefault: false } });
    if (!deleted.count) return error("Schema not found.", 404);
    return NextResponse.json({ ok: true });
  } catch (caught) {
    if (caught instanceof AuthenticationError) return error("Sign in to manage schemas.", 401);
    console.error("Schema deletion failed", caught);
    return error("We couldn't delete this schema. Please try again.", 500);
  }
}
