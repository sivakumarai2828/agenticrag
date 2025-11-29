# Line Chart Display Fix for Voice Agent

## Issue
Line charts were not displaying when requested through the voice agent.

## Root Cause
The issue was in the `handleVoiceAssistantMessage` function in `SimpleApp.tsx`. When chart data was received from the voice agent, the intent was being set to `'chart'` instead of `'transaction_chart'`, which caused rendering issues.

Additionally, the email intent was set to `'email'` instead of `'transaction_email'`.

## Changes Made

### 1. Fixed Intent Classification (SimpleApp.tsx)
**Lines 220-254**: Updated `handleVoiceAssistantMessage` function

**Before:**
```typescript
if (chartData) {
  intent = 'chart';  // ❌ Wrong intent type
}

if (sources?.includes('EMAIL')) {
  intent = 'email';  // ❌ Wrong intent type
}
```

**After:**
```typescript
if (chartData) {
  intent = 'transaction_chart';  // ✅ Correct intent type
}

if (sources?.includes('EMAIL')) {
  intent = 'transaction_email';  // ✅ Correct intent type
}
```

### 2. Added TypeScript Type Safety
- Added `IntentType` import from `./router/intentRouter`
- Added proper typing: `let intent: IntentType | undefined;`
- Changed default intent from `'general'` to `'doc_rag'` (valid IntentType)
- Added type casting for `response.intent as IntentType` in multiple places

## How It Works Now

1. **Voice Request**: User asks for a line chart via voice (e.g., "show me a line chart for client 501")

2. **OpenAI Function Call**: VoiceControls component calls `generate_transaction_chart` function with `chartType: 'line'`

3. **Chart Generation**: Backend generates chart data with line chart configuration

4. **Data Flow**: 
   - Chart data is stored in `pendingMessageRef.current` in VoiceControls
   - After audio completes, `onAssistantMessage` callback is triggered
   - `handleVoiceAssistantMessage` receives the chart data

5. **Intent Classification**: Now correctly sets `intent = 'transaction_chart'`

6. **Rendering**: 
   - Message is added to chat with correct intent
   - ChatThread passes message to AnswerCard
   - AnswerCard renders ChartView component
   - ChartView draws the line chart on canvas (lines 114-141 in ChartView.tsx)

## Testing
To test the fix:
1. Enable voice mode
2. Say: "show me a line chart for client 501"
3. The line chart should now display correctly in the chat

## Files Modified
- `/src/SimpleApp.tsx`: Fixed intent classification and added type safety

## Related Components
- `VoiceControls.tsx`: Handles voice interaction and function calls
- `ChartView.tsx`: Renders charts (supports bar, line, and pie charts)
- `intentRouter.ts`: Defines valid IntentType values
