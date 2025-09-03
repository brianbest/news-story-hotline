import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { config } from './config.js';

function stripExcessWhitespace(text) {
  return (text || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

export async function fetchArticleContent(url) {
  const headers = {
    'User-Agent': config.fetchUserAgent,
    Accept: 'text/html,application/xhtml+xml',
  };
  try {
    const resp = await axios.get(url, {
      headers,
      timeout: config.fetchTimeoutMs,
      maxRedirects: 3,
      responseType: 'text',
      validateStatus: (s) => s >= 200 && s < 400,
    });
    const html = resp.data;
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (article && article.textContent) {
      return {
        title: article.title || dom.window.document.title || '',
        text: stripExcessWhitespace(article.textContent),
      };
    }
    // Fallback to body text if Readability fails
    const bodyText = dom.window.document.body?.textContent || '';
    return {
      title: dom.window.document.title || '',
      text: stripExcessWhitespace(bodyText),
    };
  } catch (e) {
    return { title: '', text: '' };
  }
}

