import { classifyIntent } from '../router/intentRouter';
import { queryTransactions, generateTransactionChart, emailTransactionReport } from './transactionService';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface AgentRequest {
  query: string;
  conversationId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  content: string;
  intent: string;
  sources: string[];
  citations: any[];
  traceSteps: Array<{
    name: string;
    latency: number;
    timestamp: number;
  }>;
  metadata: {
    totalLatency: number;
    timestamp: number;
  };
  tableData?: any;
  chartData?: any;
}

export async function processWithAgent(request: AgentRequest): Promise<AgentResponse> {
  try {
    const startTime = Date.now();
    const intentResult = classifyIntent(request.query);

    console.log('Intent classification:', intentResult);

    if (intentResult.intent === 'transaction_query') {
      const result = await queryTransactions({
        query: request.query,
        ...intentResult.params,
      });

      return {
        content: result.voiceSummary,
        intent: 'transaction_query',
        sources: ['DB'],
        citations: [],
        tableData: result.summary,
        traceSteps: [
          { name: 'Intent Classification', latency: 50, timestamp: startTime },
          { name: 'Transaction Query', latency: 150, timestamp: startTime + 50 },
        ],
        metadata: {
          totalLatency: Date.now() - startTime,
          timestamp: Date.now(),
        },
      };
    }

    if (intentResult.intent === 'transaction_chart') {
      const result = await generateTransactionChart({
        query: request.query,
        chartType: 'bar',
        ...intentResult.params,
      });

      return {
        content: result.voiceSummary,
        intent: 'transaction_chart',
        sources: ['DB'],
        citations: [],
        chartData: result.chartData,
        traceSteps: [
          { name: 'Intent Classification', latency: 50, timestamp: startTime },
          { name: 'Chart Generation', latency: 180, timestamp: startTime + 50 },
        ],
        metadata: {
          totalLatency: Date.now() - startTime,
          timestamp: Date.now(),
        },
      };
    }

    if (intentResult.intent === 'transaction_email') {
      const queryResult = await queryTransactions({
        query: request.query,
        ...intentResult.params,
      });

      const emailResult = await emailTransactionReport({
        to: request.metadata?.email || 'user@example.com',
        subject: 'Transaction Intelligence Report',
        transactionSummary: queryResult.summary,
      });

      return {
        content: emailResult.voiceSummary,
        intent: 'transaction_email',
        sources: ['DB', 'EMAIL'],
        citations: [],
        tableData: queryResult.summary,
        traceSteps: [
          { name: 'Intent Classification', latency: 50, timestamp: startTime },
          { name: 'Transaction Query', latency: 150, timestamp: startTime + 50 },
          { name: 'Email Delivery', latency: 200, timestamp: startTime + 200 },
        ],
        metadata: {
          totalLatency: Date.now() - startTime,
          timestamp: Date.now(),
        },
      };
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/agent-orchestrator`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Agent request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Agent service error:', error);
    throw error;
  }
}
