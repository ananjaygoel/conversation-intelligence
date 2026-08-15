# Conversation Intelligence

Conversation Intelligence turns customer call recordings into trustworthy structured business data. A customer creates a private account, uploads a recording, chooses the default or a custom extraction schema, and receives a transcript plus structured JSON that remains available in their workspace.

## V3 architecture

```text
Browser → Next.js route (authenticated) → optional FFmpeg normalization
        → OpenAI transcription → strict JSON-schema extraction
        → SQLite / Prisma conversation
        → matching active pipeline(s) → destination delivery records

Recording systems can also send multipart recordings to the versioned ingestion API using a separate source key. The API creates an ingestion record, returns `202 Accepted`, and runs the exact same processing core as manual upload. Temporary recording bytes are removed after processing; they are not retained as source storage.
```

The V0 OpenAI models and strict structured-output flow are retained:

- `gpt-4o-mini-transcribe` transcribes the recording.
- `gpt-4.1-mini` extracts either the default business-conversation schema or a customer-defined schema.
- The API key is server-only. Recordings are temporary and are never stored.

## Prerequisites

- Node.js 20.9+ (Node 22 LTS recommended)
- npm
- FFmpeg and FFprobe available on `PATH` for AAC, OGG, FLAC, and MOV normalization, and for audio-duration detection
- An OpenAI API key with access to the models above

macOS:

```bash
brew install ffmpeg
```

Ubuntu/Debian:

```bash
sudo apt-get install ffmpeg
```

## Setup

```bash
git clone https://github.com/ananjaygoel/conversation-intelligence.git
cd conversation-intelligence
npm install
cp .env.example .env
```

Update `.env`:

```text
OPENAI_API_KEY=your_api_key_here
AUTH_SECRET=
DATABASE_URL="file:./dev.db"
APP_URL=http://localhost:3000
# Generate with: openssl rand -base64 32
CREDENTIAL_ENCRYPTION_KEY=
# Optional until the respective connector is used
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=
SALESFORCE_LOGIN_URL=https://login.salesforce.com
```

Never commit `.env` or `.env.local`. Do not use `NEXT_PUBLIC_OPENAI_API_KEY`.

## Database and Prisma

Generate Prisma Client and create/apply the SQLite migration:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

The database file is created at `prisma/dev.db` and is ignored by Git.

## Vercel production database

Vercel production uses PostgreSQL, never the local SQLite file. The production Prisma schema and baseline migration live in `prisma/postgres/`; the original `prisma/schema.prisma` and `prisma/migrations/` remain the SQLite development chain. In production, `DATABASE_URL` is the Supabase transaction-pooler URL for serverless runtime traffic and `DIRECT_URL` is the separate session-pooler URL Prisma uses for migrations.

After `DATABASE_URL` has been configured with the managed PostgreSQL connection string, deploy the checked-in production migration with:

```bash
npx prisma migrate deploy --schema prisma/postgres/schema.prisma
```

Vercel runs the same command through `npm run vercel-build` before building Next.js. Do not use `prisma db push` in production and do not upload `prisma/dev.db`.

## Local development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Using V1

1. Select **Get started** and create an email/password account.
2. On the dashboard, upload an MP3, WAV, M4A, AAC, OGG, FLAC, WebM, MP4, or MOV file (25 MB maximum).
3. **General Conversation** is automatically created and selected for every new account. It preserves the original V0 business-conversation extraction shape. Create additional schemas at **Schemas** when you need different output fields.
4. For a custom schema, add named fields with a type, extraction description, and required/important flag. The app deterministically converts those configured fields to strict JSON Schema; the model never creates the schema.
5. Process the recording. Completed conversations are saved with their transcript, exact JSON output, schema selection, and estimated usage.
6. Revisit a conversation to inspect, copy, or download its JSON.

## V2 pipelines and destinations

V2 extends the flow to **conversation → structured data → pipeline → destination**. A user without a configured pipeline keeps the exact V1 upload, processing, persistence, and JSON experience.

Supported destinations are:

- **Webhook:** encrypted URL and optional headers; sends a JSON envelope with conversation ID, processed time, schema name, and mapped structured data.
- **Google Sheets:** OAuth connection; appends one mapped row per conversation to the configured spreadsheet ID and worksheet/tab.
- **HubSpot:** OAuth connection; creates a Contact, Company, or Deal. An update mode is supported when an identifier source and HubSpot `idProperty` are configured.
- **Salesforce:** OAuth connection; creates a Lead, Contact, Account, or Opportunity. An update mode is supported with a mapped Salesforce record ID.

Create a connection at **Pipelines → Manage connections**, then create a pipeline: choose one of your schemas, a destination connection, destination object/configuration, mappings, and activate it. Each mapping explicitly maps a structured JSON path (for example `customer.name`) to a destination field and applies a safe text/number/boolean/date/currency/list conversion.

When a completed conversation’s schema matches an active pipeline, its JSON is delivered synchronously after the conversation is safely saved. Each delivery is persisted as `PENDING`, `PROCESSING`, `SUCCESS`, or `FAILED`. A downstream failure never changes the completed conversation into a failed one. Failed deliveries can be retried from the conversation or pipeline view, up to five attempts.

## Connector setup

Create OAuth apps with Google, HubSpot, and Salesforce and configure their callback URL as:

```text
http://localhost:3000/api/connectors/google_sheets/callback
http://localhost:3000/api/connectors/hubspot/callback
http://localhost:3000/api/connectors/salesforce/callback
```

