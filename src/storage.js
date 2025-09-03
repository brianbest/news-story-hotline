import fs from 'fs';
import path from 'path';
import { config } from './config.js';

export async function ensureStorage() {
  await fs.promises.mkdir(config.dataDir, { recursive: true });
  await fs.promises.mkdir(config.showsDir, { recursive: true });
}

export function timestampSlug(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return [
    d.getUTCFullYear(),
    pad(d.getUTCMonth() + 1),
    pad(d.getUTCDate()),
    pad(d.getUTCHours()),
    pad(d.getUTCMinutes()),
    pad(d.getUTCSeconds()),
  ].join('');
}

export async function writeText(filePath, text) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, text, 'utf8');
}

export async function getLatestShowFile() {
  try {
    const files = (await fs.promises.readdir(config.showsDir))
      .filter((f) => f.endsWith('.mp3'))
      .sort()
      .reverse();
    if (files.length === 0) return null;
    return path.join(config.showsDir, files[0]);
  } catch {
    return null;
  }
}

export async function getLatestShowFileByLang(lang) {
  try {
    const suffix = `-${lang}.mp3`;
    const files = (await fs.promises.readdir(config.showsDir))
      .filter((f) => f.endsWith(suffix))
      .sort()
      .reverse();
    if (files.length === 0) return null;
    return path.join(config.showsDir, files[0]);
  } catch {
    return null;
  }
}
