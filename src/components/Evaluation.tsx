import { Target, FileText } from 'lucide-react';

export default function Evaluation() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Target className="text-blue-500" size={24} />
          <h3 className="text-lg font-semibold">Evaluation Runs</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Run ID</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Timestamp</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Test Cases</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Grounding</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Faithfulness</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Relevance</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: 'eval-1847', time: '2 hours ago', cases: 50, grounding: 0.92, faithfulness: 0.89, relevance: 0.94, status: 'completed' },
                { id: 'eval-1846', time: '1 day ago', cases: 50, grounding: 0.88, faithfulness: 0.91, relevance: 0.87, status: 'completed' },
                { id: 'eval-1845', time: '2 days ago', cases: 50, grounding: 0.85, faithfulness: 0.87, relevance: 0.90, status: 'completed' },
                { id: 'eval-1844', time: '3 days ago', cases: 50, grounding: 0.90, faithfulness: 0.88, relevance: 0.92, status: 'completed' },
              ].map((run, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium">{run.id}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{run.time}</td>
                  <td className="py-3 px-4 text-sm">{run.cases}</td>
                  <td className="py-3 px-4">
                    <span className={`text-sm font-medium ${
                      run.grounding > 0.9 ? 'text-green-600' : run.grounding > 0.8 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {run.grounding.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-sm font-medium ${
                      run.faithfulness > 0.9 ? 'text-green-600' : run.faithfulness > 0.8 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {run.faithfulness.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-sm font-medium ${
                      run.relevance > 0.9 ? 'text-green-600' : run.relevance > 0.8 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {run.relevance.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                      {run.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
            Run New Evaluation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Grounding Score</h4>
          <p className="text-3xl font-semibold mb-1">0.92</p>
          <p className="text-xs text-green-600">+3% improvement</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Faithfulness Score</h4>
          <p className="text-3xl font-semibold mb-1">0.89</p>
          <p className="text-xs text-orange-600">-2% from last run</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div className="bg-orange-500 h-2 rounded-full" style={{ width: '89%' }}></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Relevance Score</h4>
          <p className="text-3xl font-semibold mb-1">0.94</p>
          <p className="text-xs text-green-600">+5% improvement</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '94%' }}></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FileText className="text-blue-500" size={24} />
          <h3 className="text-lg font-semibold">Evaluation Prompt Editor</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Evaluation Template</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>Grounding Assessment</option>
              <option>Faithfulness Check</option>
              <option>Relevance Scoring</option>
              <option>Custom Template</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prompt</label>
            <textarea
              rows={8}
              defaultValue={`Evaluate the following response for faithfulness to the source material:

Question: {question}
Retrieved Context: {context}
Generated Answer: {answer}

Rate the faithfulness on a scale of 0-1, where:
1.0 = Completely faithful, all claims supported by context
0.5 = Partially faithful, some unsupported claims
0.0 = Not faithful, contains hallucinations`}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          <div className="flex space-x-4">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Save Template
            </button>
            <button className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Test Prompt
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Failed Test Cases</h3>

        <div className="space-y-3">
          {[
            { id: 'tc-127', question: 'What is the refund policy?', score: 0.45, issue: 'Low grounding score' },
            { id: 'tc-238', question: 'How do I reset my password?', score: 0.52, issue: 'Incomplete retrieval' },
            { id: 'tc-391', question: 'What are the system requirements?', score: 0.48, issue: 'Low faithfulness' },
          ].map((test, idx) => (
            <div key={idx} className="border border-red-200 bg-red-50 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-mono text-gray-500">{test.id}</span>
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">{test.issue}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 mb-1">{test.question}</p>
                  <p className="text-xs text-gray-600">Score: {test.score}</p>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-700">View Details</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
