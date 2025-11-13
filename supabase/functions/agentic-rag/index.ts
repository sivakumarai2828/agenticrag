import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AgenticRAGRequest {
  query: string;
  conversationId?: string;
  userId?: string;
  maxIterations?: number;
  relevanceThreshold?: number;
}

interface AgentStep {
  agent: string;
  action: string;
  status: "running" | "completed" | "error";
  startTime: number;
  endTime?: number;
  details?: string;
  data?: any;
}

interface RetrievalResult {
  content: string;
  title: string;
  similarity: number;
  source: string;
}

interface EvaluationResult {
  isRelevant: boolean;
  needsMoreInfo: boolean;
  relevanceScore: number;
  reasoning: string;
  suggestedRefinement?: string;
}

async function generateEmbedding(text: string, openaiApiKey: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-ada-002",
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate embedding");
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function retrieveDocuments(
  queryEmbedding: number[],
  supabase: any,
  matchThreshold: number,
  matchCount: number
): Promise<RetrievalResult[]> {
  const { data: documents, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    throw new Error("Vector search failed");
  }

  return (documents || []).map((doc: any) => ({
    content: doc.content,
    title: doc.title,
    similarity: doc.similarity,
    source: doc.metadata?.source || "unknown",
  }));
}

async function evaluateRelevance(
  query: string,
  retrievedDocs: RetrievalResult[],
  openaiApiKey: string
): Promise<EvaluationResult> {
  const docsContext = retrievedDocs
    .map((doc, i) => `[${i + 1}] ${doc.title} (similarity: ${doc.similarity.toFixed(2)})\n${doc.content.substring(0, 300)}...`)
    .join("\n\n");

  const evaluationPrompt = `You are an evaluation agent. Assess if the retrieved documents can answer the user's query.

Query: "${query}"

Retrieved Documents:
${docsContext}

Evaluate:
1. Are these documents relevant to the query?
2. Do they contain enough information to answer completely?
3. What is the relevance score (0-1)?

Respond in JSON format:
{
  "isRelevant": boolean,
  "needsMoreInfo": boolean,
  "relevanceScore": number,
  "reasoning": "brief explanation",
  "suggestedRefinement": "optional suggestion to improve query"
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
          content: "You are a precise evaluation agent. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: evaluationPrompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error("Evaluation failed");
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function refineQuery(
  originalQuery: string,
  evaluationResult: EvaluationResult,
  openaiApiKey: string
): Promise<string> {
  const refinementPrompt = `Original query: "${originalQuery}"

Evaluation feedback: ${evaluationResult.reasoning}
Suggested refinement: ${evaluationResult.suggestedRefinement || "none"}

Generate an improved, more specific query that will retrieve better results. Keep it concise and focused.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
          content: "You are a query refinement specialist. Output only the refined query.",
        },
        {
          role: "user",
          content: refinementPrompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 100,
    }),
  });

  if (!response.ok) {
    throw new Error("Query refinement failed");
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function generateResponse(
  query: string,
  retrievedDocs: RetrievalResult[],
  openaiApiKey: string
): Promise<string> {
  const context = retrievedDocs
    .map((doc, i) => `[${i + 1}] ${doc.title}\n${doc.content}`)
    .join("\n\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
            "You are a helpful AI assistant. Answer based on the provided context. Cite sources using [1], [2], etc.",
        },
        {
          role: "user",
          content: `Context:\n${context}\n\nQuestion: ${query}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    throw new Error("Response generation failed");
  }

  const data = await response.json();
  return data.choices[0].message.content;
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!openaiApiKey || !supabaseUrl || !supabaseKey) {
      throw new Error("Required environment variables not configured");
    }

    const {
      query,
      conversationId,
      userId,
      maxIterations = 3,
      relevanceThreshold = 0.7,
    }: AgenticRAGRequest = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Agentic RAG: "${query}"`);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const steps: AgentStep[] = [];
    let currentQuery = query;
    let retrievedDocs: RetrievalResult[] = [];
    let finalResponse = "";
    let iteration = 0;

    const storeContext = async (context: any) => {
      if (conversationId && userId) {
        await supabase.from("context_memory").insert({
          conversation_id: conversationId,
          user_id: userId,
          context_type: "retrieval_iteration",
          context_data: context,
        });
      }
    };

    while (iteration < maxIterations) {
      iteration++;
      console.log(`Iteration ${iteration}: "${currentQuery}"`);

      const retrieverStart = Date.now();
      steps.push({
        agent: "Retriever LLM Agent",
        action: `Retrieving documents (iteration ${iteration})`,
        status: "running",
        startTime: retrieverStart,
      });

      const queryEmbedding = await generateEmbedding(currentQuery, openaiApiKey);
      retrievedDocs = await retrieveDocuments(queryEmbedding, supabase, 0.5, 8);

      steps[steps.length - 1].status = "completed";
      steps[steps.length - 1].endTime = Date.now();
      steps[steps.length - 1].details = `Retrieved ${retrievedDocs.length} documents`;
      steps[steps.length - 1].data = {
        query: currentQuery,
        resultsCount: retrievedDocs.length,
        avgSimilarity: retrievedDocs.reduce((acc, doc) => acc + doc.similarity, 0) / retrievedDocs.length,
      };

      if (retrievedDocs.length === 0) {
        steps.push({
          agent: "Context Response",
          action: "No documents found",
          status: "completed",
          startTime: Date.now(),
          endTime: Date.now(),
          details: "Unable to find relevant documents",
        });
        finalResponse = "I apologize, but I couldn't find relevant information to answer your question.";
        break;
      }

      const evaluatorStart = Date.now();
      steps.push({
        agent: "Evaluator LLM Agent",
        action: "Evaluating retrieval relevance",
        status: "running",
        startTime: evaluatorStart,
      });

      const evaluation = await evaluateRelevance(currentQuery, retrievedDocs, openaiApiKey);

      steps[steps.length - 1].status = "completed";
      steps[steps.length - 1].endTime = Date.now();
      steps[steps.length - 1].details = evaluation.reasoning;
      steps[steps.length - 1].data = {
        isRelevant: evaluation.isRelevant,
        needsMoreInfo: evaluation.needsMoreInfo,
        relevanceScore: evaluation.relevanceScore,
      };

      await storeContext({
        iteration,
        query: currentQuery,
        evaluation,
        retrievedCount: retrievedDocs.length,
      });

      if (evaluation.isRelevant && !evaluation.needsMoreInfo) {
        console.log("Evaluation passed - generating response");

        const responseStart = Date.now();
        steps.push({
          agent: "AI Agent",
          action: "Generating final response",
          status: "running",
          startTime: responseStart,
        });

        finalResponse = await generateResponse(currentQuery, retrievedDocs, openaiApiKey);

        steps[steps.length - 1].status = "completed";
        steps[steps.length - 1].endTime = Date.now();
        steps[steps.length - 1].details = `Generated ${finalResponse.split(" ").length} words`;

        steps.push({
          agent: "Store Context",
          action: "Storing conversation context",
          status: "completed",
          startTime: Date.now(),
          endTime: Date.now(),
          details: "Context saved to memory",
        });

        break;
      } else if (evaluation.needsMoreInfo && iteration < maxIterations) {
        console.log("Evaluation indicates need for refinement");

        const refinementStart = Date.now();
        steps.push({
          agent: "Updated Query",
          action: "Refining query for better results",
          status: "running",
          startTime: refinementStart,
        });

        currentQuery = await refineQuery(currentQuery, evaluation, openaiApiKey);

        steps[steps.length - 1].status = "completed";
        steps[steps.length - 1].endTime = Date.now();
        steps[steps.length - 1].details = `Refined query: "${currentQuery}"`;
        steps[steps.length - 1].data = { refinedQuery: currentQuery };
      } else {
        console.log("Generating response despite low relevance");
        finalResponse = await generateResponse(currentQuery, retrievedDocs, openaiApiKey);
        break;
      }
    }

    if (!finalResponse) {
      finalResponse = await generateResponse(currentQuery, retrievedDocs, openaiApiKey);
    }

    const totalLatency = steps[steps.length - 1].endTime! - steps[0].startTime;

    return new Response(
      JSON.stringify({
        content: finalResponse,
        citations: retrievedDocs,
        agentSteps: steps,
        iterations: iteration,
        finalQuery: currentQuery,
        metadata: {
          totalLatency,
          conversationId,
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
        details: "Failed to process agentic RAG",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
