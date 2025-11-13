export interface WebResult {
  title: string;
  snippet: string;
  url: string;
}

export async function webSearch(query: string): Promise<WebResult[]> {
  await new Promise(resolve => setTimeout(resolve, 600));

  return [
    {
      title: 'Latest Industry Trends 2024',
      snippet: 'Comprehensive analysis of current trends in the technology sector, including AI adoption, cloud migration strategies, and emerging security challenges.',
      url: 'https://example.com/industry-trends-2024',
    },
    {
      title: 'Best Practices for Modern Applications',
      snippet: 'Learn about microservices architecture, containerization, CI/CD pipelines, and observability patterns for building scalable applications.',
      url: 'https://example.com/best-practices',
    },
    {
      title: 'Technical Blog: System Design Patterns',
      snippet: 'Explore common design patterns including event-driven architecture, CQRS, saga patterns, and distributed caching strategies.',
      url: 'https://example.com/design-patterns',
    },
  ];
}
