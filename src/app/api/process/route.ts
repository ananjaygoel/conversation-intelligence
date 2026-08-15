import { NextResponse } from "next/server";
import { AuthenticationError, requireUser } from "@/lib/auth";
import { processAndSaveRecording } from "@/lib/ingestion";
import { ProcessingError } from "@/lib/process-recording";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const formData = await request.formData();
    const file = formData.get("recording");
    const schemaId = formData.get("schemaId");

    if (!(file instanceof File) || file.size === 0) {
      return jsonError("Choose a recording before processing.", 400);
    }

    const { result, conversation } = await processAndSaveRecording({ userId: user.id, file, schemaId: typeof schemaId === "string" && schemaId ? schemaId : null });
    return NextResponse.json({ ...result, conversationId: conversation.id });
  } catch (error) {
    if (error instanceof AuthenticationError) return jsonError("Sign in to process recordings.", 401);
    if (error instanceof ProcessingError) return jsonError(error.message, error.status);
    console.error("Unexpected recording-processing error", error);
    return jsonError("We couldn't process this recording. Please try again.", 500);
  }
}
