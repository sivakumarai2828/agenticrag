import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WebSearchRequest {
  query: string;
  maxResults?: number;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  relevance: number;
}

async function simulateWebSearch(query: string, maxResults: number): Promise<SearchResult[]> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const mockResults: SearchResult[] = [
    {
      title: "Understanding Modern Web Architecture",
      url: "https://example.com/web-architecture",
      snippet: "A comprehensive guide to building scalable web applications using microservices and cloud-native patterns...",
      relevance: 0.92,
    },
    {
      title: "Best Practices for API Design",
      url: "https://example.com/api-design",
      snippet: "Learn how to design RESTful APIs that are intuitive, scalable, and secure. Covers versioning, authentication...",
      relevance: 0.88,
    },
    {
      title: "Database Optimization Techniques",
      url: "https://example.com/db-optimization",
      snippet: "Improve your database performance with indexing strategies, query optimization, and caching mechanisms...",
      relevance: 0.85,
    },
  ];

  return mockResults.slice(0, maxResults);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { query, maxResults = 5 }: WebSearchRequest = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Web Search Tool: "${query}"`);

    const results = await simulateWebSearch(query, maxResults);

    return new Response(
      JSON.stringify({
        query,
        results,
        metadata: {
          resultsCount: results.length,
          timestamp: Date.now(),
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: "Failed to perform web search",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
