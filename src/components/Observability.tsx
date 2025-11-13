import { Activity, AlertTriangle } from 'lucide-react';

export default function Observability() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Activity className="text-blue-500" size={24} />
          <h3 className="text-lg font-semibold">Execution Traces</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Trace ID</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Timestamp</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Query</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Steps</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Duration</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: 'tr-8f7a9b', time: '10:23:45', query: 'How do I reset my password?', steps: 4, duration: '1.2s', status: 'success' },
                { id: 'tr-3c2d1e', time: '10:22:18', query: 'What are the pricing plans?', steps: 3, duration: '890ms', status: 'success' },
                { id: 'tr-9b4e5f', time: '10:20:52', query: 'Explain the API authentication', steps: 5, duration: '2.1s', status: 'warning' },
                { id: 'tr-7a1c8d', time: '10:19:33', query: 'System requirements for installation', steps: 4, duration: '1.5s', status: 'success' },
                { id: 'tr-4f2b9e', time: '10:18:07', query: 'Integration with third-party tools', steps: 6, duration: '3.2s', status: 'error' },
              ].map((trace, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50 cursor-pointer">
                  <td className="py-3 px-4 text-sm font-mono text-blue-600">{trace.id}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{trace.time}</td>
                  <td className="py-3 px-4 text-sm max-w-xs truncate">{trace.query}</td>
                  <td className="py-3 px-4 text-sm">{trace.steps}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{trace.duration}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      trace.status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : trace.status === 'warning'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {trace.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Trace Details: tr-8f7a9b</h3>

        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">1. Query Received</span>
              <span className="text-xs text-gray-500">0ms</span>
            </div>
            <p className="text-xs text-gray-600">Input: "How do I reset my password?"</p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">2. Retrieval</span>
              <span className="text-xs text-gray-500">234ms</span>
            </div>
            <p className="text-xs text-gray-600">Retrieved 5 chunks from knowledge-base collection</p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">3. Evaluation</span>
              <span className="text-xs text-gray-500">89ms</span>
            </div>
            <p className="text-xs text-gray-600">Relevance score: 0.94, Grounding score: 0.91</p>
          </div>

          <div className="border-l-4 border-green-500 pl-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">4. Response Generated</span>
              <span className="text-xs text-gray-500">877ms</span>
            </div>
            <p className="text-xs text-gray-600">Total duration: 1.2s</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-6">
          <AlertTriangle className="text-orange-500" size={24} />
          <h3 className="text-lg font-semibold">Active Alerts</h3>
        </div>

        <div className="space-y-3">
          {[
            { severity: 'warning', time: '5 min ago', message: 'Memory usage at 87% (high threshold)', source: 'Memory Monitor' },
            { severity: 'warning', time: '12 min ago', message: 'Retrieval latency increased by 15%', source: 'Performance Monitor' },
            { severity: 'info', time: '1 hour ago', message: 'Scheduled maintenance completed successfully', source: 'System' },
          ].map((alert, idx) => (
            <div key={idx} className={`border-l-4 p-4 rounded ${
              alert.severity === 'error'
                ? 'border-red-500 bg-red-50'
                : alert.severity === 'warning'
                ? 'border-yellow-500 bg-yellow-50'
                : 'border-blue-500 bg-blue-50'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      alert.severity === 'error'
                        ? 'bg-red-100 text-red-700'
                        : alert.severity === 'warning'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">{alert.time}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 mb-1">{alert.message}</p>
                  <p className="text-xs text-gray-600">Source: {alert.source}</p>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-700 ml-4">Acknowledge</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Latency Distribution</h3>
          <div className="space-y-3">
            {[
              { range: '0-500ms', percentage: 45, color: 'bg-green-500' },
              { range: '500-1000ms', percentage: 30, color: 'bg-blue-500' },
              { range: '1000-2000ms', percentage: 18, color: 'bg-orange-500' },
              { range: '2000ms+', percentage: 7, color: 'bg-red-500' },
            ].map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{item.range}</span>
                  <span className="font-medium">{item.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Error Breakdown</h3>
          <div className="space-y-3">
            {[
              { type: 'Retrieval Timeout', count: 12, percentage: 40 },
              { type: 'Tool Execution Failed', count: 8, percentage: 27 },
              { type: 'Rate Limit Exceeded', count: 6, percentage: 20 },
              { type: 'Other', count: 4, percentage: 13 },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{item.type}</span>
                    <span className="text-gray-500">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${item.percentage}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Monitoring Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Trace Retention</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>7 days</option>
              <option>14 days</option>
              <option>30 days</option>
              <option>90 days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Alert Threshold</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>Critical only</option>
              <option>Warning and above</option>
              <option>Info and above</option>
              <option>All levels</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm text-gray-700">Enable real-time monitoring</span>
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm text-gray-700">Send alert notifications</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
