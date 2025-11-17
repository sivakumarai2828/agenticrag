# Pipecat Backend Changes Summary

## 🔍 Issues Found in Original Code

### ❌ Issue 1: No Function Calling
**Problem:** Backend couldn't query transactions, search documents, or send emails
**Impact:** Julia could only have basic conversations, couldn't access real data

### ❌ Issue 2: No Context Persistence
**Problem:** Each message was treated as a new conversation
**Impact:** Screenshot #3 issue - asking "would you like their contact information" got response about California because previous context was lost

### ❌ Issue 3: Generic System Prompt
**Problem:** Julia didn't know she was a financial assistant
**Impact:** Wouldn't know when to query transactions vs general chat

### ❌ Issue 4: No Integration with Supabase
**Problem:** No connection to your edge functions
**Impact:** Couldn't send emails (Screenshot #2 issue)

---

## ✅ What's Been Added/Changed

### 1. Function/Tool Definitions (NEW)
```python
TRANSACTION_TOOLS = [
    query_transactions,      # Query DB for transactions
    search_documents,        # Search knowledge base
    web_search,             # Fallback to web
    send_email_report,      # Send emails
    generate_transaction_chart  # Generate charts
]
```

### 2. Function Execution Handler (NEW)
```python
async def execute_function(function_name, arguments):
    # Calls your Supabase edge functions
    # Handles all 5 function types
    # Returns results to LLM
```

**Connects to your existing Supabase functions:**
- `transaction-query`
- `rag-retrieval`
- `web-search-tool`
- `transaction-email`
- `transaction-chart`

### 3. FunctionCallProcessor Class (NEW)
```python
class FunctionCallProcessor(FrameProcessor):
    # Intercepts function call requests from LLM
    # Executes them via Supabase
    # Returns results back to pipeline
```

### 4. Session Management (NEW)
```python
conversation_sessions: Dict[str, list] = {}

# Each WebSocket gets unique session ID
session_id = str(uuid.uuid4())

# Maintains conversation history
conversation_sessions[session_id] = [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."},
]
```

**Fixes Screenshot #3 issue** - Context now persists across messages

### 5. Enhanced System Prompt (UPDATED)
```python
# OLD:
"You are Julia, a warm, conversational AI voice assistant. "
"Keep your responses short and natural for real-time speech."

# NEW:
"You are Julia, a helpful AI assistant for a financial transaction intelligence system. "
"You help users with:
- Querying client transactions (use query_transactions)
- Searching documents (use search_documents)
- Web searches (use web_search)
- Sending email reports (use send_email_report)
- Generating charts (use generate_transaction_chart)

IMPORTANT: When users mention a client ID, you MUST call query_transactions first.
Maintain context throughout the conversation - remember what was discussed earlier."
```

### 6. LLM Service Configuration (UPDATED)
```python
# OLD:
llm = OpenAILLMService(
    api_key=os.getenv("OPENAI_API_KEY"),
    params=BaseOpenAILLMService.InputParams(temperature=0.7),
)

# NEW:
llm = OpenAILLMService(
    api_key=os.getenv("OPENAI_API_KEY"),
    params=BaseOpenAILLMService.InputParams(
        temperature=0.7,
        tools=TRANSACTION_TOOLS,  # ← Added tools
        tool_choice="auto"        # ← Let LLM decide when to use
    ),
)
```

### 7. Updated Pipeline (UPDATED)
```python
# OLD:
pipeline = Pipeline([
    transport.input(),
    stt,
    context_aggregator.user(),
    llm,
    tts,
    transport.output(),
    audiobuffer,
    context_aggregator.assistant(),
])

# NEW:
pipeline = Pipeline([
    transport.input(),
    stt,
    context_aggregator.user(),
    llm,
    function_processor,  # ← Added function handler
    tts,
    transport.output(),
    audiobuffer,
    context_aggregator.assistant(),
])
```

