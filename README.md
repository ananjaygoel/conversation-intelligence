# Conversation Intelligence

A focused V0 for turning customer call recordings into structured business data. Upload a recording and receive the transcript, a human-readable extraction, and downloadable JSON—without accounts, a database, or file storage.

## Prerequisites

- Node.js 20.9 or later
- An OpenAI API key with access to transcription and text models

## Installation

```bash
npm install
cp .env.example .env.local
```

Set the value in `.env.local`:

```text
OPENAI_API_KEY=your_api_key_here
```

Never expose this key in a browser variable (for example, one prefixed with `NEXT_PUBLIC_`).

## Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), select an MP3, WAV, M4A, MP4, or WebM recording under 25 MB, then select **Process recording**.

## Processing pipeline

1. The browser sends the selected file as multipart form data to `/api/process`.
2. The server validates the extension and file size.
3. The server sends the in-memory file to OpenAI's `gpt-4o-mini-transcribe` model.
4. The transcript is sent to `gpt-4.1-mini` through the Responses API with a strict JSON Schema response format.
5. The client receives the transcript and validated structured result, then displays and makes the JSON available to copy or download.

Files are never written to persistent storage and the API key remains server-side.

## Checks

```bash
npm run lint
npm run build
```

## Known limitations

- V0 processes one recording at a time and waits for one synchronous response.
- The 25 MB limit matches a simple demo-friendly path; long recordings should be split before upload.
- Speaker labels and timestamps are not included in this first version.
- Extraction quality depends on the clarity of the recording and transcription.
