import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Menu, X, Brain, Download, Upload, RotateCcw, Moon, Sun, Monitor } from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import PersonaSwitcher from './PersonaSwitcher';
import AdaptiveConfigPanel from './AdaptiveConfigPanel';
import QuickActionChips from './QuickActionChips';
import EnhancedMessageList from './EnhancedMessageList';
import MemoryManagementSheet from './MemoryManagementSheet';
import TraceDrawer from './TraceDrawer';
import AgenticFlowVisualizer from './AgenticFlowVisualizer';
import VoiceControls from './VoiceControls';
import { supabase, Message } from '../lib/supabase';
import { generateId } from '../utils/id';

export default function EnhancedChatInterface() {
  const { config, persona, exportConfig, importConfig, reset, updateConfig } = useConfig();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showMemorySheet, setShowMemorySheet] = useState(false);
  const [showTraceDrawer, setShowTraceDrawer] = useState(false);
  const [selectedTraceMessageId, setSelectedTraceMessageId] = useState<string | undefined>();
  const [validationError, setValidationError] = useState<string>('');
  const [agentSteps, setAgentSteps] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    initializeConversation();
  }, []);

  useEffect(() => {
    validateConfiguration();
  }, [config]);

  const validateConfiguration = () => {
    if (config.retrieval.collections.length === 0) {
      setValidationError('No data sources selected. Please select at least one collection.');
    } else {
      setValidationError('');
    }
  };

  const initializeConversation = async () => {
    const userId = 'demo-user-123';

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title: 'New Conversation',
      })
      .select()
      .single();

    if (!error && conversation) {
      setCurrentConversationId(conversation.id);
    }
  };

  const estimateCost = (tokens: number): number => {
    const costPer1kTokens = config.agents.model.includes('gpt-4') ? 0.03 : 0.002;
    return (tokens / 1000) * costPer1kTokens;
  };

  const simulateAgenticRAG = async (userMessage: string): Promise<Message> => {
    await new Promise(resolve => setTimeout(resolve, 800));

    const retrievalResults = [
      { chunk: 'Product features include real-time analytics dashboard...', score: 0.94, source: 'docs/features.pdf' },
      { chunk: 'Advanced API integration capabilities with REST and GraphQL...', score: 0.89, source: 'docs/api.pdf' },
      { chunk: 'Enterprise security with SOC2 compliance...', score: 0.82, source: 'docs/security.pdf' },
    ];

    const toolsUsed = [
      { name: 'Vector DB1 (Context Docs)', latency: 234, status: 'success' as const },
      { name: 'Vector DB2 (Product Data)', latency: 189, status: 'success' as const },
    ];

    const evaluationScores = config.safety.enableEvaluation
      ? {
        relevance: 0.94,
        grounding: 0.91,
        faithfulness: 0.89,
      }
      : undefined;

    const tokenCount = 247;
    const estimatedCost = estimateCost(tokenCount);

    return {
      id: generateId(),
      conversation_id: currentConversationId || '',
      role: 'assistant',
      content: `Based on your question "${userMessage}", I've analyzed the available context and can provide you with comprehensive information. The system successfully retrieved relevant information from multiple sources including product documentation and API guides.

Key findings include:
1. Real-time analytics capabilities with customizable dashboards
2. Comprehensive API integration supporting both REST and GraphQL
3. Enterprise-grade security features with SOC2 compliance
4. Advanced data processing and transformation tools

Would you like me to elaborate on any specific aspect?`,
      retrieval_results: retrievalResults,
      evaluation_scores: evaluationScores,
      tools_used: toolsUsed,
      token_count: tokenCount,
      latency_ms: 1234,
      created_at: new Date().toISOString(),
      estimated_cost: estimatedCost,
    };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentConversationId || validationError) return;

    const userMessage: Message = {
      id: generateId(),
      conversation_id: currentConversationId,
      role: 'user',
      content: inputValue,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    await supabase.from('messages').insert({
      conversation_id: currentConversationId,
      role: 'user',
      content: inputValue,
    });

    const assistantMessage = await simulateAgenticRAG(inputValue);

    if (assistantMessage.estimated_cost && assistantMessage.estimated_cost > config.costLatency.budgetLimitPerQuery * 0.8) {
      console.warn('Cost approaching budget limit!');
    }

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);

    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsProcessing(false);

    setTimeout(() => {
      setAgentSteps([]);
    }, 8000);

    await supabase.from('messages').insert({
      conversation_id: currentConversationId,
      role: 'assistant',
      content: assistantMessage.content,
      retrieval_results: assistantMessage.retrieval_results,
      evaluation_scores: assistantMessage.evaluation_scores,
      tools_used: assistantMessage.tools_used,
      token_count: assistantMessage.token_count,
      latency_ms: assistantMessage.latency_ms,
    });

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentConversationId);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceTranscript = async (transcript: string) => {
    if (!currentConversationId) return;

    const userMessage: Message = {
      id: generateId(),
      conversation_id: currentConversationId,
      role: 'user',
      content: transcript,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsProcessing(true);

    await supabase.from('messages').insert({
      conversation_id: currentConversationId,
      role: 'user',
      content: transcript,
    });

    const assistantResponse = await simulateAgenticRAG(transcript);
    setMessages(prev => [...prev, assistantResponse]);
    setIsLoading(false);
    setIsProcessing(false);

    await supabase.from('messages').insert({
      conversation_id: currentConversationId,
      role: 'assistant',
      content: assistantResponse.content,
    });
  };

  const handleVoiceAssistantMessage = async (text: string, sources?: any[]) => {
    if (!currentConversationId) return;

    const assistantMessage: Message = {
      id: generateId(),
      conversation_id: currentConversationId,
      role: 'assistant',
      content: text,
      created_at: new Date().toISOString(),
      retrieval_results: (sources || []).map(s => ({ chunk: s.content || s, score: 1, source: s.metadata?.source || 'Voice' })),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);

    await supabase.from('messages').insert({
      conversation_id: currentConversationId,
      role: 'assistant',
      content: text,
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsProcessing(false);

    setTimeout(() => {
      setAgentSteps([]);
    }, 8000);

    await supabase.from('messages').insert({
      conversation_id: currentConversationId,
      role: 'assistant',
      content: assistantMessage.content,
      retrieval_results: assistantMessage.retrieval_results,
      evaluation_scores: assistantMessage.evaluation_scores,
      tools_used: assistantMessage.tools_used,
      token_count: assistantMessage.token_count,
      latency_ms: assistantMessage.latency_ms,
    });
  };

  const handleQuickAction = (action: string) => {
    setInputValue(action);
  };

  const handleExportConfig = () => {
    const configJson = exportConfig();
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agentic-rag-config-${Date.now()}.json`;
    a.click();
  };

  const handleImportConfig = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        const content = ev.target?.result as string;
        const success = importConfig(content);
        if (success) {
          alert('Configuration imported successfully!');
        } else {
          alert('Failed to import configuration. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleThemeToggle = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(config.ui.theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    updateConfig({ ui: { ...config.ui, theme: nextTheme } });
  };

  const getThemeIcon = () => {
    if (config.ui.theme === 'light') return <Sun size={18} />;
    if (config.ui.theme === 'dark') return <Moon size={18} />;
    return <Monitor size={18} />;
  };

  const handleOpenTrace = (messageId: string) => {
    setSelectedTraceMessageId(messageId);
    setShowTraceDrawer(true);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {isSidebarOpen && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-screen overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-gray-800">Configuration</h2>
                <p className="text-xs text-gray-500">{persona} mode</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleThemeToggle}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title={`Theme: ${config.ui.theme}`}
              >
                {getThemeIcon()}
              </button>
              <button
                onClick={handleExportConfig}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Export Configuration"
              >
                <Download size={18} />
              </button>
              <button
                onClick={handleImportConfig}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Import Configuration"
              >
                <Upload size={18} />
              </button>
              <button
                onClick={reset}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Reset to Defaults"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            <AdaptiveConfigPanel />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">Voice Agentic RAG</h1>
                  <p className="text-sm text-gray-500">{isVoiceConnected ? 'Voice-controlled multi-modal responses' : 'Smart routing • Multi-modal responses • Voice-enabled AI'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMemorySheet(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-violet-50 hover:bg-violet-100 rounded-lg text-sm font-medium text-violet-700 transition-colors"
              >
                <Brain size={18} />
                <span>Memory</span>
              </button>
            </div>
            <PersonaSwitcher />
          </div>
          <VoiceControls
            onTranscript={handleVoiceTranscript}
            onAssistantMessage={handleVoiceAssistantMessage}
            isEnabled={isVoiceEnabled}
            onToggle={() => setIsVoiceEnabled(!isVoiceEnabled)}
            onConnectionChange={setIsVoiceConnected}
          />
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {agentSteps.length > 0 && (
            <AgenticFlowVisualizer
              steps={agentSteps}
              isActive={isProcessing}
            />
          )}

          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-2xl">
                <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">Ask anything, get structured answers</h2>
                <p className="text-gray-600 mb-6">
                  Intelligent routing to the right data source with multi-modal rendering
                </p>
                {!isVoiceConnected && <QuickActionChips onSelectAction={handleQuickAction} />}
                {isVoiceConnected && (
                  <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200 rounded-xl p-6">
                    <p className="text-lg font-semibold text-gray-800 mb-2">🎤 Voice Mode Active</p>
                    <p className="text-gray-600">Speak naturally to ask questions, query data, or request charts</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <EnhancedMessageList
              messages={messages}
              isLoading={isLoading}
              config={config}
              persona={persona}
              onOpenTrace={handleOpenTrace}
            />
          )}
          <div ref={messagesEndRef} />
        </div>

        {!isVoiceConnected && (
          <div className="border-t border-gray-200 bg-white px-6 py-4">
            <div className="max-w-4xl mx-auto">
              {validationError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {validationError}
                </div>
              )}
              <div className="flex items-end space-x-3">
                <button className="p-3 hover:bg-gray-100 rounded-lg transition-colors">
                  <Paperclip size={20} className="text-gray-600" />
                </button>
                <div className="flex-1 relative">
                  <textarea
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about data, docs, APIs, or request charts..."
                    rows={1}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                    style={{ minHeight: '48px', maxHeight: '200px' }}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading || !!validationError}
                  className="p-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg hover:from-violet-700 hover:to-fuchsia-700 shadow-lg shadow-violet-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title={validationError || undefined}
                >
                  <Send size={20} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Enter to send • Shift+Enter for new line
              </p>
            </div>
          </div>
        )}
      </div>

      <MemoryManagementSheet isOpen={showMemorySheet} onClose={() => setShowMemorySheet(false)} />
      <TraceDrawer
        isOpen={showTraceDrawer}
        onClose={() => setShowTraceDrawer(false)}
        messageId={selectedTraceMessageId}
      />
    </div>
  );
}
