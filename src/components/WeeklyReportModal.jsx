import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, Copy, Check, FileText, ChevronDown, 
  ChevronUp, RotateCw, AlertCircle, Edit2, CheckCircle2 
} from 'lucide-react';
import { generateWeeklyReport, computeWeeklyReportHash, formatWeeklyReport } from '../utils/aiService';
import { getAiCache, saveAiCache } from '../utils/storage';

function StructuredReport({ report }) {
  const status = ['RED', 'AMBER', 'GREEN'].includes(report.overallStatus) ? report.overallStatus : 'REVIEW';
  const statusClass = status === 'RED' ? 'bg-rose-100 text-rose-800 border-rose-200'
    : status === 'AMBER' ? 'bg-amber-100 text-amber-800 border-amber-200'
      : status === 'GREEN' ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
        : 'bg-slate-100 text-slate-700 border-slate-200';
  const confidence = ['LOW', 'MEDIUM', 'HIGH'].includes(report.forecastConfidence) ? report.forecastConfidence : 'LOW';
  const risks = Array.isArray(report.keyRisks) ? report.keyRisks : [];
  const decisions = Array.isArray(report.decisions) ? report.decisions : [];
  const actions = Array.isArray(report.actionPlan) ? report.actionPlan : [];
  const watchItems = Array.isArray(report.watchItems) ? report.watchItems : [];
  const dataGaps = Array.isArray(report.dataGaps) ? report.dataGaps : [];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-slate-950 text-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-300">Executive brief</span>
          <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black tracking-wider ${statusClass}`}>{status} PROJECT OUTLOOK</span>
        </div>
        <p className="text-sm sm:text-base leading-7 font-medium text-slate-100">{report.executiveBrief}</p>
      </section>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs uppercase tracking-wider font-bold text-indigo-950">Delivery forecast</h3>
          <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${confidence === 'LOW' ? 'bg-amber-100 text-amber-800' : confidence === 'HIGH' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>{confidence} CONFIDENCE</span>
        </div>
        <p className="text-sm leading-6 text-slate-800">{report.deliveryForecast}</p>
        <p className="text-[11px] leading-5 text-slate-600"><strong>Confidence basis:</strong> {report.confidenceBasis}</p>
        {report.scenarios && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {[
              ['Best case', report.scenarios.bestCase, 'border-emerald-200 bg-white'],
              ['Most likely', report.scenarios.mostLikely, 'border-blue-200 bg-white'],
              ['Risk case', report.scenarios.riskCase, 'border-rose-200 bg-white'],
            ].map(([label, value, classes]) => (
              <div key={label} className={`rounded-xl border p-3 ${classes}`}>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">{label}</p>
                <p className="text-[11px] leading-5 text-slate-700">{value || 'Not provided.'}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {risks.length > 0 && (
        <section className="space-y-2.5">
          <h3 className="text-xs uppercase tracking-wider font-bold text-slate-700">Critical delivery risks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {risks.map((risk, index) => {
              const red = risk.riskLevel === 'RED';
              return (
                <article key={`${risk.taskId}-${index}`} className={`rounded-xl border p-3.5 ${red ? 'border-rose-200 bg-rose-50/60' : 'border-amber-200 bg-amber-50/50'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div><span className="font-mono text-[10px] text-slate-500">{risk.taskId}</span><h4 className="text-xs font-bold text-slate-900">{risk.title}</h4></div>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black ${red ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'}`}>{risk.riskLevel}</span>
                  </div>
                  <p className="text-[11px] leading-5 text-slate-700"><strong>Evidence:</strong> {risk.evidence}</p>
                  <p className="text-[11px] leading-5 text-slate-700 mt-1"><strong>Impact:</strong> {risk.deliveryImpact}</p>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {decisions.length > 0 && (
        <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 space-y-3">
          <h3 className="text-xs uppercase tracking-wider font-bold text-violet-950">Decisions for the project lead</h3>
          {decisions.map((item, index) => (
            <div key={index} className="flex items-start gap-3 bg-white border border-violet-100 rounded-xl p-3">
              <span className="shrink-0 px-1.5 py-1 rounded bg-violet-100 text-violet-800 text-[9px] font-black">{item.priority || 'REVIEW'}</span>
              <div className="min-w-0"><p className="text-xs font-semibold text-slate-800">{item.decision}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Owner: {item.owner || 'Project manager'} · Trigger: {item.trigger}</p></div>
            </div>
          ))}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-2"><h3 className="text-xs uppercase tracking-wider font-bold text-slate-800">Prioritized action plan</h3><span className="text-[10px] text-slate-400">Owner · timing · success measure</span></div>
        <div className="space-y-2">
          {actions.map((item, index) => (
            <div key={index} className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl bg-slate-50 border border-slate-100 p-3">
              <span className={`mt-0.5 px-1.5 py-0.5 h-fit rounded text-[9px] font-black ${item.priority === 'P1' ? 'bg-rose-100 text-rose-700' : item.priority === 'P2' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>{item.priority || `P${index + 1}`}</span>
              <div><p className="text-xs font-semibold leading-5 text-slate-800">{item.action}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{item.owner || 'Project manager'} · {item.timing || 'Before next review'}</p><p className="mt-1 text-[10px] leading-4 text-emerald-800"><strong>Done when:</strong> {item.successMeasure || 'The risk is resolved and task status is updated.'}</p></div>
            </div>
          ))}
        </div>
      </section>

      {(watchItems.length > 0 || dataGaps.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {watchItems.length > 0 && <section className="rounded-xl border border-sky-100 bg-sky-50/60 p-3.5"><h3 className="text-[10px] uppercase tracking-wider font-bold text-sky-900 mb-2">Watchlist</h3><ul className="space-y-1.5">{watchItems.map((item, index) => <li key={index} className="text-[11px] leading-5 text-slate-700">• {item}</li>)}</ul></section>}
          {dataGaps.length > 0 && <section className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"><h3 className="text-[10px] uppercase tracking-wider font-bold text-slate-600 mb-2">Forecast limits</h3><ul className="space-y-1.5">{dataGaps.map((item, index) => <li key={index} className="text-[11px] leading-5 text-slate-600">• {item}</li>)}</ul></section>}
        </div>
      )}
    </div>
  );
}

export default function WeeklyReportModal({ 
  isOpen, 
  onClose, 
  project, 
  tasks, 
  summary, 
  riskScores = {},
  aiProvider = 'gemini',
  demoDate = '',
}) {
  const projectId = project ? project.id : 'all';
  const reportHash = computeWeeklyReportHash(project, tasks, summary, riskScores, demoDate);
  const cacheKey = `weekly_report_${projectId}_${aiProvider}_${reportHash}`;

  const [reportState, setReportState] = useState({
    summary: '',
    report: null,
    isFallback: false,
    fallbackNotice: null,
    audit: null,
    status: 'draft', // 'draft' | 'accepted'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  // Load cached report on mount or project change
  useEffect(() => {
    const cache = getAiCache();
    if (cache[cacheKey]) {
      setReportState(cache[cacheKey]);
      setEditText(cache[cacheKey].summary || (cache[cacheKey].report ? formatWeeklyReport(cache[cacheKey].report) : ''));
    } else {
      setReportState({
        summary: '',
        report: null,
        isFallback: false,
        fallbackNotice: null,
        audit: null,
        status: 'draft',
      });
      setEditText('');
    }
    setIsEditing(false);
    setShowAudit(false);
  }, [cacheKey]);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await generateWeeklyReport(project, tasks, summary, riskScores, aiProvider, demoDate);
      const updated = {
        summary: res.summary,
        report: res.report || null,
        isFallback: res.isFallback,
        fallbackNotice: res.fallbackNotice,
        audit: res.audit,
        status: 'draft',
      };
      setReportState(updated);
      setEditText(res.report ? formatWeeklyReport(res.report) : res.summary);
      setIsEditing(false);

      // Persist in localStorage cache
      const cache = getAiCache();
      cache[cacheKey] = updated;
      saveAiCache(cache);
    } catch (err) {
      console.error('Failed to generate weekly report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = () => {
    const updated = {
      ...reportState,
      summary: editText || reportState.summary,
      report: isEditing ? null : reportState.report,
      status: 'accepted',
    };
    setReportState(updated);
    setIsEditing(false);

    const cache = getAiCache();
    cache[cacheKey] = updated;
    saveAiCache(cache);
  };

  const handleDismiss = () => {
    setReportState({
      summary: '',
      report: null,
      isFallback: false,
      fallbackNotice: null,
      audit: null,
      status: 'draft',
    });
    setEditText('');
    setIsEditing(false);

    const cache = getAiCache();
    delete cache[cacheKey];
    saveAiCache(cache);
  };

  const handleCopy = async () => {
    const content = isEditing ? editText : reportState.report ? formatWeeklyReport(reportState.report) : reportState.summary;
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="workspace-glass-modal bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Weekly Executive Status Report (AI)
              </h2>
              <p className="text-xs text-slate-500">
                Scope: <strong>{project ? project.name : 'All Consolidated Projects'}</strong>
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* If no report has been generated yet */}
          {!reportState.summary && !isLoading && (
            <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Build a Decision-Ready Delivery Brief
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                  The model reviews all {tasks.length} tasks, dependencies, owners, dates, effort estimates and risk signals to produce an evidence-backed outlook, scenarios, decisions and a prioritized action plan.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-purple-500/20 inline-flex items-center gap-2 transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Weekly Report</span>
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12 space-y-3 animate-pulse">
              <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="font-semibold text-purple-900 text-xs">
                Reviewing task-level evidence, dependencies and delivery scenarios...
              </p>
              <p className="text-[11px] text-slate-400">
                Forecast confidence is limited when historical trend or capacity data is missing.
              </p>
            </div>
          )}

          {/* Render Generated Report */}
          {reportState.summary && !isLoading && (
            <div className="space-y-4">
              
              {/* Draft Status Banner & Fallback Notice */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    reportState.status === 'accepted' 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {reportState.status === 'accepted' ? 'PM Accepted' : 'AI draft, please review'}
                  </span>
                  {reportState.isFallback && (
                    <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      {reportState.fallbackNotice || 'Pre-generated sample. Live call unavailable.'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold flex items-center gap-1 shadow-2xs transition"
                    title="Copy report text"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied!' : 'Copy to Clipboard'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition"
                    title="Regenerate Report"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Text Display or Editor */}
              {isEditing ? (
                <div className="space-y-2">
                  <label className="block text-slate-700 font-semibold text-xs">
                    Edit Executive Report Text (PM Override):
                  </label>
                  <textarea
                    rows={16}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl font-sans text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditText(reportState.report ? formatWeeklyReport(reportState.report) : reportState.summary);
                        setIsEditing(false);
                      }}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                    >
                      Cancel Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleAccept}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                    >
                      Save & Accept Changes
                    </button>
                  </div>
                </div>
              ) : (
                reportState.report ? (
                  <StructuredReport report={reportState.report} />
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl">
                    <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed">
                      {reportState.summary}
                    </pre>
                  </div>
                )
              )}

              {/* PM Control Action Bar */}
              {!isEditing && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    {reportState.status !== 'accepted' && (
                      <button
                        type="button"
                        onClick={handleAccept}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-2xs transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Accept Draft</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setEditText(reportState.report ? formatWeeklyReport(reportState.report) : reportState.summary);
                        setIsEditing(true);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold flex items-center gap-1.5 shadow-2xs transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDismiss}
                      className="px-3 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg font-semibold transition"
                    >
                      Dismiss
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    Saved in browser localStorage
                  </span>
                </div>
              )}

              {/* Explainability Accordion: "What the AI was given" */}
              {reportState.audit && (
                <div className="border border-slate-200 rounded-xl overflow-hidden mt-4">
                  <button
                    type="button"
                    onClick={() => setShowAudit(!showAudit)}
                    className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-slate-700 font-semibold text-xs transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>What the AI was given (Explainability Audit)</span>
                    </span>
                    {showAudit ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showAudit && (
                    <div className="p-4 bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto space-y-3">
                      <div>
                        <span className="text-purple-400 font-bold block mb-1">System Instruction:</span>
                        <p className="text-slate-300">{reportState.audit.systemInstruction}</p>
                      </div>
                      <div>
                        <span className="text-blue-400 font-bold block mb-1">Structured Payload Sent:</span>
                        <pre className="text-slate-300">{JSON.stringify(reportState.audit.payloadSent, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Augmented Project Management · Team 4
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold transition text-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
