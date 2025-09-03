import express from 'express';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { config } from './config.js';
import { ensureStorage, getLatestShowFile, getLatestShowFileByLang } from './storage.js';
import { log } from './logger.js';
import { synthesizePromptOnce } from './tts.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

// Serve static files for shows and prompts
app.use('/shows', express.static(path.resolve('public/shows')));
app.use('/prompts', express.static(path.resolve('public/prompts')));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Returns the full URL to the latest show file or 404 if missing
app.get('/shows/latest-url', async (_req, res) => {
  const latest = await getLatestShowFile();
  if (!latest) return res.status(404).json({ error: 'No show available' });
  const file = path.basename(latest);
  const url = `${config.publicBaseUrl}/shows/${file}`;
  res.json({ url });
});

// Language-specific latest URL
app.get('/shows/latest-url/:lang', async (req, res) => {
  const { lang } = req.params;
  const latest = await getLatestShowFileByLang(lang);
  if (!latest) return res.status(404).json({ error: `No show available for ${lang}` });
  const file = path.basename(latest);
  const url = `${config.publicBaseUrl}/shows/${file}`;
  res.json({ url });
});

// Twilio Voice webhook: respond with TwiML that plays the latest show
app.post('/twilio/voice', async (_req, res) => {
  const action = `${config.publicBaseUrl}/twilio/voice/route`;
  let gatherInner;
  try {
    const greetingPath = path.join(config.promptsDir, 'language-select.mp3');
    // Ensure greeting exists once
    await synthesizePromptOnce(
      config.greetingText,
      greetingPath,
      config.greetingVoiceId || config.langVoiceMap['en'] || config.elevenVoiceId
    );
    const greetingUrl = `${config.publicBaseUrl}/prompts/${path.basename(greetingPath)}`;
    gatherInner = `<Play>${greetingUrl}</Play>`;
  } catch (e) {
    // Fallback to speaking the greeting if TTS fails/unconfigured
    gatherInner = `<Say voice="alice">${escapeXml(config.greetingText)}</Say>`;
  }
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Gather input="dtmf" timeout="5" numDigits="1" action="${action}" method="POST">\n    ${gatherInner}\n  </Gather>\n  <Say voice="alice">No input received. Goodbye.</Say>\n</Response>`;
  res.set('Content-Type', 'text/xml');
  res.status(200).send(twiml);
});

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Handle language selection
app.post('/twilio/voice/route', async (req, res) => {
  const digit = (req.body.Digits || '').trim();
  const langs = config.languages;
  const map = { '1': langs[0] || 'en', '2': langs[1] || 'fr', '3': langs[2], '4': langs[3] };
  const lang = map[digit];
  if (!lang) {
    const retryUrl = `${config.publicBaseUrl}/twilio/voice`;
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say voice="alice">Invalid selection.</Say>\n  <Redirect method="POST">${retryUrl}</Redirect>\n</Response>`;
    res.set('Content-Type', 'text/xml');
    return res.status(200).send(twiml);
  }
  const latest = await getLatestShowFileByLang(lang);
  if (!latest) {
    const fallbackSay = lang === 'fr'
      ? '<Say voice="alice" language="fr-CA">Aucun épisode n\'est disponible pour le moment. Veuillez rappeler plus tard.</Say>'
      : '<Say voice="alice">No episode is available right now. Please call back later.</Say>';
    const twiml = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<Response>\n  ${fallbackSay}\n</Response>`;
    res.set('Content-Type', 'text/xml');
    return res.status(200).send(twiml);
  }
  const file = path.basename(latest);
  const url = `${config.publicBaseUrl}/shows/${file}`;
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Play>${url}</Play>\n</Response>`;
  res.set('Content-Type', 'text/xml');
  res.status(200).send(twiml);
});

// Boot server
const start = async () => {
  await ensureStorage();
  // Ensure prompts dir exists
  await fs.promises.mkdir(config.promptsDir, { recursive: true });
  // Try to pre-generate greeting prompt once (non-fatal on failure)
  try {
    const greetingPath = path.join(config.promptsDir, 'language-select.mp3');
    await synthesizePromptOnce(
      config.greetingText,
      greetingPath,
      config.greetingVoiceId || config.langVoiceMap['en'] || config.elevenVoiceId
    );
  } catch (e) {
    log('Greeting prompt generation skipped or failed:', e?.message || e);
  }
  app.listen(config.port, () => {
    log(`Server listening on :${config.port}`);
    log(`Static shows at /shows, base URL: ${config.publicBaseUrl}`);
  });
};

start();
