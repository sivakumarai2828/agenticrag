/*
  # Add Context Memory Table for Agentic RAG

  ## New Table
  
  ### context_memory
  Stores conversation context and retrieval iterations for agentic behavior
  - `id` (uuid, primary key) - Unique memory entry identifier
  - `conversation_id` (uuid, foreign key) - Associated conversation
  - `user_id` (uuid) - User who owns this memory
  - `context_type` (text) - Type of context: 'retrieval_iteration', 'query_refinement', 'user_preference', 'extracted_entity'
  - `context_data` (jsonb) - Flexible storage for context information
  - `created_at` (timestamptz) - When context was stored
  - `expires_at` (timestamptz) - Optional expiration for temporary context

  ## Security
  - Enable RLS on context_memory table
  - Users can only access their own context memory
  - Supports both session-based and persistent context storage
*/

CREATE TABLE IF NOT EXISTS context_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  context_type text NOT NULL CHECK (context_type IN ('retrieval_iteration', 'query_refinement', 'user_preference', 'extracted_entity', 'agent_decision')),
  context_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_context_memory_conversation ON context_memory(conversation_id);
CREATE INDEX IF NOT EXISTS idx_context_memory_user ON context_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_context_memory_type ON context_memory(context_type);
CREATE INDEX IF NOT EXISTS idx_context_memory_expires ON context_memory(expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE context_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own context memory"
  ON context_memory FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own context memory"
  ON context_memory FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own context memory"
  ON context_memory FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own context memory"
  ON context_memory FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