Use your deployed `APP_URL` instead of localhost in production. OAuth state is short-lived, hashed in SQLite, and tied to the signed-in user. Access/refresh tokens and webhook headers are encrypted at rest with `CREDENTIAL_ENCRYPTION_KEY` and are never returned to the browser. Disconnecting a connection makes dependent pipelines unavailable rather than deleting their history.

Google Sheets tests can append a clearly labeled test row when implemented against a configured account; webhook tests send a `test: true` payload. CRM tests are intentionally non-destructive configuration checks. Provider developer accounts and the provider-side OAuth consent/app configuration are required for live integrations.

## V3 automatic ingestion

Create a source at **Sources**. It generates a machine-to-machine API key beginning with `ci_src_`; the complete key is displayed only once. SQLite stores only its SHA-256 hash and a non-secret prefix. Sources can be disabled or have their key rotated; either action immediately prevents use of the old key.

Use the source documentation page for the exact deployed endpoint. The contract is:

```text
POST {APP_URL}/api/v1/ingest
Authorization: Bearer ci_src_...
Content-Type: multipart/form-data

recording      required audio/video file
schemaId       optional customer-owned schema
pipelineId     optional enabled, compatible customer-owned pipeline
externalId     optional idempotency key within this source
source         optional descriptive source label
```

Example:

```bash
curl -X POST https://your-domain.example/api/v1/ingest \
  -H "Authorization: Bearer ci_src_xxx" \
  -F "recording=@call.mp3" \
  -F "externalId=call_12345"
```

The initial response is `202` with `{ "id": "…", "status": "accepted" }`. Reusing the same `externalId` for the same source returns the original ingestion rather than processing the call again. View source activity in **Ingestions**; completed records link to their conversation and existing V2 delivery records.

## Production configuration

The current production deployment uses:

```text
APP_URL=https://trustmebro.one
```

This makes the public ingestion endpoint:

```text
https://trustmebro.one/api/v1/ingest
```

Register these callback URLs with the optional OAuth providers when those connector apps are configured:

```text
https://trustmebro.one/api/connectors/google_sheets/callback
https://trustmebro.one/api/connectors/hubspot/callback
https://trustmebro.one/api/connectors/salesforce/callback
```

Do not hard-code this domain in application logic: all runtime URLs are derived from `APP_URL`. Keep `APP_URL=http://localhost:3000` for the default local setup, or use the actual port passed to `npm run dev -- --port <port>`.

Vercel Functions accept multipart request bodies up to 4.5 MB. The deployed application enforces a 4 MB recording limit so manual uploads and ingestion requests receive a controlled `413` response; local development retains the 25 MB limit. Direct MP3, WAV, M4A, WebM, and MP4 processing works without FFmpeg. Formats that require normalization still need an FFmpeg-capable runtime.

## Authentication and data isolation

Passwords are bcrypt-hashed. Authentication uses opaque, random, HTTP-only, same-site session cookies; the raw session token is never stored in the database. Every dashboard query and protected API route scopes database operations to the authenticated user, so IDs in another account cannot expose that user’s schemas or conversations.

## Default schema

Every account receives one built-in **General Conversation** schema at signup. It is a customer-owned selection that appears normally in the schema picker, but its V0 field structure is protected from deletion. Existing accounts receive it automatically when they next open their dashboard; the idempotent backfill can also be run manually:

```bash
npm run backfill-default-schemas
```

The backfill is safe to run repeatedly and does not create duplicates.

## Admin dashboard

Users have a server-side `USER` or `ADMIN` role. Signup always creates `USER` accounts; no browser form can assign administrator access.

Promote an existing local account:

```bash
npm run make-admin -- user@example.com
```

After logging in with that account, open [http://localhost:3000/admin](http://localhost:3000/admin). The internal dashboard shows product-wide customer, conversation, duration, and estimated-cost totals, plus customer pages that can inspect schemas, conversation metadata, transcripts, and structured JSON. Access is checked on the server; regular users are redirected to their own dashboard and unauthenticated visitors to login.

## Audio normalization

MP3, WAV, M4A, WebM, and MP4 are sent directly to transcription. AAC, OGG, FLAC, and MOV are temporarily transcoded using FFmpeg to 16 kHz mono MP3. Temporary files are removed in a `finally` block. If conversion is necessary but FFmpeg is unavailable, the customer receives a clear, safe error.

## Usage estimates

Each completed conversation records transcription, extraction, and total **Estimated API cost**. The calculation uses the token-usage data returned by OpenAI when available and server-side per-token pricing constants in `src/lib/pricing.ts`. Estimates are displayed as usage visibility, not an invoice. Audio minutes are measured with FFprobe when it is installed.

## Checks

```bash
npm run lint
npm run build
```

## Known V2 limitations

- Processing is synchronous: the browser waits for one recording at a time.
- Sources remain manual uploads; V2 does not ingest recordings from call systems, cloud storage, or a public API.
- Connector execution is synchronous and has manual retry only; there is no background queue or automatic retry worker yet.
- Ingestion uses a lightweight in-process worker and temporary SQLite BLOB storage so it can acknowledge quickly without permanent audio storage. A production multi-instance deployment should replace this handoff with durable object storage plus a queue/worker; V3 deliberately does not introduce that infrastructure.
- Google spreadsheet/worksheet selection currently accepts the spreadsheet ID and worksheet name, rather than a full picker; CRM custom fields are mapped by their provider field/property API names.
- Live OAuth and delivery behavior requires provider developer credentials; no provider credentials are included with this repository.
- Audio is limited to 25 MB to fit the straightforward V1 processing path.
- SQLite is appropriate for the local/single-instance V1 deployment; it is not a multi-region datastore.

## Future roadmap

Future versions may add sources, saved source recordings, background processing, and real-time ingestion. V2 remains focused on **conversation → structured business data → destination**.
