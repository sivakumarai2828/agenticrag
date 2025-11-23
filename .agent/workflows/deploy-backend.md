---
description: Deploy Python Backend to Render
---

# Deploy Backend to Render

Follow these steps to deploy the Python FastAPI backend separately:

## Prerequisites
- GitHub account
- Render account (free tier available at https://render.com)
- Your code pushed to GitHub

## Step 1: Push Backend Code to GitHub

If you haven't already, push your project to GitHub:

```bash
cd /Users/sivakumarkondapalle/Downloads/Projects/agenticrag
git add .
git commit -m "Prepare backend for deployment"
git push origin main
```

## Step 2: Create Web Service on Render

1. Go to https://render.com and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select your `agenticrag` repository

## Step 3: Configure Backend Service

Use these exact settings:

- **Name**: `agenticrag-backend` (or your preferred name)
- **Root Directory**: `backend`
- **Environment**: `Python 3`
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Instance Type**: Free (or paid if needed)

## Step 4: Add Environment Variables

In Render dashboard, add these environment variables:

```
OPENAI_API_KEY=sk-your-openai-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
RESEND_API_KEY=re-your-resend-key
```

## Step 5: Deploy

1. Click **"Create Web Service"**
2. Wait for deployment to complete (3-5 minutes)
3. **Copy your backend URL**: `https://agenticrag-backend.onrender.com`

## Step 6: Test Backend

Test your deployed backend:

```bash
curl https://agenticrag-backend.onrender.com/
```

Expected response:
```json
{"message": "Agentic RAG Python Backend is running"}
```

## ✅ Backend Deployment Complete!

Save your backend URL - you'll need it for frontend deployment.
