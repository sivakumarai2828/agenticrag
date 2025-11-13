const SUPABASE_URL = "https://tqyxgybbrkybwbshalsa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeXhneWJicmt5Yndic2hhbHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMzEwMjgsImV4cCI6MjA3NzYwNzAyOH0.IM31NCIYpY_SKr6oK4uBCXy5VRIYUTAIhGYWGyepNyk";

const documents = [
  {
    title: "Authentication Best Practices",
    content: `Authentication is a critical component of any secure application. Here are the key best practices:

1. Use OAuth 2.0 for third-party authentication
2. Implement multi-factor authentication (MFA) for sensitive operations
3. Store passwords using bcrypt or Argon2 with proper salting
4. Use JWT tokens with short expiration times (15-30 minutes)
5. Implement refresh tokens for seamless user experience
6. Always use HTTPS to protect credentials in transit
7. Rate limit authentication attempts to prevent brute force attacks
8. Implement account lockout after multiple failed attempts
9. Use secure session management with httpOnly and secure cookies
10. Regularly rotate API keys and secrets`,
    url: "/docs/authentication",
    metadata: { category: "security", type: "guide" }
  },
  {
    title: "API Integration Guide",
    content: `This comprehensive guide covers integrating with our RESTful API:

Base URL: https://api.example.com/v1

Authentication: Include your API key in the Authorization header:
Authorization: Bearer YOUR_API_KEY

Rate Limits:
- Free tier: 1000 requests/hour
- Pro tier: 10000 requests/hour
- Enterprise: Custom limits

Common Endpoints:
- GET /users - List all users
- POST /users - Create a new user
- GET /users/:id - Get user by ID
- PUT /users/:id - Update user
- DELETE /users/:id - Delete user

Error Handling:
All errors return JSON with status code and message. Common codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

Best Practices:
- Implement exponential backoff for retries
- Cache responses when appropriate
- Use webhooks for real-time updates
- Validate all inputs before sending requests`,
    url: "/docs/api-integration",
    metadata: { category: "api", type: "guide" }
  },
  {
    title: "Database Schema Design",
    content: `Our database uses PostgreSQL with the following core tables:

Users Table:
- id (uuid, primary key)
- email (text, unique)
- password_hash (text)
- created_at (timestamptz)
- updated_at (timestamptz)

Transactions Table:
- id (uuid, primary key)
- user_id (uuid, foreign key)
- amount (decimal)
- status (enum: pending, completed, failed)
- merchant_id (uuid, foreign key)
- created_at (timestamptz)

Merchants Table:
- id (uuid, primary key)
- name (text)
- category (text)
- revenue (decimal)
- created_at (timestamptz)

Indexes:
- users.email for fast lookups
- transactions.user_id for user queries
- transactions.created_at for time-based queries
- merchants.category for filtering

Relationships:
- One user has many transactions
- One merchant has many transactions
- Use CASCADE delete for referential integrity`,
    url: "/docs/database-schema",
    metadata: { category: "database", type: "reference" }
  },
  {
    title: "Error Handling Strategies",
    content: `Proper error handling is crucial for robust applications:

1. Try-Catch Blocks:
Always wrap async operations in try-catch blocks to prevent unhandled exceptions.

2. Error Types:
- ValidationError: Invalid input data
- AuthenticationError: Invalid credentials
- AuthorizationError: Insufficient permissions
- NotFoundError: Resource doesn't exist
- RateLimitError: Too many requests
- DatabaseError: Database operation failed
- ExternalAPIError: Third-party service failed

3. Logging:
Log all errors with context:
- Timestamp
- User ID (if available)
- Request ID
- Error stack trace
- Input parameters

4. User-Friendly Messages:
Never expose internal errors to users. Return generic messages for security.

5. Retry Logic:
Implement exponential backoff for transient failures:
- Wait 1s, then 2s, then 4s, then 8s
- Maximum 3-5 retries
- Only retry idempotent operations

6. Circuit Breakers:
Fail fast when a service is down to prevent cascading failures.`,
    url: "/docs/error-handling",
    metadata: { category: "development", type: "guide" }
  },
  {
    title: "Performance Optimization Tips",
    content: `Optimize your application performance with these proven techniques:

Database Optimization:
1. Add indexes on frequently queried columns
2. Use connection pooling (recommended: 10-20 connections)
3. Implement query result caching with Redis
4. Optimize N+1 queries with eager loading
5. Use database views for complex queries
6. Partition large tables by date or ID
7. Regular VACUUM and ANALYZE operations

API Optimization:
1. Implement response compression (gzip)
2. Use pagination for large datasets (limit: 100)
3. Enable HTTP/2 for multiplexing
4. Implement API response caching
5. Use CDN for static assets
6. Minimize payload size with field selection

Code Optimization:
1. Use async/await properly (avoid blocking)
2. Implement worker threads for CPU-intensive tasks
3. Use streams for large file processing
4. Optimize memory usage with object pooling
5. Profile code regularly to identify bottlenecks
6. Use lazy loading for heavy dependencies

Frontend Optimization:
1. Code splitting and lazy loading
2. Image optimization and lazy loading
3. Minimize bundle size
4. Use service workers for offline support
5. Implement virtual scrolling for long lists`,
    url: "/docs/performance",
    metadata: { category: "optimization", type: "guide" }
  },
  {
    title: "Webhook Configuration",
    content: `Webhooks allow real-time event notifications:

Supported Events:
- user.created
- user.updated
- user.deleted
- transaction.completed
- transaction.failed
- merchant.registered

Configuration:
1. Go to Settings > Webhooks
2. Click "Add Webhook"
3. Enter your endpoint URL (must be HTTPS)
4. Select events to subscribe to
5. Set a secret for signature verification

Payload Format:
{
  "event": "transaction.completed",
  "timestamp": "2025-01-01T12:00:00Z",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "amount": 100.50,
    "status": "completed"
  }
}

Signature Verification:
Verify webhooks using HMAC-SHA256:
const signature = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex');

Best Practices:
- Return 200 status code quickly (< 5 seconds)
- Process webhooks asynchronously in a queue
- Implement idempotency using event IDs
- Retry failed webhooks with exponential backoff
- Store webhook logs for debugging`,
    url: "/docs/webhooks",
    metadata: { category: "integration", type: "guide" }
  }
];

async function seedDocuments() {
  console.log("Starting document seeding...\n");

  for (const doc of documents) {
    try {
      console.log(`Ingesting: ${doc.title}`);

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/ingest-document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(doc),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log(`✓ Success: ${result.document.id}\n`);
      } else {
        const error = await response.json();
        console.error(`✗ Failed: ${error.error}\n`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`✗ Error: ${error.message}\n`);
    }
  }

  console.log("Seeding complete!");
}

seedDocuments();
