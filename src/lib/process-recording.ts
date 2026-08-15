import OpenAI, { toFile } from "openai";
import {
  conversationSchema,
  isConversationData,
  type ConversationData,
} from "@/lib/conversation-schema";
import { calculateEstimatedCosts } from "@/lib/pricing";

export class ProcessingError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
  ) {
    super(message);
  }
}

export type ExtractionOptions = {
  name: string;
  schema: Record<string, unknown>;
};

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function tokenUsage(usage: unknown) {
  if (!usage || typeof usage !== "object") return undefined;
  const value = usage as Record<string, unknown>;
  return {
    input_tokens: typeof value.input_tokens === "number" ? value.input_tokens : undefined,
    output_tokens: typeof value.output_tokens === "number" ? value.output_tokens : undefined,
  };
}

export async function processRecording(
  file: File,
  extractionOptions?: ExtractionOptions,
): Promise<{
  transcript: string;
  data: ConversationData | Record<string, unknown>;
  costs: { transcriptionCost: number; extractionCost: number; estimatedApiCost: number };
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ProcessingError(
      "The service is not configured yet. Add OPENAI_API_KEY and try again.",
      503,
    );
  }

  const openai = new OpenAI({ apiKey });
  const upload = await toFile(Buffer.from(await file.arrayBuffer()), file.name, {
    type: file.type || "application/octet-stream",
  });

  let transcript: string;
  let transcriptionUsage: ReturnType<typeof tokenUsage>;
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: upload,
      model: "gpt-4o-mini-transcribe",
    });
    transcript = transcription.text.trim();
    transcriptionUsage = tokenUsage(transcription.usage);
  } catch (error) {
    console.error("OpenAI transcription failed", error);
    throw new ProcessingError("We couldn't transcribe this recording. Please try again.", 502);
  }

  if (!transcript) {
    throw new ProcessingError("We couldn't detect speech in this recording.", 422);
  }

  try {
    const isDefaultSchema = !extractionOptions;
    const schemaName = (extractionOptions?.name ?? "customer_conversation")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 64);
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      instructions:
        "You extract accurate business data from customer conversations. Use only the supplied transcript. Never invent or infer identities, companies, budgets, dates, or details that are absent. Use null for absent scalar values and [] for absent lists. If a field is requested but absent, do not guess. Keep any quotes exact and brief.",
      input: `Transcript:\n\n${transcript}`,
      text: {
        format: {
          type: "json_schema",
          name: schemaName || "custom_schema",
          strict: true,
          schema: extractionOptions?.schema ?? conversationSchema,
        },
      },
    });

    if (!response.output_text) {
      throw new Error("The extraction response did not include text.");
    }

    const parsed: unknown = JSON.parse(response.output_text);
    if (isDefaultSchema && !isConversationData(parsed)) {
      throw new Error("The extraction response did not match the expected shape.");
    }
    if (!isDefaultSchema && !isJsonObject(parsed)) {
      throw new Error("The custom extraction response did not match the expected shape.");
    }

    return {
      transcript,
      data: parsed as ConversationData | Record<string, unknown>,
      costs: calculateEstimatedCosts(transcriptionUsage, tokenUsage(response.usage)),
    };
  } catch (error) {
    console.error("OpenAI structured extraction failed", error);
    throw new ProcessingError("We couldn't structure this conversation. Please try again.", 502);
  }
}
