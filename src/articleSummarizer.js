import OpenAI from 'openai';
import { config } from './config.js';

function buildSummaryPrompt({ title, url, excerpt }) {
  return `Summarize the following news article for a radio host. Keep it factual and concise, capturing the main point, key context, and any implications listeners care about.

Constraints:
- 6–9 sentences total.
- Plain language, no bullet points, no brackets.
- Include context and why it matters for everyday listeners.
- Do not speculate beyond the excerpt.

Title: ${title || '(untitled)'}
URL: ${url}
Excerpt:
"""
${excerpt}
"""`;
}

export async function summarizeArticle({ title, url, text }) {
  if (!config.openaiApiKey) {
    return '';
  }
  const client = new OpenAI({ apiKey: config.openaiApiKey });
  const excerpt = (text || '').slice(0, config.summaryMaxChars);
  if (!excerpt) return '';

  const prompt = buildSummaryPrompt({ title, url, excerpt });
  const request = {
    model: config.openaiModel,
    messages: [
      { role: 'system', content: 'You are a concise news editor who writes clear, reliable summaries for radio.' },
      { role: 'user', content: prompt },
    ],
  };
  // For non-gpt-5 models, set a mild temperature.
  if (!config.openaiModel.includes('gpt-5')) {
    request.temperature = 0.4;
  }
  const completion = await client.chat.completions.create(request);
  const textOut = completion.choices?.[0]?.message?.content?.trim();
  return textOut || '';
}

