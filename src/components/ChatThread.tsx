import { useRef, useEffect } from 'react';
import { LucideIcon, Sparkles } from 'lucide-react';
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
  traceSteps?: any[];
  isVoice?: boolean;
}

interface ChatThreadProps {
  messages: Message[];
  isLoading?: boolean;
}

export default function ChatThread({ messages, isLoading }: ChatThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-12">
      <div className="max-w-4xl mx-auto space-y-12">
        {messages.map(message => (
          <div key={message.id} className="animate-fadeIn">
            {message.role === 'user' ? (
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300">
                  <img src="https://ui-avatars.com/api/?name=User&background=64748b&color=fff" alt="User" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 bg-white border border-[#EBE8FF] rounded-2xl px-6 py-4 shadow-sm max-w-2xl">
                  <p className="text-base font-bold text-slate-700 leading-relaxed">{message.content}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
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
          <div className="flex items-start space-x-4 animate-fadeIn">
            <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/5 animate-pulse">
              <div className="w-4 h-4 rounded-full bg-indigo-500/50" />
            </div>
            <div className="flex-1">
              <div className="glass-card rounded-2xl p-4 border border-white/5">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-xs text-purple-600 font-bold uppercase tracking-widest">Synchronizing Intelligence...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
