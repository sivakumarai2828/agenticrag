import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { IntentType } from '../router/intentRouter';
import TableView from './TableView';
import ChartView from './ChartView';
import JSONView from './JSONView';
import Citations from './Citations';
import { VectorResult } from '../services/mockVector';
import { WebResult } from '../services/mockWeb';
import { ChartConfig } from '../services/mockChart';
import { APIStatusResult } from '../services/mockAPI';

interface AnswerCardProps {
  intent: IntentType;
  sources: string[];
  answer?: string;
  citations?: (VectorResult | WebResult)[];
  table?: { columns: string[]; rows: Record<string, any>[] };
  chart?: ChartConfig;
  json?: APIStatusResult;
}

export default function AnswerCard({
  sources,
  answer,
  citations,
  table,
  chart,
  json,
}: AnswerCardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const getSourceInfo = () => {
    if (sources.includes('VECTOR')) return { label: 'Knowledge Base', tool: 'RAG Agent' };
    if (sources.includes('WEB')) return { label: 'Web Search', tool: 'Google' };
    if (sources.includes('OPEN-METEO')) return { label: 'Live Data', tool: 'Open-Meteo' };
    if (sources.includes('YAHOO-FINANCE')) return { label: 'Live Data', tool: 'Yahoo Finance' };
    if (sources.includes('DB')) return { label: 'Database', tool: 'Transactions' };
    if (sources.includes('EMAIL')) return { label: 'Communication', tool: 'Resend' };
    return { label: 'AI Assistant', tool: 'OpenAI' };
  };

  const { label, tool } = getSourceInfo();

  return (
    <div className={`bg-white p-7 rounded-3xl border border-[#F0EDFF] shadow-sm transition-all duration-500 overflow-hidden ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
      {/* Header section from image */}
      <div className="flex items-center space-x-2 mb-6">
        <div className="p-1 bg-purple-600 rounded-md">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-[13px] font-black text-slate-800 tracking-tight">Agent Response</span>
      </div>

      <div className="bg-[#F4F2FF] px-4 py-2 rounded-lg border border-[#EBE8FF] flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <div className="p-1 bg-white rounded border border-[#EBE8FF]">
            <Sparkles className="w-3 h-3 text-purple-600" />
          </div>
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{label}</span>
          <span className="text-slate-300 mx-1">|</span>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Tool: {tool}</span>
        </div>
      </div>

      {answer && (
        <div className="relative mb-6 animate-fadeIn">
          <div className="text-slate-800 text-base leading-relaxed font-bold tracking-tight whitespace-pre-wrap">
            {answer}
          </div>
        </div>
      )}

      <div className="space-y-6 animate-fadeIn animation-delay-400">
        {table && (
          <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-white/60">
            <TableView columns={table.columns} rows={table.rows} />
          </div>
        )}

        {chart && (
          <div className="p-6 bg-white/60 rounded-2xl border border-slate-100 shadow-sm">
            <ChartView config={chart} />
          </div>
        )}

        {json && (
          <div className="rounded-2xl overflow-hidden border border-slate-100 bg-white/60 shadow-sm">
            <JSONView data={json} />
          </div>
        )}

        {citations && citations.length > 0 && (
          <div className="pt-6 border-t border-slate-100 animate-fadeIn text-slate-600">
            <Citations citations={citations} />
          </div>
        )}
      </div>
    </div>
  );
}
