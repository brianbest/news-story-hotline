Design summary and reasoning

- Goal: Build a small Node.js service that creates an audio “news show” from story data and makes it available over a phone call (Twilio).

- DiggAPI: The source service is explicitly non‑existent here, so `src/diggApiClient.js` is a stub that returns mock stories and documents how a real client would look. This keeps the app runnable without external dependencies while making integration straightforward later.

- Script generation: `src/scriptGenerator.js` uses the OpenAI SDK and a tight prompt to produce a short, two‑host radio‑style script that includes 1–2 top comments per story. The model name is set via `OPENAI_MODEL` and defaults to the requested placeholder `gpt-5`.

- TTS: `src/tts.js` calls the ElevenLabs text‑to‑speech endpoint with a single default voice and saves an MP3 file. There’s a stub for multi‑voice mapping via `ELEVENLABS_VOICES_JSON`; actual multi‑clip stitching is deferred to keep scope lean.

- Storage and serving: Scripts are saved under `data/`, audio under `public/shows/`. `src/server.js` serves audio statically and exposes a Twilio Voice webhook that replies with TwiML to play the most recent show.

- CLI flow: `src/index.js` provides a `generate` command that runs end‑to‑end: fetch mock stories → generate script → synthesize audio → print public URL.

- Environment: `env.template` captures all required and optional configuration. `README.md` documents setup, generation, server start, and Twilio integration steps.

Tradeoffs and future work

- The DiggAPI layer is intentionally mocked; enabling it later should be a drop‑in change to the stub.
- ElevenLabs multi‑voice synthesis would benefit from proper segmentation and audio concatenation (e.g., ffmpeg) or ElevenLabs projects API; left as a future enhancement.
- A scheduler/cron or queue could generate shows periodically instead of manual `npm run generate`.
- Persistence could be extended (e.g., DB of episodes, metadata, and analytics).

Update: Article fetching & summaries

- Added `src/contentFetcher.js` (axios + jsdom + @mozilla/readability) to retrieve and extract main text from each story URL.
- Added `src/articleSummarizer.js` which uses OpenAI to produce concise, factual per‑article summaries.
- `src/scriptGenerator.js` now optionally fetches and summarizes articles (guarded by `FETCH_ARTICLE_CONTENT=true`) and feeds those summaries into the DJ prompt to reduce hallucinations and improve natural commentary.

Update: Multi-language & IVR

- Added `src/translator.js` to translate the English script into configured languages using OpenAI while preserving tone.
- `src/index.js` now generates English first, then translates and synthesizes per language using a configurable voice map. Files follow `show-<timestamp>-<lang>.(txt|mp3)`.
- `src/tts.js` accepts an override voice ID and can generate a persistent greeting prompt via `synthesizePromptOnce`.
- `src/server.js` implements a Twilio IVR: `/twilio/voice` plays a generated greeting and gathers a single digit; `/twilio/voice/route` routes to the latest show for the selected language via `getLatestShowFileByLang`.
- `src/config.js` adds `LANGUAGES`, `ELEVENLABS_LANG_VOICE_MAP_JSON`, greeting text and voice, and a `public/prompts` directory.