### 8. Environment Variables (NEW REQUIRED)
```env
# Added requirements:
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

### 9. Dependencies (ADDED)
```txt
httpx>=0.27.0  # For calling Supabase functions
```

---

## 🎯 How This Fixes Your Screenshots

### Screenshot #1: Chinese/Garbled Text
**Root Cause:** Whisper transcription language detection issue
**Fix:** Speechmatics STT with `Language.EN` should be more reliable
**Additional:** Better error handling logs transcription issues

### Screenshot #2: "I'm unable to send emails"
**Root Cause:** No `send_email_report` function defined
**Fix:** ✅ Added `send_email_report` to tools
**Fix:** ✅ Added handler that calls `transaction-email` edge function
**Fix:** ✅ LLM now knows it CAN send emails

### Screenshot #3: Context Loss (California response)
**Root Cause:** No conversation history maintained
**Fix:** ✅ Session-based conversation storage
**Fix:** ✅ Each session maintains full chat history
**Fix:** ✅ LLM can reference previous messages

---

## 🔄 Migration Steps

### Step 1: Backup Original
```bash
cp main.py main.py.backup
```

### Step 2: Replace with New Code
```bash
cp pipecat-backend-updated.py main.py
```

### Step 3: Install New Dependencies
```bash
pip install httpx
```

### Step 4: Update .env
```bash
# Add these lines:
SUPABASE_URL=your_url_here
SUPABASE_ANON_KEY=your_key_here
```

### Step 5: Test
```bash
uvicorn main:app --reload
```

### Step 6: Verify Function Calls Work
Test that Supabase functions are accessible:
```bash
curl -X POST $SUPABASE_URL/functions/v1/transaction-query \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"clientId": 5001}'
```

---

## 📊 Before vs After Comparison

| Feature | Before ❌ | After ✅ |
|---------|-----------|---------|
| Query Transactions | No | Yes - via Supabase |
| Search Documents | No | Yes - via RAG |
| Web Search | No | Yes - Fallback |
| Send Emails | No | Yes - via edge function |
| Generate Charts | No | Yes - via edge function |
| Context Memory | No | Yes - Session-based |
| Knows about finances | No | Yes - Updated prompt |
| Supabase Integration | No | Yes - Full integration |

---

## 🎓 Testing Scenarios

### Test 1: Transaction Query
```
User: "What transactions does client 5001 have?"
Expected: Julia calls query_transactions, returns real data
```

### Test 2: Email Sending
```
User: "Send those transactions to john@example.com"
Expected: Julia calls send_email_report, email sent
```

### Test 3: Context Retention
```
User: "What about client 5002?"
Julia: [returns 5002 transactions]
User: "Send that report to jane@example.com"
Expected: Julia remembers we're talking about 5002
```

### Test 4: Document Search
```
User: "What's our refund policy?"
Expected: Julia calls search_documents, returns policy from docs
```

### Test 5: Web Fallback
```
User: "What's the weather in San Francisco?"
Expected: Julia calls web_search (not in documents)
```

---

## 🚨 Important Notes

1. **Session Cleanup**: Sessions persist for connection lifetime. Consider adding cleanup logic for old sessions.

2. **Error Handling**: All function calls have try/catch and return graceful errors to users.

3. **Logging**: Look for these emojis in logs:
   - 🔧 Function call started
   - ✅ Success
   - ❌ Error
   - 📧 Email operation
   - 🔌 Connection events

4. **Rate Limiting**: Consider adding rate limits for function calls to prevent abuse.

5. **Authentication**: Current version doesn't authenticate users. Add if needed.

---

## 📞 Quick Reference

### Function Call Flow
```
User speaks → STT → LLM decides to use function →
FunctionCallProcessor → Supabase edge function →
Result back to LLM → LLM generates response →
TTS → User hears answer
```

### Session Lifecycle
```
WebSocket Connect → Create session ID →
Initialize conversation history →
Process messages (maintain context) →
Disconnect → Optional cleanup
```

---

**All changes are backward compatible with your existing Supabase edge functions!** 🎉
