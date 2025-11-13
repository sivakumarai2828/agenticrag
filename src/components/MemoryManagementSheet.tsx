import { useState } from 'react';
import { X, Trash2, Download } from 'lucide-react';

interface MemoryManagementSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MemoryManagementSheet({ isOpen, onClose }: MemoryManagementSheetProps) {
  const [activeTab, setActiveTab] = useState<'session' | 'longterm' | 'redactions'>('session');

  if (!isOpen) return null;

  const handleExportConversation = () => {
    const mockData = [
      { role: 'user', content: 'Sample message 1', timestamp: new Date().toISOString() },
      { role: 'assistant', content: 'Sample response 1', timestamp: new Date().toISOString() },
    ];
    const blob = new Blob([mockData.map(m => JSON.stringify(m)).join('\n')], {
      type: 'application/jsonl',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${Date.now()}.jsonl`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Memory Management</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('session')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'session'
                ? 'text-violet-600 border-b-2 border-violet-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Session Memory
          </button>
          <button
            onClick={() => setActiveTab('longterm')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'longterm'
                ? 'text-violet-600 border-b-2 border-violet-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Long-term Memory
          </button>
          <button
            onClick={() => setActiveTab('redactions')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'redactions'
                ? 'text-violet-600 border-b-2 border-violet-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Redactions
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'session' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Current conversation context</p>
                <button className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={16} />
                  <span>Clear Session</span>
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="text-xs text-gray-500">Last updated: 2 minutes ago</div>
                <div className="text-sm text-gray-700">
                  <strong>Context:</strong> Discussion about API integration and security features
                </div>
                <div className="text-sm text-gray-700">
                  <strong>Key entities:</strong> REST API, GraphQL, SOC2, authentication
                </div>
              </div>
            </div>
          )}

          {activeTab === 'longterm' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Persistent context across sessions</p>
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-800">User Preferences</div>
                    <div className="text-xs text-gray-500">Last 30 days</div>
                  </div>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Preferred programming language: Python</li>
                    <li>• Focus area: API development</li>
                    <li>• Technical level: Advanced</li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-800">Project Context</div>
                    <div className="text-xs text-gray-500">Last 7 days</div>
                  </div>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Working on microservices architecture</li>
                    <li>• Using Kubernetes for deployment</li>
                    <li>• Focus on security compliance</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'redactions' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Manage sensitive information removal</p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm font-medium text-amber-800">Auto-detection enabled</span>
                </div>
                <p className="text-xs text-amber-700">
                  PII, API keys, and sensitive data are automatically detected and masked
                </p>
              </div>
              <div className="space-y-2">
                <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                  <div className="text-sm text-gray-700">Email addresses (3 detected)</div>
                  <button className="text-xs text-violet-600 hover:text-violet-700 font-medium">
                    Review
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                  <div className="text-sm text-gray-700">API keys (1 detected)</div>
                  <button className="text-xs text-violet-600 hover:text-violet-700 font-medium">
                    Review
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleExportConversation}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
          >
            <Download size={16} />
            <span>Export Conversation</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
