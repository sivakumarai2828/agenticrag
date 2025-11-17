# 🚀 Deploy Your Updated Pipecat Backend

## Current Situation

Your frontend is currently pointing to: `wss://pipecat-speech2speech.onrender.com/ws`

**This is NOT your updated backend** with:
- ❌ No function calling
- ❌ No session management
- ❌ No Supabase integration
- ❌ No context memory

You need to deploy `pipecat-backend-updated.py` to use all the new features!

---

## 🎯 Quick Deployment Steps

### Option 1: Deploy to Render.com (Recommended)

#### Step 1: Prepare Your Files

1. Create a new folder for your Pipecat backend:
   ```bash
   mkdir pipecat-backend
   cd pipecat-backend
   ```

2. Copy these files:
   ```bash
   cp /path/to/pipecat-backend-updated.py main.py
   cp /path/to/pipecat-requirements.txt requirements.txt
   ```

3. Create a `render.yaml` (optional):
   ```yaml
   services:
     - type: web
       name: pipecat-backend
       env: python
       buildCommand: pip install -r requirements.txt
       startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
       envVars:
         - key: OPENAI_API_KEY
           sync: false
         - key: SPEECHMATICS_API_KEY
           sync: false
         - key: CARTESIA_API_KEY
           sync: false
         - key: VOICE_ID
           value: "71a7ad14-091c-4e8e-a314-022ece01c121"
         - key: SUPABASE_URL
           sync: false
         - key: SUPABASE_ANON_KEY
           sync: false
   ```

#### Step 2: Push to GitHub

```bash
git init
git add .
git commit -m "Initial Pipecat backend with function calling"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pipecat-backend.git
git push -u origin main
```

#### Step 3: Deploy on Render

