# Netlify Deployment Guide for Nexa Voice Assistant

## 🚀 Quick Start - Deploy to Netlify

I've created everything you need to deploy your frontend to Netlify!

### Files Created:
- ✅ `netlify.toml` - Netlify configuration file
- ✅ `.agent/workflows/deploy-netlify.md` - Detailed deployment workflow

---

## 📋 Step-by-Step Instructions

### **Option 1: Deploy via Netlify Website (Easiest)**

#### 1. Go to Netlify
Visit: https://app.netlify.com/

#### 2. Import Your Project
- Click **"Add new site"** → **"Import an existing project"**
- Choose **"Deploy with GitHub"**
- Select repository: `sivakumarai2828/agenticrag`
- Select branch: `agentic_rag_app`

#### 3. Configure Build Settings
Netlify should auto-detect these, but verify:
```
Base directory: (leave empty)
Build command: npm run build
Publish directory: dist
```

#### 4. Add Environment Variables
Click **"Show advanced"** → **"New variable"** and add these:

**Required Variables:**
```
VITE_API_URL = <your-backend-url-from-render>
VITE_SUPABASE_URL = <your-supabase-project-url>
VITE_SUPABASE_ANON_KEY = <your-supabase-anon-key>
```

**Example:**
```
VITE_API_URL = https://nexa-backend.onrender.com
VITE_SUPABASE_URL = https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 5. Deploy!
- Click **"Deploy site"**
- Wait 1-3 minutes for build to complete
- Your site will be live! 🎉

---

### **Option 2: Deploy via Netlify CLI**

#### 1. Install Netlify CLI
```bash
npm install -g netlify-cli
```

#### 2. Login to Netlify
```bash
netlify login
```

#### 3. Initialize and Deploy
```bash
cd /Users/sivakumarkondapalle/Downloads/Projects/agenticrag
netlify init
```

Follow the prompts, then deploy:
```bash
netlify deploy --prod
```

---

## 🔧 Environment Variables Reference

You'll need these environment variables in Netlify:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Your backend API URL (from Render) | `https://nexa-backend.onrender.com` |
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://abcdefgh.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | `eyJhbGci...` |

**Important Notes:**
- All frontend env vars MUST start with `VITE_` prefix
- No trailing slash on `VITE_API_URL`
- Get these values from your `.env` file (don't commit this file!)

---

## ✅ After Deployment Checklist

1. **Test Your Site**
   - Visit the Netlify URL
   - Try the voice assistant
   - Check browser console for errors

2. **Verify Backend Connection**
   - Make sure API calls work
   - Check CORS settings on backend
   - Ensure backend is running on Render

3. **Custom Domain (Optional)**
   - Go to Site settings → Domain management
   - Add your custom domain

4. **Update README**
   - Add your live Netlify URL to README.md

---

## 🔄 Continuous Deployment

Once connected, Netlify will automatically:
- ✅ Deploy when you push to `agentic_rag_app` branch
- ✅ Create preview deployments for pull requests
- ✅ Show build status in GitHub

---

## 🐛 Troubleshooting

### Build Fails
- Check build logs in Netlify dashboard
- Verify all dependencies are in `package.json`
- Ensure Node version is 18+

### Environment Variables Not Working
- Make sure they start with `VITE_` prefix
- Redeploy after adding variables
- Check spelling matches your code

### API Calls Failing
- Verify `VITE_API_URL` is correct
- Check backend CORS settings
- Ensure backend is deployed and running

---

## 📚 Useful Resources

- Netlify Dashboard: https://app.netlify.com/
- Netlify Docs: https://docs.netlify.com/
- Your workflows: `.agent/workflows/deploy-netlify.md`

---

## 🎯 Next Steps

1. Deploy to Netlify using Option 1 or 2 above
2. Get your live URL
3. Test all features
4. Share your Nexa voice assistant with the world! 🌍
