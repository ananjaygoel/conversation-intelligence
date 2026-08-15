import { NextResponse } from "next/server";
import { AuthenticationError, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { runDelivery } from "@/lib/pipeline-execution";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const user = await requireUser(); const { id } = await params; const delivery = await db.pipelineDelivery.findFirst({ where: { id, pipeline: { userId: user.id } } }); if (!delivery) return NextResponse.json({ error: "Delivery not found." }, { status: 404 }); if (delivery.status !== "FAILED") return NextResponse.json({ error: "Only failed deliveries can be retried." }, { status: 409 }); if (delivery.attemptCount >= 5) return NextResponse.json({ error: "This delivery has reached its retry limit." }, { status: 429 }); const result = await runDelivery(id); return NextResponse.json({ status: result.status, error: result.errorMessage }); } catch (cause) { if (cause instanceof AuthenticationError) return NextResponse.json({ error: "Sign in to retry deliveries." }, { status: 401 }); return NextResponse.json({ error: "Could not retry this delivery." }, { status: 500 }); }
}
