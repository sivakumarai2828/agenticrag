import { getApiUrl, API_ENDPOINTS } from '../config/api';



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
    [key: string]: any;
  };
  tableData?: any;
  chartData?: any;
  queryCount?: number;
}

export async function processWithAgent(request: AgentRequest): Promise<AgentResponse> {
  try {
    const response = await fetch(
      getApiUrl(API_ENDPOINTS.AGENT_ORCHESTRATOR),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
