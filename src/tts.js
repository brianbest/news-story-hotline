import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { config, getSpeakerMap } from './config.js';

/**
 * Basic synthesis with a single default voice.
 * Returns the absolute path to the saved MP3.
 */
export async function synthesizeShow(scriptText, outputDir, filenameBase = 'show', overrideVoiceId) {
  if (!config.elevenApiKey) {
    throw new Error('Missing ELEVENLABS_API_KEY');
  }
  const voiceId = overrideVoiceId || config.elevenVoiceId;
  if (!voiceId) throw new Error('Missing ELEVENLABS_VOICE_ID');

  await fs.promises.mkdir(outputDir, { recursive: true });
  const outPath = path.join(outputDir, `${filenameBase}.mp3`);

  // ElevenLabs text-to-speech API (v1)
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const payload = {
    model_id: config.elevenModelId,
    voice_settings: {
      stability: config.elevenStability,
      similarity_boost: config.elevenStyle,
    },
    text: scriptText,
  };

  const resp = await axios.post(url, payload, {
    responseType: 'arraybuffer',
    headers: {
      'xi-api-key': config.elevenApiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    timeout: 120000,
  });

  await fs.promises.writeFile(outPath, resp.data);
  return outPath;
}

/**
 * Experimental: Multi-voice synthesis.
 * Splits the script by speaker labels (e.g., "Host A:") and maps speakers
 * to voice IDs provided via ELEVENLABS_VOICES_JSON. Concatenation is left
 * as a future improvement; for now, we fall back to single voice.
 */
export async function synthesizeShowMulti(scriptText, outputDir, filenameBase = 'show') {
  const map = getSpeakerMap();
  if (!map || Object.keys(map).length === 0) {
    return synthesizeShow(scriptText, outputDir, filenameBase);
  }
  // NOTE: Proper multi-clip synthesis and concatenation would require an
  // audio processing step. To keep scope focused, we currently default to
  // single-voice synthesis and reserve multi-voice stitching for later.
  return synthesizeShow(scriptText, outputDir, filenameBase);
}

export async function synthesizePromptOnce(text, outPath, overrideVoiceId) {
  const dir = path.dirname(outPath);
  await fs.promises.mkdir(dir, { recursive: true });
  try {
    await fs.promises.access(outPath);
    return outPath; // already exists
  } catch {}
  const base = path.basename(outPath, path.extname(outPath));
  const tmp = await synthesizeShow(text, dir, `${base}`, overrideVoiceId);
  // synthesizeShow already writes to dir/base.mp3; ensure same path
  if (tmp !== outPath) {
    // If names differ, rename tmp to outPath
    if (await exists(tmp)) await fs.promises.rename(tmp, outPath);
  }
  return outPath;
}

async function exists(p) {
  try { await fs.promises.access(p); return true; } catch { return false; }
}
