import { NextResponse } from "next/server";
import { AuthenticationError, requireUser } from "@/lib/auth";
import { decryptCredentials, isConnectorType, parseMappings, webhookPayload } from "@/lib/connectors";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = await requireUser(); const body = await request.json();
    if (!isConnectorType(body.connectorType) || typeof body.connectionId !== "string") return NextResponse.json({ error: "Choose a connection to test." }, { status: 400 });
    const connection = await db.connectorConnection.findFirst({ where: { id: body.connectionId, userId: user.id, type: body.connectorType, status: "CONNECTED" } });
    if (!connection) return NextResponse.json({ error: "Connection not found." }, { status: 404 });
    const mappings = parseMappings(body.fieldMappings ?? []);
    const sample = { id: "test-conversation", createdAt: new Date(), schema: { name: "Test schema" }, structuredData: JSON.stringify({ customer_name: "Test Customer", company: "Example Co", budget: 25000, call_summary: "Test delivery only." }) };
    if (connection.type === "WEBHOOK") { const credentials = decryptCredentials<{ url: string; method?: string; headers?: Record<string, string> }>(connection.credentials ?? ""); const response = await fetch(credentials.url, { method: credentials.method ?? "POST", headers: { "Content-Type": "application/json", ...(credentials.headers ?? {}) }, body: JSON.stringify({ ...webhookPayload(sample, mappings), test: true }) }); if (!response.ok) return NextResponse.json({ error: `Webhook returned HTTP ${response.status}.` }, { status: 422 }); return NextResponse.json({ ok: true, message: `Webhook accepted test payload (HTTP ${response.status}).` }); }
    // CRM tests are intentionally non-destructive: delivery validates credentials when it creates a real record.
    return NextResponse.json({ ok: true, message: "Connection configuration is saved. This non-destructive test does not create a CRM record." });
  } catch (cause) { if (cause instanceof AuthenticationError) return NextResponse.json({ error: "Sign in to test connections." }, { status: 401 }); return NextResponse.json({ error: cause instanceof Error ? cause.message : "Test failed." }, { status: 400 }); }
}
