import Link from "next/link";
import { notFound } from "next/navigation";
import { SourceTestRecording } from "@/components/source-test-recording";
import { requireUser } from "@/lib/auth";
import { appUrl } from "@/lib/connectors";
import { db } from "@/lib/db";

const Inline = ({ children }: { children: string }) => <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800">{children}</code>;

export default async function SourcePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(); const { id } = await params;
  const source = await db.ingestionSource.findFirst({ where: { id, userId: user.id } });
  if (!source) notFound();
  const endpoint = `${appUrl()}/api/v1/ingest`; const statusEndpoint = `${endpoint}/INGESTION_ID`;
  const curl = `curl -X POST "${endpoint}" \\
  -H "Authorization: Bearer ci_src_xxxxxxxxx" \\
  -F "recording=@call.mp3" \\
  -F "externalId=call_12345"`;
  const examples = `// JavaScript
const form = new FormData();
form.append("recording", file);
form.append("externalId", "call_12345");
const response = await fetch("${endpoint}", {
  method: "POST", headers: { Authorization: "Bearer ci_src_xxxxxxxxx" }, body: form,
});
const ingestion = await response.json();

# Python
import requests
with open("call.mp3", "rb") as recording:
    response = requests.post("${endpoint}",
        headers={"Authorization": "Bearer ci_src_xxxxxxxxx"},
        files={"recording": ("call.mp3", recording, "audio/mpeg")},
        data={"externalId": "call_12345"})
print(response.json())`;
  return <main className="mx-auto max-w-4xl px-5 py-9 sm:px-8"><Link href="/dashboard/sources" className="text-sm font-semibold text-blue-700">← Back to sources</Link><h1 className="mt-5 text-3xl font-semibold tracking-tight">{source.name}</h1><p className="mt-2 text-sm text-slate-500">{source.enabled ? "Active" : "Disabled"} · Key prefix: {source.keyPrefix}…</p><section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Ingestion API</h2><p className="mt-2 text-sm leading-6 text-slate-600">Send a customer-call recording to Conversation Intelligence. It is automatically processed into structured business data, saved as a conversation, and matching active pipelines are triggered.</p><p className="mt-5 text-sm font-semibold">POST endpoint</p><code className="mt-1 block break-all rounded bg-slate-100 p-3 text-sm">{endpoint}</code><p className="mt-2 text-xs text-slate-500">Production uses <Inline>APP_URL=https://trustmebro.one</Inline>, making the endpoint <Inline>https://trustmebro.one/api/v1/ingest</Inline>. This page uses the configured origin so local environments remain local.</p><h3 className="mt-6 font-semibold">Authentication</h3><p className="mt-2 text-sm leading-6 text-slate-600">Send <Inline>Authorization: Bearer YOUR_SOURCE_API_KEY</Inline>. This source key is created by you, unique to this source, shown only at creation/rotation, stored only as a secure hash, revocable, rotatable, and not recoverable. It is not a Salesforce, HubSpot, or Google credential.</p><h3 className="mt-6 font-semibold">Request fields</h3><div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Field</th><th className="p-3">Required</th><th className="p-3">Purpose / validation</th><th className="p-3">Example</th></tr></thead><tbody className="divide-y divide-slate-100"><tr><td className="p-3"><Inline>recording</Inline></td><td className="p-3">Yes</td><td className="p-3">Multipart audio/video file; MP3, WAV, M4A, AAC, OGG, FLAC, WebM, MP4, or MOV; non-empty; max 25 MB.</td><td className="p-3"><Inline>@call.mp3</Inline></td></tr><tr><td className="p-3"><Inline>schemaId</Inline></td><td className="p-3">No</td><td className="p-3">Your schema ID; must belong to the source owner. Defaults to General Conversation.</td><td className="p-3"><Inline>cms…</Inline></td></tr><tr><td className="p-3"><Inline>pipelineId</Inline></td><td className="p-3">No</td><td className="p-3">Enabled owner pipeline; supplied schema must match it, otherwise the pipeline schema is selected.</td><td className="p-3"><Inline>cms…</Inline></td></tr><tr><td className="p-3"><Inline>externalId</Inline></td><td className="p-3">No</td><td className="p-3">Stable source-system call ID. Duplicate values for this source return the original ingestion.</td><td className="p-3"><Inline>call_12345</Inline></td></tr><tr><td className="p-3"><Inline>source</Inline></td><td className="p-3">No</td><td className="p-3">Display-only source label, maximum 120 characters.</td><td className="p-3"><Inline>Sales dialer</Inline></td></tr></tbody></table></div></section><section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">Responses and status</h2><p className="mt-2 text-sm text-slate-600">HTTP 202 Accepted means the recording was received and processing has started or been scheduled. It does not mean AI processing is finished.</p><pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-100">{`{ "id": "ing_123", "status": "accepted" }`}</pre><p className="mt-5 text-sm font-semibold">Status endpoint</p><code className="mt-1 block break-all rounded bg-slate-100 p-3 text-sm">GET {statusEndpoint}</code><pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-100">{`curl "${statusEndpoint}" \\
  -H "Authorization: Bearer ci_src_xxxxxxxxx"

{ "id": "…", "status": "completed", "conversationId": "conv_456" }
{ "id": "…", "status": "failed", "error": "Safe error message" }`}</pre><h3 className="mt-6 font-semibold">Errors</h3><ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600"><li><strong>400</strong> — missing recording or malformed multipart request; correct the body.</li><li><strong>401</strong> — invalid, rotated, or disabled source key; create or rotate a source key.</li><li><strong>404</strong> — unknown/unauthorized schema, pipeline, or ingestion ID; verify ownership and IDs.</li><li><strong>413</strong> — file exceeds 25 MB; reduce or split it.</li><li><strong>415</strong> — unsupported extension; use a documented type.</li><li><strong>422</strong> — incompatible schema/pipeline or safe media-normalization error; correct the request.</li><li><strong>503</strong> — surfaced in status if the server-side AI service is not configured; configure it and submit a new external ID.</li></ul></section><section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">Examples</h2><pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-100">{curl}</pre><pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-100">{examples}</pre></section><SourceTestRecording endpoint={endpoint} /></main>;
}
