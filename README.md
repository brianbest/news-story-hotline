# News Story Hotline

Automated audio news hotline that:

- Fetches stories from a placeholder DiggAPI client (stubbed).
- Generates a short, conversational script via OpenAI (GPT‑5 placeholder).
- Synthesizes audio via ElevenLabs.
- Serves the latest show over HTTP and a Twilio Voice webhook.
 - Supports multi-language shows with IVR (press 1/2 for en/fr).

This repo is scaffolded to run locally and be exposed to Twilio (e.g., via ngrok).

## Prerequisites

- Node.js 18+ (ESM modules and native fetch support)
- API keys: OpenAI, ElevenLabs
- Optional: Twilio account and a phone number for inbound calls

## Setup

1) Install dependencies

```
npm install
```

2) Configure environment

```
cp env.template .env
# Open .env and fill in:
# - OPENAI_API_KEY
# - ELEVENLABS_API_KEY
# - ELEVENLABS_VOICE_ID (choose a voice in ElevenLabs)
# - PUBLIC_BASE_URL (e.g., your ngrok URL)
# Optional: enable article fetching & summarization
# - FETCH_ARTICLE_CONTENT=true
# - (optional) FETCH_TIMEOUT_MS, FETCH_USER_AGENT, SUMMARY_MAX_CHARS
# Optional: multi-language
# - LANGUAGES=en,fr
# - ELEVENLABS_LANG_VOICE_MAP_JSON={"en":"<voiceIdEn>","fr":"<voiceIdFr>"}
# - GREETING_TEXT (defaults to bilingual en/fr)
```

3) Generate a show (script + audio)

```
npm run generate
```

This will:

- Use the DiggAPI stub to get a handful of mock stories.
- Optionally fetch and summarize each story’s article content (if `FETCH_ARTICLE_CONTENT=true`).
- Ask OpenAI to generate a single‑voice DJ‑style script informed by the summaries (English primary).
- Translate the English script to configured languages (e.g., French) via OpenAI.
- Use ElevenLabs to synthesize an MP3 for each language into `public/shows/` (e.g., `*-en.mp3`, `*-fr.mp3`).

4) Start the server

```
npm start
```

Routes:

- `GET /health` – basic health check
- `GET /shows/latest-url` – URL to the latest generated MP3
- Static files under `/shows/*` – serves generated audio
- `POST /twilio/voice` – Twilio Voice webhook that plays the latest show

## Greeting Prompt

- Automatically generated on first call (and also on server startup if keys are set).
- You can also generate it manually:

```
npm run greeting
```

The greeting text and voice are configurable via `GREETING_TEXT` and `GREETING_VOICE_ID`. If `GREETING_VOICE_ID` is not set, it falls back to the English voice mapping or the default `ELEVENLABS_VOICE_ID`.

## Deploying to Vercel

Vercel is a serverless platform with important constraints:

- File system is read-only at runtime (only temporary `/tmp` is writable and not persistent).
- Functions have short timeouts; long TTS and generation jobs may time out.
- Processes are stateless; do not rely on local `public/shows` or `public/prompts` persistence.

Recommended architecture on Vercel:

- Generate shows off-platform (locally, a small VM, or a scheduled job) using `npm run generate`.
- Upload the resulting MP3s to persistent storage (e.g., S3/CloudFront, GCS, or Vercel Blob Storage).
- Set `PUBLIC_BASE_URL` to that storage/CDN domain so Twilio can stream the audio.
- Deploy only the IVR/webhook endpoints to Vercel to return TwiML that plays those hosted MP3s.

Option A: Webhook-only on Vercel (recommended)

1) Create a Vercel project and configure environment variables (OpenAI/ElevenLabs only needed if you plan to generate greeting on-demand; otherwise omit). Set `PUBLIC_BASE_URL` to your storage/CDN where MP3s live.
2) Add two serverless functions for Twilio IVR under an `api/` directory in your Vercel project (these can live in a separate repo if you prefer):

`api/voice.js`
```
export default async function handler(req, res) {
  const action = new URL('/api/route', process.env.PUBLIC_BASE_URL).toString();
  const greetingText = process.env.GREETING_TEXT || 'Welcome to the Canadian-run Digg news hotline! For English, press 1. Pour le français, appuyez sur 2.';
  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf" timeout="5" numDigits="1" action="${action}" method="POST">
    <Say>${greetingText}</Say>
  </Gather>
  <Say>No input received. Goodbye.</Say>
</Response>`);
}
```

`api/route.js`
```
export const config = { runtime: 'edge' };
export default async function handler(req) {
  const form = await req.formData();
  const digit = (form.get('Digits') || '').toString();
  const langs = (process.env.LANGUAGES || 'en,fr').split(',').map(s => s.trim());
  const map = { '1': langs[0] || 'en', '2': langs[1] || 'fr' };
  const lang = map[digit];
  const latestEndpoint = new URL(`/shows/latest-url/${lang || 'en'}`, process.env.PUBLIC_BASE_URL).toString();
  let url;
  try {
    const r = await fetch(latestEndpoint);
    if (r.ok) ({ url } = await r.json());
  } catch {}
  const twiml = url
    ? `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Play>${url}</Play>\n</Response>`
    : `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say>No episode is available right now. Please call back later.</Say>\n</Response>`;
  return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
}
```

3) Point your Twilio Voice webhook to `POST https://<your-vercel-app>.vercel.app/api/voice`.
4) Keep generating and uploading MP3s from your job; the IVR will always point to the latest URLs.

