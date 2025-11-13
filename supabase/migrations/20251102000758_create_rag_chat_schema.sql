/*
  # RAG Agentic Chat System Schema

  ## Overview
  Creates the complete database schema for the Agentic RAG chat system with conversation
  management, message tracking, agent execution traces, and user preferences.

  ## New Tables
  
  ### conversations
  Stores conversation sessions
  - `id` (uuid, primary key) - Unique conversation identifier
  - `user_id` (uuid) - User who owns the conversation
  - `title` (text) - Conversation title (auto-generated from first message)
  - `created_at` (timestamptz) - When conversation was created
  - `updated_at` (timestamptz) - Last message timestamp
  
  ### messages
  Stores individual messages within conversations
  - `id` (uuid, primary key) - Unique message identifier
  - `conversation_id` (uuid, foreign key) - Parent conversation
  - `role` (text) - Message role: 'user', 'assistant', 'system'
  - `content` (text) - Message content
  - `retrieval_results` (jsonb) - Retrieved chunks and scores
  - `evaluation_scores` (jsonb) - Relevance, grounding, faithfulness scores
  - `tools_used` (jsonb) - List of tools/agents used in processing
  - `token_count` (int) - Tokens used in this message
  - `latency_ms` (int) - Processing time in milliseconds
  - `created_at` (timestamptz) - Message timestamp
  
  ### query_traces
  Stores detailed execution traces for observability
  - `id` (uuid, primary key) - Unique trace identifier
  - `message_id` (uuid, foreign key) - Associated message
  - `trace_data` (jsonb) - Complete execution trace
  - `execution_steps` (jsonb) - Step-by-step agent flow
  - `created_at` (timestamptz) - Trace timestamp
  
  ### user_settings
  Stores user preferences and default configurations
  - `user_id` (uuid, primary key) - User identifier
  - `model` (text) - Preferred AI model
  - `capabilities` (jsonb) - Enabled capabilities (RAG, tools, memory, etc.)
  - `rag_config` (jsonb) - RAG configuration (retrieval mode, top-k, threshold)
  - `default_prompt` (text) - Custom system prompt
  - `created_at` (timestamptz) - Settings creation timestamp
  - `updated_at` (timestamptz) - Last settings update

  ## Security
  - Enable RLS on all tables
  - Users can only access their own conversations and messages
  - Users can only modify their own settings
*/

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New Conversation',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  retrieval_results jsonb DEFAULT '[]'::jsonb,
  evaluation_scores jsonb DEFAULT '{}'::jsonb,
  tools_used jsonb DEFAULT '[]'::jsonb,
  token_count int DEFAULT 0,
  latency_ms int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create query traces table
CREATE TABLE IF NOT EXISTS query_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  trace_data jsonb DEFAULT '{}'::jsonb,
  execution_steps jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create user settings table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY,
  model text DEFAULT 'gpt-4',
  capabilities jsonb DEFAULT '{"enableRAG": true, "enableTools": true, "useMemory": true, "enableEvaluation": true, "enableWebSearch": false}'::jsonb,
  rag_config jsonb DEFAULT '{"retrievalMode": "multi-source", "topK": 5, "similarityThreshold": 0.7, "collections": ["context_docs", "product_data"]}'::jsonb,
  default_prompt text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_query_traces_message_id ON query_traces(message_id);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON conversations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in own conversations"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in own conversations"
  ON messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- RLS Policies for query traces
CREATE POLICY "Users can view traces for own messages"
  ON query_traces FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages
      JOIN conversations ON conversations.id = messages.conversation_id
      WHERE messages.id = query_traces.message_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create traces for own messages"
  ON query_traces FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages
      JOIN conversations ON conversations.id = messages.conversation_id
      WHERE messages.id = query_traces.message_id
      AND conversations.user_id = auth.uid()
    )
  );

-- RLS Policies for user settings
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
