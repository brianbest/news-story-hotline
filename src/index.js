import path from 'path';
import { fetchTopStories } from './diggApiClient.js';
import { generateShowScript } from './scriptGenerator.js';
import { synthesizeShow, synthesizePromptOnce } from './tts.js';
import { ensureStorage, timestampSlug, writeText } from './storage.js';
import { config } from './config.js';
import { log } from './logger.js';
import { translateText } from './translator.js';

async function generate() {
  await ensureStorage();

  log('Fetching stories (DiggAPI stub)...');
  const stories = await fetchTopStories(3);

  log('Generating show script (OpenAI)...');
  const script = await generateShowScript(stories);

  const ts = timestampSlug();
  const base = `show-${ts}`;
  // English primary
  const enScriptPath = path.join(config.dataDir, `${base}-en.txt`);
  await writeText(enScriptPath, script);
  log('Saved English script:', enScriptPath);

  // Voices per language
  const voiceMap = config.langVoiceMap || {};

  // Synthesize English
  log('Synthesizing English audio (ElevenLabs)...');
  const enVoice = voiceMap['en'] || config.elevenVoiceId;
  const enAudioPath = await synthesizeShow(script, config.showsDir, `${base}-en`, enVoice);
  log('Saved English audio:', enAudioPath);

  // Translations for other languages
  for (const lang of config.languages.filter((l) => l !== 'en')) {
    try {
      log(`Translating script to ${lang}...`);
      const translated = await translateText(script, lang);
      const scriptPath = path.join(config.dataDir, `${base}-${lang}.txt`);
      await writeText(scriptPath, translated);
      log(`Saved ${lang} script:`, scriptPath);

      const vId = voiceMap[lang] || config.elevenVoiceId;
      log(`Synthesizing ${lang} audio (ElevenLabs)...`);
      const audioPath = await synthesizeShow(translated, config.showsDir, `${base}-${lang}`, vId);
      log(`Saved ${lang} audio:`, audioPath);
    } catch (e) {
      console.error(`Failed to translate/synthesize ${lang}:`, e.message || e);
    }
  }

  const publicUrlEn = `${config.publicBaseUrl}/shows/${path.basename(enAudioPath)}`;
  log('Latest English show URL:', publicUrlEn);
}

async function generateGreeting() {
  await ensureStorage();
  const pathModule = await import('path');
  const path = pathModule.default;
  const outPath = path.join(config.promptsDir, 'language-select.mp3');
  const voiceOverride = config.greetingVoiceId || config.langVoiceMap['en'] || config.elevenVoiceId;
  if (!voiceOverride) throw new Error('No greeting voice configured. Set GREETING_VOICE_ID or ELEVENLABS_LANG_VOICE_MAP_JSON["en"] or ELEVENLABS_VOICE_ID.');
  const resultPath = await synthesizePromptOnce(config.greetingText, outPath, voiceOverride);
  log('Greeting prompt ready at:', resultPath);
  log('URL:', `${config.publicBaseUrl}/prompts/${path.basename(resultPath)}`);
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === 'generate') {
    try {
      await generate();
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  } else if (cmd === 'greeting' || cmd === 'generate:greeting') {
    try {
      await generateGreeting();
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  } else {
    console.log('Usage:');
    console.log('- node src/index.js generate           # build latest show(s)');
    console.log('- node src/index.js greeting           # build greeting prompt mp3');
    process.exit(1);
  }
}

main();
