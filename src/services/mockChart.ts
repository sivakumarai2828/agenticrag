export type ChartType = 'line' | 'bar' | 'pie';

export interface ChartConfig {
  type: ChartType;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      color: string;
    }>;
  };
}

export async function buildChart(query: string, type: ChartType = 'line'): Promise<ChartConfig> {
  await new Promise(resolve => setTimeout(resolve, 400));

  const isWeekly = query.includes('7 days') || query.includes('week');

  if (isWeekly) {
    return {
      type,
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'Revenue',
            data: [12500, 15200, 14800, 16100, 18500, 13200, 11900],
            color: '#8b5cf6',
          },
          {
            label: 'Transactions',
            data: [125, 152, 148, 161, 185, 132, 119],
            color: '#d946ef',
          },
        ],
      },
    };
  }

  return {
    type,
    data: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [
        {
          label: 'Revenue',
          data: [98500, 112300, 105800, 131500],
          color: '#8b5cf6',
        },
        {
          label: 'Transactions',
          data: [985, 1123, 1058, 1315],
          color: '#d946ef',
        },
      ],
    },
  };
}
