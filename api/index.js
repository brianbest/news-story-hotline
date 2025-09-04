import serverless from 'serverless-http';
import { createApp } from '../src/app.js';

// Create the Express app
const app = createApp();

// Export the serverless handler
export default serverless(app);
