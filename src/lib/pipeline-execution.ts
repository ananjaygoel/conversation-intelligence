import { db } from "@/lib/db";
import { decryptCredentials, googleSheetsRow, hubspotProperties, parseMappings, safeSummary, salesforceRecord, webhookPayload } from "@/lib/connectors";

type OAuthCredentials = { accessToken: string; refreshToken?: string; expiresAt?: string; instanceUrl?: string };

function parsed(value: string) { return JSON.parse(value) as Record<string, unknown>; }
async function responseOrError(response: Response) {
  const body = await response.text();
  if (!response.ok) throw new Error(`Destination returned HTTP ${response.status}: ${safeSummary(body)}`);
  return { status: response.status, summary: safeSummary(body) };
}

async function refreshOAuth(type: string, connection: { id: string; credentials: string | null }) {
  if (!connection.credentials) throw new Error("This connection needs to be reconnected.");
  const current = decryptCredentials<OAuthCredentials>(connection.credentials);
  if (!current.refreshToken || !current.expiresAt || new Date(current.expiresAt).getTime() > Date.now() + 60_000) return current;
  let url = ""; let fields: Record<string, string> = {};
  if (type === "GOOGLE_SHEETS") { url = "https://oauth2.googleapis.com/token"; fields = { client_id: process.env.GOOGLE_CLIENT_ID ?? "", client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "", grant_type: "refresh_token", refresh_token: current.refreshToken }; }
  if (type === "HUBSPOT") { url = "https://api.hubapi.com/oauth/v3/token"; fields = { client_id: process.env.HUBSPOT_CLIENT_ID ?? "", client_secret: process.env.HUBSPOT_CLIENT_SECRET ?? "", grant_type: "refresh_token", refresh_token: current.refreshToken }; }
  if (type === "SALESFORCE") { url = `${(current.instanceUrl ?? process.env.SALESFORCE_LOGIN_URL ?? "https://login.salesforce.com").replace(/\/$/, "")}/services/oauth2/token`; fields = { client_id: process.env.SALESFORCE_CLIENT_ID ?? "", client_secret: process.env.SALESFORCE_CLIENT_SECRET ?? "", grant_type: "refresh_token", refresh_token: current.refreshToken }; }
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(fields) });
  if (!response.ok) { await db.connectorConnection.update({ where: { id: connection.id }, data: { status: "NEEDS_RECONNECTION" } }); throw new Error("OAuth token expired. Reconnect this destination to resume delivery."); }
  const result = await response.json() as { access_token: string; expires_in?: number; instance_url?: string };
  const next = { ...current, accessToken: result.access_token, instanceUrl: result.instance_url ?? current.instanceUrl, expiresAt: new Date(Date.now() + (result.expires_in ?? 1800) * 1000).toISOString() };
  const { encryptCredentials } = await import("@/lib/connectors");
  await db.connectorConnection.update({ where: { id: connection.id }, data: { credentials: encryptCredentials(next), status: "CONNECTED" } });
  return next;
}

