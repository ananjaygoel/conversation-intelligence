import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { appUrl, createOAuthState, isConnectorType, oauthConfigured } from "@/lib/connectors";

export async function GET(_: Request, { params }: { params: Promise<{ type: string }> }) {
  const user = await requireUser(); const { type: rawType } = await params; const type = rawType.toUpperCase();
  if (!isConnectorType(type) || type === "WEBHOOK") return NextResponse.redirect(new URL("/dashboard/connections?error=Unsupported+connector", appUrl()));
  if (!oauthConfigured(type)) return NextResponse.redirect(new URL(`/dashboard/connections?error=${encodeURIComponent(`${type} OAuth is not configured on this server.`)}`, appUrl()));
  const state = await createOAuthState(user.id, type); const redirectUri = `${appUrl()}/api/connectors/${rawType}/callback`;
  let authorizeUrl = "";
  if (type === "GOOGLE_SHEETS") authorizeUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: redirectUri, response_type: "code", access_type: "offline", prompt: "consent", scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.metadata.readonly", state })}`;
  if (type === "HUBSPOT") authorizeUrl = `https://app.hubspot.com/oauth/authorize?${new URLSearchParams({ client_id: process.env.HUBSPOT_CLIENT_ID!, redirect_uri: redirectUri, scope: "oauth crm.objects.contacts.read crm.objects.contacts.write crm.objects.companies.read crm.objects.companies.write crm.objects.deals.read crm.objects.deals.write", state })}`;
  if (type === "SALESFORCE") authorizeUrl = `${(process.env.SALESFORCE_LOGIN_URL ?? "https://login.salesforce.com").replace(/\/$/, "")}/services/oauth2/authorize?${new URLSearchParams({ client_id: process.env.SALESFORCE_CLIENT_ID!, redirect_uri: redirectUri, response_type: "code", state })}`;
  return NextResponse.redirect(authorizeUrl);
}
