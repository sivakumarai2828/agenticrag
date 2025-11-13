const SUPABASE_URL = "https://tqyxgybbrkybwbshalsa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeXhneWJicmt5Yndic2hhbHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMzEwMjgsImV4cCI6MjA3NzYwNzAyOH0.IM31NCIYpY_SKr6oK4uBCXy5VRIYUTAIhGYWGyepNyk";

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

async function test(
  name: string,
  fn: () => Promise<any>
): Promise<void> {
  const start = Date.now();
  try {
    console.log(`\n🧪 Testing: ${name}`);
    const data = await fn();
    const duration = Date.now() - start;
    results.push({ name, success: true, duration, data });
    console.log(`✓ PASS (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    results.push({
      name,
      success: false,
      duration,
      error: error.message,
    });
    console.log(`✗ FAIL (${duration}ms): ${error.message}`);
  }
}

async function testOpenAIChat() {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/openai-chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say hello in 5 words or less." }
        ],
        model: "gpt-4o-mini",
        temperature: 0.7,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0]?.message?.content) {
    throw new Error("Invalid response structure");
  }

  return { response: data.choices[0].message.content };
}

async function testRAGRetrieval() {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/rag-retrieval`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: "How should I handle authentication?",
        matchThreshold: 0.7,
        matchCount: 3,
        enhanceWithContext: true,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  if (!data.documents || data.documents.length === 0) {
    throw new Error("No documents retrieved");
  }

  return {
    documentsFound: data.documents.length,
    topResult: data.documents[0]?.title,
    hasEnhancedResponse: !!data.enhancedResponse,
  };
}

async function testAgentOrchestrator() {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/agent-orchestrator`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: "Explain best practices for API authentication",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  if (!data.content) {
    throw new Error("No content in response");
  }

  return {
    intent: data.intent,
    sources: data.sources,
    traceSteps: data.traceSteps?.length || 0,
    totalLatency: data.metadata?.totalLatency,
  };
}

async function testChatterboxTTS() {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/chatterbox-tts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        text: "Testing text to speech functionality.",
        language: "en",
        voice: "female",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const audioData = await response.arrayBuffer();
  if (!audioData || audioData.byteLength === 0) {
    throw new Error("No audio data received");
  }

  return { audioSize: audioData.byteLength };
}

async function runTests() {
  console.log("=".repeat(60));
  console.log("🚀 BACKEND INTEGRATION TESTS");
  console.log("=".repeat(60));

  await test("OpenAI Chat Completion", testOpenAIChat);
  await test("RAG Retrieval (Vector Search)", testRAGRetrieval);
  await test("Agent Orchestrator (Multi-Agent)", testAgentOrchestrator);
  await test("Chatterbox TTS (Voice)", testChatterboxTTS);

  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => r.success === false).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`Total Duration: ${totalDuration}ms`);

  if (failed > 0) {
    console.log("\n❌ FAILED TESTS:");
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
  }

  console.log("\n" + "=".repeat(60));

  if (passed === results.length) {
    console.log("✅ ALL TESTS PASSED!");
  } else {
    console.log("❌ SOME TESTS FAILED");
    process.exit(1);
  }
}

runTests();