async function deliver(delivery: Awaited<ReturnType<typeof loadDelivery>>) {
  const pipeline = delivery.pipeline;
  const config = parsed(pipeline.connectorConfig);
  const mappings = parseMappings(JSON.parse(pipeline.fieldMappings));
  const data = JSON.parse(delivery.conversation.structuredData) as unknown;
  if (!pipeline.connection || pipeline.connection.status !== "CONNECTED") throw new Error("This destination is unavailable. Reconnect it to resume delivery.");
  if (pipeline.connectorType === "WEBHOOK") {
    const credentials = decryptCredentials<{ url: string; method?: string; headers?: Record<string, string> }>(pipeline.connection.credentials ?? "");
    const url = new URL(credentials.url);
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("Webhook URLs must use HTTPS outside local development.");
    const response = await fetch(url, { method: credentials.method ?? "POST", headers: { "Content-Type": "application/json", ...(credentials.headers ?? {}) }, body: JSON.stringify(webhookPayload(delivery.conversation, mappings)) });
    return responseOrError(response);
  }
  const tokens = await refreshOAuth(pipeline.connectorType, pipeline.connection);
  if (pipeline.connectorType === "GOOGLE_SHEETS") {
    const spreadsheetId = String(config.spreadsheetId ?? ""); const sheetName = String(config.sheetName ?? "");
    if (!spreadsheetId || !sheetName) throw new Error("Choose a spreadsheet and worksheet before activating this pipeline.");
    const range = `${sheetName.replace(/'/g, "''")}!A:ZZ`;
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, { method: "POST", headers: { Authorization: `Bearer ${tokens.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ values: [googleSheetsRow(data, mappings)] }) });
    return responseOrError(response);
  }
  if (pipeline.connectorType === "HUBSPOT") {
    const objectType = String(config.objectType ?? "contacts"); const properties = hubspotProperties(data, mappings);
    let response: Response;
    if (config.mode === "update" && typeof config.idSourceField === "string" && typeof config.idProperty === "string") {
      const identifier = String((properties as Record<string, unknown>)[config.idSourceField] ?? "");
      if (!identifier) throw new Error("A HubSpot update needs the selected record identifier.");
      response = await fetch(`https://api.hubapi.com/crm/v3/objects/${encodeURIComponent(objectType)}/${encodeURIComponent(identifier)}?idProperty=${encodeURIComponent(config.idProperty)}`, { method: "PATCH", headers: { Authorization: `Bearer ${tokens.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ properties }) });
    } else response = await fetch(`https://api.hubapi.com/crm/v3/objects/${encodeURIComponent(objectType)}`, { method: "POST", headers: { Authorization: `Bearer ${tokens.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ properties }) });
    return responseOrError(response);
  }
  if (pipeline.connectorType === "SALESFORCE") {
    const objectName = String(config.objectType ?? "Lead"); const record = salesforceRecord(data, mappings, Array.isArray(config.requiredFields) ? config.requiredFields as never[] : []);
    const base = tokens.instanceUrl;
    if (!base) throw new Error("Salesforce connection is missing its instance URL. Reconnect it.");
    const version = "v60.0";
    let response: Response;
    if (config.mode === "update" && typeof config.recordIdSource === "string") {
      const recordId = String((record as Record<string, unknown>)[config.recordIdSource] ?? "");
      if (!recordId) throw new Error("A Salesforce update needs the selected record ID.");
      response = await fetch(`${base}/services/data/${version}/sobjects/${encodeURIComponent(objectName)}/${encodeURIComponent(recordId)}`, { method: "PATCH", headers: { Authorization: `Bearer ${tokens.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(record) });
    } else response = await fetch(`${base}/services/data/${version}/sobjects/${encodeURIComponent(objectName)}`, { method: "POST", headers: { Authorization: `Bearer ${tokens.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(record) });
    return responseOrError(response);
  }
  throw new Error("Unsupported connector.");
}

async function loadDelivery(id: string) {
  const delivery = await db.pipelineDelivery.findUnique({ where: { id }, include: { pipeline: { include: { connection: true } }, conversation: { include: { schema: { select: { name: true } } } } } });
  if (!delivery) throw new Error("Delivery not found.");
  return delivery;
}

export async function runDelivery(id: string) {
  const delivery = await db.pipelineDelivery.update({ where: { id }, data: { status: "PROCESSING", attemptCount: { increment: 1 }, errorMessage: null } });
  try {
    const result = await deliver(await loadDelivery(delivery.id));
    return await db.pipelineDelivery.update({ where: { id }, data: { status: "SUCCESS", responseStatus: result.status, responseBodySummary: result.summary, deliveredAt: new Date(), errorMessage: null } });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Delivery failed.";
    console.error("Pipeline delivery failed", { deliveryId: id, message });
    return db.pipelineDelivery.update({ where: { id }, data: { status: "FAILED", errorMessage: message } });
  }
}

export async function triggerPipelinesForConversation(conversationId: string, userId: string, schemaId: string | null, pipelineId?: string) {
  if (!schemaId) return [];
  const pipelines = await db.pipeline.findMany({ where: { userId, schemaId, enabled: true, ...(pipelineId ? { id: pipelineId } : {}) }, select: { id: true } });
  const deliveries = await Promise.all(pipelines.map((pipeline) => db.pipelineDelivery.upsert({ where: { pipelineId_conversationId: { pipelineId: pipeline.id, conversationId } }, create: { pipelineId: pipeline.id, conversationId, status: "PENDING" }, update: {} })));
  return Promise.all(deliveries.map((delivery) => runDelivery(delivery.id)));
}
