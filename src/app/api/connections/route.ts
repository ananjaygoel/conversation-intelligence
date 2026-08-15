import { NextResponse } from "next/server";
import { AuthenticationError, requireUser } from "@/lib/auth";
import { encryptCredentials, isConnectorType } from "@/lib/connectors";
import { db } from "@/lib/db";

const error = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(request: Request) {
  try {
    const user = await requireUser(); const body = await request.json();
    if (body.type !== "WEBHOOK" || !isConnectorType(body.type)) return error("This connection type must use OAuth.");
    if (typeof body.url !== "string") return error("Enter a webhook URL.");
    const url = new URL(body.url);
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname))) return error("Webhook URLs must use HTTPS outside local development.");
    let headers: Record<string, string> = {};
    if (body.headers) { try { headers = JSON.parse(body.headers); } catch { return error("Webhook headers must be valid JSON."); } }
    if (!headers || typeof headers !== "object" || Array.isArray(headers) || Object.values(headers).some((value) => typeof value !== "string")) return error("Webhook headers must be text values.");
    const connection = await db.connectorConnection.create({ data: { userId: user.id, type: "WEBHOOK", displayName: typeof body.displayName === "string" && body.displayName.trim() ? body.displayName.trim() : url.hostname, credentials: encryptCredentials({ url: url.toString(), method: body.method === "PUT" ? "PUT" : "POST", headers }), metadata: JSON.stringify({ host: url.host, method: body.method === "PUT" ? "PUT" : "POST" }) } });
    return NextResponse.json({ connection: { id: connection.id, type: connection.type, displayName: connection.displayName, status: connection.status } });
  } catch (cause) { if (cause instanceof AuthenticationError) return error("Sign in to manage connections.", 401); console.error("Connection save failed", cause); return error(cause instanceof Error ? cause.message : "Could not save the connection."); }
}

export async function DELETE(request: Request) {
  try { const user = await requireUser(); const { searchParams } = new URL(request.url); const id = searchParams.get("id"); if (!id) return error("Connection not found."); const connection = await db.connectorConnection.findFirst({ where: { id, userId: user.id } }); if (!connection) return error("Connection not found.", 404); await db.connectorConnection.update({ where: { id }, data: { status: "DISCONNECTED", credentials: null } }); return NextResponse.json({ ok: true }); } catch (cause) { if (cause instanceof AuthenticationError) return error("Sign in to manage connections.", 401); return error("Could not disconnect this connection."); }
}
