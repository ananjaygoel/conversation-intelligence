import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonViewer } from "@/components/json-viewer";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminConversationPage({ params }: { params: Promise<{ id: string; conversationId: string }> }) {
  await requireAdmin();
  const { id, conversationId } = await params;
  const conversation = await db.conversation.findFirst({ where: { id: conversationId, userId: id }, include: { schema: { select: { name: true } } } });
  if (!conversation) notFound();
  let structuredData: unknown;
  try { structuredData = JSON.parse(conversation.structuredData); } catch { structuredData = { error: "Stored data is unavailable." }; }
  return <main className="mx-auto max-w-7xl px-5 py-9 sm:px-8"><Link href={`/admin/customers/${id}`} className="text-sm font-semibold text-blue-700 hover:text-blue-800">← Back to customer</Link><div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[.14em] text-blue-700">{conversation.schema?.name ?? "Default schema"}</p><h1 className="mt-1 break-all text-3xl font-semibold tracking-tight">{conversation.originalFilename}</h1><p className="mt-2 text-sm text-slate-500">Processed {conversation.createdAt.toLocaleString()}</p></div><div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_.9fr]"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">Transcript</h2><p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">{conversation.transcript}</p></section><JsonViewer data={structuredData} filename={conversation.originalFilename} /></div></main>;
}
