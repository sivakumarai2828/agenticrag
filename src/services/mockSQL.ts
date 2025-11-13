export interface SQLResult {
  rows: Record<string, any>[];
  columns: string[];
}

export async function runSQL(query: string, timeRange: string): Promise<SQLResult> {
  await new Promise(resolve => setTimeout(resolve, 450));

  const days = timeRange === '7d' ? 7 : 30;

  return {
    columns: ['merchant_name', 'transactions', 'revenue', 'avg_amount'],
    rows: [
      { merchant_name: 'Acme Corp', transactions: 1245, revenue: 124567.89, avg_amount: 100.05 },
      { merchant_name: 'Global Trading', transactions: 987, revenue: 98234.12, avg_amount: 99.53 },
      { merchant_name: 'Tech Solutions', transactions: 856, revenue: 85600.45, avg_amount: 100.00 },
      { merchant_name: 'Digital Goods', transactions: 743, revenue: 74300.78, avg_amount: 100.00 },
      { merchant_name: 'Services Inc', transactions: 654, revenue: 65432.10, avg_amount: 100.05 },
    ].map(row => ({ ...row, period: `Last ${days} days` })),
  };
}
