# Testing Agentic RAG Visual Flow

## ⭐ TWO WAYS TO VIEW AGENT FLOW

### 1. 🎬 Live Animation (During Processing)
**Location**: Appears ABOVE your chat messages while processing

When you send a message, watch for the real-time agent flow animation:
- 🔍 **Retriever LLM Agent** (800ms) - searching documents
- ✓ **Evaluator LLM Agent** (600ms) - checking relevance
- 🤖 **AI Agent** (900ms) - generating response
- 💾 **Context Response** (50ms) - saving to memory

**Duration**: Visible for ~2.5 seconds during processing, then stays 8 more seconds

### 2. 📊 View Agent Flow Link (On-Demand) ⭐ NEW!
**Location**: Bottom of every assistant message

After receiving a response:
1. Scroll to the bottom of the assistant's message
2. Click **"View Agent Flow"** (next to token/latency stats)
3. See the complete agent execution trace with:
   - All agent steps that were executed
   - Precise timing for each step (ms)
   - Data passed between agents
   - Relevance scores and document counts
   - Visual progress indicators

## How to Test

### In Chat Mode:
1. Navigate to the **Chat** tab
2. Type: **"I need to know about Care Credit"**
3. Press **Send**
4. **DURING PROCESSING**: Watch ABOVE the messages for live animation
5. **AFTER RESPONSE**: Click **"View Agent Flow"** at bottom of message
6. The complete flow diagram expands showing all 4 steps

### In Enhanced Chat Mode:
Same as above, PLUS you can use Voice Mode if enabled

## What You'll See

```
┌─────────────────────────────────────────────────────┐
│ 🔍 Retriever LLM Agent                      234ms   │
│ Retrieved 8 documents                               │
│ [Progress bar showing time]                         │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ ✓ Evaluator LLM Agent                       189ms   │
│ Relevance: 94%                                      │
│ [Progress bar showing time]                         │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 🤖 AI Agent                                  1222ms  │
│ Generated 247 words                                 │
│ [Progress bar showing time]                         │
└─────────────────────────────────────────────────────┘
```

## Features
- **Real-time updates**: Each step appears as it completes
- **Color-coded agents**: Different background colors for each agent type
- **Timing info**: Shows milliseconds for each operation
- **Status icons**: ✓ for completed, ⏱️ for running, ❌ for errors
- **Auto-dismiss**: Flow fades away 8 seconds after completion
- **Works in both**: Regular chat and voice modes

## Architecture
The visualization connects to the `agentic-rag` Edge Function which:
1. Generates embeddings for the query
2. Searches vector database
3. Evaluates relevance of results
4. Refines query if needed (up to 3 iterations)
5. Generates final response with citations
6. Stores context in memory

## Troubleshooting
If you don't see the flow:
1. Make sure you've sent a message
2. Check that documents are uploaded to the vector database
3. The flow appears **above** the message list, not below
4. It only shows while processing (1-3 seconds typically)
