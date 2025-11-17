# Pipecat Backend Setup Guide

## 🎯 What's Been Fixed

Your updated Pipecat backend now includes:

✅ **Function Calling** - Can query transactions, search documents, send emails, generate charts
✅ **Session Management** - Maintains conversation context across messages
✅ **Better System Prompt** - Julia knows she's a financial assistant
✅ **Web Search Fallback** - Searches web when documents don't have answers
✅ **Proper Error Handling** - Graceful error messages and logging
✅ **Context Persistence** - Remembers previous conversation turns

## 🚀 Installation Steps

### 1. Install Dependencies

```bash
pip install -r pipecat-requirements.txt
```

### 2. Set Environment Variables

Create a `.env` file in your Pipecat backend directory:

```env
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key

# Speechmatics API Key (for Speech-to-Text)
SPEECHMATICS_API_KEY=your_speechmatics_api_key

# Cartesia API Key (for Text-to-Speech)
CARTESIA_API_KEY=your_cartesia_api_key

# Optional: Custom voice ID for Cartesia
VOICE_ID=71a7ad14-091c-4e8e-a314-022ece01c121

# Supabase Configuration (from your frontend .env)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run the Server

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Or if your file is named differently:

```bash
python pipecat-backend-updated.py
```

### 4. Test the Connection

```bash
# Check health endpoint
curl http://localhost:8000/health

# Expected response:
# {"status": "ok", "active_sessions": 0}
```

## 🔧 Key Improvements Explained

### 1. Function Calling with Supabase Edge Functions

The backend now calls your existing Supabase edge functions:

- `transaction-query` - Query transactions by client ID
- `rag-retrieval` - Search documents
- `web-search-tool` - Web search fallback
- `transaction-email` - Send email reports
- `transaction-chart` - Generate charts

### 2. Session-Based Context

Each WebSocket connection gets a unique session ID that maintains conversation history:

```python
conversation_sessions[session_id] = [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "What transactions does client 5001 have?"},
    {"role": "assistant", "content": "Client 5001 has 5 transactions..."},
    {"role": "user", "content": "Can you email that to john@example.com?"},
    # Julia remembers we're talking about client 5001!
]
```

### 3. Better System Instructions

Julia now knows:
- When to call which function
- To maintain conversation context
- To be concise for voice interaction
- To always fetch real data from functions

### 4. FunctionCallProcessor

Custom processor that:
1. Detects when LLM wants to call a function
2. Executes the function via Supabase edge functions
3. Returns results to LLM
4. LLM responds with the answer

## 📊 How It Works

### Conversation Flow:

```
User: "What transactions does client 5001 have?"
  ↓
Speechmatics STT → Text
  ↓
OpenAI LLM → Decides to call query_transactions(clientId: 5001)
  ↓
FunctionCallProcessor → Calls Supabase edge function
  ↓
Result returned to LLM
  ↓
LLM generates natural response: "Client 5001 has 5 transactions..."
  ↓
Cartesia TTS → Speech
  ↓
User hears response
```

### Follow-up Works:

```
User: "Can you email that to john@example.com?"
  ↓
LLM remembers context (client 5001) from conversation history
  ↓
Calls send_email_report(to: "john@example.com", clientId: 5001)
  ↓
Email sent successfully
```

## 🐛 Troubleshooting

### Issue: "Supabase credentials not configured"

**Solution:** Make sure `.env` has `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### Issue: Function calls failing

**Solution:** Check that your Supabase edge functions are deployed:
```bash
# Test from command line
curl -X POST https://your-project.supabase.co/functions/v1/transaction-query \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"clientId": 5001, "query": "transactions for client 5001"}'
```

### Issue: No audio output

**Solution:**
1. Check Cartesia API key is valid
2. Check audio device configuration
3. Look for WebRTC errors in browser console

### Issue: Context not maintained

**Solution:** Session should persist for the WebSocket connection lifetime. If reconnecting, a new session is created. Consider implementing session resumption if needed.

## 🔐 Security Notes

- Uses `SUPABASE_ANON_KEY` (safe for client-side use)
- All function calls go through Supabase RLS policies
- No direct database access from Pipecat
- Function execution errors are logged but sanitized for user responses

## 📈 Monitoring

Check logs for:

```
🔧 Function call detected: query_transactions
✅ Transaction query result: {...}
📧 Sending email to john@example.com
✅ Email sent successfully
```

Monitor active sessions:

```bash
curl http://localhost:8000/
# Returns number of active sessions
```

## 🚀 Deployment

### Deploy to Render.com, Railway, or similar:

1. Push code to GitHub
2. Connect repository
3. Set environment variables
4. Deploy

### WebSocket URL for frontend:

```javascript
const ws = new WebSocket('wss://your-pipecat-backend.onrender.com/ws');
```

## 🎓 Next Steps

1. **Add Authentication**: Validate users before creating sessions
2. **Session Persistence**: Store sessions in Redis for reconnection
3. **Rate Limiting**: Prevent abuse of function calls
4. **Analytics**: Track which functions are called most
5. **Custom Voices**: Add per-user voice preferences
6. **Multi-language**: Support multiple languages with Speechmatics

## 📞 Support

For issues:
- Check logs first (look for 🔧, ✅, ❌ emojis)
- Verify Supabase functions work independently
- Test WebSocket connection separately
- Check all API keys are valid

---

**Ready to Deploy!** 🎉

Your Pipecat backend is now production-ready with full function calling, context persistence, and integration with your Supabase edge functions.
