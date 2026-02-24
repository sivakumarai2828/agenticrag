# Deployment Guide

This guide outlines how to deploy the **Agentic RAG** application, which consists of a **React Frontend** and a **Python FastAPI Backend**.

## Architecture Overview

The application has two main components:
1. **Frontend (React/Vite)**: User interface that makes API calls
2. **Backend (Python/FastAPI)**: REST API that handles business logic

## Environment Variables

### Frontend Environment Variables

Create a `.env` file in the root directory with:

```env
# Backend API URL (no trailing slash)
VITE_API_URL=https://your-backend-url.com

# Supabase Configuration (for direct Supabase features)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Important Notes:**
- `VITE_API_URL` should point to your deployed Python backend
- For local development, you can omit `VITE_API_URL` and it will use relative URLs
- The frontend uses a centralized API configuration (`src/config/api.ts`) - no hardcoded URLs

### Backend Environment Variables

The backend needs these environment variables:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-...

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Email Service (optional)
RESEND_API_KEY=re_...

# Search Service (at least one required for web search)
SERPAPI_API_KEY=...
SERPER_API_KEY=...
```

---

## 1. Backend Deployment (Python/FastAPI)

### Option A: Deploy on Render (Recommended)

1. **Push your code to GitHub/GitLab**

2. **Create a new Web Service** on [Render](https://render.com/)

3. **Connect your repository**

4. **Configure Settings**:
   - **Name**: `agenticrag-backend` (or your preferred name)
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

5. **Add Environment Variables** in the Render dashboard:
   - `OPENAI_API_KEY`: Your OpenAI API Key
   - `VITE_SUPABASE_URL`: Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key
   - `RESEND_API_KEY`: Your Resend API Key (for emails)
   - `SERPAPI_API_KEY`: Your SerpApi Key (for web search)
   - `SERPER_API_KEY`: Alternative Serper.dev Key (optional)

6. **Deploy**: Render will automatically deploy your backend

7. **Copy the URL**: After deployment, copy your backend URL (e.g., `https://agenticrag-backend.onrender.com`)

### Option B: Deploy on Railway

1. **Create a new project** on [Railway](https://railway.app/)

2. **Deploy from GitHub repository**

3. **Configure Settings**:
   - **Root Directory**: `backend`
   - Railway should auto-detect Python
   - If needed, set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **Add Environment Variables** (same as Render)

5. **Deploy and copy the URL**

### Option C: Deploy on Heroku

1. **Install Heroku CLI** and login

2. **Create a new Heroku app**:
   ```bash
   heroku create agenticrag-backend
   ```

3. **Set environment variables**:
   ```bash
   heroku config:set OPENAI_API_KEY=sk-...
   heroku config:set VITE_SUPABASE_URL=https://...
   heroku config:set VITE_SUPABASE_ANON_KEY=...
   heroku config:set RESEND_API_KEY=re_...
   ```

4. **Deploy**:
   ```bash
   git subtree push --prefix backend heroku main
   ```

---

## 2. Frontend Deployment (Vite/React)

### Deploy on Vercel (Recommended)

1. **Push your code to GitHub**

2. **Import project** into [Vercel](https://vercel.com/)

3. **Configure Build Settings**:
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Add Environment Variables**:
   - `VITE_API_URL`: Your deployed backend URL (e.g., `https://agenticrag-backend.onrender.com`)
   - `VITE_SUPABASE_URL`: Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key

5. **Deploy**: Vercel will automatically deploy your frontend

### Alternative: Deploy on Netlify

1. **Push to GitHub**

2. **Create new site** on [Netlify](https://netlify.com/)

3. **Build Settings**:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`

4. **Add Environment Variables** (same as Vercel)

5. **Deploy**

---

## 3. CORS Configuration

The backend is currently configured to allow all origins by default for a smoother deployment experience:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Security Note**: For production, you may want to restrict `allow_origins` to your specific frontend URL (e.g., `https://your-app.netlify.app`).

---

## 4. Testing the Deployment

### Test Backend

```bash
curl https://your-backend-url.com/
# Should return: {"message": "Agentic RAG Python Backend is running"}
```

### Test Frontend

1. Open your deployed frontend URL
2. Try a query like "show me transactions for client 101"
3. Check browser console for any errors

---

## 5. Local Development

### Run Backend Locally

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python3 main.py
```

Backend runs on `http://localhost:8000`

### Run Frontend Locally

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

**Note**: For local development, you don't need to set `VITE_API_URL` - the app will use relative URLs that proxy to your local backend.

---

## 6. Monitoring and Logs

### Render
- View logs in the Render dashboard under "Logs"
- Monitor deployment status and health

### Vercel
- Check deployment logs in Vercel dashboard
- View function logs for debugging

### Railway
- Access logs from Railway dashboard
- Monitor resource usage

---

## 7. Troubleshooting

### Frontend can't connect to backend
- Verify `VITE_API_URL` is set correctly in Vercel/Netlify
- Check CORS settings in backend
- Inspect browser console for errors

### Backend errors
- Check environment variables are set
- Review backend logs for Python errors
- Verify Supabase credentials

### Build failures
- Ensure all dependencies are in `package.json` and `requirements.txt`
- Check Node.js and Python versions match your local environment

---

## 8. Cloud-Agnostic Architecture

This project is designed to be **platform-independent**. You can move from Render/Netlify to Microsoft Foundry (Azure) without changing a single line of code.

### Portability Key Features:
1. **Dynamic API Routing**: The frontend uses `src/config/api.ts` to resolve backend URLs via environment variables.
2. **Stateless Backend**: The FastAPI server is stateless, making it compatible with Serverless (Azure Functions), Managed Containers (Azure Container Apps), or traditional VMs.
3. **Docker Ready**: We provide a `backend/Dockerfile` so the entire backend can be "pickled" and run on any cloud that supports containers.
4. **Environment Variable Injection**: All credentials follow the 12-factor app methodology—identically handled across Render, Azure, and AWS.

### Migrating to Azure (Microsoft Foundry):
- **Frontend**: Deploy to **Azure Static Web Apps**. It will auto-detect the Vite build.
- **Backend**: Use **Azure Container Apps** and point it to your `backend/` folder. It will use the provided Dockerfile.
- **Data**: Supabase stays as your database provider, ensuring your data layer is not locked into any specific cloud provider.

---

## Summary

