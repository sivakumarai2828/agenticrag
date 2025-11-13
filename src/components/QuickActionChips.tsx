import { useConfig } from '../contexts/ConfigContext';
import { Sparkles } from 'lucide-react';

const personaQuickActions = {
  business: [
    'Generate quarterly sales report',
    'Summarize market trends',
    'Compare product performance',
    'Show revenue insights',
  ],
  sales: [
    'Find competitive advantages',
    'Generate customer pitch',
    'Show product benefits',
    'Compare pricing models',
  ],
  developer: [
    'Debug API integration',
    'Explain architecture pattern',
    'Review code for security',
    'Optimize database queries',
  ],
  techlead: [
    'Assess technical debt',
    'Design scalable architecture',
    'Review deployment strategy',
    'Analyze performance bottlenecks',
  ],
  solutions: [
    'Design integration approach',
    'Propose solution architecture',
    'Map customer requirements',
    'Create implementation roadmap',
  ],
};

interface QuickActionChipsProps {
  onSelectAction: (action: string) => void;
}

export default function QuickActionChips({ onSelectAction }: QuickActionChipsProps) {
  const { persona } = useConfig();
  const actions = personaQuickActions[persona];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, idx) => (
        <button
          key={idx}
          onClick={() => onSelectAction(action)}
          className="group flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-all"
        >
          <Sparkles size={14} className="text-gray-400 group-hover:text-violet-500" />
          <span>{action}</span>
        </button>
      ))}
    </div>
  );
}
