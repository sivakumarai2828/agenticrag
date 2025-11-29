---
description: Deploy React Frontend to Netlify
---

# Deploy Frontend to Netlify

This workflow guides you through deploying the Nexa voice assistant frontend to Netlify.

## Prerequisites

1. A Netlify account (sign up at https://www.netlify.com/)
2. Your GitHub repository pushed with latest changes
3. Environment variables configured (if needed)

## Option 1: Deploy via Netlify UI (Recommended for First Time)

### Step 1: Connect to Netlify

1. Go to https://app.netlify.com/
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **"Deploy with GitHub"**
4. Authorize Netlify to access your GitHub account
5. Select the repository: `sivakumarai2828/agenticrag`
6. Select the branch: `agentic_rag_app`

### Step 2: Configure Build Settings

Netlify should auto-detect the settings, but verify:

- **Base directory:** (leave empty)
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Branch to deploy:** `agentic_rag_app`

### Step 3: Add Environment Variables (if needed)

Click **"Show advanced"** → **"New variable"** and add:

- `VITE_SUPABASE_URL` = your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
- `VITE_BACKEND_URL` = your backend URL (from Render deployment)

### Step 4: Deploy

1. Click **"Deploy site"**
2. Wait for the build to complete (usually 1-3 minutes)
3. Your site will be live at a URL like: `https://random-name-123456.netlify.app`

### Step 5: Custom Domain (Optional)

1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Follow the instructions to configure your domain

## Option 2: Deploy via Netlify CLI

### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

### Step 2: Login to Netlify

// turbo
```bash
netlify login
```

### Step 3: Initialize Netlify Site

// turbo
```bash
netlify init
```

Follow the prompts:
- Choose "Create & configure a new site"
- Select your team
- Enter a site name (or leave blank for random)
- Build command: `npm run build`
- Publish directory: `dist`

### Step 4: Deploy

// turbo
```bash
netlify deploy --prod
```

## Continuous Deployment

Once connected, Netlify will automatically:
- Deploy when you push to the `agentic_rag_app` branch
- Create preview deployments for pull requests
- Run build checks before deploying

## Verify Deployment

1. Visit your Netlify URL
2. Test the voice assistant functionality
3. Check browser console for any errors
4. Verify API calls to your backend are working

## Troubleshooting

### Build Fails
- Check the build logs in Netlify dashboard
- Ensure all dependencies are in `package.json`
- Verify Node version compatibility

### Environment Variables Not Working
- Ensure variables start with `VITE_` prefix
- Redeploy after adding environment variables
- Check variable names match your code

### API Calls Failing
- Verify `VITE_BACKEND_URL` is set correctly
- Check CORS settings on your backend
- Ensure backend is deployed and running

## Useful Commands

```bash
# Deploy to production
netlify deploy --prod

# Deploy preview
netlify deploy

# Open Netlify dashboard
netlify open

# View site in browser
netlify open:site

# Check deploy status
netlify status
```

## Next Steps

After deployment:
1. Update your README with the live URL
2. Test all features in production
3. Set up custom domain (optional)
4. Configure analytics (optional)
