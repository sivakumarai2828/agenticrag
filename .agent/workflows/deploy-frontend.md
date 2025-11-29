---
description: Deploy React Frontend to Vercel
---

# Deploy Frontend to Vercel

Follow these steps to deploy the React/Vite frontend separately:

## Prerequisites
- GitHub account
- Vercel account (free tier available at https://vercel.com)
- Your backend deployed and URL ready
- Code pushed to GitHub

## Step 1: Ensure Code is on GitHub

```bash
cd /Users/sivakumarkondapalle/Downloads/Projects/agenticrag
git add .
git commit -m "Prepare frontend for deployment"
git push origin main
```

## Step 2: Import Project to Vercel

1. Go to https://vercel.com and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Select your `agenticrag` repository

## Step 3: Configure Frontend Build Settings

Vercel should auto-detect Vite. Verify these settings:

- **Framework Preset**: Vite (auto-detected)
- **Root Directory**: `./` (leave as root, NOT backend)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## Step 4: Add Environment Variables

**CRITICAL**: Add these environment variables in Vercel:

```
VITE_API_URL=https://agenticrag-backend.onrender.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Important Notes**:
- Replace `https://agenticrag-backend.onrender.com` with YOUR actual backend URL
- Do NOT include trailing slash in `VITE_API_URL`
- These variables are build-time variables (they get baked into your build)

## Step 5: Deploy

1. Click **"Deploy"**
2. Wait for build to complete (2-3 minutes)
3. Vercel will give you a URL like: `https://agenticrag.vercel.app`

## Step 6: Test Frontend

1. Open your Vercel URL in browser
2. Try a query like: "show me transactions for client 101"
3. Open browser DevTools → Network tab
4. Verify API calls go to your backend URL

## Step 7: Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

## Troubleshooting

### Frontend can't connect to backend
- Check `VITE_API_URL` is set correctly in Vercel
- Verify backend is running: `curl https://your-backend-url.com/`
- Check browser console for CORS errors

### Build fails
- Check all dependencies are in `package.json`
- Verify Node.js version compatibility
- Review build logs in Vercel dashboard

### Environment variables not working
- Remember: Vite env vars must start with `VITE_`
- Redeploy after adding/changing env vars
- Clear cache and redeploy if needed

## ✅ Frontend Deployment Complete!

Your app is now live with:
- Frontend: Vercel
- Backend: Render (deployed separately)
