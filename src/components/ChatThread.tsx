import { User, Eye } from 'lucide-react';
import AnswerCard from './AnswerCard';
import { IntentType } from '../router/intentRouter';
import { VectorResult } from '../services/mockVector';
import { WebResult } from '../services/mockWeb';
import { ChartConfig } from '../services/mockChart';
import { APIStatusResult } from '../services/mockAPI';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: IntentType;
  sources?: string[];
  citations?: (VectorResult | WebResult)[];
  table?: { columns: string[]; rows: Record<string, any>[] };
  chart?: ChartConfig;
  json?: APIStatusResult;
}

interface ChatThreadProps {
  messages: Message[];
  onViewTrace: (messageId: string) => void;
  isLoading?: boolean;
}

export default function ChatThread({ messages, onViewTrace, isLoading }: ChatThreadProps) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.map(message => (
          <div key={message.id}>
            {message.role === 'user' ? (
              <div className="flex justify-end mb-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-violet-600 text-white rounded-2xl px-5 py-3 max-w-2xl">
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <User size={16} className="text-gray-600" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xs font-semibold text-gray-500">
                      Intent: {message.intent}
                    </span>
                    <button
                      onClick={() => onViewTrace(message.id)}
                      className="flex items-center space-x-1 px-2 py-1 text-xs text-violet-600 hover:bg-violet-50 rounded transition-colors"
                    >
                      <Eye size={12} />
                      <span>Trace</span>
                    </button>
                  </div>
                  <AnswerCard
                    intent={message.intent!}
                    sources={message.sources || []}
                    answer={message.content}
                    citations={message.citations}
                    table={message.table}
                    chart={message.chart}
                    json={message.json}
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm text-gray-600 font-medium">AI is thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
