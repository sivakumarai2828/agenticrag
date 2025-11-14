import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TRANSACTION_TOOLS = [
  {
    type: "function",
    name: "query_transactions",
    description: "Query and retrieve transaction records from the database. Use this when users ask about client transactions, purchases, refunds, or transaction status.",
    parameters: {
      type: "object",
      properties: {
        clientId: {
          type: "number",
          description: "The client ID to filter transactions by (e.g., 5001, 5002, 5003)",
        },
        type: {
          type: "string",
          enum: ["PURCHASE", "REFUND"],
          description: "Filter by transaction type",
        },
        status: {
          type: "string",
          enum: ["APPROVED", "DECLINED"],
          description: "Filter by transaction status",
        },
      },
    },
  },
  {
    type: "function",
    name: "generate_transaction_chart",
    description: "Generate a chart visualization of transaction trends over time for a specific client.",
    parameters: {
      type: "object",
      properties: {
        clientId: {
          type: "number",
          description: "The client ID to generate chart for",
        },
      },
      required: ["clientId"],
    },
  },
  {
    type: "function",
    name: "send_email_report",
    description: "Send a transaction report via email to a specified recipient. Use this when users ask to email or send reports.",
    parameters: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Email address of the recipient",
        },
        subject: {
          type: "string",
          description: "Subject line for the email",
        },
        clientId: {
          type: "number",
          description: "Client ID to generate the report for",
        },
      },
      required: ["to", "clientId"],
    },
  },
];

