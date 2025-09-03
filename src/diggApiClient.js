// PSEUDOCODE STUB FOR DiggAPI
// The real DiggAPI client is not implemented and not fetched.
// Replace this stub with real HTTP calls when the service is available.

import { config } from './config.js';

/**
 * Fetches top stories from the (nonexistent) DiggAPI.
 * Returns an array of { id, title, url, comments: [{author, text}] }.
 * Currently returns mock data when DIGG_USE_MOCK is true.
 */
export async function fetchTopStories(limit = 5) {
  if (config.diggUseMock) {
    const stories = [
      {
        id: '1',
        title: 'Drew Barrymore Wants To Remake Cult Horror Comedy "Death Becomes Her"',
        url: 'https://gizmodo.com/drew-barrymore-wants-to-remake-cult-horror-comedy-death-becomes-her-with-adam-sandler-jennifer-anniston-2000651819',
        comments: [
          { author: 'techfan88', text: 'Please for the love of god stop remaking movies.' },
          { author: 'skeptic42', text: 'Bruce Willis was so terribly miscast in that film.' },
        ],
      },
      {
        id: '2',
        title: 'LEGO SEGA Genesis Controller Officially Announced',
        url: 'https://www.thebrickfan.com/lego-sega-genesis-controller-40769-officially-announced/',
        comments: [
          { author: 'urbanist', text: 'The Gameboy is damn impressive' },
          { author: 'commuter', text: "I like how creative they've been with items like this." },
        ],
      },
      {
        id: '3',
        title: 'Scientists Detect Possible Signs of Life in Exoplanet Atmosphere',
        url: 'https://arstechnica.com/gaming/2025/09/over-30-years-later-a-rare-laserdisc-game-console-gets-its-first-pc-emulator/',
        comments: [
          { author: 'astro_n00b', text: 'This is like the pre-3DO.' },
          { author: 'mathguy', text: 'I thought I had at least a passing familiarity with all of the retro consoles but this one is new to me.' },
        ],
      },
    ];
    return stories.slice(0, limit);
  }

  // Pseudocode for a future implementation (do not run):
  // const resp = await axios.get('https://api.digg.com/vX/top?limit=' + limit);
  // return resp.data.items.map(item => ({
  //   id: item.id,
  //   title: item.title,
  //   url: item.url,
  //   comments: item.comments.map(c => ({ author: c.user, text: c.body }))
  // }));

  // For now, return empty list if mock disabled.
  return [];
}

