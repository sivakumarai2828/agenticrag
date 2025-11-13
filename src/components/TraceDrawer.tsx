import { X, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface TraceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messageId?: string;
}

interface TraceStep {
  name: string;
  status: 'completed' | 'running' | 'error';
  startTime: number;
  endTime?: number;
  details?: string;
}

export default function TraceDrawer({ isOpen, onClose }: TraceDrawerProps) {
  if (!isOpen) return null;

  const mockTrace: TraceStep[] = [
    {
      name: 'Query Processing',
      status: 'completed',
      startTime: 0,
      endTime: 45,
      details: 'Parsed and validated user query',
    },
    {
      name: 'Query Expansion',
      status: 'completed',
      startTime: 45,
      endTime: 123,
      details: 'Generated 3 alternative queries with synonyms',
    },
    {
      name: 'Vector DB1 Search',
      status: 'completed',
      startTime: 123,
      endTime: 357,
      details: 'Retrieved 8 chunks, avg similarity: 0.87',
    },
    {
      name: 'Vector DB2 Search',
      status: 'completed',
      startTime: 123,
      endTime: 312,
      details: 'Retrieved 7 chunks, avg similarity: 0.82',
    },
    {
      name: 'Reranking',
      status: 'completed',
      startTime: 357,
      endTime: 489,
      details: 'Reranked 15 results to top 5',
    },
    {
      name: 'Context Assembly',
      status: 'completed',
      startTime: 489,
      endTime: 512,
      details: 'Assembled 5 chunks into context window',
    },
    {
      name: 'LLM Generation',
      status: 'completed',
      startTime: 512,
      endTime: 1734,
      details: 'Generated 247 tokens',
    },
    {
      name: 'Evaluation',
      status: 'completed',
      startTime: 1734,
      endTime: 2012,
      details: 'Relevance: 0.94, Grounding: 0.91, Faithfulness: 0.89',
    },
  ];

  const totalDuration = Math.max(...mockTrace.map(s => s.endTime || 0));

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Execution Trace</h2>
          <p className="text-sm text-gray-500 mt-1">Total: {totalDuration}ms</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {mockTrace.map((step, idx) => {
            const duration = step.endTime ? step.endTime - step.startTime : 0;
            const widthPercent = step.endTime ? (duration / totalDuration) * 100 : 0;

            return (
              <div key={idx} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {step.status === 'completed' && (
                      <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
                    )}
                    {step.status === 'running' && (
                      <Clock size={18} className="text-blue-600 flex-shrink-0 animate-spin" />
                    )}
                    {step.status === 'error' && (
                      <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
                    )}
                    <span className="text-sm font-semibold text-gray-800">{step.name}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-600">{duration}ms</span>
                </div>

                {step.details && (
                  <p className="text-xs text-gray-600 mb-3">{step.details}</p>
                )}

                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-violet-600 h-full rounded-full"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>Start: {step.startTime}ms</span>
                  {step.endTime && <span>End: {step.endTime}ms</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-6 border-t border-gray-200">
        <div className="bg-violet-50 rounded-lg p-4">
          <div className="text-sm font-medium text-violet-900 mb-2">Performance Summary</div>
          <div className="space-y-1 text-xs text-violet-700">
            <div className="flex justify-between">
              <span>Retrieval:</span>
              <span className="font-semibold">489ms (24%)</span>
            </div>
            <div className="flex justify-between">
              <span>Generation:</span>
              <span className="font-semibold">1222ms (61%)</span>
            </div>
            <div className="flex justify-between">
              <span>Evaluation:</span>
              <span className="font-semibold">278ms (14%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
