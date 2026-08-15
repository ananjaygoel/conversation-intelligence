"use client";

import { useEffect, useRef, useState } from "react";
import type { ConversationData } from "@/lib/conversation-schema";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const supportedExtensions = ["mp3", "wav", "m4a", "mp4", "webm"];
const stages = ["Uploading", "Transcribing", "Analyzing", "Structuring", "Complete"];

type Result = { transcript: string; data: ConversationData };

function FileIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 14h8M8 18h5" /></svg>;
}

function UploadIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" /></svg>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function displayValue(value: string | null) {
  return value || "Not mentioned";
}

function ListField({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">{label}</p>
      {items.length ? (
        <ul className="space-y-1.5 text-sm leading-5 text-slate-700">
          {items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />{item}</li>)}
        </ul>
      ) : <p className="text-sm text-slate-400">Not mentioned</p>}
    </div>
  );
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isProcessing) return;
    const timer = window.setInterval(() => setStage((current) => Math.min(current + 1, 3)), 2200);
    return () => window.clearInterval(timer);
  }, [isProcessing]);

  const chooseFile = (candidate: File | undefined) => {
    setError(null);
    setResult(null);
    if (!candidate) return;
    const extension = candidate.name.split(".").pop()?.toLowerCase();
    if (!extension || !supportedExtensions.includes(extension)) {
      setFile(null);
      setError("Unsupported file type. Choose an MP3, WAV, M4A, MP4, or WebM recording.");
      return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("This recording is too large. Upload a file smaller than 25 MB.");
      return;
    }
    setFile(candidate);
  };

  const processRecording = async () => {
    if (!file || isProcessing) return;
    setError(null);
    setResult(null);
    setStage(0);
    setIsProcessing(true);
    try {
      const body = new FormData();
      body.append("recording", file);
      const response = await fetch("/api/process", { method: "POST", body });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "We couldn't process this recording. Please try again.");
      setStage(4);
      setResult(payload as Result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't process this recording. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const json = result ? JSON.stringify(result.data, null, 2) : "";
  const copyJson = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  const downloadJson = () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${file?.name.replace(/\.[^.]+$/, "") || "conversation"}-data.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3 font-semibold tracking-tight"><span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.5V8a7 7 0 0 1 14 0v4.5M7 15v-3a2 2 0 0 0-4 0v3a2 2 0 0 0 4 0Zm14 0v-3a2 2 0 0 0-4 0v3a2 2 0 0 0 4 0Z" /></svg></span>Conversation Intelligence</div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">V0 Demo</span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
        <section className="mb-10 max-w-2xl">
          <p className="mb-3 text-sm font-semibold text-blue-700">CONVERSATION-TO-DATA</p>
          <h1 className="text-4xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-5xl">Turn customer conversations into <span className="text-blue-600">structured business data.</span></h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">Upload a call recording and get a transcript, a clear summary, and reliable JSON your team can use.</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); chooseFile(event.dataTransfer.files[0]); }} className={`rounded-xl border-2 border-dashed p-8 text-center transition sm:p-12 ${isDragging ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50/80"}`}>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-blue-100 text-blue-700"><span className="h-6 w-6"><UploadIcon /></span></div>
            <h2 className="text-lg font-semibold text-slate-900">Upload a customer recording</h2>
            <p className="mt-2 text-sm text-slate-500">Drag and drop it here, or select a file from your computer.</p>
            <p className="mt-1 text-xs text-slate-400">MP3, WAV, M4A, MP4, or WebM · Maximum 25 MB</p>
            <input ref={inputRef} type="file" accept=".mp3,.wav,.m4a,.mp4,.webm,audio/*,video/mp4,video/webm" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0])} />
            <button type="button" onClick={() => inputRef.current?.click()} className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"><span className="h-4 w-4"><FileIcon /></span>Choose recording</button>
          </div>

          {file && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700"><span className="h-5 w-5"><FileIcon /></span></span><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{file.name}</p><p className="text-xs text-slate-500">{formatBytes(file.size)}</p></div></div><button type="button" disabled={isProcessing} onClick={() => { setFile(null); setResult(null); if (inputRef.current) inputRef.current.value = ""; }} className="text-sm font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50">Remove</button></div>}
          {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="mt-5 flex items-center justify-between gap-4"><p className="text-xs text-slate-500">Recordings are processed only for this request and are not saved.</p><button type="button" disabled={!file || isProcessing} onClick={processRecording} className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">{isProcessing ? "Processing recording…" : "Process recording"}</button></div>
        </section>

        {(isProcessing || result) && <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-5 flex items-center justify-between"><h2 className="font-semibold text-slate-900">Processing status</h2>{result && <span className="text-sm font-medium text-emerald-700">Ready</span>}</div><div className="grid gap-3 sm:grid-cols-5">{stages.map((name, index) => { const complete = result ? true : index < stage; const active = !result && index === stage; return <div key={name} className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${complete ? "bg-emerald-50 text-emerald-800" : active ? "bg-blue-50 text-blue-800" : "bg-slate-50 text-slate-400"}`}><span className={`grid h-5 w-5 place-items-center rounded-full ${complete ? "bg-emerald-500 text-white" : active ? "animate-spin border-2 border-blue-500 border-t-transparent" : "border border-slate-300"}`}>{complete && <span className="h-3 w-3"><CheckIcon /></span>}</span><span className="font-medium">{name}</span></div>; })}</div></section>}

        {result && <section className="mt-8 space-y-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">Call summary</p><p className="mt-3 text-lg leading-8 text-slate-700">{result.data.call_summary}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">Structured information</h2><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">AI extracted</span></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">Customer</p><p className="mt-2 text-sm font-medium text-slate-800">{displayValue(result.data.customer.name)}</p><p className="mt-0.5 text-sm text-slate-500">{displayValue(result.data.customer.company)}</p></div><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">Intent</p><p className="mt-2 text-sm font-medium text-slate-800">{displayValue(result.data.intent)}</p></div><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">Budget</p><p className="mt-2 text-sm font-medium text-slate-800">{displayValue(result.data.budget)}</p></div><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">Timeline</p><p className="mt-2 text-sm font-medium text-slate-800">{displayValue(result.data.timeline)}</p></div></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><ListField label="Products / services" items={result.data.products_or_services_discussed} /><ListField label="Customer needs" items={result.data.customer_needs} /><ListField label="Pain points" items={result.data.pain_points} /><ListField label="Objections" items={result.data.objections} /><ListField label="Next actions" items={result.data.next_actions} /><ListField label="Competitors" items={result.data.competitors_mentioned} /></div></div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-[#101827] p-5 shadow-sm sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-white">Raw JSON</h2><p className="mt-1 text-xs text-slate-400">Ready to copy or download</p></div><div className="flex gap-2"><button type="button" onClick={copyJson} className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10">{copied ? "Copied" : "Copy JSON"}</button><button type="button" onClick={downloadJson} className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-400">Download</button></div></div><pre className="max-h-[680px] overflow-auto rounded-lg bg-[#0b1220] p-4 text-xs leading-5 text-blue-100"><code>{json}</code></pre></div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-4 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600"><span className="h-4 w-4"><FileIcon /></span></span><div><h2 className="font-semibold">Original transcript</h2><p className="text-xs text-slate-500">Compare the source conversation with the extracted information.</p></div></div><p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{result.transcript}</p></div>
        </section>}
      </div>
    </main>
  );
}
