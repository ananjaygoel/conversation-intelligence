import { after, NextResponse } from "next/server";
import { authenticateSource, processIngestion, validateIncomingFile } from "@/lib/ingestion";
import { db } from "@/lib/db";
import { ProcessingError } from "@/lib/process-recording";

export const runtime = "nodejs";
// `after()` work shares this route's Vercel Function lifetime.
export const maxDuration = 300;
const response = (body: object, status: number) => NextResponse.json(body, { status });
export async function POST(request: Request) {
  const source = await authenticateSource(request.headers.get("authorization"));
  if (!source) return response({ error: "Invalid or disabled ingestion source." }, 401);
  let form: FormData;
  try { form = await request.formData(); } catch { return response({ error: "Use multipart/form-data with a recording field." }, 400); }
  const recording = form.get("recording"); const externalId = form.get("externalId"); const schemaId = form.get("schemaId"); const pipelineId = form.get("pipelineId"); const sourceLabel = form.get("source");
  const external = typeof externalId === "string" && externalId.trim() ? externalId.trim().slice(0, 200) : null;
  if (external) { const existing = await db.ingestion.findFirst({ where: { sourceId: source.id, externalId: external } }); if (existing) return response({ id: existing.id, status: existing.status.toLowerCase(), duplicate: true }, 200); }
  if (!(recording instanceof File)) return response({ error: "Include a recording file." }, 400);
  let selectedSchemaId: string | null = typeof schemaId === "string" && schemaId ? schemaId : null;
  const selectedPipelineId: string | null = typeof pipelineId === "string" && pipelineId ? pipelineId : null;
  let validationError: ProcessingError | null = null;
  try {
    validateIncomingFile(recording);
    if (selectedSchemaId && !await db.extractionSchema.findFirst({ where: { id: selectedSchemaId, userId: source.userId } })) return response({ error: "Schema not found." }, 404);
    if (selectedPipelineId) { const pipeline = await db.pipeline.findFirst({ where: { id: selectedPipelineId, userId: source.userId, enabled: true } }); if (!pipeline) return response({ error: "Pipeline not found or inactive." }, 404); if (selectedSchemaId && pipeline.schemaId !== selectedSchemaId) return response({ error: "Pipeline and schema must match." }, 422); selectedSchemaId ??= pipeline.schemaId; }
  } catch (error) { validationError = error instanceof ProcessingError ? error : new ProcessingError("Invalid recording.", 400); }
  if (!selectedSchemaId && !validationError) selectedSchemaId = (await db.extractionSchema.findFirst({ where: { userId: source.userId, isDefault: true }, select: { id: true } }))?.id ?? null;
  const extension = recording.name.split(".").pop()?.toLowerCase() ?? "unknown";
  const ingestion = await db.ingestion.create({ data: { sourceId: source.id, userId: source.userId, externalId: external, sourceLabel: typeof sourceLabel === "string" ? sourceLabel.slice(0, 120) : null, originalFilename: recording.name.slice(0, 255), originalFileType: recording.type || extension, fileSize: recording.size, schemaId: selectedSchemaId, pipelineId: selectedPipelineId, status: validationError ? "FAILED" : "RECEIVED", errorMessage: validationError?.message ?? null, recordingData: validationError ? null : Buffer.from(await recording.arrayBuffer()), processingCompletedAt: validationError ? new Date() : null } });
  await db.ingestionSource.update({ where: { id: source.id }, data: { lastUsedAt: new Date() } });
  if (validationError) return response({ id: ingestion.id, status: "failed", error: validationError.message }, validationError.status);
  after(() => processIngestion(ingestion.id));
  return response({ id: ingestion.id, status: "accepted" }, 202);
}
