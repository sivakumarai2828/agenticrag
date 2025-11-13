import { useConfig, Persona } from '../contexts/ConfigContext';
import { Briefcase, TrendingUp, Code, Shield, Lightbulb } from 'lucide-react';

const personas: Array<{
  id: Persona;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
}> = [
  {
    id: 'business',
    label: 'Business',
    icon: Briefcase,
    color: 'from-blue-500 to-blue-600',
    description: 'Simplified insights & reports',
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: TrendingUp,
    color: 'from-green-500 to-emerald-600',
    description: 'Customer-focused answers',
  },
  {
    id: 'developer',
    label: 'Developer',
    icon: Code,
    color: 'from-violet-500 to-fuchsia-600',
    description: 'Technical deep-dives',
  },
  {
    id: 'techlead',
    label: 'Tech Lead',
    icon: Shield,
    color: 'from-orange-500 to-red-600',
    description: 'Architecture & budgets',
  },
  {
    id: 'solutions',
    label: 'Solutions',
    icon: Lightbulb,
    color: 'from-amber-500 to-yellow-600',
    description: 'Integration strategies',
  },
];

export default function PersonaSwitcher() {
  const { persona, setPersona } = useConfig();

  return (
    <div className="flex items-center space-x-2">
      {personas.map(p => {
        const Icon = p.icon;
        const isActive = persona === p.id;

        return (
          <button
            key={p.id}
            onClick={() => setPersona(p.id)}
            className={`group relative px-4 py-2 rounded-lg transition-all ${
              isActive
                ? `bg-gradient-to-r ${p.color} text-white shadow-lg`
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={p.description}
          >
            <div className="flex items-center space-x-2">
              <Icon size={16} />
              <span className="text-sm font-medium">{p.label}</span>
            </div>
            {!isActive && (
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {p.description}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
