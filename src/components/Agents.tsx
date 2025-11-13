import { Bot, CheckCircle, Settings } from 'lucide-react';

export default function Agents() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Bot className="text-blue-500" size={32} />
              <h3 className="text-lg font-semibold">Retriever Agent</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Searches and retrieves relevant document chunks from the vector store
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max Retries</label>
              <input
                type="number"
                defaultValue="3"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Timeout (ms)</label>
              <input
                type="number"
                defaultValue="5000"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t flex items-center text-xs text-green-600">
            <CheckCircle size={16} className="mr-1" />
            Operational
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Bot className="text-green-500" size={32} />
              <h3 className="text-lg font-semibold">Evaluator Agent</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Assesses quality and relevance of retrieved results and generated responses
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Relevance Threshold</label>
              <input
                type="number"
                step="0.1"
                defaultValue="0.7"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Evaluation Model</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                <option>gpt-4</option>
                <option>claude-3</option>
                <option>custom</option>
              </select>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t flex items-center text-xs text-green-600">
            <CheckCircle size={16} className="mr-1" />
            Operational
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Bot className="text-purple-500" size={32} />
              <h3 className="text-lg font-semibold">Planner Agent</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Orchestrates multi-step reasoning and tool usage based on query complexity
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max Steps</label>
              <input
                type="number"
                defaultValue="5"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Strategy</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                <option>ReAct</option>
                <option>Chain-of-Thought</option>
                <option>Tree-of-Thoughts</option>
              </select>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t flex items-center text-xs text-green-600">
            <CheckCircle size={16} className="mr-1" />
            Operational
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Settings className="text-gray-600" size={24} />
          <h3 className="text-lg font-semibold">Global Agent Settings</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Error Handling Policy</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>Fail Fast</option>
              <option>Retry with Backoff</option>
              <option>Graceful Degradation</option>
              <option>Circuit Breaker</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logging Level</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>DEBUG</option>
              <option>INFO</option>
              <option>WARNING</option>
              <option>ERROR</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm text-gray-700">Enable inter-agent communication</span>
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm text-gray-700">Enable agent memory persistence</span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Agent Execution History</h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Timestamp</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Agent</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Action</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Duration</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { time: '10:23:45', agent: 'Planner', action: 'Query decomposition', duration: '127ms', status: 'success' },
                { time: '10:23:46', agent: 'Retriever', action: 'Vector search', duration: '234ms', status: 'success' },
                { time: '10:23:47', agent: 'Evaluator', action: 'Relevance scoring', duration: '89ms', status: 'success' },
                { time: '10:23:48', agent: 'Planner', action: 'Response synthesis', duration: '456ms', status: 'success' },
              ].map((item, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-500">{item.time}</td>
                  <td className="py-3 px-4 text-sm font-medium">{item.agent}</td>
                  <td className="py-3 px-4 text-sm">{item.action}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{item.duration}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
