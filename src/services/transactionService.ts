import { getApiUrl, API_ENDPOINTS } from '../config/api';

export interface Transaction {
  id: number;
  client_id: string;
  type: string;
  tran_amt: number;
  tran_status: string;
  tran_date: string;
}

export interface TransactionSummary {
  totalTransactions: number;
  totalAmount: string;
  approvedCount: number;
  declinedCount: number;
  transactions: Transaction[];
}

export interface TransactionQueryResult {
  success: boolean;
  summary: TransactionSummary;
  voiceSummary: string;
  query: string;
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie';
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    fill?: boolean;
  }>;
}

export interface ChartResult {
  success: boolean;
  chartData: ChartData;
  voiceSummary: string;
  transactionCount: number;
}

export interface EmailResult {
  success: boolean;
  message: string;
  emailId?: string;
  voiceSummary: string;
}



export async function queryTransactions(params: {
  query: string;
  clientId?: string;
  type?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<TransactionQueryResult> {
  const apiUrl = getApiUrl(API_ENDPOINTS.TRANSACTION_QUERY);

  const headers = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Transaction query failed: ${response.statusText}`);
  }

  return await response.json();
}

export async function generateTransactionChart(params: {
  query: string;
  clientId?: string;
  chartType?: 'bar' | 'line' | 'pie';
  dateFrom?: string;
  dateTo?: string;
}): Promise<ChartResult> {
  const apiUrl = getApiUrl(API_ENDPOINTS.TRANSACTION_CHART);

  const headers = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Chart generation failed: ${response.statusText}`);
  }

  return await response.json();
}

export async function emailTransactionReport(params: {
  to: string;
  subject: string;
  transactionSummary: TransactionSummary;
  chartData?: ChartData;
}): Promise<EmailResult> {
  const apiUrl = getApiUrl(API_ENDPOINTS.TRANSACTION_EMAIL);

  const headers = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Email send failed: ${response.statusText}`);
  }

  return await response.json();
}
