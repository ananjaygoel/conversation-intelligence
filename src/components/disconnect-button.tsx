"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DisconnectButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function disconnect() { setBusy(true); await fetch(`/api/connections?id=${encodeURIComponent(id)}`, { method: "DELETE" }); router.refresh(); setBusy(false); }
  return <button onClick={disconnect} disabled={busy} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">{busy ? "Disconnecting…" : "Disconnect"}</button>;
}
