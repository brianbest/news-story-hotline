import path from 'path';
import { synthesizePromptOnce } from './tts.js';
import { ensureStorage } from './storage.js';
import { config } from './config.js';
import { log } from './logger.js';
import { runGenerate } from './generator.js';

async function generate() {
  const { outputs, base } = await runGenerate();
  const enAudio = outputs.find((o) => o.lang === 'en' && o.type === 'audio');
  if (enAudio) {
    const publicUrlEn = `${config.publicBaseUrl}/shows/${path.basename(enAudio.path)}`;
    log('Latest English show URL:', publicUrlEn);
  }
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
