"use client";

import { useState } from "react";

function testWav() {
  const sampleRate = 8_000; const samples = sampleRate; const bytes = new ArrayBuffer(44 + samples * 2); const view = new DataView(bytes);
  const write = (offset: number, value: string) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  write(0, "RIFF"); view.setUint32(4, 36 + samples * 2, true); write(8, "WAVE"); write(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, "data"); view.setUint32(40, samples * 2, true);
  for (let index = 0; index < samples; index += 1) view.setInt16(44 + index * 2, Math.sin(index / sampleRate * Math.PI * 2 * 440) * 1_000, true);
  return new File([bytes], "conversation-intelligence-test.wav", { type: "audio/wav" });
}

export function SourceTestRecording({ endpoint }: { endpoint: string }) {
  const [key, setKey] = useState(""); const [result, setResult] = useState(""); const [busy, setBusy] = useState(false);
  async function send() { setBusy(true); setResult(""); const form = new FormData(); form.set("recording", testWav()); form.set("externalId", `dashboard-test-${Date.now()}`); form.set("source", "Dashboard test recording"); const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form }); const body = await response.json(); setResult(response.ok ? `Accepted: ${body.id}. Check Ingestions for processing status.` : body.error ?? "Test recording failed."); setBusy(false); }
  return <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">Send test recording</h2><p className="mt-1 text-sm text-slate-600">This creates a small WAV test file in your browser and sends it through the same authenticated ingestion API. Paste this source’s key; it is used only for this request and is not saved.</p><label className="mt-4 block text-sm font-medium">Source API key<input value={key} onChange={(event) => setKey(event.target.value)} type="password" autoComplete="off" placeholder="ci_src_…" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><button disabled={busy || !key} onClick={send} className="mt-4 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Sending…" : "Send Test Recording"}</button>{result && <p className="mt-3 text-sm text-slate-700">{result}</p>}</section>;
}
