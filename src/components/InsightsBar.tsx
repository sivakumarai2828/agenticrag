import { Clock, Database, FileText, TrendingUp } from 'lucide-react';

interface InsightsBarProps {
  totalLatency: number;
  sourcesUsed: string[];
  citationsCount: number;
  queriesCount: number;
}

export default function InsightsBar({
  totalLatency,
  sourcesUsed,
  citationsCount,
  queriesCount,
}: InsightsBarProps) {
  const uniqueSources = Array.from(new Set(sourcesUsed));

  return (
    <div className="px-6 py-3 bg-gradient-to-r from-violet-50 to-fuchsia-50 border-b border-violet-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Clock size={16} className="text-violet-600" />
            <div>
              <span className="text-xs text-gray-600">Avg Latency</span>
              <p className="text-sm font-bold text-gray-800">
                {queriesCount > 0 ? Math.round(totalLatency / queriesCount) : 0}ms
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Database size={16} className="text-violet-600" />
            <div>
              <span className="text-xs text-gray-600">Sources</span>
              <p className="text-sm font-bold text-gray-800">{uniqueSources.length}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <FileText size={16} className="text-violet-600" />
            <div>
              <span className="text-xs text-gray-600">Citations</span>
              <p className="text-sm font-bold text-gray-800">{citationsCount}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <TrendingUp size={16} className="text-violet-600" />
            <div>
              <span className="text-xs text-gray-600">Queries</span>
              <p className="text-sm font-bold text-gray-800">{queriesCount}</p>
            </div>
          </div>
        </div>

        {uniqueSources.length > 0 && (
          <div className="flex items-center space-x-2">
            {uniqueSources.map(source => (
              <span
                key={source}
                className="px-2 py-1 bg-white border border-violet-200 text-violet-700 text-xs font-semibold rounded"
              >
                {source}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
