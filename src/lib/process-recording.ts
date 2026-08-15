import OpenAI, { toFile } from "openai";
import {
  conversationSchema,
  isConversationData,
  type ConversationData,
} from "@/lib/conversation-schema";

export class ProcessingError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
  ) {
    super(message);
  }
}

export async function processRecording(file: File): Promise<{
  transcript: string;
  data: ConversationData;
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
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: upload,
      model: "gpt-4o-mini-transcribe",
    });
    transcript = transcription.text.trim();
  } catch (error) {
    console.error("OpenAI transcription failed", error);
    throw new ProcessingError("We couldn't transcribe this recording. Please try again.", 502);
  }

  if (!transcript) {
    throw new ProcessingError("We couldn't detect speech in this recording.", 422);
  }

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      instructions:
        "You extract accurate business data from customer conversations. Use only the supplied transcript. Never invent or infer identities, companies, budgets, dates, or details that are absent. Use null for absent scalar values, [] for absent lists, and a short factual summary. Keep key_quotes exact and brief. Sentiment, if present, must be a concise description grounded in the conversation.",
      input: `Transcript:\n\n${transcript}`,
      text: {
        format: {
          type: "json_schema",
          name: "customer_conversation",
          strict: true,
          schema: conversationSchema,
        },
      },
    });

    if (!response.output_text) {
      throw new Error("The extraction response did not include text.");
    }

    const parsed: unknown = JSON.parse(response.output_text);
    if (!isConversationData(parsed)) {
      throw new Error("The extraction response did not match the expected shape.");
    }

    return { transcript, data: parsed };
  } catch (error) {
    console.error("OpenAI structured extraction failed", error);
    throw new ProcessingError("We couldn't structure this conversation. Please try again.", 502);
  }
}
