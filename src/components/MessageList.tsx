import { useState } from 'react';
import { ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, Eye, CheckCircle, AlertCircle, Workflow } from 'lucide-react';
import { Message } from '../lib/supabase';
import AgentFlowVisualization from './AgentFlowVisualization';
import AgenticFlowVisualizer from './AgenticFlowVisualizer';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  settings: {
    enableRAG: boolean;
    enableEvaluation: boolean;
    enableTools: boolean;
  };
}

export default function MessageList({ messages, isLoading, settings }: MessageListProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} settings={settings} />
      ))}
      {isLoading && <LoadingMessage settings={settings} />}
    </div>
  );
}

function MessageBubble({ message, settings }: { message: Message; settings: MessageListProps['settings'] }) {
  const [showTrace, setShowTrace] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [showAgentFlow, setShowAgentFlow] = useState(false);

  const generateAgentSteps = () => {
    const steps = [];

    if (message.retrieval_results && message.retrieval_results.length > 0) {
      steps.push({
        agent: 'Retriever LLM Agent',
        action: 'Retrieved documents',
        status: 'completed' as const,
        startTime: Date.now() - 3000,
        endTime: Date.now() - 2500,
        details: `Retrieved ${message.retrieval_results.length} documents`,
        data: {
          resultsCount: message.retrieval_results.length,
          avgSimilarity: message.retrieval_results.reduce((sum, r) => sum + r.score, 0) / message.retrieval_results.length,
        },
      });
    }

    if (message.evaluation_scores) {
      steps.push({
        agent: 'Evaluator LLM Agent',
        action: 'Evaluated relevance',
        status: 'completed' as const,
        startTime: Date.now() - 2500,
        endTime: Date.now() - 1800,
        details: `Relevance: ${((message.evaluation_scores.relevance || 0) * 100).toFixed(0)}%`,
        data: {
          isRelevant: true,
          relevanceScore: message.evaluation_scores.relevance,
        },
      });
    }

    steps.push({
      agent: 'AI Agent',
      action: 'Generated response',
      status: 'completed' as const,
      startTime: Date.now() - 1800,
      endTime: Date.now() - 600,
      details: `Generated ${message.token_count || 0} tokens`,
    });

    steps.push({
      agent: 'Context Response',
      action: 'Stored context',
      status: 'completed' as const,
      startTime: Date.now() - 600,
      endTime: Date.now() - 550,
      details: 'Context saved to memory',
    });

    return steps;
  };

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-2xl px-5 py-3 shadow-lg shadow-violet-500/20">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-3xl w-full">
        {settings.enableRAG && message.retrieval_results && message.retrieval_results.length > 0 && (
          <AgentFlowVisualization
            stage="retriever"
            data={{
              status: 'completed',
              results: message.retrieval_results.length,
              avgScore: message.retrieval_results.reduce((sum, r) => sum + r.score, 0) / message.retrieval_results.length,
            }}
          />
        )}

        {settings.enableEvaluation && message.evaluation_scores && (
          <AgentFlowVisualization
            stage="evaluator"
            data={{
              status: 'completed',
              scores: message.evaluation_scores,
            }}
          />
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="px-5 py-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>

            {message.retrieval_results && message.retrieval_results.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowContext(!showContext)}
                  className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  {showContext ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span>Retrieved Context ({message.retrieval_results.length} chunks)</span>
                </button>
                {showContext && (
                  <div className="mt-3 space-y-2">
                    {message.retrieval_results.map((result, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600">{result.source}</span>
                          <span className="text-xs font-semibold text-violet-600">
                            Score: {(result.score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{result.chunk}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {message.tools_used && message.tools_used.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowTrace(!showTrace)}
                  className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  {showTrace ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span>Tools Used</span>
                </button>
                {showTrace && (
                  <div className="mt-3 space-y-2">
                    {message.tools_used.map((tool, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          {tool.status === 'success' ? (
                            <CheckCircle size={16} className="text-green-600" />
                          ) : (
                            <AlertCircle size={16} className="text-red-600" />
                          )}
                          <span className="text-sm text-gray-700">{tool.name}</span>
                        </div>
                        {tool.latency && (
                          <span className="text-xs text-gray-500">{tool.latency}ms</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {message.evaluation_scores && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowEvaluation(!showEvaluation)}
                  className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  {showEvaluation ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span>Evaluation Results</span>
                </button>
                {showEvaluation && (
                  <div className="mt-3 space-y-2">
                    {Object.entries(message.evaluation_scores).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">{key}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                value >= 0.8 ? 'bg-green-500' : value >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${value * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                            {(value * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {showAgentFlow && (
            <div className="px-5 py-4 border-t border-gray-100">
              <AgenticFlowVisualizer
                steps={generateAgentSteps()}
                isActive={false}
              />
            </div>
          )}

          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 rounded-b-2xl flex items-center justify-between">
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <button
                onClick={() => setShowAgentFlow(!showAgentFlow)}
                className="flex items-center space-x-1 hover:text-violet-600 transition-colors"
              >
                <Workflow size={14} />
                <span className="font-medium">{showAgentFlow ? 'Hide' : 'View'} Agent Flow</span>
              </button>
              {message.token_count && (
                <span>Tokens: {message.token_count}</span>
              )}
              {message.latency_ms && (
                <span>Latency: {message.latency_ms}ms</span>
              )}
              {message.evaluation_scores && (
                <span className="flex items-center space-x-1">
                  <Eye size={12} />
                  <span>Confidence: {(message.evaluation_scores.relevance || 0) * 100}%</span>
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                <ThumbsUp size={14} className="text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                <ThumbsDown size={14} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingMessage({ settings }: { settings: MessageListProps['settings'] }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-3xl w-full space-y-3">
        {settings.enableRAG && (
          <AgentFlowVisualization
            stage="retriever"
            data={{ status: 'loading' }}
          />
        )}
        {settings.enableEvaluation && (
          <AgentFlowVisualization
            stage="evaluator"
            data={{ status: 'loading' }}
          />
        )}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-full flex items-center justify-center animate-pulse">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
