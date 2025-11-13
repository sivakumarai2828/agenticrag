/*
  # Add Documents Table with Vector Embeddings

  1. Extensions
    - Enable vector extension for embedding storage
  
  2. New Tables
    - `documents`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `content` (text, not null)
      - `url` (text)
      - `metadata` (jsonb)
      - `embedding` (vector(1536)) - OpenAI embeddings
      - `created_at` (timestamptz)
  
  3. Indexes
    - HNSW index on embeddings for fast similarity search
    - GIN index on metadata for filtering
  
  4. Functions
    - `match_documents` for semantic search
  
  5. Security
    - Enable RLS
    - Public read access
    - Authenticated write access
*/

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
);

-- Create HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS documents_embedding_idx 
  ON documents 
  USING hnsw (embedding vector_cosine_ops);

-- GIN index for metadata filtering
CREATE INDEX IF NOT EXISTS documents_metadata_idx 
  ON documents 
  USING gin (metadata);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policies for documents
CREATE POLICY "Anyone can read documents"
  ON documents FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (true);

-- Function for semantic search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  url text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.title,
    documents.content,
    documents.url,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
