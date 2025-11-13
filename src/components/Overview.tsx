import { Activity, Clock, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';

export default function Overview() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Requests</p>
              <p className="text-3xl font-semibold mt-2">12,847</p>
              <p className="text-sm text-green-600 mt-1">+18% from last week</p>
            </div>
            <Activity className="text-blue-500" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Latency</p>
              <p className="text-3xl font-semibold mt-2">247ms</p>
              <p className="text-sm text-green-600 mt-1">-12% improvement</p>
            </div>
            <Clock className="text-green-500" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Monthly Cost</p>
              <p className="text-3xl font-semibold mt-2">$342</p>
              <p className="text-sm text-orange-600 mt-1">+5% from last month</p>
            </div>
            <DollarSign className="text-orange-500" size={40} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="text-green-500" size={24} />
            <div>
              <p className="font-medium">Retriever</p>
              <p className="text-sm text-gray-500">Operational</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="text-green-500" size={24} />
            <div>
              <p className="font-medium">Evaluator</p>
              <p className="text-sm text-gray-500">Operational</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <AlertCircle className="text-yellow-500" size={24} />
            <div>
              <p className="font-medium">Memory</p>
              <p className="text-sm text-gray-500">High Usage (87%)</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="text-green-500" size={24} />
            <div>
              <p className="font-medium">Tools</p>
              <p className="text-sm text-gray-500">4/4 Active</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { time: '2 min ago', action: 'Query processed', status: 'success' },
              { time: '5 min ago', action: 'Index updated', status: 'success' },
              { time: '12 min ago', action: 'Evaluation completed', status: 'success' },
              { time: '18 min ago', action: 'Tool execution', status: 'warning' },
              { time: '23 min ago', action: 'Query processed', status: 'success' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div>
                  <p className="text-sm font-medium">{item.action}</p>
                  <p className="text-xs text-gray-500">{item.time}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  item.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Cache Hit Rate</span>
                <span className="font-medium">78%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '78%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Retrieval Accuracy</span>
                <span className="font-medium">92%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Tool Success Rate</span>
                <span className="font-medium">85%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
