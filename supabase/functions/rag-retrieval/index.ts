import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RAGRequest {
  query: string;
  matchThreshold?: number;
  matchCount?: number;
  enhanceWithContext?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const {
      query,
      matchThreshold = 0.7,
      matchCount = 5,
      enhanceWithContext = true,
    }: RAGRequest = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`RAG Retrieval: "${query}"`);

    const embeddingResponse = await fetch(
      "https://api.openai.com/v1/embeddings",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "text-embedding-ada-002",
          input: query,
        }),
      }
    );

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.json();
      console.error("OpenAI embedding error:", error);
      throw new Error("Failed to generate embedding");
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    console.log(`Generated embedding: ${queryEmbedding.length} dimensions`);

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: documents, error: searchError } = await supabase.rpc(
      "match_documents",
      {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
      }
    );

    if (searchError) {
      console.error("Vector search error:", searchError);
      throw new Error("Failed to search documents");
    }

    console.log(`Found ${documents?.length || 0} matching documents`);

    let enhancedResponse = null;

    if (enhanceWithContext && documents && documents.length > 0) {
      const context = documents
        .map((doc: any, i: number) => `[${i + 1}] ${doc.title}\n${doc.content}`)
        .join("\n\n");

      const chatResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant. Answer the user's question based on the provided context. If the context doesn't contain enough information, say so.",
              },
              {
                role: "user",
                content: `Context:\n${context}\n\nQuestion: ${query}`,
              },
            ],
            temperature: 0.7,
            max_tokens: 500,
          }),
        }
      );

      if (chatResponse.ok) {
        const chatData = await chatResponse.json();
        enhancedResponse = chatData.choices[0].message.content;
      }
    }

    return new Response(
      JSON.stringify({
        query,
        documents: documents || [],
        enhancedResponse,
        metadata: {
          matchThreshold,
          matchCount,
          resultsFound: documents?.length || 0,
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
        details: "Failed to process RAG retrieval",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});