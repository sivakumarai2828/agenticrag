import { VectorResult } from '../services/mockVector';
import { WebResult } from '../services/mockWeb';
import { ExternalLink } from 'lucide-react';

interface CitationsProps {
  citations: (VectorResult | WebResult)[];
}

export default function Citations({ citations }: CitationsProps) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Citations</h4>
      <div className="space-y-2">
        {citations.map((citation, idx) => {
          const similarity = 'similarity' in citation ? citation.similarity : undefined;
          return (
            <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start justify-between mb-1">
                <a
                  href={citation.url}
                  className="text-sm font-medium text-violet-600 hover:text-violet-700 flex items-center space-x-1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>{citation.title}</span>
                  <ExternalLink size={12} />
                </a>
                {similarity !== undefined && (
                  <span className="text-xs font-semibold text-gray-600">
                    {(similarity * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{citation.snippet}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
