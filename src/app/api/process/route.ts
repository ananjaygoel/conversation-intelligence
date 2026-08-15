import { NextResponse } from "next/server";
import { ProcessingError, processRecording } from "@/lib/process-recording";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const acceptedExtensions = new Set(["mp3", "wav", "m4a", "mp4", "webm"]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("recording");

    if (!(file instanceof File) || file.size === 0) {
      return jsonError("Choose a recording before processing.", 400);
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !acceptedExtensions.has(extension)) {
      return jsonError("Unsupported file type. Choose an MP3, WAV, M4A, MP4, or WebM recording.", 415);
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonError("This recording is too large. Upload a file smaller than 25 MB.", 413);
    }

    const result = await processRecording(file);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ProcessingError) return jsonError(error.message, error.status);
    console.error("Unexpected recording-processing error", error);
    return jsonError("We couldn't process this recording. Please try again.", 500);
  }
}