### Daily Generation with Vercel Cron (server-backed)

If you run the full server somewhere with persistent storage (Render/Fly/VM/etc.), you can use Vercel Cron to trigger generation daily, or immediately if no shows exist.

This repo includes a serverless function `api/cron.js` and a `vercel.json` cron schedule.

Requirements:
- Your long-lived server must expose `POST /admin/generate` (already included here) and `GET /shows/latest-url/:lang`.
- Set on Vercel: `PUBLIC_BASE_URL` pointing to your server, `ADMIN_API_KEY` matching the server’s key, and `LANGUAGES`.

Steps:
1) Deploy this repo (or a minimal copy containing `api/cron.js` and `vercel.json`) to Vercel.
2) In Vercel Project Settings → Environment Variables, set:
   - `PUBLIC_BASE_URL=https://<your-server-host>`
   - `ADMIN_API_KEY=<your-strong-secret>`
   - `LANGUAGES=en,fr`
3) In Vercel Project Settings → Schedules (or via `vercel.json`), ensure a daily cron exists for `/api/cron`.

Behavior:
- `/api/cron` checks the latest URLs for each language.
- If any are missing or the newest is older than 24 hours, it calls `POST /admin/generate` with `x-admin-key`.
- Response includes `shouldGenerate`, per-language statuses, and the generation result (if triggered).

Note: Generating audio on Vercel itself is discouraged due to timeouts and ephemeral storage. Use the cron only to trigger generation on your long‑lived server.

Option B: Adapt this repo to run as Vercel Functions

- Vercel Functions don’t run long-lived `app.listen`. Wrap Express with `serverless-http` and export a handler.
- Refactor `src/server.js` into an `src/app.js` that exports the Express app, then add `api/index.js`:

`src/app.js`
```
import express from 'express';
// factor out the existing setup from src/server.js into a function
export function createApp() {
  const app = express();
  // middleware, routes, etc.
  return app;
}
```

`api/index.js`
```
import serverless from 'serverless-http';
import { createApp } from '../src/app.js';
export default serverless(createApp());
```

Important: Generating/saving MP3s on Vercel is discouraged (timeouts, no persistent FS). Use external storage and background jobs instead.

Option C: Use a VM/host for full server

- If you prefer to keep everything in one place (including generation and local storage), consider Render, Fly.io, Railway, or a small VM where disk persistence and longer runtimes are available. Then set Twilio to call that host directly.

Twilio setup on Vercel:

- Voice webhook: `POST https://<your-vercel-app>.vercel.app/api/voice`
- Gather action: automatically handled inside the function above (`/api/route`).


## Twilio Configuration

Point your number’s Voice webhook to:

```
POST {PUBLIC_BASE_URL}/twilio/voice
```

When a call comes in:

- `POST /twilio/voice` responds with a `<Gather>` that plays a generated greeting prompt (`/prompts/language-select.mp3`) asking the caller to press 1/2 for language.
- `POST /twilio/voice/route` receives the digit and plays the latest show for that language (e.g., `*-en.mp3` or `*-fr.mp3`).

Tip: Use ngrok to expose your local port and set `PUBLIC_BASE_URL` accordingly.

## Notes on DiggAPI Stub

The real DiggAPI service does not exist in this repo. The module `src/diggApiClient.js` returns mock stories unless `DIGG_USE_MOCK=false` (in which case it returns an empty list). Replace the pseudocode with real HTTP calls once the service is available.

## Customization

- OpenAI model: set `OPENAI_MODEL` (defaults to `gpt-5` placeholder).
- ElevenLabs voice: set `ELEVENLABS_VOICE_ID` and tuning via `ELEVENLABS_*` vars.
- Multi‑voice: you can provide `ELEVENLABS_VOICES_JSON` to map speaker labels to voice IDs. The current implementation uses a single voice; multi‑voice stitching is left as a future enhancement.
- Languages: configure `LANGUAGES=en,fr` in order; map voices with `ELEVENLABS_LANG_VOICE_MAP_JSON`. The first two languages are bound to digits 1 and 2.
- Article fetching & summaries: set `FETCH_ARTICLE_CONTENT=true` to fetch pages and include concise summaries per story to improve realism and commentary.

## Development Tips

- Generated scripts are stored under `data/` as timestamped `.txt` files.
- Audio is saved under `public/shows/` as timestamped `.mp3` files.
- Ensure `PUBLIC_BASE_URL` matches where Twilio can reach your server.

## Safety and Limits

- This project does not call any real Digg API.
- OpenAI/ELEVEN calls require valid API keys and will incur usage costs.
- Keep generated shows short for caller experience and cost control.
