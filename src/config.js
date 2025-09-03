import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:3000',

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-5',

  // ElevenLabs
  elevenApiKey: process.env.ELEVENLABS_API_KEY || '',
  elevenVoiceId: process.env.ELEVENLABS_VOICE_ID || '',
  elevenModelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
  elevenStability: Number(process.env.ELEVENLABS_VOICE_STABILITY || 0.5),
  elevenStyle: Number(process.env.ELEVENLABS_VOICE_STYLE || 0.5),
  elevenSpeakerMapJson: process.env.ELEVENLABS_VOICES_JSON || '{}',

  // Storage
  dataDir: path.resolve(__dirname, '../data'),
  showsDir: path.resolve(__dirname, '../public/shows'),
  promptsDir: path.resolve(__dirname, '../public/prompts'),

  // DiggAPI (pseudo)
  diggUseMock: (process.env.DIGG_USE_MOCK || 'true').toLowerCase() !== 'false',

  // Article fetching & summarization
  fetchArticleContent: (process.env.FETCH_ARTICLE_CONTENT || 'false').toLowerCase() === 'true',
  fetchTimeoutMs: parseInt(process.env.FETCH_TIMEOUT_MS || '10000', 10),
  fetchUserAgent:
    process.env.FETCH_USER_AGENT ||
    'NewsStoryHotline/0.1 (+https://example.com; Node.js)'
  ,
  summaryMaxChars: parseInt(process.env.SUMMARY_MAX_CHARS || '5000', 10),

  // Languages and voices
  languagesCsv: process.env.LANGUAGES || 'en,fr',
  get languages() {
    return this.languagesCsv.split(',').map((s) => s.trim()).filter(Boolean);
  },
  langVoiceMapJson: process.env.ELEVENLABS_LANG_VOICE_MAP_JSON || '{}',
  get langVoiceMap() {
    try { return JSON.parse(this.langVoiceMapJson || '{}'); } catch { return {}; }
  },

  // Greeting prompt
  greetingText:
    process.env.GREETING_TEXT ||
    'Welcome to the Canadian-run Digg news hotline! For English, press 1. Pour le français, appuyez sur 2.',
  greetingVoiceId: process.env.GREETING_VOICE_ID || '',
};

export function getSpeakerMap() {
  try {
    return JSON.parse(config.elevenSpeakerMapJson || '{}');
  } catch {
    return {};
  }
}
