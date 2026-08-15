import { NextResponse } from "next/server";
import { AuthenticationError, requireUser } from "@/lib/auth";
import { isConnectorType, parseMappings } from "@/lib/connectors";
import { db } from "@/lib/db";

const error = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
export async function POST(request: Request) {
  try {
    const user = await requireUser(); const body = await request.json();
    if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 100) return error("Enter a pipeline name between 2 and 100 characters.");
    if (!isConnectorType(body.connectorType)) return error("Choose a supported destination.");
    if (typeof body.schemaId !== "string" || !await db.extractionSchema.findFirst({ where: { id: body.schemaId, userId: user.id } })) return error("Choose one of your extraction schemas.");
    if (typeof body.connectionId !== "string" || !await db.connectorConnection.findFirst({ where: { id: body.connectionId, userId: user.id, type: body.connectorType, status: "CONNECTED" } })) return error("Connect this destination before creating a pipeline.");
    let mappings; try { mappings = parseMappings(body.fieldMappings); } catch (cause) { return error(cause instanceof Error ? cause.message : "Field mappings are invalid."); }
    const config = body.connectorConfig && typeof body.connectorConfig === "object" && !Array.isArray(body.connectorConfig) ? body.connectorConfig : {};
    if (body.connectorType === "SALESFORCE") {
      const requiredByObject: Record<string, string[]> = { Lead: ["LastName", "Company"], Contact: ["LastName"], Account: ["Name"], Opportunity: ["Name", "StageName", "CloseDate"] };
      const required = requiredByObject[String(config.objectType ?? "Lead")] ?? [];
      const mapped = new Set(mappings.map((mapping) => mapping.destination));
      const missing = required.filter((field) => !mapped.has(field));
      if (missing.length) return error(`Salesforce requires mappings for: ${missing.join(", ")}.`);
      config.requiredFields = required.map((name) => ({ name, label: name, required: true }));
    }
    const pipeline = await db.pipeline.create({ data: { userId: user.id, name: body.name.trim(), schemaId: body.schemaId, connectorType: body.connectorType, connectionId: body.connectionId, connectorConfig: JSON.stringify(config), fieldMappings: JSON.stringify(mappings), enabled: Boolean(body.enabled) } });
    return NextResponse.json({ pipeline: { id: pipeline.id } });
  } catch (cause) { if (cause instanceof AuthenticationError) return error("Sign in to create pipelines.", 401); if ((cause as { code?: string })?.code === "P2002") return error("You already have a pipeline with this name."); console.error("Pipeline create failed", cause); return error("Could not create the pipeline.", 500); }
}

export async function PATCH(request: Request) {
  try { const user = await requireUser(); const body = await request.json(); if (typeof body.id !== "string") return error("Pipeline not found."); const pipeline = await db.pipeline.findFirst({ where: { id: body.id, userId: user.id } }); if (!pipeline) return error("Pipeline not found.", 404); await db.pipeline.update({ where: { id: pipeline.id }, data: { enabled: Boolean(body.enabled) } }); return NextResponse.json({ ok: true }); } catch (cause) { if (cause instanceof AuthenticationError) return error("Sign in to manage pipelines.", 401); return error("Could not update the pipeline."); }
}
