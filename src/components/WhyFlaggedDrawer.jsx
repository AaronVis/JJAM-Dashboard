import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle2, AlertCircle, Link2, Edit3, Trash2, 
  Sparkles, ShieldAlert, ArrowRight, Check, ChevronDown, 
  ChevronUp, RotateCw, Edit2, ListChecks 
} from 'lucide-react';
import { generateTaskAiInsights, computeTaskHash } from '../utils/aiService';
import { getAiCache, saveAiCache } from '../utils/storage';

export default function WhyFlaggedDrawer({
  isOpen,
  onClose,
  task,
  scoreData,
  project,
  allTasks,
  onEditTask,
  onDeleteTask,
  aiProvider = 'gemini',
  demoDate
}) {
  const currentScore = scoreData?.score ?? 0;
  const status = scoreData?.status ?? 'GREEN';
  const firedRules = scoreData?.firedRules ?? [];
  const isDelayed = status === 'AMBER' || status === 'RED';

  const taskHash = task ? computeTaskHash(task, firedRules, allTasks) : '';
  const cacheKey = task ? `task_ai_${task.id}_${aiProvider}_${taskHash}` : '';

  // AI State
  const [aiData, setAiData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editCause, setEditCause] = useState('');
  const [editForecast, setEditForecast] = useState('');
  const [editActions, setEditActions] = useState([]);
  const [showAudit, setShowAudit] = useState(false);

  // Sync state from localStorage when task changes
  useEffect(() => {
    if (!task) return;
    const cache = getAiCache();
    const cached = cache[cacheKey];
    if (cached) {
      setAiData(cached);
      setEditCause(cached.cause || '');
      setEditForecast(cached.forecast || '');
      setEditActions(cached.actions || []);
    } else {
      setAiData(null);
      setEditCause('');
      setEditForecast('');
      setEditActions([]);
    }
    setIsEditing(false);
    setShowAudit(false);
  }, [task, taskHash, cacheKey, aiProvider]);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const result = await generateTaskAiInsights(task, scoreData, allTasks, aiProvider);
      const newEntry = {
        cause: result.cause,
        forecast: result.forecast,
        actions: result.actions,
        isFallback: result.isFallback,
        fallbackNotice: result.fallbackNotice,
        audit: result.audit,
        status: 'draft', // 'draft' | 'accepted'
        generatedAt: new Date().toISOString(),
      };
      setAiData(newEntry);
      setEditCause(newEntry.cause);
      setEditForecast(newEntry.forecast);
      setEditActions(newEntry.actions);
      setIsEditing(false);

      // Persist in localStorage
      const cache = getAiCache();
      cache[cacheKey] = newEntry;
      saveAiCache(cache);
    } catch (err) {
      console.error('Error generating AI insights:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = () => {
    if (!aiData) return;
    const updated = {
      ...aiData,
      cause: editCause || aiData.cause,
      forecast: editForecast || aiData.forecast,
      actions: editActions.length > 0 ? editActions : aiData.actions,
      status: 'accepted',
    };
    setAiData(updated);
    setIsEditing(false);

    const cache = getAiCache();
    cache[cacheKey] = updated;
    saveAiCache(cache);
  };

  const handleDismiss = () => {
    setAiData(null);
    setEditCause('');
    setEditActions([]);
    setIsEditing(false);

    const cache = getAiCache();
    delete cache[cacheKey];
    saveAiCache(cache);
  };

  const parentTask = task?.dependsOn 
    ? allTasks.find((t) => t.id === task.dependsOn) 
    : null;

  const blockedChildren = task 
    ? allTasks.filter((t) => t.dependsOn === task.id) 
    : [];

  if (!isOpen || !task) return null;

  const statusTheme = {
    RED: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-700',
      badge: 'bg-rose-600 text-white',
      badgeSoft: 'bg-rose-100 text-rose-800 border-rose-200',
      label: 'CRITICAL / HIGH RISK',
    },
    AMBER: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      badge: 'bg-amber-500 text-white',
      badgeSoft: 'bg-amber-100 text-amber-800 border-amber-200',
      label: 'AT RISK / MONITOR',
    },
    GREEN: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      badge: 'bg-emerald-600 text-white',
      badgeSoft: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      label: 'ON TRACK',
    },
  }[status];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="workspace-glass-modal w-full max-w-xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                #{task.id}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusTheme.badgeSoft}`}>
                {statusTheme.label}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1.5 leading-snug">
              {task.name}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {project ? project.name : task.projectId} · Assignee: <strong>{task.owner}</strong>
            </p>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Big Score Card */}
          <div className={`p-4 rounded-2xl border ${statusTheme.bg} ${statusTheme.border} flex items-center justify-between`}>
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-600 block">
                Calculated Delay Risk Score
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Deterministic mathematical sum of triggered rules
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-3xl font-black font-mono px-3.5 py-1 rounded-xl shadow-xs ${statusTheme.badge}`}>
                {currentScore}
              </span>
              <span className="text-xs font-bold text-slate-400">/ 100</span>
            </div>
          </div>

          {/* Section: Why is this flagged? (Feature C) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-blue-600" />
                Why is this flagged? (Transparent Rules)
              </h3>
              <span className="text-xs text-slate-400">
                {firedRules.length} rule{firedRules.length === 1 ? '' : 's'} active
              </span>
            </div>

            {firedRules.length === 0 ? (
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-semibold">No risk flags triggered.</p>
                  <p className="text-emerald-700 mt-0.5">
                    This task is progressing in step with schedule expectations.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {firedRules.map((r, idx) => (
                  <div 
                    key={idx} 
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 hover:bg-slate-100/60 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        <span className="text-xs font-bold text-slate-900">{r.name}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        +{r.points} pts
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pl-4">
                      {r.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Insights Section: Feature D (Cause) & Feature E (Suggested Actions) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Generative AI Analysis (Features D & E)
              </h3>
              {aiData && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 transition"
                  title="Regenerate insights"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
              )}
            </div>

            {/* If no insights generated yet */}
            {!aiData && !isLoading && (
              <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-2.5">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-full">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">
                    {isDelayed ? 'Synthesize Root Cause & Recommended PM Actions' : 'Task In Progress on Track'}
                  </h4>
                  <p className="text-[11px] text-slate-500 max-w-sm mt-0.5">
                    {isDelayed 
                      ? 'Ask Gemini to analyze facts and propose concrete, grounded next steps.' 
                      : 'You can generate an executive analysis for this deliverable.'}
                  </p>
                </div>
                <button
                  id="generate-ai-insights-btn"
                  type="button"
                  onClick={handleGenerate}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate AI Insights</span>
                </button>
              </div>
            )}

            {/* Loading Spinner */}
            {isLoading && (
              <div className="p-6 bg-purple-50/40 border border-purple-200 rounded-2xl text-center space-y-2 animate-pulse">
                <div className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="font-semibold text-purple-900 text-xs">
                  Querying Gemini with strictly structured facts...
                </p>
                <p className="text-[10px] text-slate-400">
                  Grounding prompt on task dates, progress lag, and dependencies
                </p>
              </div>
            )}

            {/* AI Insights Display */}
            {aiData && !isLoading && (
              <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-3.5">
                
                {/* Banner & Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      aiData.status === 'accepted' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {aiData.status === 'accepted' ? 'PM Accepted' : 'AI draft, please review'}
                    </span>

                    {aiData.isFallback && (
                      <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        {aiData.fallbackNotice || 'Pre-generated sample. Live call unavailable.'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {aiData.status !== 'accepted' && (
                      <button
                        type="button"
                        onClick={handleAccept}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition"
                      >
                        <Check className="w-3 h-3" />
                        <span>Accept</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDismiss}
                      className="px-2 py-1 text-slate-500 hover:text-rose-600 rounded text-[11px] font-semibold transition"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>

                {/* Edit Form or Display */}
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                        Edit Root Cause:
                      </label>
                      <textarea
                        rows={3}
                        value={editCause}
                        onChange={(e) => setEditCause(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    <label className="block text-xs font-semibold text-slate-700">Delivery forecast</label>
                    <textarea rows={3} value={editForecast} onChange={(e) => setEditForecast(e.target.value)} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                        Edit Actions (one per line):
                      </label>
                      <textarea
                        rows={3}
                        value={editActions.join('\n')}
                        onChange={(e) => setEditActions(e.target.value.split('\n').filter(Boolean))}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAccept}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                    >
                      Save & Accept Edits
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Feature D: Why is it delayed? */}
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-purple-900 block">
                        D. Plain-Language Cause Analysis:
                      </span>
                      <p className="text-slate-800 text-xs leading-relaxed bg-white/80 p-3 rounded-xl border border-purple-100">
                        {aiData.cause}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-purple-900 block">Delivery Forecast:</span>
                      <p className="text-slate-800 text-xs leading-relaxed bg-white/80 p-3 rounded-xl border border-purple-100">{aiData.forecast || 'Generate a fresh analysis to see a delivery forecast.'}</p>
                    </div>

                    {/* Feature E: Suggested Actions */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-purple-900 block flex items-center gap-1">
                        <ListChecks className="w-3.5 h-3.5 text-purple-700" />
                        E. Concrete Next Actions for PM:
                      </span>
                      <div className="space-y-1.5">
                        {aiData.actions?.map((act, i) => (
                          <div 
                            key={i} 
                            className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-purple-100 text-xs text-slate-800"
                          >
                            <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span className="leading-snug">{act}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Explainability Accordion: "What the AI was given" */}
                {aiData.audit && (
                  <div className="border border-purple-200/80 rounded-xl overflow-hidden mt-3">
                    <button
                      type="button"
                      onClick={() => setShowAudit(!showAudit)}
                      className="w-full px-3 py-2 bg-purple-100/60 hover:bg-purple-100 flex items-center justify-between text-purple-900 font-semibold text-[11px] transition"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                        <span>What the AI was given (Prompt Audit & Facts)</span>
                      </span>
                      {showAudit ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {showAudit && (
                      <div className="p-3 bg-slate-900 text-slate-200 text-[10px] font-mono overflow-x-auto space-y-2">
                        <div>
                          <span className="text-purple-400 font-bold block">System Instruction:</span>
                          <p className="text-slate-300">{aiData.audit.systemInstruction}</p>
                        </div>
                        <div>
                          <span className="text-blue-400 font-bold block">Strict Facts Sent:</span>
                          <pre className="text-slate-300">{JSON.stringify(aiData.audit.payloadSent, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Dependency Insights */}
          {(parentTask || blockedChildren.length > 0) && (
            <div className="space-y-2.5 p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs">
              <h4 className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-indigo-600" />
                Dependency Chain Analysis
              </h4>
              
              {parentTask && (
                <div className="text-slate-700">
                  <span className="text-slate-500">Prerequisite (Depends on): </span>
                  <span className="font-semibold text-slate-900">#{parentTask.id} {parentTask.name}</span>
                  <span className={`ml-2 font-mono text-[11px] px-1.5 py-0.2 rounded font-bold ${parentTask.percentComplete < 100 && parentTask.dueDate < demoDate ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'}`}>
                    {parentTask.percentComplete}% ({parentTask.dueDate})
                  </span>
                </div>
              )}

              {blockedChildren.length > 0 && (
                <div className="text-slate-700">
                  <span className="text-slate-500">Blocks downstream tasks: </span>
                  <div className="mt-1 space-y-1">
                    {blockedChildren.map((child) => (
                      <div key={child.id} className="flex items-center gap-1 text-slate-800 pl-2">
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span>#{child.id} {child.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Task Metadata Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Task Details & Metrics
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Schedule Timeline</span>
                <span className="font-semibold text-slate-800 font-mono mt-0.5 block">
                  {task.startDate} → {task.dueDate}
                </span>
                <span className="text-[10px] text-slate-500">Effort: {task.effortDays} work days</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Completion Progress</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-bold text-slate-900 font-mono text-sm">{task.percentComplete}%</span>
                  {task.completedOn && (
                    <span className="text-[10px] text-emerald-600 font-medium">Done: {task.completedOn}</span>
                  )}
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1 mt-1.5 overflow-hidden">
                  <div className="bg-blue-600 h-full" style={{ width: `${task.percentComplete}%` }}></div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Last Update Log</span>
                <span className="font-semibold text-slate-800 font-mono mt-0.5 block">
                  {task.lastUpdate}
                </span>
                <span className="text-[10px] text-slate-500">
                  {scoreData?.daysSinceUpdate ?? 0} days prior to demo date
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Assignee Capacity</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {task.owner}
                </span>
                <span className="text-[10px] text-slate-500">APM Team 4 Resource</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Drawer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete task "${task.name}" (#${task.id})?`)) {
                onDeleteTask(task.id);
                onClose();
              }
            }}
            className="px-3 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Task
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditTask(task);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Task Details
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
