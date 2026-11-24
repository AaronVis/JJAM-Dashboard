import React from 'react';
import { X, Info, ShieldCheck, Database, Users, Cpu, FileCode2, Layers } from 'lucide-react';

export default function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const comparisonRows = [
    {
      dimension: 'Website and screens',
      demo: 'Built with agentic AI tools',
      product: 'Same, extended',
      icon: FileCode2,
    },
    {
      dimension: 'Task list and input',
      demo: 'Saved in this browser only',
      product: 'Shared database for the whole team',
      icon: Layers,
    },
    {
      dimension: 'Risk score',
      demo: 'Real rules in the browser',
      product: 'Same, tuned on project history',
      icon: Cpu,
    },
    {
      dimension: 'Gen AI text',
      demo: 'Live Gemini call, saved in this browser',
      product: 'Visible to the whole team',
      icon: ShieldCheck,
    },
    {
      dimension: 'Data storage',
      demo: 'Sample file and browser storage',
      product: 'Cloud database',
      icon: Database,
    },
    {
      dimension: 'Users',
      demo: 'One user, no login',
      product: 'Accounts and roles',
      icon: Users,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="workspace-glass-modal bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">About This Demo</h2>
              <p className="text-xs text-slate-500">
                Business School Consulting Showcase · Augmented Project Management (Team 4)
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Executive Summary */}
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1.5">
            <h3 className="font-bold text-blue-950 text-xs uppercase tracking-wider">
              Augmented Project Management Demo Philosophy
            </h3>
            <p className="text-blue-900 leading-relaxed text-xs">
              This prototype demonstrates how predictive project analytics and generative AI empower project managers to anticipate timeline slippage <em>before</em> deadlines are missed. Risk scores are generated via transparent, rule-based algorithms, while Generative AI provides grounded root-cause explanations and actionable recovery measures.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Our Demo vs Real Product
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3.5">Dimension</th>
                    <th className="py-2.5 px-3.5 text-blue-800 bg-blue-50/50">Our Demo</th>
                    <th className="py-2.5 px-3.5 text-slate-800">Real Product</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {comparisonRows.map((row, idx) => {
                    const Icon = row.icon;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3.5 text-slate-700 font-semibold flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{row.dimension}</span>
                        </td>
                        <td className="py-2.5 px-3.5 text-blue-700 font-semibold bg-blue-50/30">
                          {row.demo}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600">
                          {row.product}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mandatory Safety Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-xs font-bold text-amber-900">
              Changes are saved in this browser only.
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Project inputs, task updates, scoring weights, and accepted AI drafts stay in local browser storage (<code className="font-mono">localStorage</code>). When live AI is enabled, only the analysis prompt is sent through the local API proxy to the selected provider; the API key remains server-side.
            </p>
          </div>

          {/* Architecture Highlight */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
              Engineering Architecture
            </h4>
            <p className="text-slate-600 text-xs leading-relaxed">
              Built with React 18, Vite, Tailwind CSS, and Recharts. Persistence is isolated into a standalone <code className="bg-slate-200/80 px-1 py-0.2 rounded font-mono text-slate-900">storage.js</code> service module, and all generative calls flow through <code className="bg-slate-200/80 px-1 py-0.2 rounded font-mono text-slate-900">aiService.js</code>, ensuring zero coupling between UI screens and downstream cloud backends.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Augmented Project Management · Team 4
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition text-xs shadow-2xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
