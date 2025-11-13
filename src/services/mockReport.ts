export interface ReportResult {
  summary: string;
  rows: Record<string, any>[];
  columns: string[];
}

export async function buildReport(query: string, timeRange: string): Promise<ReportResult> {
  await new Promise(resolve => setTimeout(resolve, 500));

  const days = timeRange === '7d' ? 7 : 30;

  return {
    summary: `Report generated for the last ${days} days. Total revenue: $448,135.34 across 4,485 transactions from 5 merchants. Average transaction value: $99.93.`,
    columns: ['category', 'count', 'total', 'percentage'],
    rows: [
      { category: 'E-commerce', count: 2002, total: 200234.56, percentage: '44.7%' },
      { category: 'SaaS', count: 1245, total: 124567.89, percentage: '27.8%' },
      { category: 'Professional Services', count: 856, total: 85600.45, percentage: '19.1%' },
      { category: 'Digital Products', count: 382, total: 37732.44, percentage: '8.4%' },
    ],
  };
}
