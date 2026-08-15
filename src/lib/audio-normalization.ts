import { execFile } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { promisify } from "util";
import { ProcessingError } from "@/lib/process-recording";

const execFileAsync = promisify(execFile);

export const supportedExtensions = new Set([
  "mp3",
  "wav",
  "m4a",
  "aac",
  "ogg",
  "flac",
  "webm",
  "mp4",
  "mov",
]);

const directTranscriptionExtensions = new Set(["mp3", "wav", "m4a", "webm", "mp4"]);

async function commandAvailable(command: string) {
  try {
    await execFileAsync(command, ["-version"], { timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

async function durationOf(filePath: string) {
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath],
      { timeout: 15_000 },
    );
    const duration = Number.parseFloat(stdout.trim());
    return Number.isFinite(duration) && duration > 0 ? duration : null;
  } catch {
    return null;
  }
}

async function fileToTemp(file: File, directory: string, extension: string) {
  const inputPath = path.join(directory, `input.${extension}`);
  await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
  return inputPath;
}

export async function normalizeRecording(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !supportedExtensions.has(extension)) {
    throw new ProcessingError(
      "Unsupported file type. Choose MP3, WAV, M4A, AAC, OGG, FLAC, WebM, MP4, or MOV.",
      415,
    );
  }

  const needsNormalization = !directTranscriptionExtensions.has(extension);
  const hasFfmpeg = needsNormalization ? await commandAvailable("ffmpeg") : false;
  if (needsNormalization && !hasFfmpeg) {
    throw new ProcessingError(
      "This recording needs FFmpeg to be converted. Install FFmpeg on the server and try again.",
      422,
    );
  }

  const probeAvailable = await commandAvailable("ffprobe");
  if (!needsNormalization && !probeAvailable) {
    return { file, durationSeconds: null, wasNormalized: false };
  }

  const directory = await mkdtemp(path.join(tmpdir(), "conversation-intelligence-"));
  try {
    const inputPath = await fileToTemp(file, directory, extension);
    if (!needsNormalization) {
      return {
        file,
        durationSeconds: probeAvailable ? await durationOf(inputPath) : null,
        wasNormalized: false,
      };
    }

    const outputPath = path.join(directory, "normalized.mp3");
    try {
      await execFileAsync(
        "ffmpeg",
        ["-y", "-i", inputPath, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", outputPath],
        { timeout: 120_000, maxBuffer: 1024 * 1024 },
      );
    } catch (error) {
      console.error("FFmpeg normalization failed", error);
      throw new ProcessingError("We couldn't normalize this recording. Please try another file.", 422);
    }

    const buffer = await readFile(outputPath);
    if (buffer.length > 25 * 1024 * 1024) {
      throw new ProcessingError("The normalized recording is too large to process.", 413);
    }
    return {
      file: new File([buffer], `${file.name.replace(/\.[^.]+$/, "")}.mp3`, { type: "audio/mpeg" }),
      durationSeconds: probeAvailable ? await durationOf(outputPath) : null,
      wasNormalized: true,
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
