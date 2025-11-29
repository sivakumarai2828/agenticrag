# Web Search Voice Assistant Fix

## Issue
The voice assistant was unable to perform web searches when users asked questions like "Can you find the best restaurants in Sacramento?" The AI would respond saying it doesn't have access to a web search tool.

## Root Cause
The VoiceControls component was missing the `web_search` function in its OpenAI Realtime API tool configuration. While the backend had web search capabilities using the Serper API, the voice assistant wasn't configured to use it.

## Changes Made

### 1. Added Web Search Tool to Voice Assistant (`src/components/VoiceControls.tsx`)

**Added to the tools array in `sendSessionUpdate()`:**
```typescript
{
  type: 'function',
  name: 'web_search',
  description: 'Search the web for current information, news, weather, restaurants, or any real-time data. Use this when users ask about things outside of the transaction database, like weather, news, restaurants, or general web queries.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to look up on the web',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of search results to return (default: 5)',
        default: 5,
      },
    },
    required: ['query'],
  },
}
```

### 2. Added Web Search Handler (`src/components/VoiceControls.tsx`)

**Added to `handleFunctionCall()`:**
```typescript
else if (name === 'web_search') {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/web-search-tool`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: args.query,
        maxResults: args.maxResults || 5,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Web search failed:', response.status, errorText);
    result = {
      success: false,
      error: `Failed to search the web: ${response.status}`,
      voiceSummary: 'Sorry, I encountered an error searching the web.',
    };
  } else {
    result = await response.json();

    if (result.results && result.results.length > 0) {
      // Format the search results into a readable summary
      const topResults = result.results.slice(0, 3);
      const summaryText = topResults.map((r: any, i: number) => 
        `${i + 1}. ${r.title}: ${r.snippet}`
      ).join('\n\n');

      // Queue message to display after audio finishes
      pendingMessageRef.current = {
        text: `Here's what I found:\n\n${summaryText}`,
        sources: ['WEB'],
      };

      result.voiceSummary = `I found ${result.results.length} results. ${topResults[0].snippet}`;
    } else {
      result.voiceSummary = 'I couldn\'t find any results for that search.';
    }
  }
}
```

### 3. Updated Supabase Edge Function (`supabase/functions/web-search-tool/index.ts`)

**Changed from mock data to proxy to Python backend:**
- Removed mock search results
- Now proxies requests to the Python backend at `http://localhost:8000/web-search-tool`
- The Python backend uses the Serper API for real Google search results

## How It Works Now

1. User asks via voice: "Can you find the best restaurants in Sacramento?"
2. OpenAI Realtime API recognizes this as a web search query
3. Calls the `web_search` function with the query
4. VoiceControls sends request to Supabase Edge Function
5. Edge Function proxies to Python backend
6. Python backend uses Serper API to get real Google search results
7. Results are formatted and returned to the user
8. Voice assistant speaks the results and displays them in the UI

## Testing

To test the fix:
1. Enable voice mode in the app
2. Ask: "Can you find the best restaurants in Sacramento?"
3. The assistant should now search the web and provide real results

## Environment Variables Required

Make sure these are set in your `.env`:
- `SERPER_API_KEY` - For the Python backend to access Serper API
- `OPENAI_API_KEY` - For OpenAI Realtime API

## Notes

- The Deno lint errors in the Edge Function are expected (Deno is available at runtime)
- For production deployment, update the `backendUrl` in the Edge Function to use the production backend URL
- The `onToggle` warning in VoiceControls.tsx is harmless (it's a prop passed but not used internally)
