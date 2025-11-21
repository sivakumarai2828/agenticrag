import React, { useState, KeyboardEvent } from 'react';
import { Send, Zap, Upload, X, Database, MessageSquare, Activity } from 'lucide-react';
import Toggles from './components/Toggles';
import QuickActions from './components/QuickActions';
import InsightsBar from './components/InsightsBar';
import VoiceControls from './components/VoiceControls';
import ChatThread, { Message } from './components/ChatThread';
import SimpleTraceDrawer from './components/SimpleTraceDrawer';
import DocumentUpload from './components/DocumentUpload';
import DataIndex from './components/DataIndex';
import VisualVoiceAgent from './components/VisualVoiceAgent';
import { VectorResult } from './services/mockVector';
import { WebResult } from './services/mockWeb';
import { processWithAgent } from './services/agentService';
import { TransactionSummary } from './services/transactionService';

interface TraceStep {
  name: string;
  latency: number;
}

function formatTransactionTable(summary: TransactionSummary) {
  return {
    columns: ['ID', 'Client ID', 'Type', 'Amount', 'Status', 'Date'],
    rows: summary.transactions.map(t => ({
      'ID': t.id,
      'Client ID': t.client_id,
      'Type': t.type,
      'Amount': `$${parseFloat(t.tran_amt.toString()).toFixed(2)}`,
      'Status': t.tran_status,
      'Date': new Date(t.tran_date).toLocaleDateString(),
    })),
  };
}

