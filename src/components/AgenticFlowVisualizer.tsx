import { useState, useEffect } from 'react';
import { CheckCircle, Circle, Clock, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';

interface AgentStep {
  agent: string;
  action: string;
  status: 'running' | 'completed' | 'error';
  startTime: number;
  endTime?: number;
  details?: string;
  data?: any;
}

interface AgenticFlowVisualizerProps {
  steps: AgentStep[];
  isActive: boolean;
  onClose?: () => void;
}

export default function AgenticFlowVisualizer({ steps, isActive }: AgenticFlowVisualizerProps) {
  const [animatedSteps, setAnimatedSteps] = useState<AgentStep[]>([]);

  useEffect(() => {
    if (steps.length > 0) {
      steps.forEach((step, index) => {
        setTimeout(() => {
          setAnimatedSteps(prev => [...prev, step]);
        }, index * 200);
      });
    } else {
      setAnimatedSteps([]);
    }
  }, [steps]);

  const getAgentIcon = (agent: string) => {
    if (agent.includes('Retriever')) return '🔍';
    if (agent.includes('Evaluator')) return '✓';
    if (agent.includes('AI Agent')) return '🤖';
    if (agent.includes('Updated Query')) return '✏️';
    if (agent.includes('Context')) return '💾';
    return '⚙️';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={18} className="text-green-500" />;
      case 'running':
        return <Clock size={18} className="text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle size={18} className="text-red-500" />;
      default:
        return <Circle size={18} className="text-gray-300" />;
    }
  };

  const getAgentColor = (agent: string) => {
    if (agent.includes('Retriever')) return 'bg-blue-50 border-blue-200 text-blue-900';
    if (agent.includes('Evaluator')) return 'bg-amber-50 border-amber-200 text-amber-900';
    if (agent.includes('AI Agent')) return 'bg-emerald-50 border-emerald-200 text-emerald-900';
    if (agent.includes('Updated Query')) return 'bg-purple-50 border-purple-200 text-purple-900';
    return 'bg-gray-50 border-gray-200 text-gray-900';
  };

  if (!isActive && steps.length === 0 && animatedSteps.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <RefreshCw size={18} className={`${isActive ? 'animate-spin text-blue-600' : 'text-gray-600'}`} />
          <h3 className="text-sm font-semibold text-gray-800">
            Agentic RAG Flow {isActive ? '(Processing...)' : '(Completed)'}
          </h3>
        </div>
        {!isActive && animatedSteps.length > 0 && (
          <span className="text-xs text-gray-500">
            {animatedSteps[animatedSteps.length - 1].endTime ?
              `${animatedSteps[animatedSteps.length - 1].endTime! - animatedSteps[0].startTime}ms` :
              ''}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {animatedSteps.length === 0 && isActive && (
          <div className="border rounded-lg p-4 bg-blue-50 border-blue-200 text-blue-900">
            <div className="flex items-center space-x-3">
              <Clock size={18} className="text-blue-500 animate-spin" />
              <div>
                <p className="text-sm font-medium">Initializing agentic flow...</p>
                <p className="text-xs opacity-75 mt-1">Starting document retrieval</p>
              </div>
            </div>
          </div>
        )}
        {animatedSteps.map((step, index) => {
          const duration = step.endTime ? step.endTime - step.startTime : 0;
          const isLast = index === animatedSteps.length - 1;

          return (
            <div key={index} className="relative">
              <div className={`border rounded-lg p-3 ${getAgentColor(step.agent)} transition-all duration-300 animate-fadeIn`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <span className="text-xl flex-shrink-0 mt-0.5">{getAgentIcon(step.agent)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        {getStatusIcon(step.status)}
                        <span className="text-xs font-semibold truncate">{step.agent}</span>
                      </div>
                      <p className="text-xs mb-1">{step.action}</p>
                      {step.details && (
                        <p className="text-xs opacity-75 mt-1 italic">{step.details}</p>
                      )}
                      {step.data && (
                        <div className="mt-2 text-xs opacity-60">
                          {step.data.query && (
                            <div className="truncate">Query: "{step.data.query}"</div>
                          )}
                          {step.data.refinedQuery && (
                            <div className="truncate">Refined: "{step.data.refinedQuery}"</div>
                          )}
                          {step.data.resultsCount !== undefined && (
                            <div>Found: {step.data.resultsCount} results</div>
                          )}
                          {step.data.relevanceScore !== undefined && (
                            <div>Relevance: {(step.data.relevanceScore * 100).toFixed(0)}%</div>
                          )}
                        </div>
                      )}
                    </div>
                    {duration > 0 && (
                      <span className="text-xs font-medium opacity-60 flex-shrink-0">{duration}ms</span>
                    )}
                  </div>
                </div>
              </div>

              {!isLast && (
                <div className="flex justify-center my-1">
                  <ArrowRight size={16} className="text-gray-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isActive && (
        <div className="mt-3 flex items-center space-x-2 text-xs text-gray-500">
          <div className="animate-pulse flex space-x-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animation-delay-200"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animation-delay-400"></div>
          </div>
          <span>Processing your query with multiple agents...</span>
        </div>
      )}
    </div>
  );
}
