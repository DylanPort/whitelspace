# Environment Setup

## Required Environment Variables

### For Local Development

Create a `.env` file in the root directory (this file is gitignored):

```env
PERPLEXITY_API_KEY=your_api_key_here
```

### For Netlify Deployment

Set the following environment variable in Netlify UI:

1. Go to your site in Netlify Dashboard
2. Navigate to **Site settings** > **Environment variables**
3. Click **Add a variable**
4. Add:
   - **Key:** `PERPLEXITY_API_KEY`
   - **Value:** `your_perplexity_api_key_here`
   - **Scopes:** All (Production, Deploy Preview, Branch deploys)

## Getting API Keys

### Perplexity AI API Key
1. Visit: https://www.perplexity.ai/settings/api
2. Sign up or log in
3. Generate a new API key
4. Copy and paste into Netlify environment variables

## Security Notes

- ✅ API keys are stored securely on Netlify's servers
- ✅ Keys are never exposed to the client
- ✅ All API calls go through serverless functions
- ⚠️ Never commit API keys to git
- ⚠️ `.env` files are automatically gitignored

