export function log(...args) {
  console.log('[NewsHotline]', ...args);
}

export function warn(...args) {
  console.warn('[NewsHotline][WARN]', ...args);
}

export function error(...args) {
  console.error('[NewsHotline][ERROR]', ...args);
}

