"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fieldTypes, type FieldType } from "@/lib/custom-schema";

type EditableField = { id: string; name: string; type: FieldType; description: string; required: boolean };

const typeLabels: Record<FieldType, string> = {
  text: "Text",
  number: "Number",
  boolean: "Boolean",
  text_list: "List of text",
  date: "Date",
  currency: "Currency",
};

function newField(): EditableField {
  return { id: crypto.randomUUID(), name: "", type: "text", description: "", required: false };
}

export function SchemaBuilder() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<EditableField[]>([newField()]);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function updateField(id: string, update: Partial<EditableField>) {
    setFields((items) => items.map((field) => field.id === id ? { ...field, ...update } : field));
  }
  async function save() {
    setError("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/schemas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, fields }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "We couldn't save this schema.");
      setName(""); setDescription(""); setFields([newField()]);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't save this schema.");
    } finally {
      setIsSaving(false);
    }
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[.14em] text-blue-700">Schema builder</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Create an extraction schema</h1><p className="mt-2 text-sm text-slate-600">Define the fields you want returned from a customer conversation.</p></div>
    <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-700">Schema name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Sales Call" maxLength={64} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label><label className="block text-sm font-medium text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Information to capture from sales conversations" maxLength={400} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label></div>
    <div className="mt-7"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Fields</h2><button type="button" onClick={() => setFields((items) => [...items, newField()])} className="text-sm font-semibold text-blue-700 hover:text-blue-800">+ Add field</button></div><div className="space-y-3">{fields.map((field, index) => <div key={field.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-medium text-slate-700">Field {index + 1}</p><button type="button" onClick={() => setFields((items) => items.length > 1 ? items.filter((item) => item.id !== field.id) : items)} className="text-xs font-semibold text-slate-500 hover:text-red-700">Delete</button></div><div className="grid gap-3 sm:grid-cols-[1.1fr_.8fr]"><label className="text-xs font-medium text-slate-600">Field name<input value={field.name} onChange={(event) => updateField(field.id, { name: event.target.value })} placeholder="Budget" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" /></label><label className="text-xs font-medium text-slate-600">Type<select value={field.type} onChange={(event) => updateField(field.id, { type: event.target.value as FieldType })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">{fieldTypes.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}</select></label></div><label className="mt-3 block text-xs font-medium text-slate-600">Description <span className="font-normal text-slate-400">(helps the AI extract accurately)</span><input value={field.description} onChange={(event) => updateField(field.id, { description: event.target.value })} placeholder="The customer's stated annual budget" maxLength={400} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" /></label><label className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-600"><input checked={field.required} onChange={(event) => updateField(field.id, { required: event.target.checked })} type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600" />Required / important field</label></div>)}</div></div>
    {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}<div className="mt-6 flex justify-end"><button type="button" onClick={save} disabled={isSaving} className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300">{isSaving ? "Saving…" : "Save schema"}</button></div>
  </section>;
}
