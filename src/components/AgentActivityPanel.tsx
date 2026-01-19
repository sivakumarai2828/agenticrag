import React from 'react';
import {
    BrainCircuit,
    CheckCircle2,
    X
} from 'lucide-react';

export interface ActivityStep {
    id: string;
    label: string;
    status: 'pending' | 'active' | 'completed' | 'error';
    icon: React.ElementType;
}

interface AgentActivityPanelProps {
    steps: ActivityStep[];
    className?: string;
}

const AgentActivityPanel: React.FC<AgentActivityPanelProps> = ({
    steps,
    className = ""
}) => {
    return (
        <div className={`p-0 flex flex-col h-full bg-white/50 backdrop-blur-sm ${className}`}>
            <div className="flex items-center justify-between px-6 py-8">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-50 rounded-xl border border-purple-100 shadow-sm">
                        <BrainCircuit className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-black text-slate-800 tracking-tight leading-none mb-1">
                            Agent Activity
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Live processing</p>
                    </div>
                </div>
                <button className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 px-6 space-y-0 relative">
                {/* Vertical Timeline Line */}
                <div className="absolute left-[47.5px] top-6 bottom-12 w-[1.5px] bg-gradient-to-b from-purple-100 via-slate-100 to-transparent z-0" />

                {steps.map((step) => (
                    <div key={step.id} className="relative z-10 group">
                        <div className={`flex items-center space-x-4 py-4 rounded-2xl transition-all duration-500 ${step.status === 'active' ? 'bg-purple-50/40 translate-x-1' : ''
                            }`}>
                            <div className="relative">
                                {/* Pulse effect for active state */}
                                {step.status === 'active' && (
                                    <div className="absolute inset-0 bg-purple-400/20 rounded-full animate-ping scale-150" />
                                )}

                                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 border-2 relative z-10 ${step.status === 'active'
                                    ? 'bg-white border-purple-500 text-purple-600 scale-110 shadow-lg shadow-purple-100/50'
                                    : step.status === 'completed'
                                        ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-900/10'
                                        : step.status === 'error'
                                            ? 'bg-red-500 border-red-500 text-white'
                                            : 'bg-white border-slate-100 text-slate-300 group-hover:border-slate-200'
                                    }`}>
                                    {step.status === 'completed' ? (
                                        <CheckCircle2 className="w-5 h-5" strokeWidth={3} />
                                    ) : step.status === 'error' ? (
                                        <X className="w-5 h-5" strokeWidth={3} />
                                    ) : (
                                        <step.icon className={`w-4 h-4 ${step.status === 'active' ? 'animate-pulse' : ''}`} />
                                    )}
                                </div>
                            </div>

                            <div className="flex-1">
                                <p className={`text-[13px] leading-tight transition-all duration-300 ${step.status === 'active'
                                    ? 'text-purple-700 font-black scale-102'
                                    : step.status === 'completed'
                                        ? 'text-slate-500 font-bold'
                                        : 'text-slate-400 font-bold group-hover:text-slate-500'
                                    }`}>
                                    {step.label}
                                </p>
                                {step.status === 'active' && (
                                    <span className="text-[10px] text-purple-400 font-black uppercase tracking-widest animate-pulse mt-1 inline-block">
                                        Processing...
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="px-6 py-8 border-t border-slate-100 flex flex-col space-y-4 bg-slate-50/20">
                <div className="flex items-center justify-between px-2">
                    <div className="flex flex-col space-y-1">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em]">System Status</span>
                        <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">Context: Ready</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em]">Turn Cycle</span>
                        <p className="text-[11px] font-bold text-slate-700">#03 ACTIVE</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentActivityPanel;
