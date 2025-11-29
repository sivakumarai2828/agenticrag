import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { IntentType } from '../router/intentRouter';
import TableView from './TableView';
import ChartView from './ChartView';
import JSONView from './JSONView';
import Citations from './Citations';
import { VectorResult } from '../services/mockVector';
import { WebResult } from '../services/mockWeb';
import { ChartConfig } from '../services/mockChart';
import { APIStatusResult } from '../services/mockAPI';

interface AnswerCardProps {
  intent: IntentType;
  sources: string[];
  answer?: string;
  citations?: (VectorResult | WebResult)[];
  table?: { columns: string[]; rows: Record<string, any>[] };
  chart?: ChartConfig;
  json?: APIStatusResult;
}

export default function AnswerCard({
  intent,
  sources,
  answer,
  citations,
  table,
  chart,
  json,
}: AnswerCardProps) {
  const [sourcesExpanded, setSourcesExpanded] = useState(true);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {sources.map(source => (
            <span
              key={source}
              className="px-2.5 py-1 bg-violet-100 text-violet-700 text-xs font-semibold rounded-full"
            >
              {source}
            </span>
          ))}
        </div>

        {citations && citations.length > 0 && (
          <button
            onClick={() => setSourcesExpanded(!sourcesExpanded)}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
          >
            <span>Sources ({citations.length})</span>
            {sourcesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {answer && (
        <div className="prose prose-sm max-w-none mb-4">
          <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">{answer}</div>
        </div>
      )}

      {table && <TableView columns={table.columns} rows={table.rows} />}

      {chart && <ChartView config={chart} />}

      {json && <JSONView data={json} />}

      {citations && citations.length > 0 && sourcesExpanded && <Citations citations={citations} />}
    </div>
  );
}
