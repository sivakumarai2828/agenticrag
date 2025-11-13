import { Wrench, Play } from 'lucide-react';

export default function Tools() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Wrench className="text-blue-500" size={24} />
          <h3 className="text-lg font-semibold">Tool Registry</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Authentication</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Last Used</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Success Rate</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'web-search', type: 'API', auth: 'API Key', lastUsed: '2 min ago', successRate: '98%', status: 'active' },
                { name: 'calculator', type: 'Built-in', auth: 'None', lastUsed: '15 min ago', successRate: '100%', status: 'active' },
                { name: 'database-query', type: 'Database', auth: 'OAuth', lastUsed: '1 hour ago', successRate: '94%', status: 'active' },
                { name: 'code-executor', type: 'Sandbox', auth: 'Token', lastUsed: '3 hours ago', successRate: '89%', status: 'active' },
                { name: 'email-sender', type: 'API', auth: 'API Key', lastUsed: '1 day ago', successRate: '96%', status: 'inactive' },
              ].map((tool, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium">{tool.name}</td>
                  <td className="py-3 px-4 text-sm">{tool.type}</td>
                  <td className="py-3 px-4 text-sm">{tool.auth}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{tool.lastUsed}</td>
                  <td className="py-3 px-4 text-sm">
                    <span className={`${
                      parseInt(tool.successRate) > 95 ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {tool.successRate}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      tool.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {tool.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
            + Add New Tool
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Play className="text-green-500" size={24} />
          <h3 className="text-lg font-semibold">Tool Tester</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Tool</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>web-search</option>
              <option>calculator</option>
              <option>database-query</option>
              <option>code-executor</option>
              <option>email-sender</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Input Parameters (JSON)</label>
            <textarea
              rows={6}
              placeholder='{\n  "query": "latest AI research papers",\n  "max_results": 5\n}'
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Execute Tool
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Execution Results</h3>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Success</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Execution Time:</span>
            <span className="text-sm text-gray-600">324ms</span>
          </div>
          <div className="border-t pt-3 mt-3">
            <p className="text-sm font-medium text-gray-700 mb-2">Response:</p>
            <pre className="bg-white p-3 rounded border text-xs overflow-x-auto">
{`{
  "results": [
    {
      "title": "Advances in Large Language Models",
      "url": "https://arxiv.org/...",
      "date": "2024-10-15"
    },
    {
      "title": "Retrieval-Augmented Generation Techniques",
      "url": "https://arxiv.org/...",
      "date": "2024-10-12"
    }
  ],
  "total": 5
}`}
            </pre>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Tool Usage Analytics</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Executions</p>
            <p className="text-2xl font-semibold">3,247</p>
            <p className="text-xs text-green-600 mt-1">+12% this week</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Avg Execution Time</p>
            <p className="text-2xl font-semibold">287ms</p>
            <p className="text-xs text-green-600 mt-1">-8% improvement</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Error Rate</p>
            <p className="text-2xl font-semibold">3.2%</p>
            <p className="text-xs text-orange-600 mt-1">+0.5% from last week</p>
          </div>
        </div>
      </div>
    </div>
  );
}
