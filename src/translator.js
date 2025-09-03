import OpenAI from 'openai';
import { config } from './config.js';

export async function translateText(text, targetLang) {
  if (!config.openaiApiKey) {
    throw new Error('Missing OPENAI_API_KEY for translation');
  }
  const client = new OpenAI({ apiKey: config.openaiApiKey });
  const langName = languageName(targetLang);
  const messages = [
    { role: 'system', content: 'You are a professional media translator. You translate scripts for radio, preserving tone and style while remaining natural and idiomatic.' },
    { role: 'user', content: `Translate the following radio host monologue into ${langName}. Keep a natural, broadcast-ready tone. Do not add headings or labels.\n\n"""\n${text}\n"""` },
  ];
  const request = { model: config.openaiModel, messages };
  if (!config.openaiModel.includes('gpt-5')) request.temperature = 0.3;
  const completion = await client.chat.completions.create(request);
  const out = completion.choices?.[0]?.message?.content?.trim();
  if (!out) throw new Error('Empty translation');
  return out;
}

function languageName(code) {
  switch ((code || '').toLowerCase()) {
    case 'en': return 'English';
    case 'fr': return 'French';
    case 'es': return 'Spanish';
    case 'de': return 'German';
    case 'it': return 'Italian';
    case 'pt': return 'Portuguese';
    case 'ja': return 'Japanese';
    case 'ko': return 'Korean';
    case 'zh': return 'Chinese';
    default: return code;
  }
}

