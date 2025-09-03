import path from 'path';
import { fetchTopStories } from './diggApiClient.js';
import { generateShowScript } from './scriptGenerator.js';
import { synthesizeShow } from './tts.js';
import { ensureStorage, timestampSlug, writeText } from './storage.js';
import { config } from './config.js';
import { log } from './logger.js';
import { translateText } from './translator.js';

export async function runGenerate() {
  await ensureStorage();

  log('Fetching stories (DiggAPI stub)...');
  const stories = await fetchTopStories(3);

  log('Generating show script (OpenAI)...');
  const script = await generateShowScript(stories);

  const ts = timestampSlug();
  const base = `show-${ts}`;
  const outputs = [];

  // English primary
  const enScriptPath = path.join(config.dataDir, `${base}-en.txt`);
  await writeText(enScriptPath, script);
  outputs.push({ lang: 'en', type: 'script', path: enScriptPath });

  const voiceMap = config.langVoiceMap || {};
  const enVoice = voiceMap['en'] || config.elevenVoiceId;
  log('Synthesizing English audio (ElevenLabs)...');
  const enAudioPath = await synthesizeShow(script, config.showsDir, `${base}-en`, enVoice);
  outputs.push({ lang: 'en', type: 'audio', path: enAudioPath });

  // Other languages
  for (const lang of config.languages.filter((l) => l !== 'en')) {
    try {
      log(`Translating script to ${lang}...`);
      const translated = await translateText(script, lang);
      const scriptPath = path.join(config.dataDir, `${base}-${lang}.txt`);
      await writeText(scriptPath, translated);
      outputs.push({ lang, type: 'script', path: scriptPath });

      const vId = voiceMap[lang] || config.elevenVoiceId;
      log(`Synthesizing ${lang} audio (ElevenLabs)...`);
      const audioPath = await synthesizeShow(translated, config.showsDir, `${base}-${lang}`, vId);
      outputs.push({ lang, type: 'audio', path: audioPath });
    } catch (e) {
      log(`Failed to translate/synthesize ${lang}: ${e?.message || e}`);
    }
  }

  return { base, ts, outputs };
}

