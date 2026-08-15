import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonViewer } from "@/components/json-viewer";
import { DeliveryList } from "@/components/delivery-list";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

function formatCost(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 4 }).format(value); }

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const conversation = await db.conversation.findFirst({ where: { id, userId: user.id }, include: { schema: { select: { name: true } }, deliveries: { include: { pipeline: { select: { name: true, connectorType: true } } }, orderBy: { createdAt: "desc" } } } });
  if (!conversation) notFound();
  let structuredData: unknown;
  try { structuredData = JSON.parse(conversation.structuredData); } catch { structuredData = { error: "Stored data is unavailable." }; }
  return <main className="mx-auto max-w-7xl px-5 py-9 sm:px-8"><Link href="/dashboard" className="text-sm font-semibold text-blue-700 hover:text-blue-800">← Back to conversations</Link><div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-blue-700">{conversation.schema?.name ?? "Default business conversation schema"}</p><h1 className="mt-1 break-all text-3xl font-semibold tracking-tight">{conversation.originalFilename}</h1><p className="mt-2 text-sm text-slate-500">Processed {conversation.createdAt.toLocaleString()} · {conversation.processingStatus}</p></div><div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-right text-xs text-slate-500"><p>Estimated API cost</p><p className="mt-1 text-sm font-semibold text-slate-800">{formatCost(conversation.estimatedApiCost)}</p></div></div><div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_.9fr]"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">Original transcript</h2><p className="mt-1 text-sm text-slate-500">Source conversation retained with the structured result.</p><p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">{conversation.transcript}</p></section><JsonViewer data={structuredData} filename={conversation.originalFilename} /></div><DeliveryList deliveries={conversation.deliveries} /></main>;
}
