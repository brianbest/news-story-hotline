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
