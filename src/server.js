import { config } from './config.js';
import { log } from './logger.js';
import { createApp, initializeApp } from './app.js';

// Boot server
const start = async () => {
  await initializeApp();
  const app = createApp();
  
  app.listen(config.port, () => {
    log(`Server listening on :${config.port}`);
    log(`Static shows at /shows, base URL: ${config.publicBaseUrl}`);
  });
};

start();
