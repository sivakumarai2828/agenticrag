# 🔄 Pipecat Backend - Code Comparison

## Side-by-Side Changes

### 1️⃣ Imports

#### ❌ BEFORE
```python
from pipecat.frames.frames import EndFrame, LLMRunFrame
```

#### ✅ AFTER
```python
import httpx
import uuid
from typing import Dict

from pipecat.frames.frames import (
    EndFrame,
    LLMRunFrame,
    FunctionCallInProgressFrame,  # NEW
    FunctionCallResultFrame        # NEW
)
from pipecat.processors.frame_processor import FrameProcessor  # NEW
```

---

### 2️⃣ Global Variables

#### ❌ BEFORE
```python
# None - no session management
```

#### ✅ AFTER
```python
# Session Management
conversation_sessions: Dict[str, list] = {}

# Function/Tool Definitions
TRANSACTION_TOOLS = [
    {
        "type": "function",
        "name": "query_transactions",
        # ... 5 tools total
    }
]
```

---

### 3️⃣ System Prompt

#### ❌ BEFORE
```python
messages = [
    {
        "role": "system",
        "content": (
            "You are Julia, a warm, conversational AI voice assistant. "
            "Keep your responses short and natural for real-time speech."
        ),
    }
]
```

#### ✅ AFTER
```python
if session_id not in conversation_sessions:
    conversation_sessions[session_id] = [
        {
            "role": "system",
            "content": (
                "You are Julia, a helpful AI assistant for a financial transaction intelligence system. "
                "You help users with:\n"
                "- Querying client transactions (use query_transactions when users mention client IDs)\n"
                "- Searching documents in the knowledge base (use search_documents)\n"
                "- Web searches for general information (use web_search)\n"
                "- Sending email reports (use send_email_report)\n"
                "- Generating transaction charts (use generate_transaction_chart)\n\n"
                "IMPORTANT: When users mention a client ID or ask about transactions, "
                "you MUST call the query_transactions function first. "
                "Always explain what you found in simple, conversational terms. "
                "Keep responses concise and natural for voice interaction. "
                "Maintain context throughout the conversation - remember what was discussed earlier."
            ),
        }
    ]

messages = conversation_sessions[session_id]
```

---

### 4️⃣ LLM Configuration

#### ❌ BEFORE
```python
llm = OpenAILLMService(
    api_key=os.getenv("OPENAI_API_KEY"),
    params=BaseOpenAILLMService.InputParams(temperature=0.7),
)
```

#### ✅ AFTER
```python
llm = OpenAILLMService(
    api_key=os.getenv("OPENAI_API_KEY"),
    params=BaseOpenAILLMService.InputParams(
        temperature=0.7,
        tools=TRANSACTION_TOOLS,  # ← Added
        tool_choice="auto"        # ← Added
    ),
)
```

---

### 5️⃣ Pipeline

#### ❌ BEFORE
```python
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
```

#### ✅ AFTER
```python
# Create function processor
function_processor = FunctionCallProcessor()

pipeline = Pipeline([
    transport.input(),
    stt,
    context_aggregator.user(),
    llm,
    function_processor,  # ← Added
    tts,
    transport.output(),
    audiobuffer,
    context_aggregator.assistant(),
])
```

---

### 6️⃣ WebSocket Endpoint

#### ❌ BEFORE
```python
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("🔌 WebSocket client connected")

    params = FastAPIWebsocketParams(...)
    transport = FastAPIWebsocketTransport(websocket, params)

    try:
        await run_pipeline(transport, handle_sigint=False)
    except WebSocketDisconnect:
        logger.info("🔌 WebSocket client disconnected")
```

#### ✅ AFTER
```python
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    # Create unique session ID
    session_id = str(uuid.uuid4())
    logger.info(f"🔌 WebSocket client connected - Session: {session_id}")

    params = FastAPIWebsocketParams(...)
    transport = FastAPIWebsocketTransport(websocket, params)

    try:
        await run_pipeline(transport, session_id, handle_sigint=False)  # ← Pass session_id
    except WebSocketDisconnect:
        logger.info(f"🔌 WebSocket client disconnected - Session: {session_id}")
    finally:
        logger.info(f"🧹 Cleaning up session: {session_id}")
```

---

### 7️⃣ Function Signature

#### ❌ BEFORE
```python
async def run_pipeline(transport, handle_sigint: bool = False):
```

#### ✅ AFTER
```python
async def run_pipeline(transport, session_id: str, handle_sigint: bool = False):
```

---

## 🆕 Completely New Functions

### ✅ execute_function()
```python
async def execute_function(function_name: str, arguments: dict):
    """Execute function calls against Supabase edge functions"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")

    # Validates credentials
    # Makes HTTP calls to Supabase edge functions
    # Returns structured results
    # Handles errors gracefully

    # Supports 5 functions:
    # - query_transactions
    # - search_documents
    # - web_search
    # - send_email_report
    # - generate_transaction_chart
```

