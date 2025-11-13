import { Brain, Download } from 'lucide-react';

export default function Memory() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-blue-500">
          <div className="flex items-center space-x-3 mb-4">
            <Brain className="text-blue-500" size={32} />
            <h3 className="text-lg font-semibold">Short-Term Memory</h3>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Stores conversation context and recent interactions within the current session
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Active Sessions</span>
              <span className="text-sm font-semibold">23</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Memory Usage</span>
              <span className="text-sm font-semibold">124 MB</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Avg Context Length</span>
              <span className="text-sm font-semibold">2,847 tokens</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Retention Period</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>1 hour</option>
                <option>4 hours</option>
                <option>24 hours</option>
                <option>Until session end</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max Context Window</label>
              <input
                type="number"
                defaultValue="8192"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <button className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm">
              Clear Short-Term Memory
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-green-500">
          <div className="flex items-center space-x-3 mb-4">
            <Brain className="text-green-500" size={32} />
            <h3 className="text-lg font-semibold">Long-Term Memory</h3>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Persists important facts, user preferences, and historical interactions
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Total Entries</span>
              <span className="text-sm font-semibold">1,247</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Storage Used</span>
              <span className="text-sm font-semibold">43 MB</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Last Updated</span>
              <span className="text-sm font-semibold">5 min ago</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Persistence Strategy</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                <option>Auto-save (5 min)</option>
                <option>Manual save only</option>
                <option>After each session</option>
                <option>Real-time sync</option>
              </select>
            </div>
            <div>
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-gray-700">Enable automatic pruning</span>
              </label>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t flex space-x-2">
            <button className="flex-1 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm flex items-center justify-center space-x-1">
              <Download size={16} />
              <span>Export</span>
            </button>
            <button className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
              Archive
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Memory Entries</h3>

        <div className="space-y-3">
          {[
            { type: 'short', time: '2 min ago', content: 'User asked about pricing plans', relevance: 'high' },
            { type: 'short', time: '5 min ago', content: 'Retrieved 5 documents about product features', relevance: 'medium' },
            { type: 'long', time: '15 min ago', content: 'User preference: prefers technical explanations', relevance: 'high' },
            { type: 'short', time: '18 min ago', content: 'Query: "How do I integrate the API?"', relevance: 'medium' },
            { type: 'long', time: '1 hour ago', content: 'Fact: User is a software engineer at TechCorp', relevance: 'high' },
            { type: 'short', time: '1 hour ago', content: 'Tool execution: web-search for latest documentation', relevance: 'low' },
          ].map((entry, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    entry.type === 'short'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {entry.type === 'short' ? 'Short-term' : 'Long-term'}
                  </span>
                  <span className="text-xs text-gray-500">{entry.time}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  entry.relevance === 'high'
                    ? 'bg-red-100 text-red-700'
                    : entry.relevance === 'medium'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {entry.relevance}
                </span>
              </div>
              <p className="text-sm text-gray-700">{entry.content}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Memory Search</h3>

        <div className="space-y-4">
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="Search memory entries..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Search
            </button>
          </div>

          <div className="flex space-x-4">
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>All Types</option>
              <option>Short-term only</option>
              <option>Long-term only</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>All Relevance</option>
              <option>High relevance</option>
              <option>Medium relevance</option>
              <option>Low relevance</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>Last 24 hours</option>
              <option>Last week</option>
              <option>Last month</option>
              <option>All time</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Memory Analytics</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Memory Hit Rate</p>
            <p className="text-2xl font-semibold">76%</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '76%' }}></div>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Avg Retrieval Time</p>
            <p className="text-2xl font-semibold">34ms</p>
            <p className="text-xs text-green-600 mt-1">-15% improvement</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Storage Efficiency</p>
            <p className="text-2xl font-semibold">87%</p>
            <p className="text-xs text-green-600 mt-1">Optimized</p>
          </div>
        </div>
      </div>
    </div>
  );
}
