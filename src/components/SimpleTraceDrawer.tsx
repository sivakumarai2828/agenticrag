import { X, Clock, CheckCircle } from 'lucide-react';
import { VectorResult } from '../services/mockVector';
import { WebResult } from '../services/mockWeb';

interface TraceStep {
  name: string;
  latency: number;
}

interface SimpleTraceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  steps: TraceStep[];
  citations?: (VectorResult | WebResult)[];
}

export default function SimpleTraceDrawer({ isOpen, onClose, steps, citations }: SimpleTraceDrawerProps) {
  if (!isOpen) return null;

  const totalLatency = steps.reduce((sum, step) => sum + step.latency, 0);

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Trace & Sources</h3>
          <p className="text-xs text-gray-500 mt-0.5">Total: {totalLatency}ms</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Execution Timeline</h4>
          <div className="space-y-3">
            {steps.map((step, idx) => {
              const widthPercent = (step.latency / totalLatency) * 100;
              return (
                <div key={idx} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle size={14} className="text-green-600" />
                      <span className="text-sm font-medium text-gray-800">{step.name}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-600">
                      <Clock size={12} />
                      <span>{step.latency}ms</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-violet-600 h-full rounded-full"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {citations && citations.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Sources ({citations.length})
            </h4>
            <div className="space-y-2">
              {citations.map((citation, idx) => {
                const similarity = 'similarity' in citation ? citation.similarity : undefined;
                return (
                  <div key={idx} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-800">
                        {citation.title}
                      </span>
                      {similarity !== undefined && (
                        <span className="text-xs font-bold text-violet-600">
                          {(similarity * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{citation.snippet}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