async function executeFunction(functionName: string, args: any): Promise<any> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials not configured");
  }

  console.log(`Executing function: ${functionName} with args:`, args);

  if (functionName === "query_transactions") {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/transaction-query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(args),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Transaction query failed:", errorText);
      throw new Error(`Failed to query transactions: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("Transaction query result:", result);
    return result;
  } else if (functionName === "generate_transaction_chart") {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/transaction-chart`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(args),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Chart generation failed:", errorText);
      throw new Error(`Failed to generate chart: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("Chart generation result:", result);
    return result;
  } else if (functionName === "send_email_report") {
    const queryResponse = await fetch(
      `${supabaseUrl}/functions/v1/transaction-query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ clientId: args.clientId }),
      }
    );

    if (!queryResponse.ok) {
      throw new Error(`Failed to query transactions: ${queryResponse.statusText}`);
    }

    const queryResult = await queryResponse.json();

    const emailResponse = await fetch(
      `${supabaseUrl}/functions/v1/transaction-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          to: args.to,
          subject: args.subject || "Transaction Intelligence Report",
          transactionSummary: queryResult.summary,
        }),
      }
    );

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Email sending failed:", errorText);
      throw new Error(`Failed to send email: ${emailResponse.statusText}`);
    }

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);
    return emailResult;
  }

  throw new Error(`Unknown function: ${functionName}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const upgrade = req.headers.get("upgrade") || "";

    if (upgrade.toLowerCase() !== "websocket") {
      return new Response(
        JSON.stringify({ error: "Expected WebSocket upgrade" }),
        {
          status: 426,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { socket, response } = Deno.upgradeWebSocket(req);

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      socket.close(1008, "OpenAI API key not configured");
      return response;
    }

    let openaiWs: WebSocket | null = null;

    socket.onopen = async () => {
      console.log("Client connected");

      try {
        openaiWs = new WebSocket(
          "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01",
          {
            headers: {
              "Authorization": `Bearer ${openaiApiKey}`,
              "OpenAI-Beta": "realtime=v1",
            },
          }
        );

        openaiWs.onopen = () => {
          console.log("Connected to OpenAI Realtime API");

          openaiWs?.send(JSON.stringify({
            type: "session.update",
            session: {
              modalities: ["text", "audio"],
              instructions: "You are a helpful financial assistant that helps users query transaction data. When users ask about transactions, use the available functions to fetch real data from the database. Always call the query_transactions function when users mention client IDs or ask about transactions. When users request to send emails or reports, use the send_email_report function. Provide clear, concise responses about what you found, including the number of transactions, total amount, and status breakdown.",
              voice: "alloy",
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
              input_audio_transcription: {
                model: "whisper-1",
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
              },
              tools: TRANSACTION_TOOLS,
            },
          }));

          socket.send(JSON.stringify({
            type: "status",
            status: "connected",
          }));
        };

        openaiWs.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);

            console.log("OpenAI event:", data.type);

            if (data.type === "conversation.item.input_audio_transcription.completed") {
              socket.send(JSON.stringify({
                type: "transcript",
                text: data.transcript,
              }));
            }

            else if (data.type === "response.output_item.added" && data.item?.type === "function_call") {
              console.log("Function call initiated:", data.item.name);
            }

            else if (data.type === "response.function_call_arguments.done") {
              console.log("Function call completed:", data.name, "with args:", data.arguments);

              try {
                const args = JSON.parse(data.arguments);
                const result = await executeFunction(data.name, args);

                console.log("Function result:", result);

                openaiWs?.send(JSON.stringify({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: data.call_id,
                    output: JSON.stringify(result),
                  },
                }));

                openaiWs?.send(JSON.stringify({
                  type: "response.create",
                }));

                socket.send(JSON.stringify({
                  type: "function_result",
                  functionName: data.name,
                  result,
                }));
              } catch (error) {
                console.error("Function execution error:", error);

                const errorOutput = {
                  error: error.message || "Function execution failed",
                  details: error.toString(),
                };

                openaiWs?.send(JSON.stringify({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: data.call_id,
                    output: JSON.stringify(errorOutput),
                  },
                }));

                openaiWs?.send(JSON.stringify({
                  type: "response.create",
                }));
              }
            }

            else if (data.type === "response.audio.delta") {
              socket.send(JSON.stringify({
                type: "audio",
                audio: data.delta,
              }));
            }

            else if (data.type === "response.audio_transcript.delta") {
              socket.send(JSON.stringify({
                type: "text",
                text: data.delta,
              }));
            }

            else if (data.type === "response.text.delta") {
              socket.send(JSON.stringify({
                type: "text",
                text: data.delta,
              }));
            }

            else if (data.type === "response.done") {
              console.log("Response completed");
              socket.send(JSON.stringify({
                type: "response_complete",
              }));
            }

            else if (data.type === "error") {
              console.error("OpenAI error:", data);
              socket.send(JSON.stringify({
                type: "error",
                message: data.error?.message || "Unknown error",
              }));
            }
          } catch (error) {
            console.error("Error parsing OpenAI message:", error);
          }
        };

        openaiWs.onerror = (error) => {
          console.error("OpenAI WebSocket error:", error);
          socket.send(JSON.stringify({
            type: "error",
            message: "OpenAI connection error",
          }));
        };

        openaiWs.onclose = () => {
          console.log("OpenAI WebSocket closed");
          socket.close();
        };

      } catch (error) {
        console.error("Failed to connect to OpenAI:", error);
        socket.send(JSON.stringify({
          type: "error",
          message: "Failed to connect to OpenAI",
        }));
        socket.close();
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "audio" && openaiWs?.readyState === WebSocket.OPEN) {
          openaiWs.send(JSON.stringify({
            type: "input_audio_buffer.append",
            audio: data.audio,
          }));
        }

        else if (data.type === "commit" && openaiWs?.readyState === WebSocket.OPEN) {
          openaiWs.send(JSON.stringify({
            type: "input_audio_buffer.commit",
          }));
        }

        else if (data.type === "text" && openaiWs?.readyState === WebSocket.OPEN) {
          openaiWs.send(JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: data.text,
                },
              ],
            },
          }));

          openaiWs.send(JSON.stringify({
            type: "response.create",
          }));
        }
      } catch (error) {
        console.error("Error handling client message:", error);
      }
    };

    socket.onclose = () => {
      console.log("Client disconnected");
      if (openaiWs?.readyState === WebSocket.OPEN) {
        openaiWs.close();
      }
    };

    socket.onerror = (error) => {
      console.error("Client WebSocket error:", error);
      if (openaiWs?.readyState === WebSocket.OPEN) {
        openaiWs.close();
      }
    };

    return response;

  } catch (error) {
    console.error("Error in voice-agent function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});