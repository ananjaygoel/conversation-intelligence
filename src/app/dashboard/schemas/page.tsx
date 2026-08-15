import Link from "next/link";
import { SchemaBuilder } from "@/components/schema-builder";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseSchemaDefinition } from "@/lib/custom-schema";
import { ensureGeneralConversationSchema, generalConversationSchemaDefinition } from "@/lib/default-schema";

export default async function SchemasPage() {
  const user = await requireUser();
  await ensureGeneralConversationSchema(db, user.id);
  const schemas = await db.extractionSchema.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return <main className="mx-auto max-w-5xl px-5 py-9 sm:px-8"><Link href="/dashboard" className="text-sm font-semibold text-blue-700 hover:text-blue-800">← Back to dashboard</Link><div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_.8fr]"><SchemaBuilder /><aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Your schemas</h2><p className="mt-1 text-sm leading-6 text-slate-500">Choose one when processing a recording. General Conversation is built in and protected.</p><div className="mt-5 space-y-3">{schemas.map((schema) => { let count = schema.isDefault ? 15 : 0; if (!schema.isDefault) { try { count = parseSchemaDefinition(JSON.parse(schema.schemaDefinition)).fields.length; } catch { /* invalid historical schema stays visible */ } } return <div key={schema.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><p className="font-medium text-slate-800">{schema.name}</p>{schema.isDefault && <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">Built in</span>}</div>{schema.description && <p className="mt-1 text-sm text-slate-500">{schema.description}</p>}{schema.isDefault && <p className="mt-3 break-words text-xs leading-5 text-slate-500">{generalConversationSchemaDefinition.fields.join(" · ")}</p>}<p className="mt-2 text-xs font-medium text-slate-400">{count} field{count === 1 ? "" : "s"}</p></div>; })}</div></aside></div></main>;
}
