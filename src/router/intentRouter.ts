export type IntentType = 'doc_rag' | 'sql' | 'report' | 'chart' | 'api_status' | 'web' | 'transaction_query' | 'transaction_chart' | 'transaction_email';

export interface IntentResult {
  intent: IntentType;
  confidence: number;
  sources: string[];
  reasoning: string;
  params?: any;
}

const SQL_KEYWORDS = ['select', 'top', 'average', 'avg', 'sum', 'count', 'merchants', 'transactions', 'revenue', 'group by', 'order by'];
const CHART_KEYWORDS = ['chart', 'plot', 'graph', 'visualize', 'show trends', 'time series', '7 days', '30 days', 'last week', 'last month'];
const API_KEYWORDS = ['api', 'downstream', 'health', 'errors', '5xx', '4xx', 'status', 'endpoint', 'service'];
const DOC_KEYWORDS = ['documentation', 'docs', 'policy', 'guide', 'pdf', 'explain', 'how to', 'what is'];
const TRANSACTION_KEYWORDS = ['transaction', 'purchase', 'refund', 'payment', 'client', 'approved', 'declined', 'spending'];
const EMAIL_KEYWORDS = ['email', 'send', 'mail', 'report to'];

export function classifyIntent(query: string): IntentResult {
  const lowerQuery = query.toLowerCase();

  if (containsKeywords(lowerQuery, EMAIL_KEYWORDS) || lowerQuery.includes('send') && lowerQuery.includes('report')) {
    const params: any = {};

    const emailMatch = lowerQuery.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/);
    if (emailMatch) {
      params.email = emailMatch[0];
    }

    const clientMatch = lowerQuery.match(/client\s*(\d+)/);
    const ipLikeMatch = lowerQuery.match(/client\s*(\d+)\.(\d+)\.(\d+)\.(\d+)/);

    if (ipLikeMatch) {
      params.clientId = parseInt(ipLikeMatch[1] + ipLikeMatch[2] + ipLikeMatch[3] + ipLikeMatch[4]);
    } else if (clientMatch) {
      params.clientId = parseInt(clientMatch[1]);
    }

    return {
      intent: 'transaction_email',
      confidence: 0.95,
      sources: ['DB', 'EMAIL'],
      reasoning: 'Query requests email report for transactions',
      params,
    };
  }

  if (containsKeywords(lowerQuery, TRANSACTION_KEYWORDS)) {
    const params: any = {};

    const clientMatch = lowerQuery.match(/client\s*(\d+)/);
    const ipLikeMatch = lowerQuery.match(/client\s*(\d+)\.(\d+)\.(\d+)\.(\d+)/);

    if (ipLikeMatch) {
      params.clientId = parseInt(ipLikeMatch[1] + ipLikeMatch[2] + ipLikeMatch[3] + ipLikeMatch[4]);
    } else if (clientMatch) {
      params.clientId = parseInt(clientMatch[1]);
    }

    if (lowerQuery.includes('purchase')) {
      params.type = 'PURCHASE';
    } else if (lowerQuery.includes('refund')) {
      params.type = 'REFUND';
    }

    if (lowerQuery.includes('approved')) {
      params.status = 'APPROVED';
    } else if (lowerQuery.includes('declined')) {
      params.status = 'DECLINED';
    }

    const isChartRequest = containsKeywords(lowerQuery, CHART_KEYWORDS) ||
                          lowerQuery.includes('trend') ||
                          lowerQuery.includes('pattern');

    if (isChartRequest) {
      if (lowerQuery.includes('pie')) {
        params.chartType = 'pie';
      } else if (lowerQuery.includes('line')) {
        params.chartType = 'line';
      } else if (lowerQuery.includes('bar')) {
        params.chartType = 'bar';
      } else {
        params.chartType = 'bar';
      }
    }

    return {
      intent: isChartRequest ? 'transaction_chart' : 'transaction_query',
      confidence: 0.92,
      sources: ['DB'],
      reasoning: isChartRequest
        ? 'Query requests transaction visualization'
        : 'Query asks about transaction data',
      params,
    };
  }

  if (containsKeywords(lowerQuery, API_KEYWORDS)) {
    return {
      intent: 'api_status',
      confidence: 0.9,
      sources: ['API'],
      reasoning: 'Query mentions API health or service status',
    };
  }

  if (containsKeywords(lowerQuery, CHART_KEYWORDS)) {
    const isNumeric = containsKeywords(lowerQuery, SQL_KEYWORDS) ||
                     /\d+\s*(days|weeks|months)/.test(lowerQuery);
    return {
      intent: 'chart',
      confidence: 0.85,
      sources: isNumeric ? ['DB'] : ['VECTOR'],
      reasoning: 'Query requests visualization or chart',
    };
  }

  if (containsKeywords(lowerQuery, SQL_KEYWORDS)) {
    const isReport = lowerQuery.includes('report') ||
                    lowerQuery.includes('summary') ||
                    lowerQuery.includes('breakdown');

    return {
      intent: isReport ? 'report' : 'sql',
      confidence: 0.88,
      sources: ['DB'],
      reasoning: isReport
        ? 'Query requires aggregated reporting from database'
        : 'Query contains SQL-like aggregation keywords',
    };
  }

  if (containsKeywords(lowerQuery, DOC_KEYWORDS)) {
    return {
      intent: 'doc_rag',
      confidence: 0.8,
      sources: ['VECTOR'],
      reasoning: 'Query asks about documentation or policies',
    };
  }

  return {
    intent: 'doc_rag',
    confidence: 0.6,
    sources: ['VECTOR', 'WEB'],
    reasoning: 'Default RAG with web fallback if vector score < 0.55',
  };
}

function containsKeywords(text: string, keywords: string[]): boolean {
  return keywords.some(keyword => text.includes(keyword));
}
