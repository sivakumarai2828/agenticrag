import { useState } from 'react';
import { Settings, ChevronDown, ChevronRight, Database, Search, Bot, Activity } from 'lucide-react';

interface ConfigSidebarProps {
  isOpen: boolean;
  settings: {
    enableRAG: boolean;
    enableTools: boolean;
    useMemory: boolean;
    enableEvaluation: boolean;
    enableWebSearch: boolean;
    retrievalMode: 'vector' | 'hybrid' | 'multi-source';
    topK: number;
    similarityThreshold: number;
    collections: string[];
  };
  onSettingsChange: (settings: ConfigSidebarProps['settings']) => void;
}

export default function ConfigSidebar({ isOpen, settings, onSettingsChange }: ConfigSidebarProps) {
  const [expandedSections, setExpandedSections] = useState({
    model: true,
    capabilities: true,
    rag: true,
    ingestion: false,
    systemPrompt: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-screen overflow-y-auto">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
            <Settings size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-800">Configuration</h2>
            <p className="text-xs text-gray-500">Adjust agent settings</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        <Section
          title="Model & Agent"
          icon={Bot}
          isExpanded={expandedSections.model}
          onToggle={() => toggleSection('model')}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">AI Model</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option>GPT-4</option>
                <option>GPT-3.5 Turbo</option>
                <option>Claude 3 Opus</option>
                <option>Claude 3 Sonnet</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Primary Agent</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option>AI Agent (Default)</option>
                <option>Specialized Agent</option>
                <option>Multi-Agent System</option>
              </select>
            </div>
          </div>
        </Section>

        <Section
          title="System Capabilities"
          icon={Activity}
          isExpanded={expandedSections.capabilities}
          onToggle={() => toggleSection('capabilities')}
        >
          <div className="space-y-3">
            <Checkbox
              label="Enable RAG"
              sublabel="Retriever LLM Agent"
              checked={settings.enableRAG}
              onChange={(checked) => onSettingsChange({ ...settings, enableRAG: checked })}
            />
            <Checkbox
              label="Enable Tools"
              sublabel="Vector DB, APIs, Web Search"
              checked={settings.enableTools}
              onChange={(checked) => onSettingsChange({ ...settings, enableTools: checked })}
            />
            <Checkbox
              label="Use Context Memory"
              sublabel="Short & long-term memory"
              checked={settings.useMemory}
              onChange={(checked) => onSettingsChange({ ...settings, useMemory: checked })}
            />
            <Checkbox
              label="Enable Evaluation"
              sublabel="Evaluator LLM Agent"
              checked={settings.enableEvaluation}
              onChange={(checked) => onSettingsChange({ ...settings, enableEvaluation: checked })}
            />
            <Checkbox
              label="Enable Web Search"
              sublabel="External data sources"
              checked={settings.enableWebSearch}
              onChange={(checked) => onSettingsChange({ ...settings, enableWebSearch: checked })}
            />
          </div>
        </Section>

        <Section
          title="RAG Configuration"
          icon={Database}
          isExpanded={expandedSections.rag}
          onToggle={() => toggleSection('rag')}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Retrieval Mode</label>
              <div className="space-y-2">
                <Radio
                  name="retrievalMode"
                  label="Vector Search (DB1)"
                  checked={settings.retrievalMode === 'vector'}
                  onChange={() => onSettingsChange({ ...settings, retrievalMode: 'vector' })}
                />
                <Radio
                  name="retrievalMode"
                  label="Hybrid Search (DB1 + DB2)"
                  checked={settings.retrievalMode === 'hybrid'}
                  onChange={() => onSettingsChange({ ...settings, retrievalMode: 'hybrid' })}
                />
                <Radio
                  name="retrievalMode"
                  label="Multi-Source (DB1 + DB2 + Web)"
                  checked={settings.retrievalMode === 'multi-source'}
                  onChange={() => onSettingsChange({ ...settings, retrievalMode: 'multi-source' })}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-700">Top-K Results</label>
                <span className="text-xs font-semibold text-violet-600">{settings.topK}</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={settings.topK}
                onChange={(e) => onSettingsChange({ ...settings, topK: Number(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-700">Similarity Threshold</label>
                <span className="text-xs font-semibold text-violet-600">{settings.similarityThreshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.similarityThreshold}
                onChange={(e) => onSettingsChange({ ...settings, similarityThreshold: Number(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Collection Sources</label>
              <div className="space-y-2">
                <Checkbox
                  label="Context Docs"
                  checked={settings.collections.includes('context_docs')}
                  onChange={(checked) => {
                    const newCollections = checked
                      ? [...settings.collections, 'context_docs']
                      : settings.collections.filter(c => c !== 'context_docs');
                    onSettingsChange({ ...settings, collections: newCollections });
                  }}
                />
                <Checkbox
                  label="Product Data"
                  checked={settings.collections.includes('product_data')}
                  onChange={(checked) => {
                    const newCollections = checked
                      ? [...settings.collections, 'product_data']
                      : settings.collections.filter(c => c !== 'product_data');
                    onSettingsChange({ ...settings, collections: newCollections });
                  }}
                />
                <Checkbox
                  label="External APIs"
                  checked={settings.collections.includes('external_apis')}
                  onChange={(checked) => {
                    const newCollections = checked
                      ? [...settings.collections, 'external_apis']
                      : settings.collections.filter(c => c !== 'external_apis');
                    onSettingsChange({ ...settings, collections: newCollections });
                  }}
                />
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Ingestion Methods"
          icon={Search}
          isExpanded={expandedSections.ingestion}
          onToggle={() => toggleSection('ingestion')}
        >
          <div className="space-y-2">
            <Radio name="ingestion" label="None (Prompt Stuffing)" checked={true} onChange={() => {}} />
            <Radio name="ingestion" label="Hierarchical Chunking" checked={false} onChange={() => {}} />
            <Radio name="ingestion" label="Hypothetical Questions Generation" checked={false} onChange={() => {}} />
            <Radio name="ingestion" label="Contextual Retrieval Generation" checked={false} onChange={() => {}} />
            <Radio name="ingestion" label="Late Chunking" checked={false} onChange={() => {}} />
          </div>
        </Section>

        <Section
          title="System Prompt"
          icon={Settings}
          isExpanded={expandedSections.systemPrompt}
          onToggle={() => toggleSection('systemPrompt')}
        >
          <textarea
            placeholder="Enter custom system instructions..."
            rows={4}
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  children
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
      {isExpanded && (
        <div className="p-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

function Checkbox({
  label,
  sublabel,
  checked,
  onChange
}: {
  label: string;
  sublabel?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start space-x-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-2 focus:ring-violet-500"
      />
      <div className="flex-1">
        <span className="text-sm text-gray-800 group-hover:text-gray-900">{label}</span>
        {sublabel && <p className="text-xs text-gray-500">{sublabel}</p>}
      </div>
    </label>
  );
}

function Radio({
  name,
  label,
  checked,
  onChange
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center space-x-3 cursor-pointer group">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 text-violet-600 border-gray-300 focus:ring-2 focus:ring-violet-500"
      />
      <span className="text-sm text-gray-800 group-hover:text-gray-900">{label}</span>
    </label>
  );
}
