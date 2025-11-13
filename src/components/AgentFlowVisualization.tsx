import { CheckCircle, Loader2, Database, Target } from 'lucide-react';

interface AgentFlowVisualizationProps {
  stage: 'retriever' | 'evaluator' | 'ai-agent';
  data: {
    status: 'loading' | 'completed' | 'error';
    results?: number;
    avgScore?: number;
    scores?: {
      relevance?: number;
      grounding?: number;
      faithfulness?: number;
    };
  };
}

export default function AgentFlowVisualization({ stage, data }: AgentFlowVisualizationProps) {
  const stageConfig = {
    retriever: {
      title: 'RETRIEVER AGENT',
      icon: Database,
      color: 'violet',
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-200',
      textColor: 'text-violet-700',
      iconColor: 'text-violet-600',
    },
    evaluator: {
      title: 'EVALUATOR AGENT',
      icon: Target,
      color: 'fuchsia',
      bgColor: 'bg-fuchsia-50',
      borderColor: 'border-fuchsia-200',
      textColor: 'text-fuchsia-700',
      iconColor: 'text-fuchsia-600',
    },
    'ai-agent': {
      title: 'AI AGENT',
      icon: CheckCircle,
      color: 'purple',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700',
      iconColor: 'text-purple-600',
    },
  };

  const config = stageConfig[stage];
  const Icon = config.icon;

  return (
    <div className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4 mb-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Icon size={20} className={config.iconColor} />
          <span className={`text-xs font-bold ${config.textColor} tracking-wide`}>
            {config.title}
          </span>
        </div>
        {data.status === 'loading' && (
          <Loader2 size={16} className={`${config.iconColor} animate-spin`} />
        )}
        {data.status === 'completed' && (
          <CheckCircle size={16} className={config.iconColor} />
        )}
      </div>

      {data.status === 'loading' && (
        <div className="mt-2">
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
            <span>
              {stage === 'retriever' && 'Querying vector databases...'}
              {stage === 'evaluator' && 'Evaluating response quality...'}
              {stage === 'ai-agent' && 'Generating response...'}
            </span>
          </div>
        </div>
      )}

      {data.status === 'completed' && stage === 'retriever' && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center space-x-2 text-xs text-gray-700">
            <CheckCircle size={12} className="text-violet-600" />
            <span>Querying Vector DB1... ✓</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-700">
            <CheckCircle size={12} className="text-violet-600" />
            <span>Querying Vector DB2... ✓</span>
          </div>
          {data.results && data.avgScore && (
            <div className="mt-2 pt-2 border-t border-violet-200">
              <p className="text-xs font-medium text-violet-700">
                Retrieved {data.results} chunks (avg relevance: {(data.avgScore * 100).toFixed(0)}%)
              </p>
            </div>
          )}
        </div>
      )}

      {data.status === 'completed' && stage === 'evaluator' && data.scores && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center space-x-2 text-xs text-gray-700">
            <CheckCircle size={12} className="text-fuchsia-600" />
            <span>Checking response relevance... ✓</span>
          </div>
          <div className="mt-2 pt-2 border-t border-fuchsia-200">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-fuchsia-700">
                Score: {((data.scores.relevance || 0) * 100).toFixed(0)}% (
                {(data.scores.relevance || 0) >= 0.8 ? 'Relevant' : 'Needs Improvement'})
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Decision: {(data.scores.relevance || 0) >= 0.8 ? 'Proceed with response' : 'Refine query'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