1. Go to [Render.com](https://render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `pipecat-backend` (or your choice)
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** Free (for testing) or Starter (for production)

5. Add Environment Variables:
   ```
   OPENAI_API_KEY=sk-...
   SPEECHMATICS_API_KEY=...
   CARTESIA_API_KEY=...
   VOICE_ID=71a7ad14-091c-4e8e-a314-022ece01c121
   SUPABASE_URL=https://tqyxgybbrkybwbshalsa.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   ```

6. Click **"Create Web Service"**

7. Wait for deployment (5-10 minutes)

8. Your backend will be at: `https://YOUR-APP-NAME.onrender.com`

#### Step 4: Test Your Backend

```bash
# Test health endpoint
curl https://YOUR-APP-NAME.onrender.com/health

# Expected response:
# {"status": "ok", "active_sessions": 0}
```

#### Step 5: Update Frontend

Update your `.env` file:
```env
VITE_PIPECAT_BACKEND_URL=wss://YOUR-APP-NAME.onrender.com/ws
```

---

### Option 2: Test Locally First

#### Step 1: Run Backend Locally

```bash
# Install dependencies
pip install -r pipecat-requirements.txt

# Create .env file
cat > .env << EOF
OPENAI_API_KEY=sk-proj-...
SPEECHMATICS_API_KEY=...
CARTESIA_API_KEY=...
VOICE_ID=71a7ad14-091c-4e8e-a314-022ece01c121
SUPABASE_URL=https://tqyxgybbrkybwbshalsa.supabase.co
SUPABASE_ANON_KEY=eyJ...
EOF

# Run server
uvicorn pipecat-backend-updated:app --host 0.0.0.0 --port 8000 --reload
```

#### Step 2: Test Locally

```bash
# Open new terminal
curl http://localhost:8000/health

# Should return:
# {"status": "ok", "active_sessions": 0}
```

#### Step 3: Update Frontend for Local Testing

Your `.env` is already configured for local testing:
```env
VITE_PIPECAT_BACKEND_URL=ws://localhost:8000/ws
```

#### Step 4: Test Voice Connection

1. Start your frontend: `npm run dev`
2. Open browser: `http://localhost:5173`
3. Click **Voice Mode**
4. Select **"Pipecat Speech2Speech"** from dropdown
5. Click **"Connect"**
6. Should see: **"Connected"** status
7. Start speaking!

---

### Option 3: Deploy to Railway.app

#### Step 1: Prepare Files (same as Render)

#### Step 2: Deploy on Railway

1. Go to [Railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your repository
5. Railway auto-detects Python and installs dependencies
6. Add environment variables in settings
7. Deploy!

Your backend will be at: `https://YOUR-APP.railway.app`

Update `.env`:
```env
VITE_PIPECAT_BACKEND_URL=wss://YOUR-APP.railway.app/ws
```

---

## 🔧 Required Environment Variables

Your backend MUST have these environment variables:

```env
# Required for OpenAI LLM
OPENAI_API_KEY=sk-proj-...

# Required for Speech-to-Text
SPEECHMATICS_API_KEY=...

# Required for Text-to-Speech
CARTESIA_API_KEY=...

# Optional: Custom voice
VOICE_ID=71a7ad14-091c-4e8e-a314-022ece01c121

# Required for Supabase integration
SUPABASE_URL=https://tqyxgybbrkybwbshalsa.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

### Where to Get API Keys

1. **OpenAI:** Already have: `sk-proj-E1Lq...`
2. **Speechmatics:** [Sign up here](https://www.speechmatics.com/)
3. **Cartesia:** [Sign up here](https://cartesia.ai/)
4. **Supabase:** Already have (from your project)

---

## ✅ Testing Checklist

After deployment, test these:

### 1. Health Check
```bash
curl https://YOUR-BACKEND.com/health
# Should return: {"status": "ok", "active_sessions": 0}
```

### 2. WebSocket Connection
- Open browser console
- Click "Connect" button
- Should see: `"Pipecat WebSocket connected"`
- Should see: `"Connected to OpenAI Realtime API"`

### 3. Voice Commands
Try these voice commands:

```
✅ "What transactions does client 5001 have?"
   → Should call query_transactions
   → Returns real transaction data

✅ "Send that to john@example.com"
   → Should remember client 5001 (context!)
   → Calls send_email_report

✅ "What's our refund policy?"
   → Calls search_documents
   → Returns info from knowledge base

✅ "What's the weather in San Francisco?"
   → Calls web_search
   → Returns web results

✅ "Generate a chart for client 5002"
   → Calls generate_transaction_chart
   → Returns chart data
```

### 4. Check Logs

On Render/Railway dashboard:
- Look for `🔧 Function call detected`
- Look for `✅ Function result`
- No `❌ Error` messages

---

## 🐛 Troubleshooting

### Issue: "WebSocket failed to connect"

**Solution 1:** Check backend is running
```bash
curl https://YOUR-BACKEND.com/health
```

**Solution 2:** Check WebSocket URL in `.env`
```env
# Make sure it starts with wss:// (not ws://)
VITE_PIPECAT_BACKEND_URL=wss://YOUR-BACKEND.com/ws
```

**Solution 3:** Check CORS on backend (already configured in code)

### Issue: "Function calls not working"

**Solution 1:** Verify Supabase credentials in backend env vars

**Solution 2:** Test Supabase functions directly:
```bash
curl -X POST https://tqyxgybbrkybwbshalsa.supabase.co/functions/v1/transaction-query \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"clientId": 5001, "query": "test"}'
```

**Solution 3:** Check backend logs for errors

### Issue: "Context not maintained"

**Solution:** This is fixed in updated backend!
- Session management stores conversation history
- Each WebSocket connection gets unique session ID
- Context persists throughout conversation

### Issue: "Audio not playing"

**Solution 1:** Check Cartesia API key is valid

**Solution 2:** Check audio permissions in browser

**Solution 3:** Check audio format (PCM16, 16kHz)

---

## 📊 Comparing Old vs New Backend

| Feature | Old Backend | New Backend |
|---------|-------------|-------------|
| URL | wss://pipecat-speech2speech.onrender.com | wss://YOUR-BACKEND.onrender.com |
| Function Calling | ❌ No | ✅ Yes (5 functions) |
| Context Memory | ❌ No | ✅ Yes (session-based) |
| Supabase Integration | ❌ No | ✅ Yes (all edge functions) |
| Transaction Queries | ❌ No | ✅ Yes |
| Email Reports | ❌ No | ✅ Yes |
| Document Search | ❌ No | ✅ Yes |
| Web Search | ❌ No | ✅ Yes |
| Chart Generation | ❌ No | ✅ Yes |

---

## 🎉 You're Ready!

Once deployed:

1. ✅ Health endpoint returns `{"status": "ok"}`
2. ✅ WebSocket connects successfully
3. ✅ Voice commands trigger function calls
4. ✅ Context is maintained across messages
5. ✅ All 5 functions work correctly

Your Pipecat backend now has:
- Full function calling
- Context memory
- Supabase integration
- Production-ready reliability

**All the screenshot issues are fixed!** 🎊

---

## 🔗 Quick Links

- **Render Dashboard:** https://dashboard.render.com
- **Railway Dashboard:** https://railway.app/dashboard
- **Pipecat Docs:** https://docs.pipecat.ai
- **Your Supabase:** https://supabase.com/dashboard/project/tqyxgybbrkybwbshalsa

---

## 📞 Need Help?

1. Check backend health endpoint first
2. Review deployment logs
3. Test Supabase functions independently
4. Verify all environment variables are set
5. Check browser console for errors

**Ready to deploy!** 🚀
