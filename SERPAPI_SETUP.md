# SerpApi Setup Instructions

## Add API Key to .env

You need to manually add the SERPAPI_API_KEY to your `.env` file since it's protected by gitignore.

### Steps:

1. Open the `.env` file in your project root:
   ```
   /Users/sivakumarkondapalle/Downloads/Projects/agenticrag/.env
   ```

2. Add the following line to the file:
   ```
   SERPAPI_API_KEY=93e6543281352b5bf985366acc594f46cb69c0da
   ```

3. Save the file

## What's Been Done

✅ Installed `google-search-results` package (SerpApi client)
✅ Added `from serpapi import GoogleSearch` import to `main.py`
✅ Added `SERPAPI_KEY = os.environ.get("SERPAPI_API_KEY")` to load the environment variable
✅ Replaced the mock `logic_web_search()` function with real SerpApi integration

## How It Works

The new web search implementation:
- Uses Google Search via SerpApi
- Returns real search results instead of mock data
- Formats results with title, URL, snippet, and position
- Includes proper error handling
- Returns metadata about the search engine and result count

## Testing

After adding the API key to `.env`, restart your backend server and test with a web search query like:
- "What's the latest news about AI?"
- "Search the web for Python tutorials"