export default function SimpleApp() {
  const [activeTab, setActiveTab] = useState<'chat' | 'data' | 'visual'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [traceDrawerOpen, setTraceDrawerOpen] = useState(false);
  const [currentTraceSteps, setCurrentTraceSteps] = useState<TraceStep[]>([]);
  const [currentCitations, setCurrentCitations] = useState<(VectorResult | WebResult)[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [enableVAD, setEnableVAD] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [lastClientId, setLastClientId] = useState<number | null>(null);
  const voiceControlsRef = React.useRef<any>(null);

  const [metrics, setMetrics] = useState({
    totalLatency: 0,
    sourcesUsed: [] as string[],
    citationsCount: 0,
    queriesCount: 0,
  });

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    const query = input;
    setInput('');
    setIsLoading(true);

    try {
      const response = await processWithAgent({
        query,
        metadata: { lastClientId }
      });
      console.log('Agent response:', response);

      if (response.metadata?.lastClientId) {
        setLastClientId(response.metadata.lastClientId);
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.content,
        intent: response.intent,
        sources: response.sources,
        citations: response.citations,
        table: response.tableData ? formatTransactionTable(response.tableData) : undefined,
        chart: response.chartData,
      };
      console.log('Assistant message:', assistantMessage);

      setCurrentTraceSteps(response.traceSteps);
      if (response.citations && response.citations.length > 0) {
        setCurrentCitations(response.citations);
      }

      setMetrics(prev => ({
        totalLatency: prev.totalLatency + response.metadata.totalLatency,
        sourcesUsed: [...prev.sourcesUsed, ...response.sources],
        citationsCount: prev.citationsCount + (response.citations?.length || 0),
        queriesCount: prev.queriesCount + 1,
      }));

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Agent error:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        intent: 'error',
        sources: [],
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleViewTrace = (messageId: string) => {
    setTraceDrawerOpen(true);
  };

  const handleQuickAction = (query: string) => {
    setInput(query);
  };

  const handleVoiceTranscript = async (text: string, skipAgentProcessing: boolean = false) => {
    setInput(text);

    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // When voice is enabled, OpenAI handles everything - don't process locally
    console.log('Voice transcript received:', text, 'isVoiceConnected:', isVoiceConnected, 'voiceEnabled:', voiceEnabled);
    if (voiceEnabled) {
      console.log('Voice mode active - OpenAI will handle response');
      return;
    }

    if (skipAgentProcessing) {
      console.log('Skipping agent processing - function call will handle response');
      return;
    }

    setIsLoading(true);

    try {
      const response = await processWithAgent({
        query: text,
        metadata: { lastClientId }
      });
      console.log('Voice Agent response:', response);

      if (response.metadata?.lastClientId) {
        setLastClientId(response.metadata.lastClientId);
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.content,
        intent: response.intent,
        sources: response.sources,
        citations: response.citations,
        table: response.tableData ? formatTransactionTable(response.tableData) : undefined,
        chart: response.chartData,
      };
      console.log('Voice Assistant message:', assistantMessage);

      setCurrentTraceSteps(response.traceSteps);
      if (response.citations && response.citations.length > 0) {
        setCurrentCitations(response.citations);
      }

      setMetrics(prev => ({
        totalLatency: prev.totalLatency + response.metadata.totalLatency,
        sourcesUsed: [...prev.sourcesUsed, ...response.sources],
        citationsCount: prev.citationsCount + (response.citations?.length || 0),
        queriesCount: prev.queriesCount + 1,
      }));

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Voice Agent error:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };


  const handleVoiceAssistantMessage = (text: string, sources?: any[], tableData?: any, chartData?: any) => {
    console.log('Voice assistant message with data:', text, sources, tableData, chartData);

    let formattedTable;
    let intent;

    if (tableData) {
      const summary = tableData.summary || tableData;
      if (summary.transactions && Array.isArray(summary.transactions)) {
        formattedTable = formatTransactionTable(summary);
        intent = 'transaction_query';
      }
    }

    if (chartData) {
      intent = 'chart';
    }

    if (sources?.includes('EMAIL')) {
      intent = 'email';
    }

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: text,
      sources: sources || ['OPENAI'],
      table: formattedTable,
      chart: chartData,
      intent: intent || 'general',
    };

    setMessages(prev => [...prev, assistantMessage]);
  };

  const toggleVoice = () => {
    const newVoiceEnabled = !voiceEnabled;
    setVoiceEnabled(newVoiceEnabled);
    if (!newVoiceEnabled) {
      setVoiceStatus('idle');
      setIsVoiceConnected(false);
      setIsListening(false);
      setIsSpeaking(false);
      setAudioLevel(0);
    }
  };

  const handleVoiceConnect = () => {
    if (voiceControlsRef.current?.connectToOpenAI) {
      voiceControlsRef.current.connectToOpenAI();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Voice Agentic RAG</h1>
              <p className="text-xs text-gray-500">
                {isVoiceConnected ? 'Voice-controlled multi-modal responses' : 'Smart routing • Multi-modal responses • Voice-enabled AI'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'chat'
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-medium">Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('visual')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'visual'
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">Visual Voice</span>
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'data'
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Database className="w-4 h-4" />
              <span className="text-sm font-medium">Data Index</span>
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'data' ? (
        <div className="flex-1 overflow-y-auto p-6">
          <DataIndex />
        </div>
      ) : activeTab === 'visual' ? (
        <div className="flex-1">
          <VisualVoiceAgent />
        </div>
      ) : (
        <>
          <VoiceControls
        ref={voiceControlsRef}
        onTranscript={handleVoiceTranscript}
        onAssistantMessage={handleVoiceAssistantMessage}
        isEnabled={voiceEnabled}
        onToggle={toggleVoice}
        onConnectionChange={setIsVoiceConnected}
        onStatusChange={setVoiceStatus}
        onListeningChange={setIsListening}
        onSpeakingChange={setIsSpeaking}
        onAudioLevelChange={setAudioLevel}
        selectedVoice={selectedVoice}
        enableVAD={enableVAD}
      />

      <div className="flex items-center justify-between px-6 py-3">
        <Toggles
          voiceEnabled={voiceEnabled}
          onVoiceToggle={toggleVoice}
          voiceStatus={voiceStatus}
          onVoiceConnect={handleVoiceConnect}
          isListening={isListening}
          isSpeaking={isSpeaking}
          audioLevel={audioLevel}
          selectedVoice={selectedVoice}
          onVoiceChange={setSelectedVoice}
          enableVAD={enableVAD}
          onVADChange={setEnableVAD}
        />
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg hover:from-violet-700 hover:to-fuchsia-700 transition-all shadow-sm"
        >
          <Upload className="w-4 h-4" />
          <span className="text-sm font-medium">Upload Document</span>
        </button>
      </div>

      {metrics.queriesCount > 0 && (
        <InsightsBar
          totalLatency={metrics.totalLatency}
          sourcesUsed={metrics.sourcesUsed}
          citationsCount={metrics.citationsCount}
          queriesCount={metrics.queriesCount}
        />
      )}

      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-2xl px-6">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Zap className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Ask anything, get structured answers
            </h2>
            <p className="text-gray-600 mb-6">
              Intelligent routing to the right data source with multi-modal rendering
            </p>
            {isVoiceConnected ? (
              <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200 rounded-xl p-8 max-w-lg mx-auto">
                <p className="text-lg font-semibold text-gray-800 mb-2">🎤 Voice Mode Active</p>
                <p className="text-gray-600">Speak naturally to ask questions, query data, or request charts</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-left">
              <button
                onClick={() => setInput('Show me top merchants by revenue')}
                className="p-4 bg-white rounded-lg border border-gray-200 hover:border-violet-300 transition-colors text-left"
              >
                <p className="text-sm font-medium text-gray-800">Top merchants analysis</p>
                <p className="text-xs text-gray-500 mt-1">→ SQL query</p>
              </button>
              <button
                onClick={() => setInput('Plot revenue trends for last 7 days')}
                className="p-4 bg-white rounded-lg border border-gray-200 hover:border-violet-300 transition-colors text-left"
              >
                <p className="text-sm font-medium text-gray-800">Revenue trend chart</p>
                <p className="text-xs text-gray-500 mt-1">→ Visualization</p>
              </button>
              <button
                onClick={() => setInput('What are the authentication best practices?')}
                className="p-4 bg-white rounded-lg border border-gray-200 hover:border-violet-300 transition-colors text-left"
              >
                <p className="text-sm font-medium text-gray-800">Security documentation</p>
                <p className="text-xs text-gray-500 mt-1">→ RAG search</p>
              </button>
              <button
                onClick={() => setInput('Check API health status')}
                className="p-4 bg-white rounded-lg border border-gray-200 hover:border-violet-300 transition-colors text-left"
              >
                <p className="text-sm font-medium text-gray-800">API monitoring</p>
                <p className="text-xs text-gray-500 mt-1">→ Status check</p>
              </button>
            </div>
            )}
          </div>
        </div>
      ) : (
        <ChatThread messages={messages} onViewTrace={handleViewTrace} isLoading={isLoading} />
      )}

      {!isVoiceConnected && (
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-3">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about data, docs, APIs, or request charts..."
                rows={1}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-5 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg hover:from-violet-700 hover:to-fuchsia-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send size={18} />
                <span className="font-medium">Send</span>
              </button>
          </div>
          <div className="flex items-center justify-center mt-2">
            <p className="text-xs text-gray-500">
              Enter to send • Shift+Enter for new line
            </p>
          </div>
        </div>
        </div>
      )}
        </>
      )}

      <SimpleTraceDrawer
        isOpen={traceDrawerOpen}
        onClose={() => setTraceDrawerOpen(false)}
        steps={currentTraceSteps}
        citations={currentCitations}
      />

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-gray-50 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm z-10"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
            <div className="p-8">
              <DocumentUpload
                onUploadComplete={() => {
                  setTimeout(() => setShowUploadModal(false), 1500);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
