import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Log configuration for debugging
console.log('📡 initialized Supabase with URL:', supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials are missing. Please check your .env file or deployment settings (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  retrieval_results?: RetrievalResult[];
  evaluation_scores?: EvaluationScores;
  tools_used?: ToolUsed[];
  token_count?: number;
  latency_ms?: number;
  estimated_cost?: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface RetrievalResult {
  chunk: string;
  score: number;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface EvaluationScores {
  relevance?: number;
  grounding?: number;
  faithfulness?: number;
}

export interface ToolUsed {
  name: string;
  latency?: number;
  status: 'success' | 'error';
}

export interface UserSettings {
  user_id: string;
  model: string;
  capabilities: {
    enableRAG: boolean;
    enableTools: boolean;
    useMemory: boolean;
    enableEvaluation: boolean;
    enableWebSearch: boolean;
  };
  rag_config: {
    retrievalMode: 'vector' | 'hybrid' | 'multi-source';
    topK: number;
    similarityThreshold: number;
    collections: string[];
  };
  default_prompt: string;
}
