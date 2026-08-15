"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const extensions = ["mp3", "wav", "m4a", "aac", "ogg", "flac", "webm", "mp4", "mov"];

type SchemaOption = { id: string; name: string; isDefault: boolean };

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadPanel({ schemas }: { schemas: SchemaOption[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [schemaId, setSchemaId] = useState(() => schemas.find((schema) => schema.isDefault)?.id ?? "");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  function chooseFile(candidate?: File) {
    setError("");
    if (!candidate) return;
    const extension = candidate.name.split(".").pop()?.toLowerCase();
    if (!extension || !extensions.includes(extension)) return setError("Choose MP3, WAV, M4A, AAC, OGG, FLAC, WebM, MP4, or MOV.");
    if (candidate.size > MAX_FILE_SIZE) return setError("This recording is too large. Upload a file smaller than 25 MB.");
    setFile(candidate);
  }

  async function process() {
    if (!file) return;
    setError("");
    setIsProcessing(true);
    try {
      const data = new FormData();
      data.append("recording", file);
      if (schemaId) data.append("schemaId", schemaId);
      const response = await fetch("/api/process", { method: "POST", body: data });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "We couldn't process this recording. Please try again.");
      router.push(`/dashboard/conversations/${payload.conversationId}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't process this recording. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-blue-700">New conversation</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Turn a recording into data.</h1></div><p className="text-xs text-slate-500">Files are processed temporarily and never stored.</p></div>
    <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }} className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-9 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-blue-100 text-lg font-bold text-blue-700">↑</div>
      <p className="mt-3 text-sm font-semibold">Drop a recording here</p><p className="mt-1 text-sm text-slate-500">or choose a file from your computer</p><p className="mt-1 text-xs text-slate-400">MP3, WAV, M4A, AAC, OGG, FLAC, WebM, MP4, MOV · 25 MB max</p>
      <input ref={inputRef} type="file" className="hidden" accept=".mp3,.wav,.m4a,.aac,.ogg,.flac,.webm,.mp4,.mov,audio/*,video/*" onChange={(event) => chooseFile(event.target.files?.[0])} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={isProcessing} className="mt-5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">Choose recording</button>
    </div>
    {file && <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"><div><p className="text-sm font-medium">{file.name}</p><p className="text-xs text-slate-500">{formatBytes(file.size)}</p></div><button type="button" disabled={isProcessing} onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }} className="text-sm font-medium text-slate-500 hover:text-slate-900">Remove</button></div>}
    <label className="mt-5 block text-sm font-medium text-slate-700">Extraction schema<select value={schemaId} onChange={(event) => setSchemaId(event.target.value)} disabled={isProcessing} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{schemas.map((schema) => <option key={schema.id} value={schema.id}>{schema.name}{schema.isDefault ? " (Default)" : ""}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">General Conversation is ready to use. <a className="font-semibold text-blue-700 hover:text-blue-800" href="/dashboard/schemas">+ Create new schema</a></span></label>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
    {isProcessing && <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800"><span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent align-[-1px]" />Processing recording… This can take a moment.</div>}
    <div className="mt-5 flex justify-end"><button type="button" disabled={!file || isProcessing} onClick={process} className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">{isProcessing ? "Processing…" : "Process recording"}</button></div>
  </section>;
}
