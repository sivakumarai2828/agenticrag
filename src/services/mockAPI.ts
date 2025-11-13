export type ServiceStatus = 'OK' | 'WARN' | 'FAIL';

export interface ServiceFailure {
  service: string;
  code: string;
  count: number;
}

export interface APIStatusResult {
  status: ServiceStatus;
  failures: ServiceFailure[];
  summary: string;
  uptime: number;
  totalRequests: number;
}

export async function checkAPIStatus(timeWindow: string): Promise<APIStatusResult> {
  await new Promise(resolve => setTimeout(resolve, 350));

  const hasErrors = Math.random() > 0.7;

  if (hasErrors) {
    return {
      status: 'WARN',
      failures: [
        { service: 'payment-gateway', code: '503', count: 12 },
        { service: 'notification-service', code: '429', count: 8 },
      ],
      summary: 'System operational with minor issues. Payment gateway experienced intermittent 503 errors. Monitoring ongoing.',
      uptime: 99.85,
      totalRequests: 125400,
    };
  }

  return {
    status: 'OK',
    failures: [],
    summary: 'All systems operational. No errors detected in the monitoring window.',
    uptime: 99.99,
    totalRequests: 125400,
  };
}
