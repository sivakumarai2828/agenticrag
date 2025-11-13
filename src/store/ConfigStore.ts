export interface SourceToggles {
  vector: boolean;
  db: boolean;
  web: boolean;
  api: boolean;
}

export type TimeRange = '7d' | '30d' | 'custom';

export interface AppConfig {
  sources: SourceToggles;
  timeRange: TimeRange;
  customStartDate?: string;
  customEndDate?: string;
}

const DEFAULT_CONFIG: AppConfig = {
  sources: {
    vector: true,
    db: true,
    web: true,
    api: true,
  },
  timeRange: '7d',
};

class ConfigStore {
  private config: AppConfig;
  private listeners: Set<(config: AppConfig) => void> = new Set();

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    const stored = localStorage.getItem('agenticRAG.config');
    if (stored) {
      try {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      } catch {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  }

  private saveConfig(): void {
    localStorage.setItem('agenticRAG.config', JSON.stringify(this.config));
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.config));
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  updateSources(sources: Partial<SourceToggles>): void {
    this.config.sources = { ...this.config.sources, ...sources };
    this.saveConfig();
  }

  setTimeRange(range: TimeRange, customStart?: string, customEnd?: string): void {
    this.config.timeRange = range;
    if (range === 'custom') {
      this.config.customStartDate = customStart;
      this.config.customEndDate = customEnd;
    }
    this.saveConfig();
  }

  subscribe(listener: (config: AppConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getActiveSources(): string[] {
    return Object.entries(this.config.sources)
      .filter(([_, enabled]) => enabled)
      .map(([source]) => source.toUpperCase());
  }
}

export const configStore = new ConfigStore();
