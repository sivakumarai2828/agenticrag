import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Persona = 'business' | 'sales' | 'developer' | 'techlead' | 'solutions';

export interface AgenticConfig {
  retrieval: {
    mode: 'vector' | 'bm25' | 'hybrid' | 'multi-source';
    topK: number;
    queryExpansion: boolean;
    reranker: boolean;
    filters: Record<string, unknown>;
    similarityThreshold: number;
    collections: string[];
  };
  agents: {
    temperature: number;
    maxTokens: number;
    model: string;
  };
  memory: {
    sessionEnabled: boolean;
    longTermEnabled: boolean;
    retentionDays: number;
  };
  tools: {
    enabledTools: string[];
    timeouts: Record<string, number>;
  };
  costLatency: {
    budgetLimitPerQuery: number;
    latencyThreshold: number;
  };
  safety: {
    groundingThreshold: number;
    contentFilters: string[];
    enableEvaluation: boolean;
  };
  ui: {
    theme: 'light' | 'dark' | 'system';
    showMetrics: boolean;
    showCitations: boolean;
  };
}

const defaultConfig: AgenticConfig = {
  retrieval: {
    mode: 'multi-source',
    topK: 5,
    queryExpansion: false,
    reranker: true,
    filters: {},
    similarityThreshold: 0.7,
    collections: ['context_docs', 'product_data'],
  },
  agents: {
    temperature: 0.7,
    maxTokens: 2048,
    model: 'gpt-4',
  },
  memory: {
    sessionEnabled: true,
    longTermEnabled: false,
    retentionDays: 30,
  },
  tools: {
    enabledTools: ['vector_search', 'web_search', 'calculator'],
    timeouts: {
      vector_search: 5000,
      web_search: 10000,
      calculator: 1000,
    },
  },
  costLatency: {
    budgetLimitPerQuery: 0.50,
    latencyThreshold: 5000,
  },
  safety: {
    groundingThreshold: 0.6,
    contentFilters: ['pii', 'profanity'],
    enableEvaluation: true,
  },
  ui: {
    theme: 'system',
    showMetrics: true,
    showCitations: true,
  },
};

const personaPresets: Record<Persona, Partial<AgenticConfig>> = {
  business: {
    retrieval: {
      mode: 'vector',
      topK: 3,
      queryExpansion: false,
      reranker: false,
      filters: {},
      similarityThreshold: 0.75,
      collections: ['business_reports', 'product_data'],
    },
    agents: {
      temperature: 0.3,
      maxTokens: 1024,
      model: 'gpt-4',
    },
    ui: {
      theme: 'light',
      showMetrics: false,
      showCitations: true,
    },
  },
  sales: {
    retrieval: {
      mode: 'hybrid',
      topK: 5,
      queryExpansion: true,
      reranker: false,
      filters: {},
      similarityThreshold: 0.7,
      collections: ['sales_materials', 'product_data', 'case_studies'],
    },
    agents: {
      temperature: 0.5,
      maxTokens: 1536,
      model: 'gpt-4',
    },
    ui: {
      theme: 'light',
      showMetrics: false,
      showCitations: true,
    },
  },
  developer: {
    retrieval: {
      mode: 'multi-source',
      topK: 10,
      queryExpansion: true,
      reranker: true,
      filters: { documentType: ['api', 'technical', 'code'] },
      similarityThreshold: 0.65,
      collections: ['api_docs', 'code_examples', 'technical_specs'],
    },
    agents: {
      temperature: 0.7,
      maxTokens: 4096,
      model: 'gpt-4',
    },
    memory: {
      sessionEnabled: true,
      longTermEnabled: true,
      retentionDays: 90,
    },
    ui: {
      theme: 'dark',
      showMetrics: true,
      showCitations: true,
    },
  },
  techlead: {
    retrieval: {
      mode: 'multi-source',
      topK: 8,
      queryExpansion: true,
      reranker: true,
      filters: {},
      similarityThreshold: 0.7,
      collections: ['architecture_docs', 'technical_specs', 'best_practices'],
    },
    agents: {
      temperature: 0.6,
      maxTokens: 3072,
      model: 'gpt-4',
    },
    costLatency: {
      budgetLimitPerQuery: 1.0,
      latencyThreshold: 8000,
    },
    ui: {
      theme: 'dark',
      showMetrics: true,
      showCitations: true,
    },
  },
  solutions: {
    retrieval: {
      mode: 'multi-source',
      topK: 12,
      queryExpansion: true,
      reranker: true,
      filters: {},
      similarityThreshold: 0.65,
      collections: ['solutions', 'architecture_docs', 'case_studies', 'integration_guides'],
    },
    agents: {
      temperature: 0.7,
      maxTokens: 4096,
      model: 'gpt-4',
    },
    memory: {
      sessionEnabled: true,
      longTermEnabled: true,
      retentionDays: 60,
    },
    ui: {
      theme: 'system',
      showMetrics: true,
      showCitations: true,
    },
  },
};

interface ConfigContextType {
  config: AgenticConfig;
  persona: Persona;
  setPersona: (persona: Persona) => void;
  updateConfig: (updates: Partial<AgenticConfig>) => void;
  applyPreset: (persona: Persona) => void;
  reset: () => void;
  exportConfig: () => string;
  importConfig: (configJson: string) => boolean;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AgenticConfig>(() => {
    const stored = localStorage.getItem('agenticRag.config');
    return stored ? JSON.parse(stored) : defaultConfig;
  });

  const [persona, setPersonaState] = useState<Persona>(() => {
    const stored = localStorage.getItem('userPersona');
    return (stored as Persona) || 'developer';
  });

  useEffect(() => {
    localStorage.setItem('agenticRag.config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('userPersona', persona);
  }, [persona]);

  const setPersona = (newPersona: Persona) => {
    setPersonaState(newPersona);
    applyPreset(newPersona);
  };

  const updateConfig = (updates: Partial<AgenticConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      Object.keys(updates).forEach(key => {
        const k = key as keyof AgenticConfig;
        newConfig[k] = { ...prev[k], ...updates[k] } as any;
      });
      return newConfig;
    });
  };

  const applyPreset = (targetPersona: Persona) => {
    const preset = personaPresets[targetPersona];
    setConfig(prev => {
      const newConfig = { ...prev };
      Object.keys(preset).forEach(key => {
        const k = key as keyof AgenticConfig;
        newConfig[k] = { ...prev[k], ...preset[k] } as any;
      });
      return newConfig;
    });
  };

  const reset = () => {
    setConfig(defaultConfig);
  };

  const exportConfig = (): string => {
    return JSON.stringify({ config, persona }, null, 2);
  };

  const importConfig = (configJson: string): boolean => {
    try {
      const imported = JSON.parse(configJson);
      if (imported.config) {
        setConfig(imported.config);
      }
      if (imported.persona) {
        setPersonaState(imported.persona);
      }
      return true;
    } catch {
      return false;
    }
  };

  return (
    <ConfigContext.Provider
      value={{
        config,
        persona,
        setPersona,
        updateConfig,
        applyPreset,
        reset,
        exportConfig,
        importConfig,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
}
