import { useState, KeyboardEvent, useMemo, useRef } from 'react';
import { Send, Upload, X, Database, Scan, Search, Sparkles, Mic } from 'lucide-react';
import VoiceControls from './components/VoiceControls';
import ChatThread, { Message } from './components/ChatThread';
import SimpleTraceDrawer from './components/SimpleTraceDrawer';
import DocumentUpload from './components/DocumentUpload';
import AgentActivityPanel, { ActivityStep } from './components/AgentActivityPanel';
import NexaOrb from './components/NexaOrb';
import DocumentsTable from './components/DocumentsTable';
import { VectorResult } from './services/mockVector';
import { WebResult } from './services/mockWeb';
import { processWithAgent } from './services/agentService';
import { TransactionSummary } from './services/transactionService';
import { IntentType } from './router/intentRouter';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import { LogOut } from 'lucide-react';
import { generateId } from './utils/id';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [traceDrawerOpen, setTraceDrawerOpen] = useState(false);
  const [currentTraceSteps, setCurrentTraceSteps] = useState<TraceStep[]>([]);
  const [currentCitations, setCurrentCitations] = useState<(VectorResult | WebResult)[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [, setVoiceStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [selectedVoice] = useState('alloy');
  const [enableVAD] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [lastClientId, setLastClientId] = useState<number | null>(null);
  const [queryCount, setQueryCount] = useState(0);
  const { user, loading: authLoading, signOut } = useAuth();
  const voiceControlsRef = useRef<any>(null);

  const orbState = useMemo(() => {
    if (isListening) return 'listening';
    if (isSpeaking) return 'speaking';
    if (isLoading) return 'thinking';
    return 'idle';
  }, [isListening, isSpeaking, isLoading]);

  const activitySteps: ActivityStep[] = useMemo(() => [
    { id: 'intent', label: 'Intent Analysis', status: completedSteps.includes('intent') ? 'completed' : activeStepId === 'intent' ? 'active' : 'pending', icon: Scan },
    { id: 'retrieval', label: 'Retrieval & Tools', status: completedSteps.includes('retrieval') ? 'completed' : activeStepId === 'retrieval' ? 'active' : 'pending', icon: Search },
    { id: 'synthesis', label: 'Response Synthesis', status: completedSteps.includes('synthesis') ? 'completed' : activeStepId === 'synthesis' ? 'active' : 'pending', icon: Sparkles },
  ], [activeStepId, completedSteps]);

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleSidebarTask = (query: string) => {
    setInput(query);
  };

  const isAdmin = user?.email === 'sivakumarai2828@gmail.com';
  const queryLimit = 10;
  const isOverLimit = !isAdmin && queryCount >= queryLimit;

  const handleSend = async () => {
    if (!input.trim() || isLoading || isProcessing) return;

    if (isOverLimit) {
      alert(`You've reached the limit of ${queryLimit} queries for this session. Please contact the administrator for full access.`);
      return;
    }

    const queryText = input.trim();
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: queryText,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsProcessing(true);

    // Start activity tracking
    setCompletedSteps([]);
    setActiveStepId('intent');

    try {
      // Step transitions
      setTimeout(() => {
        setCompletedSteps(['intent']);
        setActiveStepId('retrieval');
      }, 600);

      const response = await processWithAgent({
        query: queryText,
        conversationId: generateId(),
        metadata: {
          email: user.email
        }
      });

      // Move to synthesis
      setCompletedSteps(['intent', 'retrieval']);
      setActiveStepId('synthesis');

      setTimeout(() => {
        setCompletedSteps(['intent', 'retrieval', 'synthesis']);
        setActiveStepId(null);
      }, 800);

      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: response.content,
        intent: response.intent as IntentType,
        sources: response.sources,
        citations: response.citations,
        chart: response.chartData,
        table: response.tableData ? formatTransactionTable(response.tableData) : undefined,
        traceSteps: response.traceSteps
      }]);

      setCurrentTraceSteps(response.traceSteps || []);
      setCurrentCitations(response.citations || []);
      setQueryCount(prev => prev + 1);
    } catch (error) {
      setActiveStepId(null);
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }]);
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const handleActivityStart = (stepId: string) => {
    setActiveStepId(stepId);
    if (stepId === 'intent') setCompletedSteps([]);
  };

  const handleActivityComplete = (stepId: string) => {
    setCompletedSteps(prev => [...new Set([...prev, stepId])]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };


  const handleVoiceTranscript = async (text: string, skipAgentProcessing: boolean = false) => {
    if (!text.trim() || isLoading) return;

    if (isOverLimit) {
      alert(`You've reached the limit of ${queryLimit} queries for this session.`);
      return;
    }

    // Suppress user voice transcripts from the UI entirely per user request
    if (voiceEnabled) return;
    if (skipAgentProcessing) return;

    setIsLoading(true);
    setCompletedSteps([]);
    setActiveStepId('intent');

    try {
      setTimeout(() => {
        setCompletedSteps(['intent']);
        setActiveStepId('retrieval');
      }, 600);

      const response = await processWithAgent({
        query: text,
        metadata: { lastClientId }
      });

      setCompletedSteps(['intent', 'retrieval']);
      setActiveStepId('synthesis');

      setTimeout(() => {
        setCompletedSteps(['intent', 'retrieval', 'synthesis']);
        setActiveStepId(null);
      }, 800);

      if (response.metadata?.lastClientId) {
        setLastClientId(response.metadata.lastClientId);
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: response.content,
        intent: response.intent as IntentType,
        sources: response.sources,
        citations: response.citations,
        table: response.tableData ? formatTransactionTable(response.tableData) : undefined,
        chart: response.chartData,
      };

      setCurrentTraceSteps(response.traceSteps);
      setMessages(prev => [...prev, assistantMessage]);
      setQueryCount(prev => prev + 1);
    } catch (error) {
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, I encountered an error.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceAssistantMessage = (text: string, sources?: any[], tableData?: any, chartData?: any, traceSteps?: any[]) => {
    if (isProcessing) return; // Prevent duplicate if text query is already processing

    let formattedTable;
    let finalIntent: IntentType = 'general';

    if (tableData) {
      const summary = tableData.summary || tableData;
      if (summary.transactions && Array.isArray(summary.transactions)) {
        formattedTable = formatTransactionTable(summary);
        finalIntent = 'transaction_query';
      }
    }

    if (chartData) finalIntent = 'transaction_chart';
    if (sources?.includes('EMAIL')) finalIntent = 'transaction_email';

    const assistantMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: text,
      sources: sources || ['OPENAI'],
      table: formattedTable,
      chart: chartData,
      intent: finalIntent,
      traceSteps: traceSteps || [{ name: 'Nexa Voice API', latency: 450 }],
    };

    if (traceSteps) setCurrentTraceSteps(traceSteps);
    setMessages(prev => [...prev, assistantMessage]);
  };

  return (
    <div className="flex h-screen overflow-hidden text-slate-700 bg-transparent selection:bg-purple-100">
      {/* Left Sidebar: Capability Task Cards */}
      <aside className="w-72 glass-panel p-6 flex flex-col space-y-6 hidden lg:flex border-r border-white/20">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-base font-black tracking-tight text-slate-800">Voice Agentic RAG</span>
          </div>
        </div>

        <div className="relative mb-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50/50 border border-slate-200/50 rounded-xl text-sm focus:ring-2 focus:ring-purple-100 outline-none transition-all placeholder:text-slate-400 font-medium"
          />
        </div>

        <div className="space-y-3">
          {[
            { id: 'docs', label: 'Ask Documents', icon: Database, color: 'bg-blue-400', query: 'What policies are in the documents?' },
            { id: 'info', label: 'Get Live Info', icon: Search, color: 'bg-orange-400', query: 'Get live info on Seattle weather' },
            { id: 'reports', label: 'Analyze Reports', icon: Scan, color: 'bg-purple-500', query: 'Analyze the latest transaction reports' },
            { id: 'trans', label: 'Check Transactions', icon: Database, color: 'bg-amber-400', query: 'Show me my recent transactions' },
            { id: 'web', label: 'Web Search', icon: Search, color: 'bg-slate-500', query: 'Search the web for latest AI news' }
          ].map((task) => (
            <button
              key={task.id}
              onClick={() => handleSidebarTask(task.query)}
              className="w-full flex items-center space-x-3 p-2.5 bg-white/40 hover:bg-white border border-white/40 rounded-2xl transition-all shadow-sm group"
            >
              <div className={`p-2 ${task.color} text-white rounded-lg shadow-sm group-hover:scale-110 transition-transform`}>
                <task.icon className="w-4 h-4" strokeWidth={2.5} />
              </div>
              <span className="text-[14px] font-bold text-slate-600 tracking-tight">{task.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto p-5 bg-white/60 rounded-3xl border border-slate-100 relative overflow-hidden group shadow-sm">
          <p className="text-xs font-black text-slate-800 mb-1 uppercase tracking-widest">Enterprise Core</p>
          <p className="text-[10px] text-slate-500 leading-relaxed font-bold">Personalized Support Engine.</p>
        </div>
      </aside>

      {/* Main Content: The Agent Canvas */}
      <main className="flex-1 relative flex flex-col min-w-0 bg-transparent">
        {/* Unified White Header */}
        <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-white/50 sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 bg-clip-text text-transparent">Voice Agentic RAG</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl border border-slate-200/50 text-sm font-bold shadow-sm">
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`p-1 rounded-lg transition-colors ${voiceEnabled ? 'text-purple-600 bg-purple-50' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Mic size={16} />
              </button>
              <span className="cursor-default select-none">Voice</span>
            </div>
            <button
              onClick={() => setShowDataModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl border border-slate-200/50 text-sm font-bold shadow-sm transition-all hover:bg-white"
            >
              <Database size={16} className="text-slate-400" />
              <span>Data</span>
            </button>
            <button
              onClick={() => signOut()}
              className="flex items-center space-x-2 px-4 py-2 bg-white text-slate-600 rounded-xl border border-slate-200/50 text-sm font-bold shadow-sm transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-100"
              title={`Logged in as ${user.email}`}
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
            <button
              onClick={() => setTraceDrawerOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-200 text-sm font-extrabold transition-all"
            >
              <div className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] uppercase">Trace</div>
            </button>
          </div>
        </header>

        {/* Chat Transcript Area */}
        <div className="flex-1 overflow-y-auto p-10 space-y-12 scroll-smooth custom-scrollbar">
          {orbState !== 'idle' && (
            <div className="flex flex-col items-center justify-center py-24 animate-fadeIn">
              <NexaOrb state={orbState} audioLevel={audioLevel} />
              <p className="mt-8 text-[11px] font-black text-purple-600 uppercase tracking-[0.5em] animate-pulse">
                {isListening ? 'Synchronizing' : isSpeaking ? 'Broadcasting' : 'Synthesizing'}
              </p>
            </div>
          )}

          <div className="max-w-4xl mx-auto w-full">
            {messages.length === 0 && orbState === 'idle' ? (
              <div className="flex flex-col items-center justify-center py-24 text-center animate-fadeIn">
                <div className="glass-card rounded-[3rem] p-16 max-w-5xl w-full">
                  <h1 className="text-6xl font-black mb-4 tracking-tighter leading-[1.1] bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 bg-clip-text text-transparent">
                    Voice-Enabled Agentic AI
                  </h1>
                  <h2 className="text-4xl font-bold text-slate-700 mb-8 tracking-tight">
                    Grounded, Secure, and Traceable
                  </h2>
                  <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
                    Query documents, retrieve live data, and execute verified actions — by voice or chat, with full visibility into every step.
                  </p>

                  <div className="flex items-center justify-center space-x-6 mb-16">
                    <button
                      onClick={() => {
                        if (voiceEnabled) {
                          setVoiceEnabled(false);
                          voiceControlsRef.current?.cleanup();
                        } else {
                          setVoiceEnabled(true);
                          setTimeout(() => {
                            voiceControlsRef.current?.connectToOpenAI();
                          }, 100);
                        }
                      }}
                      className={`px-10 py-4 ${voiceEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-2xl text-lg font-black shadow-xl shadow-purple-200 transition-all active:scale-95`}
                    >
                      {voiceEnabled ? 'Stop Voice Demo' : 'Start Voice Demo'}
                    </button>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="px-10 py-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl text-lg font-black border border-slate-200 transition-all active:scale-95"
                    >
                      Upload Document
                    </button>
                  </div>

                  <div className="flex flex-wrap justify-center gap-4">
                    {[
                      { label: 'Grounded Answers', color: 'bg-blue-400' },
                      { label: 'Tool-Calling', color: 'bg-blue-400' },
                      { label: 'PII/PCI Guardrails', color: 'bg-blue-400' },
                      { label: 'Agent Trace', color: 'bg-blue-400' }
                    ].map((badge) => (
                      <div key={badge.label} className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-100 rounded-full shadow-sm">
                        <div className={`w-2 h-2 rounded-full ${badge.color}`} />
                        <span className="text-[13px] font-bold text-slate-500">{badge.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <ChatThread
                messages={messages}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>

        {/* Floating Input Terminal */}
        <div className="px-8 pb-8">
          <div className="max-w-4xl mx-auto w-full space-y-4">
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 bg-white text-slate-800 text-[13px] font-black rounded-lg border border-slate-100 hover:bg-slate-50 transition-all shadow-sm">
                Try asking
              </button>
              <button className="px-4 py-2 bg-white text-slate-400 text-[13px] font-bold rounded-lg border border-slate-100/50 hover:border-slate-300 transition-all">
                • What's the weather in Seattle today?
              </button>
              <button className="px-4 py-2 bg-white text-slate-400 text-[13px] font-bold rounded-lg border border-slate-100/50 hover:border-slate-300 transition-all">
                • Show last 5 transactions
              </button>
            </div>

            <div className="bg-white border border-[#EBE8FF] rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-purple-100 transition-all overflow-hidden relative">
              <div className="flex items-center px-4">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isOverLimit ? "Query limit reached..." : "Ask about documents, live data, transactions, or reports..."}
                  rows={1}
                  disabled={isOverLimit}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-slate-700 placeholder:text-slate-400 font-bold py-6 text-[15px] resize-none min-h-[70px] disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 font-black transition-colors px-2 py-2"
                >
                  <Send size={20} />
                  <span>Send</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center space-x-2 px-5 py-3 bg-[#F4F4F9] text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all text-[13px] font-black"
                >
                  <Upload size={18} />
                  <span>Upload Doc</span>
                </button>
                <button
                  onClick={() => {
                    if (voiceEnabled) {
                      setVoiceEnabled(false);
                      voiceControlsRef.current?.cleanup();
                    } else {
                      setVoiceEnabled(true);
                      setTimeout(() => {
                        voiceControlsRef.current?.connectToOpenAI();
                      }, 100);
                    }
                  }}
                  className={`flex items-center space-x-2 px-5 py-2.5 ${voiceEnabled ? 'bg-red-50 text-red-600 border-red-200' : 'bg-[#F4F4F9] text-slate-600 border-slate-200'} rounded-xl border transition-all text-[13px] font-black`}
                >
                  <Mic size={18} />
                  <span>{voiceEnabled ? 'Stop' : 'Speak'}</span>
                </button>
                <button className="flex items-center space-x-2 px-5 py-3 bg-[#F4F4F9] text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all text-[13px] font-black">
                  <Search size={18} />
                  <span>Explain Reasoning</span>
                </button>
              </div>

              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="flex items-center space-x-2 px-10 py-3.5 bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-900/20 hover:bg-purple-700 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 font-black"
              >
                <Send size={20} />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      <aside className={`w-[340px] bg-white border-l border-slate-100 flex flex-col transition-all duration-500 ease-in-out z-10 ${messages.length > 0 ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <AgentActivityPanel
          steps={activitySteps}
          className="h-full border-none shadow-none bg-transparent"
        />
      </aside>

      {/* Voice Controls Background Service */}
      <div className="hidden">
        <VoiceControls
          ref={voiceControlsRef}
          onTranscript={handleVoiceTranscript}
          onAssistantMessage={handleVoiceAssistantMessage}
          onActivityStart={handleActivityStart}
          onActivityComplete={handleActivityComplete}
          isEnabled={voiceEnabled}
          onToggle={() => setVoiceEnabled(!voiceEnabled)}
          onStatusChange={setVoiceStatus}
          onListeningChange={setIsListening}
          onSpeakingChange={setIsSpeaking}
          onAudioLevelChange={setAudioLevel}
          selectedVoice={selectedVoice}
          enableVAD={enableVAD}
        />
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fadeIn">
          <div className="glass-card rounded-[3rem] max-w-4xl w-full max-h-[90vh] overflow-hidden relative shadow-2xl p-1 border-purple-100">
            <div className="bg-white rounded-[2.8rem] h-full overflow-hidden p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Knowledge Ingestion</h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <DocumentUpload onUploadComplete={() => setTimeout(() => setShowUploadModal(false), 1500)} />
            </div>
          </div>
        </div>
      )}

      {/* Data Modal */}
      {showDataModal && (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fadeIn">
          <div className="glass-card rounded-[3rem] max-w-5xl w-full max-h-[90vh] overflow-hidden relative shadow-2xl p-1 border-purple-100">
            <div className="bg-white rounded-[2.8rem] h-full overflow-hidden p-8 flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Knowledge Base</h2>
                <button
                  onClick={() => setShowDataModal(false)}
                  className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <DocumentsTable />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trace Drawer */}
      <SimpleTraceDrawer
        isOpen={traceDrawerOpen}
        onClose={() => setTraceDrawerOpen(false)}
        steps={currentTraceSteps}
        citations={currentCitations}
      />
    </div>
  );
}
