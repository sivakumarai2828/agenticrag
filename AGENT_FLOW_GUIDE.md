# 🎯 Agent Flow Visualization - Quick Guide

## What's New?

I've added **TWO ways** to see how the Agentic RAG system works behind the scenes:

### ⭐ Option 1: Live Animation (Auto-shows during processing)
**Where**: Appears at the TOP of your chat area, ABOVE all messages

**When**: Automatically shows while your query is being processed (~2.5 seconds)

**What you'll see**:
```
┌─────────────────────────────────────────┐
│ 🔍 Retriever LLM Agent         Running  │
│ Generating embeddings...                │
└─────────────────────────────────────────┘
         ↓ (800ms later)
┌─────────────────────────────────────────┐
│ ✓ Evaluator LLM Agent         Complete  │
│ Retrieved 8 documents, 87% similarity   │
└─────────────────────────────────────────┘
         ↓ (600ms later)
┌─────────────────────────────────────────┐
│ 🤖 AI Agent                    Running  │
│ Synthesizing answer...                  │
└─────────────────────────────────────────┘
         ↓ (900ms later)
┌─────────────────────────────────────────┐
│ 💾 Context Response           Complete  │
│ Stored to memory                        │
└─────────────────────────────────────────┘
```

**Duration**: Shows for ~10 seconds total, then fades away

---

### ⭐ Option 2: "View Agent Flow" Link (Click to expand)
**Where**: At the BOTTOM of every assistant response message

**Look for**: A clickable link that says:
```
🔀 View Agent Flow | Tokens: 247 | Latency: 2147ms
```

**When clicked**: Expands to show the complete agent execution trace with:
- All 4 agent steps (Retriever → Evaluator → AI Agent → Context Storage)
- Color-coded cards for each agent
- Timing breakdown for each step
- Data passed between agents (document counts, relevance scores, etc.)
- Visual progress bars

**Benefits**:
- ✅ View the flow anytime, even after the conversation
- ✅ Perfect for understanding how a specific response was generated
- ✅ Great for debugging or learning about the system
- ✅ Click again to hide

---

## 🎬 How to Test It

### Quick Test (1 minute):

1. **Open the Chat interface**
2. **Type**: "I need to know about Care Credit"
3. **Press Send**
4. **Watch ABOVE the messages** - you'll see 4 agent steps animate in sequence
5. **After the response appears**, scroll to the bottom of the assistant's message
6. **Click "View Agent Flow"** - the same flow expands with full details
7. **Click again to hide it**

---

## 📊 What Each Agent Does

| Agent | Purpose | Typical Time |
|-------|---------|--------------|
| 🔍 **Retriever** | Searches vector database for relevant documents | 800ms |
| ✓ **Evaluator** | Checks if results are relevant enough | 600ms |
| 🤖 **AI Agent** | Generates the final response from context | 900ms |
| 💾 **Context** | Stores conversation in memory | 50ms |

---

## 🎨 Visual Design

Each agent card has:
- **Unique color** (blue for retrieval, amber for evaluation, green for generation)
- **Status icon** (⏱️ running, ✓ completed, ❌ error)
- **Action description** (what the agent is doing)
- **Details** (results, scores, counts)
- **Timing bar** (visual indicator of time taken)

---

## 💡 Pro Tips

1. **For demos**: The live animation is perfect for showing how agentic RAG works
2. **For debugging**: Use the "View Agent Flow" link to see exact timing and data
3. **For learning**: Watch both - the animation shows the flow, the link shows the details
4. **Mobile friendly**: Works on all screen sizes

---

## 🔧 Technical Details

The visualization:
- Shows real agent execution from the `agentic-rag` Edge Function
- Updates in real-time as each step completes
- Stores timing and metadata for each agent
- Works with both Chat and Enhanced Chat interfaces
- Integrates with the existing RAG pipeline

---

## ❓ Troubleshooting

**Q: I don't see the animation**
- A: Make sure you're looking ABOVE the message area, not inside it
- A: The animation only shows for ~2.5 seconds during processing

**Q: The "View Agent Flow" link isn't there**
- A: It only appears on assistant messages (not your messages)
- A: Scroll all the way to the bottom of the assistant's response

**Q: The flow is too fast**
- A: Click "View Agent Flow" to see it at your own pace
- A: The link keeps the visualization available indefinitely

**Q: Can I see flows from old messages?**
- A: Yes! Every assistant message has a "View Agent Flow" link
