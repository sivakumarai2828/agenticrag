import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AgentRequest {
  query: string;
  conversationId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface TraceStep {
  name: string;
  latency: number;
  timestamp: number;
}

type Intent =
  | "doc_rag"
  | "sql"
  | "report"
  | "chart"
  | "api_status"
  | "web"
  | "transaction_query"
  | "transaction_chart"
  | "transaction_email"
  | "general";

function classifyIntent(query: string): Intent {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.match(/\b(email|send|mail)\b/) && (lowerQuery.match(/\b(report|transaction|above)\b/) || lowerQuery.includes('@'))) {
    return "transaction_email";
  }

  if (lowerQuery.match(/\b(transaction|client|purchase|refund|payment)\b/)) {
    if (lowerQuery.match(/\b(chart|plot|graph|visualize|trend)\b/)) {
      return "transaction_chart";
    }
    return "transaction_query";
  }

  if (lowerQuery.match(/\b(chart|plot|graph|visualize|trend)\b/)) {
    return "chart";
  }

  if (
    lowerQuery.match(
      /\b(how|what|why|explain|documentation|docs|guide|tutorial)\b/
    )
  ) {
    return "doc_rag";
  }

  if (
    lowerQuery.match(
      /\b(select|query|show|get|retrieve|find|search|top|merchants|revenue|transactions)\b/
    )
  ) {
    return "sql";
  }

  if (lowerQuery.match(/\b(report|summary|analysis|breakdown)\b/)) {
    return "report";
  }

  if (lowerQuery.match(/\b(status|health|uptime|api|service)\b/)) {
    return "api_status";
  }

  if (
    lowerQuery.match(
      /\b(search web|google|latest|news|current events|external)\b/
    )
  ) {
    return "web";
  }

  return "general";
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

    const { query, conversationId, userId, metadata }: AgentRequest =
      await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Agent Orchestrator: "${query}"`);

    const steps: TraceStep[] = [];
    const startTime = Date.now();

    steps.push({
      name: "Intent Classification",
      latency: 50,
      timestamp: Date.now(),
    });

    const intent = classifyIntent(query);
    console.log(`Detected intent: ${intent}`);

    let response: any = {
      content: "",
      intent,
      sources: [],
      citations: [],
      metadata: {},
    };

    switch (intent) {
      case "transaction_email": {
        steps.push({ name: "Email Report", latency: 0, timestamp: Date.now() });
        const emailStart = Date.now();

        const emailMatch = query.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/);
        const clientMatch = query.match(/client\s*(\d+)/i) || query.match(/(\d{4})/);

        const emailTo = emailMatch ? emailMatch[0] : metadata?.email || "user@example.com";
        const clientId = clientMatch ? parseInt(clientMatch[1]) : metadata?.lastClientId;

        const queryResponse = await fetch(
          `${supabaseUrl}/functions/v1/transaction-query`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ clientId }),
          }
        );

        if (queryResponse.ok) {
          const queryData = await queryResponse.json();

          const emailResponse = await fetch(
            `${supabaseUrl}/functions/v1/transaction-email`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                to: emailTo,
                subject: "Transaction Intelligence Report",
                transactionSummary: queryData.summary,
              }),
            }
          );

          if (emailResponse.ok) {
            const emailData = await emailResponse.json();
            response.content = emailData.voiceSummary || `Transaction report sent to ${emailTo}`;
            response.tableData = queryData.summary;
            response.sources = ["DB", "EMAIL"];
            steps[steps.length - 1].latency = Date.now() - emailStart;
          } else {
            response.content = `I found the transaction data but couldn't send the email. Please make sure RESEND_API_KEY is configured.`;
            response.tableData = queryData.summary;
            response.sources = ["DB"];
            steps[steps.length - 1].latency = Date.now() - emailStart;
          }
        }
        break;
      }

      case "transaction_query": {
        steps.push({ name: "Transaction Query", latency: 0, timestamp: Date.now() });
        const queryStart = Date.now();

        const clientMatch = query.match(/client\s*(\d+)/i) || query.match(/(\d{4})/);
        const clientId = clientMatch ? parseInt(clientMatch[1]) : null;

        const queryResponse = await fetch(
          `${supabaseUrl}/functions/v1/transaction-query`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ clientId }),
          }
        );

        if (queryResponse.ok) {
          const queryData = await queryResponse.json();
          response.content = queryData.voiceSummary || "Transaction data retrieved.";
          response.tableData = queryData.summary;
          response.sources = ["DB"];
          response.metadata.lastClientId = clientId;
          steps[steps.length - 1].latency = Date.now() - queryStart;
        }
        break;
      }

      case "transaction_chart": {
        steps.push({ name: "Transaction Chart", latency: 0, timestamp: Date.now() });
        const chartStart = Date.now();

        const clientMatch = query.match(/client\s*(\d+)/i) || query.match(/(\d{4})/);
        const clientId = clientMatch ? parseInt(clientMatch[1]) : null;

        const chartResponse = await fetch(
          `${supabaseUrl}/functions/v1/transaction-chart`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ clientId }),
          }
        );

        if (chartResponse.ok) {
          const chartData = await chartResponse.json();
          response.content = chartData.voiceSummary || "Chart generated successfully.";
          response.chartData = chartData.chartData;
          response.sources = ["DB"];
          response.metadata.lastClientId = clientId;
          steps[steps.length - 1].latency = Date.now() - chartStart;
        }
        break;
      }

      case "doc_rag": {
        steps.push({ name: "RAG Agent", latency: 0, timestamp: Date.now() });
        const ragStart = Date.now();

        const ragResponse = await fetch(
          `${supabaseUrl}/functions/v1/rag-retrieval`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              query,
              matchThreshold: 0.7,
              matchCount: 5,
              enhanceWithContext: true,
            }),
          }
        );

        if (ragResponse.ok) {
          const ragData = await ragResponse.json();
          response.content = ragData.enhancedResponse || "No documents found.";
          response.citations = ragData.documents;
          response.sources = ["VECTOR"];
          steps[steps.length - 1].latency = Date.now() - ragStart;
        }
        break;
      }

      case "chart": {
        steps.push({ name: "Chart Generation", latency: 0, timestamp: Date.now() });
        const chartStart = Date.now();

        const chartResponse = await fetch(
          `${supabaseUrl}/functions/v1/transaction-chart`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              query,
              chartType: "bar",
            }),
          }
        );

        if (chartResponse.ok) {
          const chartData = await chartResponse.json();
          response.content = chartData.voiceSummary || chartData.summary || "Chart generated successfully.";
          response.chartData = chartData.chartData;
          response.sources = ["DB"];
          steps[steps.length - 1].latency = Date.now() - chartStart;
        }
        break;
      }

      case "general":
      default: {
        steps.push({
          name: "OpenAI Chat",
          latency: 0,
          timestamp: Date.now(),
        });
        const chatStart = Date.now();

        const chatResponse = await fetch(
          `${supabaseUrl}/functions/v1/openai-chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              messages: [
                {
                  role: "system",
                  content: "You are a helpful AI assistant.",
                },
                {
                  role: "user",
                  content: query,
                },
              ],
              model: "gpt-4o-mini",
              temperature: 0.7,
            }),
          }
        );

        if (chatResponse.ok) {
          const chatData = await chatResponse.json();
          response.content = chatData.choices[0].message.content;
          response.sources = ["OPENAI"];
          steps[steps.length - 1].latency = Date.now() - chatStart;
        }
        break;
      }
    }

    steps.push({
      name: "Response Synthesis",
      latency: 100,
      timestamp: Date.now(),
    });

    const totalLatency = Date.now() - startTime;

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (conversationId) {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: response.content,
        retrieval_results: response.citations,
        latency_ms: totalLatency,
      });
    }

    return new Response(
      JSON.stringify({
        ...response,
        traceSteps: steps,
        metadata: {
          ...response.metadata,
          totalLatency,
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
        details: "Failed to process agent orchestration",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});