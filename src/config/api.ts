/**
 * API Configuration
 * 
 * Centralized configuration for API endpoints.
 * Uses environment variables with no hardcoded fallbacks in production.
 */

// Get API base URL from environment variable
// In production, VITE_API_URL must be set
// In development, it defaults to empty string (will use relative URLs if backend is proxied)
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Validate that API_BASE_URL is set in production
if (import.meta.env.PROD && !API_BASE_URL) {
    console.warn('⚠️ VITE_API_URL is not set. API calls may fail in production.');
}

/**
 * Get full API endpoint URL
 */
export function getApiUrl(endpoint: string): string {
    // Remove leading slash from endpoint if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

    // If API_BASE_URL is empty, return the endpoint as-is (for relative URLs)
    if (!API_BASE_URL) {
        return `/${cleanEndpoint}`;
    }

    // Otherwise, combine base URL with endpoint
    return `${API_BASE_URL}/${cleanEndpoint}`;
}

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
    TRANSACTION_QUERY: '/transaction-query',
    TRANSACTION_CHART: '/transaction-chart',
    TRANSACTION_EMAIL: '/transaction-email',
    AGENT_ORCHESTRATOR: '/agent-orchestrator',
    RAG_RETRIEVAL: '/rag-retrieval',
    WEB_SEARCH: '/web-search-tool',
    OPENAI_CHAT: '/openai-chat',
} as const;
