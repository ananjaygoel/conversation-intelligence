import { NextResponse } from "next/server";
import { authenticateSource } from "@/lib/ingestion";
import { db } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const source = await authenticateSource(request.headers.get("authorization"));
  if (!source) return NextResponse.json({ error: "Invalid or disabled ingestion source." }, { status: 401 });
  const { id } = await params;
  const ingestion = await db.ingestion.findFirst({ where: { id, sourceId: source.id }, select: { id: true, status: true, conversationId: true, errorMessage: true, receivedAt: true, processingCompletedAt: true } });
  if (!ingestion) return NextResponse.json({ error: "Ingestion not found." }, { status: 404 });
  const body: Record<string, unknown> = { id: ingestion.id, status: ingestion.status.toLowerCase(), receivedAt: ingestion.receivedAt.toISOString() };
  if (ingestion.status === "COMPLETED") body.conversationId = ingestion.conversationId;
  if (ingestion.status === "FAILED") body.error = ingestion.errorMessage ?? "We couldn't process this recording.";
  if (ingestion.processingCompletedAt) body.completedAt = ingestion.processingCompletedAt.toISOString();
  return NextResponse.json(body);
}