### ✅ FunctionCallProcessor Class
```python
class FunctionCallProcessor(FrameProcessor):
    """Handles function call execution and returns results to LLM"""

    async def process_frame(self, frame, direction):
        # Detects FunctionCallInProgressFrame
        # Calls execute_function()
        # Creates FunctionCallResultFrame
        # Pushes result back to pipeline
```

---

## 🔧 Environment Variables

#### ❌ BEFORE
```env
OPENAI_API_KEY=...
SPEECHMATICS_API_KEY=...
CARTESIA_API_KEY=...
VOICE_ID=...
```

#### ✅ AFTER
```env
OPENAI_API_KEY=...
SPEECHMATICS_API_KEY=...
CARTESIA_API_KEY=...
VOICE_ID=...

# NEW - Required for Supabase integration:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

---

## 📦 Dependencies

#### ❌ BEFORE
```txt
pipecat-ai>=0.0.30
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
websockets>=12.0
python-dotenv>=1.0.0
loguru>=0.7.2
openai>=1.12.0
speechmatics-python>=1.9.0
cartesia>=0.1.0
numpy>=1.24.0
sounddevice>=0.4.6
protobuf>=4.25.0
```

#### ✅ AFTER
```txt
# All previous dependencies PLUS:
httpx>=0.27.0  # ← NEW - For calling Supabase functions
```

---

## 🎯 Behavioral Changes

### Conversation Flow

#### ❌ BEFORE
```
User: "What about client 5001?"
Julia: [Responds but can't query database]

User: "Send that to john@example.com"
Julia: [Has no context, no email capability]
```

#### ✅ AFTER
```
User: "What about client 5001?"
Julia: [Calls query_transactions(5001)]
Julia: "Client 5001 has 5 transactions totaling $1,250..."
[Stores in conversation_sessions[session_id]]

User: "Send that to john@example.com"
Julia: [Remembers client 5001 from context]
Julia: [Calls send_email_report(to="john@example.com", clientId=5001)]
Julia: "I've sent the report for client 5001 to john@example.com"
```

---

## 📊 Feature Matrix

| Feature | Before | After | Code Change |
|---------|--------|-------|-------------|
| Transaction Queries | ❌ | ✅ | Added `query_transactions` tool + handler |
| Document Search | ❌ | ✅ | Added `search_documents` tool + handler |
| Web Search | ❌ | ✅ | Added `web_search` tool + handler |
| Email Reports | ❌ | ✅ | Added `send_email_report` tool + handler |
| Chart Generation | ❌ | ✅ | Added `generate_transaction_chart` tool + handler |
| Context Memory | ❌ | ✅ | Added `conversation_sessions` dict |
| Session Management | ❌ | ✅ | Added UUID session IDs |
| Function Calling | ❌ | ✅ | Added `FunctionCallProcessor` class |

---

## 🔍 Line Count Comparison

| Metric | Before | After | Difference |
|--------|--------|-------|------------|
| Total Lines | ~150 | ~467 | +317 lines |
| Functions | 2 | 4 | +2 functions |
| Classes | 0 | 1 | +1 class |
| Tools Defined | 0 | 5 | +5 tools |
| API Integrations | 0 | 5 | +5 endpoints |

---

## 🎓 Key Takeaways

### What Stayed the Same
✅ Core Pipecat pipeline structure
✅ FastAPI server setup
✅ TTS (Cartesia) and STT (Speechmatics) services
✅ Audio processing and VAD
✅ WebSocket transport layer

### What Changed
🔧 Added function calling capability
🔧 Added Supabase integration
🔧 Added session management
🔧 Enhanced system prompt
🔧 Added conversation context
🔧 Added error handling

### What's New
🆕 5 integrated tools/functions
🆕 `execute_function()` for API calls
🆕 `FunctionCallProcessor` class
🆕 Session-based conversation storage
🆕 Connection to existing Supabase edge functions

---

## 💡 Migration Path

### Step 1: Backup
```bash
cp main.py main.py.backup
```

### Step 2: Install New Dependencies
```bash
pip install httpx
```

### Step 3: Update .env
```bash
echo "SUPABASE_URL=https://your-project.supabase.co" >> .env
echo "SUPABASE_ANON_KEY=your_key" >> .env
```

### Step 4: Replace Code
```bash
cp pipecat-backend-updated.py main.py
```

### Step 5: Test
```bash
uvicorn main:app --reload
```

### Step 6: Verify
```bash
# Test health endpoint
curl http://localhost:8000/health

# Should return:
# {"status": "ok", "active_sessions": 0}
```

---

## ✅ Testing Checklist

After migration, test these scenarios:

- [ ] WebSocket connects successfully
- [ ] Health endpoint returns 200
- [ ] Transaction query: "What transactions does client 5001 have?"
- [ ] Email sending: "Send that to john@example.com"
- [ ] Context retention: Ask follow-up questions
- [ ] Document search: "What's our refund policy?"
- [ ] Web search: "What's the weather?"
- [ ] Chart generation: "Generate a chart for client 5001"
- [ ] Error handling: Try invalid client ID
- [ ] Session cleanup: Disconnect and reconnect

---

**All changes maintain backward compatibility with your existing Supabase edge functions!** ✨
