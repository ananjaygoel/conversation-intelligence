import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { appUrl, encryptCredentials, isConnectorType } from "@/lib/connectors";
import { db } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const url = new URL(request.url); const { type: rawType } = await params; const type = rawType.toUpperCase(); const failure = (message: string) => NextResponse.redirect(new URL(`/dashboard/connections?error=${encodeURIComponent(message)}`, appUrl()));
  if (!isConnectorType(type) || type === "WEBHOOK") return failure("Unsupported connector.");
  const user = await getCurrentUser(); const code = url.searchParams.get("code"); const state = url.searchParams.get("state");
  if (!user || !code || !state) return failure("The connection request could not be verified. Sign in and try again.");
  const stateHash = crypto.createHash("sha256").update(state).digest("hex"); const savedState = await db.oAuthState.findFirst({ where: { userId: user.id, type, stateHash, expiresAt: { gt: new Date() } } });
  if (!savedState) return failure("The connection request expired or did not belong to this account.");
  await db.oAuthState.delete({ where: { id: savedState.id } });
  try {
    const redirectUri = `${appUrl()}/api/connectors/${rawType}/callback`; let endpoint = ""; let clientId = ""; let clientSecret = "";
    if (type === "GOOGLE_SHEETS") { endpoint = "https://oauth2.googleapis.com/token"; clientId = process.env.GOOGLE_CLIENT_ID!; clientSecret = process.env.GOOGLE_CLIENT_SECRET!; }
    if (type === "HUBSPOT") { endpoint = "https://api.hubapi.com/oauth/v3/token"; clientId = process.env.HUBSPOT_CLIENT_ID!; clientSecret = process.env.HUBSPOT_CLIENT_SECRET!; }
    if (type === "SALESFORCE") { endpoint = `${(process.env.SALESFORCE_LOGIN_URL ?? "https://login.salesforce.com").replace(/\/$/, "")}/services/oauth2/token`; clientId = process.env.SALESFORCE_CLIENT_ID!; clientSecret = process.env.SALESFORCE_CLIENT_SECRET!; }
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri }) });
    if (!response.ok) throw new Error("The provider did not accept the authorization response.");
    const token = await response.json() as { access_token: string; refresh_token?: string; expires_in?: number; instance_url?: string; hub_id?: string | number };
    const displayName = type === "GOOGLE_SHEETS" ? "Google Sheets" : type === "HUBSPOT" ? `HubSpot${token.hub_id ? ` (${token.hub_id})` : ""}` : "Salesforce";
    await db.connectorConnection.create({ data: { userId: user.id, type, displayName, credentials: encryptCredentials({ accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: new Date(Date.now() + (token.expires_in ?? 1800) * 1000).toISOString(), instanceUrl: token.instance_url }), metadata: JSON.stringify(type === "HUBSPOT" ? { hubId: token.hub_id } : {}) } });
    return NextResponse.redirect(new URL("/dashboard/connections?connected=1", appUrl()));
  } catch (error) { console.error("Connector OAuth callback failed", { type, message: error instanceof Error ? error.message : "unknown" }); return failure("We could not connect that account. Check the app configuration and try again."); }
}
