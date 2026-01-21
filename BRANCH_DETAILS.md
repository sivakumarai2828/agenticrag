# Branch Details: agentic_rag_client_test

This branch is the primary testing environment for the Agentic RAG client, focusing on stability, cross-origin/SSL compatibility, and multi-tool orchestration.

## 🚀 Key Features

### 1. Document Retrieval Proxy
- **Endpoint**: `GET /documents` in [main.py](file:///Users/sivakumarkondapalle/Downloads/Projects/agentic_rag_client/agenticrag/backend/main.py)
- **Purpose**: Bypasses browser-level SSL/Mixed Content issues by fetching documents through the backend instead of direct Supabase client calls in the frontend.
- **Frontend Integration**: Used by [DocumentsTable.tsx](file:///Users/sivakumarkondapalle/Downloads/Projects/agentic_rag_client/agenticrag/src/components/DocumentsTable.tsx).

### 2. HTTPS Enforcement
- **Implementation**: Automatically converts `http://` to `https://` for `VITE_API_URL` and `VITE_SUPABASE_URL` when running in production mode (`import.meta.env.PROD`).
- **Files**: [api.ts](file:///Users/sivakumarkondapalle/Downloads/Projects/agentic_rag_client/agenticrag/src/config/api.ts) and [supabase.ts](file:///Users/sivakumarkondapalle/Downloads/Projects/agentic_rag_client/agenticrag/src/lib/supabase.ts).

### 3. Voice Assistant & Orchestration
- **Tooling**: Standardized `doc_rag` tool integration within the voice assistant.
- **Stability**: Refactored [VoiceControls.tsx](file:///Users/sivakumarkondapalle/Downloads/Projects/agentic_rag_client/agenticrag/src/components/VoiceControls.tsx) to handle VAD (Voice Activity Detection) more robustly and prevent duplicate tool execution responses.
- **VAD Threshold**: Updated to `0.7` for better stability in noisy environments.

## ⚙️ Environment Configuration

Ensure the following environment variables are correctly set for this branch:
- `VITE_API_URL`: Backend API base URL.
- `VITE_SUPABASE_URL`: Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key.

## 📝 Recent Version History (Stable v1)
- `0d0231b`: Implemented document proxy logic.
- `4dbbac4`: Added production HTTPS enforcement.
- `c281a02`: Enabled CORS and standardized tool descriptions.
- `3ae4577`: Initial stable release with general email and voice trace sync.
