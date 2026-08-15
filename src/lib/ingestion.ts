import crypto from "node:crypto";
import { supportedExtensions, normalizeRecording } from "@/lib/audio-normalization";
import { buildCustomJsonSchema, parseSchemaDefinition } from "@/lib/custom-schema";
import { ensureGeneralConversationSchema } from "@/lib/default-schema";
import { db } from "@/lib/db";
import { triggerPipelinesForConversation } from "@/lib/pipeline-execution";
import { ProcessingError, processRecording } from "@/lib/process-recording";

// Vercel Functions reject request bodies above 4.5 MB before the route runs.
// Leave a small margin so production receives a controlled application error,
// while local development retains the original 25 MB limit.
export const MAX_RECORDING_SIZE = process.env.VERCEL ? 4 * 1024 * 1024 : 25 * 1024 * 1024;
export const MAX_RECORDING_SIZE_MB = MAX_RECORDING_SIZE / (1024 * 1024);
const keyPrefixLength = 15;
export function apiError(message: string, status: number) { return { message, status }; }
export function generateSourceKey() { const key = `ci_src_${crypto.randomBytes(32).toString("base64url")}`; return { key, keyHash: crypto.createHash("sha256").update(key).digest("hex"), keyPrefix: key.slice(0, keyPrefixLength) }; }
export function sourceKeyHash(key: string) { return crypto.createHash("sha256").update(key).digest("hex"); }

export async function authenticateSource(authorization: string | null) {
  const key = authorization?.match(/^Bearer\s+(ci_src_[A-Za-z0-9_-]+)$/i)?.[1];
  if (!key) return null;
  const keyHash = sourceKeyHash(key); const prefix = key.slice(0, keyPrefixLength);
  const candidates = await db.ingestionSource.findMany({ where: { keyPrefix: prefix }, include: { user: true } });
  const match = candidates.find((source) => {
    const expected = Buffer.from(source.keyHash, "hex"); const supplied = Buffer.from(keyHash, "hex");
    return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
  });
  if (!match || !match.enabled) return null;
  return match;
}

export function validateIncomingFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !supportedExtensions.has(extension)) throw new ProcessingError("Unsupported file type. Choose MP3, WAV, M4A, AAC, OGG, FLAC, WebM, MP4, or MOV.", 415);
  if (!file.size) throw new ProcessingError("Choose a recording before processing.", 400);
  if (file.size > MAX_RECORDING_SIZE) throw new ProcessingError(`This recording is too large. Upload a file smaller than ${MAX_RECORDING_SIZE_MB} MB.`, 413);
  return extension;
}

async function selectedSchema(userId: string, schemaId: string | null) {
  if (!schemaId) {
    await ensureGeneralConversationSchema(db, userId);
    const schema = await db.extractionSchema.findFirst({ where: { userId, isDefault: true } });
    if (!schema) throw new ProcessingError("A default extraction schema is unavailable.", 500);
    return schema;
  }
  const schema = await db.extractionSchema.findFirst({ where: { id: schemaId, userId } });
  if (!schema) throw new ProcessingError("Schema not found.", 404);
  return schema;
}

export async function processAndSaveRecording(input: { userId: string; file: File; schemaId?: string | null; pipelineId?: string | null }) {
  const extension = validateIncomingFile(input.file);
  const schema = await selectedSchema(input.userId, input.schemaId ?? null);
  let extractionOptions;
  if (!schema.isDefault) {
    try { extractionOptions = { name: schema.name, schema: buildCustomJsonSchema(parseSchemaDefinition(JSON.parse(schema.schemaDefinition))) }; }
    catch (error) { console.error("Stored extraction schema is malformed", error); throw new ProcessingError("This schema is no longer valid. Edit it and try again.", 422); }
  }
  if (input.pipelineId) {
    const pipeline = await db.pipeline.findFirst({ where: { id: input.pipelineId, userId: input.userId, enabled: true } });
    if (!pipeline) throw new ProcessingError("Pipeline not found or inactive.", 404);
    if (pipeline.schemaId !== schema.id) throw new ProcessingError("The selected pipeline must use the selected schema.", 422);
  }
  const normalized = await normalizeRecording(input.file);
  const result = await processRecording(normalized.file, extractionOptions);
  const conversation = await db.conversation.create({ data: { userId: input.userId, originalFilename: input.file.name, originalFileType: input.file.type || extension, fileSize: input.file.size, processingStatus: "COMPLETE", transcript: result.transcript, structuredData: JSON.stringify(result.data), schemaId: schema.id, durationSeconds: normalized.durationSeconds, transcriptionCost: result.costs.transcriptionCost, extractionCost: result.costs.extractionCost, estimatedApiCost: result.costs.estimatedApiCost } });
  try { await triggerPipelinesForConversation(conversation.id, input.userId, schema.id, input.pipelineId ?? undefined); } catch (error) { console.error("Could not start one or more pipeline deliveries", error); }
  return { conversation, result };
}

export async function processIngestion(ingestionId: string) {
  const ingestion = await db.ingestion.findUnique({ where: { id: ingestionId } });
  if (!ingestion || ingestion.status !== "RECEIVED" || !ingestion.recordingData) return;
  await db.ingestion.update({ where: { id: ingestion.id }, data: { status: "PROCESSING", processingStartedAt: new Date() } });
  try {
    const file = new File([ingestion.recordingData], ingestion.originalFilename, { type: ingestion.originalFileType });
    const { conversation } = await processAndSaveRecording({ userId: ingestion.userId, file, schemaId: ingestion.schemaId, pipelineId: ingestion.pipelineId });
    await db.ingestion.update({ where: { id: ingestion.id }, data: { status: "COMPLETED", conversationId: conversation.id, recordingData: null, processingCompletedAt: new Date(), errorMessage: null } });
  } catch (error) {
    const message = error instanceof ProcessingError ? error.message : "We couldn't process this recording. Please try again.";
    console.error("Ingestion processing failed", { ingestionId, message });
    await db.ingestion.update({ where: { id: ingestion.id }, data: { status: "FAILED", errorMessage: message.slice(0, 500), recordingData: null, processingCompletedAt: new Date() } });
  }
}
