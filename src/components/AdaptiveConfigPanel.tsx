import { useState } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import {
  Settings,
  ChevronDown,
  ChevronRight,
  Database,
  Bot,
  Brain,
  Wrench,
  DollarSign,
  Shield,
  Palette,
} from 'lucide-react';

export default function AdaptiveConfigPanel() {
  const { config, persona, updateConfig } = useConfig();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    retrieval: true,
    agents: false,
    memory: false,
    tools: false,
    cost: false,
    safety: false,
    ui: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const isSimplifiedView = persona === 'business' || persona === 'sales';
  const isTechLeadView = persona === 'techlead';

  return (
    <div className="space-y-4">
      <Section
        title="Retrieval Configuration"
        icon={Database}
        isExpanded={expandedSections.retrieval}
        onToggle={() => toggleSection('retrieval')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Retrieval Mode</label>
            <select
              value={config.retrieval.mode}
              onChange={e =>
                updateConfig({
                  retrieval: { ...config.retrieval, mode: e.target.value as any },
                })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {isSimplifiedView ? (
                <>
                  <option value="vector">Smart Search</option>
                  <option value="hybrid">Comprehensive Search</option>
                </>
              ) : (
                <>
                  <option value="vector">Vector Search</option>
                  <option value="bm25">BM25 Search</option>
                  <option value="hybrid">Hybrid Search</option>
                  <option value="multi-source">Multi-Source</option>
                </>
              )}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">
                {isSimplifiedView ? 'Results to Show' : 'Top-K Results'}
              </label>
              <span className="text-xs font-semibold text-violet-600">{config.retrieval.topK}</span>
            </div>
            <input
              type="range"
              min={isSimplifiedView ? '3' : '1'}
              max={isSimplifiedView ? '10' : '20'}
              value={config.retrieval.topK}
              onChange={e =>
                updateConfig({
                  retrieval: { ...config.retrieval, topK: Number(e.target.value) },
                })
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
            />
            {config.retrieval.topK < 4 && config.retrieval.reranker && (
              <p className="text-xs text-amber-600 mt-1">
                Reranker disabled: topK must be ≥ 4
              </p>
            )}
          </div>

          {!isSimplifiedView && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-700">Similarity Threshold</label>
                  <span className="text-xs font-semibold text-violet-600">
                    {config.retrieval.similarityThreshold.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.retrieval.similarityThreshold}
                  onChange={e =>
                    updateConfig({
                      retrieval: {
                        ...config.retrieval,
                        similarityThreshold: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
              </div>

              <Checkbox
                label="Query Expansion"
                sublabel="Expand queries with synonyms"
                checked={config.retrieval.queryExpansion}
                onChange={checked =>
                  updateConfig({
                    retrieval: { ...config.retrieval, queryExpansion: checked },
                  })
                }
              />

              <Checkbox
                label="Reranker"
                sublabel="Re-rank results for relevance"
                checked={config.retrieval.reranker && config.retrieval.topK >= 4}
                disabled={config.retrieval.topK < 4 || config.retrieval.mode === 'bm25'}
                onChange={checked =>
                  updateConfig({
                    retrieval: { ...config.retrieval, reranker: checked },
                  })
                }
              />
            </>
          )}

          {isSimplifiedView && (
            <Checkbox
              label="Show Source Citations"
              checked={config.ui.showCitations}
              onChange={checked =>
                updateConfig({
                  ui: { ...config.ui, showCitations: checked },
                })
              }
            />
          )}
        </div>
      </Section>

      {!isSimplifiedView && (
        <Section
          title="Agent Configuration"
          icon={Bot}
          isExpanded={expandedSections.agents}
          onToggle={() => toggleSection('agents')}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Model</label>
              <select
                value={config.agents.model}
                onChange={e =>
                  updateConfig({
                    agents: { ...config.agents, model: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-700">Temperature</label>
                <span className="text-xs font-semibold text-violet-600">
                  {config.agents.temperature.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.agents.temperature}
                onChange={e =>
                  updateConfig({
                    agents: { ...config.agents, temperature: Number(e.target.value) },
                  })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Max Tokens</label>
              <input
                type="number"
                value={config.agents.maxTokens}
                onChange={e =>
                  updateConfig({
                    agents: { ...config.agents, maxTokens: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
        </Section>
      )}

      {(persona === 'developer' || persona === 'solutions' || persona === 'techlead') && (
        <Section
          title="Memory Configuration"
          icon={Brain}
          isExpanded={expandedSections.memory}
          onToggle={() => toggleSection('memory')}
        >
          <div className="space-y-3">
            <Checkbox
              label="Session Memory"
              sublabel="Remember context within conversation"
              checked={config.memory.sessionEnabled}
              onChange={checked =>
                updateConfig({
                  memory: { ...config.memory, sessionEnabled: checked },
                })
              }
            />
            <Checkbox
              label="Long-term Memory"
              sublabel="Persist context across sessions"
              checked={config.memory.longTermEnabled}
              onChange={checked =>
                updateConfig({
                  memory: { ...config.memory, longTermEnabled: checked },
                })
              }
            />
            {config.memory.longTermEnabled && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Retention (days)
                </label>
                <input
                  type="number"
                  value={config.memory.retentionDays}
                  onChange={e =>
                    updateConfig({
                      memory: { ...config.memory, retentionDays: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            )}
          </div>
        </Section>
      )}

      {isTechLeadView && (
        <Section
          title="Cost & Latency"
          icon={DollarSign}
          isExpanded={expandedSections.cost}
          onToggle={() => toggleSection('cost')}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Budget Limit (per query)
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={config.costLatency.budgetLimitPerQuery}
                  onChange={e =>
                    updateConfig({
                      costLatency: {
                        ...config.costLatency,
                        budgetLimitPerQuery: Number(e.target.value),
                      },
                    })
                  }
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Latency Threshold (ms)
              </label>
              <input
                type="number"
                value={config.costLatency.latencyThreshold}
                onChange={e =>
                  updateConfig({
                    costLatency: {
                      ...config.costLatency,
                      latencyThreshold: Number(e.target.value),
                    },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
        </Section>
      )}

      {!isSimplifiedView && (
        <Section
          title="Safety & Guardrails"
          icon={Shield}
          isExpanded={expandedSections.safety}
          onToggle={() => toggleSection('safety')}
        >
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-700">Grounding Threshold</label>
                <span className="text-xs font-semibold text-violet-600">
                  {config.safety.groundingThreshold.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1"
                step="0.05"
                value={config.safety.groundingThreshold}
                onChange={e =>
                  updateConfig({
                    safety: {
                      ...config.safety,
                      groundingThreshold: Math.max(0.6, Number(e.target.value)),
                    },
                  })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum: 0.60 (enforced)</p>
            </div>

            <Checkbox
              label="Enable Evaluation"
              sublabel="Assess response quality"
              checked={config.safety.enableEvaluation}
              onChange={checked =>
                updateConfig({
                  safety: { ...config.safety, enableEvaluation: checked },
                })
              }
            />
          </div>
        </Section>
      )}

      <Section
        title="UI Preferences"
        icon={Palette}
        isExpanded={expandedSections.ui}
        onToggle={() => toggleSection('ui')}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Theme</label>
            <select
              value={config.ui.theme}
              onChange={e =>
                updateConfig({
                  ui: { ...config.ui, theme: e.target.value as any },
                })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>

          {!isSimplifiedView && (
            <Checkbox
              label="Show Metrics"
              sublabel="Display latency, tokens, cost"
              checked={config.ui.showMetrics}
              onChange={checked =>
                updateConfig({
                  ui: { ...config.ui, showMetrics: checked },
                })
              }
            />
          )}

          <Checkbox
            label="Show Citations"
            sublabel="Display source references"
            checked={config.ui.showCitations}
            onChange={checked =>
              updateConfig({
                ui: { ...config.ui, showCitations: checked },
              })
            }
          />
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ElementType;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Icon size={16} className="text-gray-600" />
          <span className="text-sm font-semibold text-gray-800">{title}</span>
        </div>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {isExpanded && <div className="p-4 bg-white">{children}</div>}
    </div>
  );
}

function Checkbox({
  label,
  sublabel,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  sublabel?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start space-x-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} group`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => !disabled && onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
      />
      <div className="flex-1">
        <span className="text-sm text-gray-800 group-hover:text-gray-900">{label}</span>
        {sublabel && <p className="text-xs text-gray-500">{sublabel}</p>}
      </div>
    </label>
  );
}
