"use client";

import { useState } from "react";

export function JsonViewer({ data, filename }: { data: unknown; filename: string }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);
  async function copy() {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }
  function download() {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename.replace(/\.[^.]+$/, "")}-data.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return <section className="rounded-2xl border border-slate-800 bg-[#101827] p-5 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-semibold text-white">Raw JSON</h2><p className="mt-1 text-xs text-slate-400">The exact structured extraction.</p></div><div className="flex gap-2"><button onClick={copy} className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10">{copied ? "Copied" : "Copy JSON"}</button><button onClick={download} className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-400">Download</button></div></div><pre className="max-h-[600px] overflow-auto rounded-lg bg-[#0b1220] p-4 text-xs leading-5 text-blue-100"><code>{json}</code></pre></section>;
}
