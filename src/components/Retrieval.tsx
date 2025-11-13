import { Search, Sliders } from 'lucide-react';

export default function Retrieval() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Search className="text-blue-500" size={24} />
          <h3 className="text-lg font-semibold">Retrieval Configuration</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Retrieval Mode</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>Vector Search</option>
              <option>BM25 (Keyword)</option>
              <option>Hybrid (Vector + BM25)</option>
              <option>Semantic Reranking</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Top-K Results</label>
            <input
              type="number"
              defaultValue="5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Number of chunks to retrieve</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Similarity Threshold</label>
            <input
              type="number"
              step="0.1"
              defaultValue="0.7"
              min="0"
              max="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum similarity score</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Sliders className="text-blue-500" size={24} />
          <h3 className="text-lg font-semibold">Filters & Parameters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Collection Filter</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>All Collections</option>
              <option>product-docs</option>
              <option>customer-support</option>
              <option>knowledge-base</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>Any Time</option>
              <option>Last 24 Hours</option>
              <option>Last Week</option>
              <option>Last Month</option>
              <option>Last Year</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Metadata Filters (JSON)</label>
            <textarea
              rows={3}
              placeholder='{"category": "technical", "status": "published"}'
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Test Query</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Enter your test query</label>
            <textarea
              rows={3}
              placeholder="What are the system requirements for installation?"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Run Test Query
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Retrieved Results</h3>

        <div className="space-y-4">
          {[
            { rank: 1, score: 0.94, collection: 'product-docs', preview: 'The minimum system requirements include 4GB RAM, 10GB disk space...' },
            { rank: 2, score: 0.89, collection: 'product-docs', preview: 'For optimal performance, we recommend 8GB RAM and SSD storage...' },
            { rank: 3, score: 0.82, collection: 'knowledge-base', preview: 'Installation steps: 1. Download the installer 2. Run as administrator...' },
            { rank: 4, score: 0.78, collection: 'customer-support', preview: 'Common installation issues can be resolved by ensuring all dependencies...' },
            { rank: 5, score: 0.75, collection: 'product-docs', preview: 'Supported operating systems include Windows 10+, macOS 12+, Ubuntu 20.04+...' },
          ].map((item) => (
            <div key={item.rank} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-semibold text-sm">
                    {item.rank}
                  </span>
                  <div>
                    <span className="text-xs text-gray-500">Score: </span>
                    <span className="text-sm font-semibold text-gray-700">{item.score}</span>
                  </div>
                </div>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                  {item.collection}
                </span>
              </div>
              <p className="text-sm text-gray-700">{item.preview}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
