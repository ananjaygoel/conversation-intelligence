import crypto from "node:crypto";
import { db } from "@/lib/db";

export const connectorTypes = ["WEBHOOK", "GOOGLE_SHEETS", "HUBSPOT", "SALESFORCE"] as const;
export type ConnectorType = (typeof connectorTypes)[number];
export type FieldMapping = { source: string; destination: string; type?: "text" | "number" | "boolean" | "date" | "currency" | "text_list"; required?: boolean };
export type DestinationField = { name: string; label: string; type?: string; required?: boolean };

export const connectorCatalog: Record<ConnectorType, { name: string; description: string }> = {
  WEBHOOK: { name: "Webhook", description: "Send structured data to any HTTP endpoint." },
  GOOGLE_SHEETS: { name: "Google Sheets", description: "Append one row for each processed conversation." },
  HUBSPOT: { name: "HubSpot", description: "Create or update contacts, companies, or deals." },
  SALESFORCE: { name: "Salesforce", description: "Create or update Leads, Contacts, Accounts, or Opportunities." },
};

export function isConnectorType(value: unknown): value is ConnectorType {
  return typeof value === "string" && connectorTypes.includes(value as ConnectorType);
}

function encryptionKey() {
  const encoded = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!encoded) throw new Error("Connector credentials are not configured. Add CREDENTIAL_ENCRYPTION_KEY on the server.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("CREDENTIAL_ENCRYPTION_KEY must be a base64-encoded 32-byte value.");
  return key;
}

export function encryptCredentials(value: unknown) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const payload = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), payload.toString("base64")].join(".");
}

export function decryptCredentials<T>(value: string): T {
  const [ivValue, tagValue, payloadValue] = value.split(".");
  if (!ivValue || !tagValue || !payloadValue) throw new Error("Stored connector credentials are invalid.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(payloadValue, "base64")), decipher.final()]).toString("utf8")) as T;
}

export function parseMappings(value: unknown): FieldMapping[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error("Add at least one field mapping.");
  const mappings = value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Field mappings are invalid.");
    const mapping = item as Record<string, unknown>;
    if (typeof mapping.source !== "string" || !mapping.source.trim() || typeof mapping.destination !== "string" || !mapping.destination.trim()) throw new Error("Every field mapping needs a source and destination field.");
    return { source: mapping.source.trim(), destination: mapping.destination.trim(), type: typeof mapping.type === "string" ? mapping.type as FieldMapping["type"] : "text", required: Boolean(mapping.required) };
  });
  return mappings;
}

export function valueAtPath(data: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, data);
}

export function coerceValue(value: unknown, type: FieldMapping["type"] = "text") {
  if (value === null || value === undefined || value === "") return null;
  if (type === "number" || type === "currency") {
    const number = typeof value === "number" ? value : Number(String(value).replace(/[$,]/g, ""));
    if (!Number.isFinite(number)) throw new Error("Expected a numeric value.");
    return number;
  }
  if (type === "boolean") {
    if (typeof value === "boolean") return value;
    if (String(value).toLowerCase() === "true") return true;
    if (String(value).toLowerCase() === "false") return false;
    throw new Error("Expected a boolean value.");
  }
  if (type === "date") {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) throw new Error("Expected a date value.");
    return date.toISOString().slice(0, 10);
  }
  if (type === "text_list") return Array.isArray(value) ? value.map(String).join(", ") : String(value);
  return typeof value === "string" ? value : Array.isArray(value) ? value.join(", ") : String(value);
}

export function mappedValues(data: unknown, mappings: FieldMapping[]) {
  const values: Record<string, unknown> = {};
  for (const mapping of mappings) {
    const value = valueAtPath(data, mapping.source);
    if ((value === null || value === undefined || value === "") && mapping.required) throw new Error(`${mapping.source} is required for ${mapping.destination}.`);
    if (value !== null && value !== undefined && value !== "") values[mapping.destination] = coerceValue(value, mapping.type);
  }
  return values;
}

export function webhookPayload(conversation: { id: string; createdAt: Date; schema?: { name: string } | null; structuredData: string }, mappings: FieldMapping[]) {
  const data = JSON.parse(conversation.structuredData) as unknown;
  return { conversation_id: conversation.id, processed_at: conversation.createdAt.toISOString(), schema: conversation.schema?.name ?? "General Conversation", data: mappedValues(data, mappings) };
}

export function googleSheetsRow(data: unknown, mappings: FieldMapping[]) { return mappings.map((mapping) => { const value = valueAtPath(data, mapping.source); if ((value === null || value === undefined || value === "") && mapping.required) throw new Error(`${mapping.source} is required for ${mapping.destination}.`); return value === null || value === undefined ? "" : coerceValue(value, mapping.type); }); }
export function hubspotProperties(data: unknown, mappings: FieldMapping[]) { return mappedValues(data, mappings); }
export function salesforceRecord(data: unknown, mappings: FieldMapping[], fields: DestinationField[] = []) { const record = mappedValues(data, mappings); for (const field of fields.filter((field) => field.required)) if (record[field.name] === undefined || record[field.name] === null || record[field.name] === "") throw new Error(`${field.label} is required by Salesforce.`); return record; }

export function safeSummary(value: unknown) {
  const text = typeof value === "string" ? value : value ? JSON.stringify(value) : "Accepted";
  return text.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "[redacted]").slice(0, 500);
}

export function oauthConfigured(type: ConnectorType) {
  if (type === "GOOGLE_SHEETS") return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  if (type === "HUBSPOT") return Boolean(process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET);
  if (type === "SALESFORCE") return Boolean(process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET);
  return true;
}

export async function createOAuthState(userId: string, type: ConnectorType) {
  const state = crypto.randomBytes(32).toString("base64url");
  const stateHash = crypto.createHash("sha256").update(state).digest("hex");
  await db.oAuthState.deleteMany({ where: { userId, type } });
  await db.oAuthState.create({ data: { userId, type, stateHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
  return state;
}

export function appUrl() { return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, ""); }
