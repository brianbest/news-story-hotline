import OpenAI from 'openai';
import { config } from './config.js';
import { fetchArticleContent } from './contentFetcher.js';
import { summarizeArticle } from './articleSummarizer.js';

function buildPrompt(stories) {
  const items = stories
    .map((s, idx) => {
      const comments = (s.comments || [])
        .slice(0, 2)
        .map((c) => `- @${c.author}: ${c.text}`)
        .join('\n');
      const summaryBlock = s.summary
        ? `\nArticle summary:\n${s.summary}\n`
        : '';
      return `Story ${idx + 1}: ${s.title}\n${summaryBlock}Top comments:\n${comments}`;
    })
    .join('\n\n');

  return `You are a seasoned radio DJ writing a real-to-life, single-voice monologue that reads and reacts to the latest headlines.

Goals:
- Sound human and in-the-moment: warm, wry, curious; morning-drive energy without hype.
- React naturally to each story with quick takes, light humor, or rhetorical questions.
- Use 1–2 brief listener quotes per story verbatim from the provided comments, with @handle attribution.
- Keep it accurate: do not invent facts beyond the provided stories/comments.

Style & pacing:
- Single speaker only. No speaker labels. No stage directions. No brackets.
- Short, varied sentences. Natural rhythm. Use punctuation for pacing (commas, dashes, ellipses).
- Avoid emojis and ALL CAPS. Keep buzzwords and corporate tone out.

Structure:
1) Quick hook/open welcome listeners to the proudly canadian operated Digg news hotline (1–2 lines).
2) For each story: 
- plain-language headline, 
- read the article summary and where appropriate give a one-sentence reaction to the story. Be funny and engaging with your reactions. Keep this listener entertained 
- quick transition to the comments on the story and then read 1–2 listener quotes, give a quick reaction to the comments, then transition on.
3) Tight sign-off, end with a flattering Canadian compliment and tell the listeners to have a great day.

Length target: about 90–120 seconds when read aloud.

Important:
- You are provided per-story article summaries. Rely on them for factual content; do not invent details beyond the summaries and comments.

Stories and comments:
${items}`;
}

function cleanToSingleVoiceText(text) {
  // Remove common speaker labels if any slipped in, keeping the line content.
  const labelRegex = /^(?:Host(?:\s+[AB])?|DJ|Narrator|Speaker)\s*:\s*/i;
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(labelRegex, ''))
    .join('\n')
    // Collapse 3+ newlines to 2 for nicer paragraphing
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function generateShowScript(stories) {
  if (!config.openaiApiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }
  const client = new OpenAI({ apiKey: config.openaiApiKey });
  let enriched = stories;

  // Optionally fetch and summarize article content per story
  if (config.fetchArticleContent) {
    enriched = await Promise.all(
      stories.map(async (s) => {
        try {
          const { title, text } = await fetchArticleContent(s.url);
          const summary = await summarizeArticle({ title: title || s.title, url: s.url, text });
          return { ...s, summary };
        } catch {
          return { ...s };
        }
      })
    );
  }

  const prompt = buildPrompt(enriched);

  // Build the request options
  const requestOptions = {
    model: config.openaiModel,
    messages: [
      { role: 'system', content: 'You are a seasoned radio DJ who writes natural, engaging monologue scripts and speaks like a real person on air.' },
      { role: 'user', content: prompt },
    ],
  };

  // Only add temperature for models that support it (gpt-5 only supports default temperature of 1)
  if (!config.openaiModel.includes('gpt-5')) {
    requestOptions.temperature = 0.7;
  }

  const completion = await client.chat.completions.create(requestOptions);

  const raw = completion.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error('Empty script generated');
  const cleaned = cleanToSingleVoiceText(raw);
  return cleaned;
}
