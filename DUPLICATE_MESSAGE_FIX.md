# Duplicate Message Fix

## Problem
When asking for web search results (e.g., "find restaurants in Folsom"), the UI was showing **TWO separate responses**:

1. **First message with "WEB" badge**: The actual search results
2. **Second message with "OPENAI" badge**: OpenAI's summary of the same results

This created a confusing duplicate display.

## Root Cause
The code was doing TWO things:

1. **Setting `pendingMessageRef.current`** - This created the first message with WEB badge
2. **OpenAI generating its own response** - This created the second message with OPENAI badge

Both were being displayed, causing duplicates.

## The Fix

Removed the `pendingMessageRef.current` assignment for web search results:

### Before:
```typescript
// Queue message to display after audio finishes
pendingMessageRef.current = {
  text: `Here's what I found:\n\n${summaryText}`,
  sources: ['WEB'],
};

// Return ONLY the formatted text - no complex object
result = `I found ${searchData.results.length} results. ${directResponse}`;
```

### After:
```typescript
// DON'T set pendingMessageRef - let OpenAI handle the display
// This prevents duplicate messages (one from WEB, one from OPENAI)

// Return ONLY the formatted text - no complex object
result = `I found ${searchData.results.length} results. ${directResponse}`;
```

## How It Works Now

1. User asks: "Can you find restaurants in Folsom?"
2. `web_search` function is called
3. Real Google results are fetched
4. Results are formatted as a simple string
5. String is returned to OpenAI
6. **OpenAI displays ONE message** with the results
7. No duplicate messages!

## What You'll See Now

**Before (Duplicate):**
- Message 1 (WEB badge): "Here's what I found: 1. Restaurant A..."
- Message 2 (OPENAI badge): "Here are some nearby restaurants in Folsom..."

**After (Single):**
- Message 1 (OPENAI badge): "I found 5 results. 1. Restaurant A: Description... 2. Restaurant B: Description..."

## Testing

1. **Refresh your browser**
2. **Enable voice mode**
3. **Ask**: "Can you find some restaurants near Folsom?"
4. **Expected**: You should see **ONLY ONE message** with the OPENAI badge containing all the restaurant results

## Additional Changes

- Removed unused `summaryText` variable (was causing lint warning)
- Cleaned up code comments
- Simplified the web search response flow

## Files Modified

- `src/components/VoiceControls.tsx` - Removed pendingMessageRef for web search
- `DUPLICATE_MESSAGE_FIX.md` - This documentation

## Summary

The fix ensures that web search results are displayed **only once** through OpenAI's response, eliminating the confusing duplicate messages. The user now gets a clean, single response with all the search results.
