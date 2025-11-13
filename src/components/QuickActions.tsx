import { Sparkles, BarChart3, FileText, Activity, DollarSign, TrendingUp } from 'lucide-react';

interface QuickActionsProps {
  onSelect: (query: string) => void;
}

const quickActions = [
  {
    icon: DollarSign,
    label: 'Client Transactions',
    query: 'Show transactions for client 5001',
    color: 'from-emerald-500 to-green-600',
  },
  {
    icon: TrendingUp,
    label: 'Transaction Chart',
    query: 'Show transaction trend for client 5003',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: FileText,
    label: 'Refund Policy',
    query: "What's the refund policy?",
    color: 'from-blue-500 to-cyan-600',
  },
  {
    icon: Activity,
    label: 'API Health',
    query: 'Check API failures',
    color: 'from-orange-500 to-red-600',
  },
];

export default function QuickActions({ onSelect }: QuickActionsProps) {
  return (
    <div className="px-6 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
      <div className="flex items-center space-x-3 overflow-x-auto">
        <div className="flex items-center space-x-2 text-gray-600 flex-shrink-0">
          <Sparkles size={16} />
          <span className="text-sm font-medium">Quick:</span>
        </div>
        {quickActions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelect(action.query)}
              className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all flex-shrink-0 group"
            >
              <div className={`p-1 rounded bg-gradient-to-br ${action.color}`}>
                <Icon size={12} className="text-white" />
              </div>
              <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
