# Easy Vercel Deployment Guide

This project is now optimized for easy deployment to Vercel. You have multiple deployment options depending on your needs.

## Option 1: Webhook-Only Deployment (Recommended)

This is the simplest approach - deploy only the Twilio webhooks to Vercel and host audio files elsewhere.

### Steps:

1. **Fork/Clone this repository**

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com) and import your repository
   - Vercel will automatically detect it as a Node.js serverless functions project
   - The `vercel.json` configuration ensures proper serverless deployment

3. **Set Environment Variables in Vercel:**
   ```
   PUBLIC_BASE_URL=https://your-audio-server.com
   LANGUAGES=en,fr
   GREETING_TEXT=Welcome to the news hotline! Press 1 for English, 2 for French.
   ```
   
   Note: You don't need OpenAI/ElevenLabs keys for webhook-only deployment.s

4. **Deploy:**
   - Click "Deploy" - Vercel will build and deploy automatically
   - Your webhooks will be available at:
     - `https://your-app.vercel.app/api/voice` (main Twilio webhook)
     - `https://your-app.vercel.app/api/route` (language routing)
     - `https://your-app.vercel.app/api/cron` (optional daily generation trigger)

5. **Configure Twilio:**
   - Set your Twilio phone number's voice webhook to: `https://your-app.vercel.app/api/voice`

6. **Host audio files separately:**
   - Generate shows using `npm run generate` on your local machine or a server
   - Upload the resulting MP3s to a CDN/storage service
   - Ensure your audio host responds to `GET /shows/latest-url/:lang` endpoints

## Option 2: Full App Deployment

Deploy the complete Express application to Vercel (with limitations).

### Steps:

1. **Set all environment variables in Vercel:**
   ```
   NODE_ENV=production
   PUBLIC_BASE_URL=https://your-app.vercel.app
   OPENAI_API_KEY=your_openai_key
   ELEVENLABS_API_KEY=your_elevenlabs_key
   ELEVENLABS_VOICE_ID=your_voice_id
   LANGUAGES=en,fr
   ELEVENLABS_LANG_VOICE_MAP_JSON={"en":"voice_id_en","fr":"voice_id_fr"}
   ADMIN_API_KEY=your_secure_admin_key
   ```

2. **Deploy to Vercel**

3. **Available endpoints:**
   - `https://your-app.vercel.app/` - Main Express app (all routes from src/server.js)
   - `https://your-app.vercel.app/health` - Health check
   - `https://your-app.vercel.app/twilio/voice` - Twilio webhook
   - `https://your-app.vercel.app/admin/generate` - Trigger show generation

### ⚠️ Important Limitations:

- **No persistent storage**: Generated files are lost after each function execution
- **Function timeouts**: Long-running generation tasks may timeout
- **No background processes**: Can't run scheduled generation

## Option 3: Hybrid Approach (Best of Both Worlds)

1. **Deploy webhooks to Vercel** (for reliability and global edge locations)
2. **Run a small server elsewhere** (Render, Railway, Fly.io) for generation and file hosting
3. **Use Vercel Cron** to trigger daily generation on your server

### Setup:

1. Deploy this repo to Vercel with these environment variables:
   ```
   PUBLIC_BASE_URL=https://your-server.com
   ADMIN_API_KEY=your_secure_key
   LANGUAGES=en,fr
   ```

2. Run your server elsewhere with the same `ADMIN_API_KEY`

3. Vercel Cron will automatically call your server's `/admin/generate` endpoint daily

## Local Development

The project works exactly as before for local development:

```bash
npm install
cp env.template .env
# Fill in your API keys in .env
npm run generate  # Generate a show
npm start         # Start the server
```

## Project Structure

```
├── api/                    # Vercel serverless functions
│   ├── index.js           # Main Express app (NEW)
│   ├── voice.js           # Simple Twilio voice webhook
│   ├── route.js           # Language routing webhook  
│   └── cron.js            # Daily generation trigger
├── src/
│   ├── app.js             # Reusable Express app (NEW)
│   ├── server.js          # Local development server
│   └── ...                # All other modules unchanged
└── vercel.json            # Vercel configuration
```

## Which Option Should I Choose?

- **Option 1 (Webhook-only)**: Best for production use, most reliable, requires separate audio hosting
- **Option 2 (Full app)**: Good for testing/demos, has storage limitations
- **Option 3 (Hybrid)**: Best for automated daily shows, requires managing two deployments

Choose Option 1 or 3 for production use cases.

## Troubleshooting

### "No Output Directory named 'public' found" Error

If you see this error during deployment, it means Vercel is trying to build this as a static site instead of serverless functions. This is fixed by:

1. **Ensure `vercel.json` is present** with the correct configuration (it should be in the repo)
2. **Check that your `api/` directory contains the function files**
3. **Verify Node.js version** is set to 18+ in your Vercel project settings

The `vercel.json` file tells Vercel this is a serverless functions project, not a static site.

### Functions Not Working

- **Check environment variables** are set in your Vercel dashboard
- **Verify function paths** match the `api/` directory structure
- **Check function logs** in the Vercel dashboard for detailed error messages
