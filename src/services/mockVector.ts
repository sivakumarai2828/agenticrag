export interface VectorResult {
  title: string;
  snippet: string;
  similarity: number;
  url: string;
}

export async function vectorSearch(query: string): Promise<VectorResult[]> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const results: VectorResult[] = [
    {
      title: 'Product Documentation - Authentication',
      snippet: 'Our API uses OAuth 2.0 for authentication. To get started, generate an API key from your dashboard and include it in the Authorization header of all requests.',
      similarity: 0.92,
      url: '/docs/authentication',
    },
    {
      title: 'Security Best Practices Guide',
      snippet: 'Always validate user input, use HTTPS for all communications, implement rate limiting, and regularly rotate API keys. Enable MFA for all admin accounts.',
      similarity: 0.87,
      url: '/docs/security',
    },
    {
      title: 'API Integration Guide',
      snippet: 'This guide covers common integration patterns, webhook setup, error handling strategies, and rate limit management for production systems.',
      similarity: 0.81,
      url: '/docs/integration',
    },
    {
      title: 'Data Model Overview',
      snippet: 'Our data model includes Users, Transactions, Merchants, and Events. Each entity has unique identifiers and timestamps for tracking.',
      similarity: 0.75,
      url: '/docs/data-model',
    },
  ];

  return results;
}
