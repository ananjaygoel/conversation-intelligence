import Link from "next/link";
import { UploadPanel } from "@/components/upload-panel";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureGeneralConversationSchema } from "@/lib/default-schema";

function formatCost(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value); }
function formatDate(value: Date) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(value); }

export default async function DashboardPage() {
  const user = await requireUser();
  await ensureGeneralConversationSchema(db, user.id);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const [schemas, recent, usage] = await Promise.all([
    db.extractionSchema.findMany({ where: { userId: user.id }, select: { id: true, name: true, isDefault: true }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
    db.conversation.findMany({ where: { userId: user.id }, include: { schema: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.conversation.aggregate({ where: { userId: user.id, createdAt: { gte: monthStart } }, _count: true, _sum: { durationSeconds: true, estimatedApiCost: true } }),
  ]);
  const minutes = (usage._sum.durationSeconds ?? 0) / 60;
  return <main className="mx-auto max-w-7xl px-5 py-9 sm:px-8"><UploadPanel schemas={schemas} /><section className="mt-8"><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-blue-700">This month</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Usage at a glance</h2></div><p className="text-xs text-slate-500">Estimated API cost, not an invoice.</p></div><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Conversations processed</p><p className="mt-2 text-3xl font-semibold">{usage._count}</p></div><div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Audio minutes processed</p><p className="mt-2 text-3xl font-semibold">{minutes.toFixed(1)}</p></div><div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Estimated API cost</p><p className="mt-2 text-3xl font-semibold">{formatCost(usage._sum.estimatedApiCost ?? 0)}</p></div></div></section><section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 sm:px-7"><div><h2 className="font-semibold">Recent conversations</h2><p className="mt-1 text-sm text-slate-500">Completed recordings saved to your workspace.</p></div><Link href="/dashboard/schemas" className="text-sm font-semibold text-blue-700 hover:text-blue-800">Manage schemas</Link></div>{recent.length ? <div className="divide-y divide-slate-100">{recent.map((conversation) => <Link key={conversation.id} href={`/dashboard/conversations/${conversation.id}`} className="grid gap-2 px-5 py-4 transition hover:bg-slate-50 sm:grid-cols-[1.5fr_1fr_.7fr_.8fr] sm:items-center sm:px-7"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{conversation.originalFilename}</p><p className="mt-0.5 text-xs text-slate-500 sm:hidden">{conversation.schema?.name ?? "Default schema"} · {formatDate(conversation.createdAt)}</p></div><span className="hidden text-sm text-slate-600 sm:block">{conversation.schema?.name ?? "Default schema"}</span><span className="text-xs font-semibold text-emerald-700">{conversation.processingStatus}</span><span className="hidden text-right text-sm text-slate-500 sm:block">{formatDate(conversation.createdAt)}</span></Link>)}</div> : <div className="px-7 py-12 text-center"><p className="font-medium text-slate-700">No conversations yet</p><p className="mt-1 text-sm text-slate-500">Upload your first customer recording above.</p></div>}</section></main>;
}
