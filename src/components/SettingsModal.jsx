import React, { useState } from 'react';
import { 
  Sliders, Calendar, RotateCcw, CheckCircle2, 
  AlertCircle, X, SlidersHorizontal, Info, Sparkles, 
  Database, Download, Upload 
} from 'lucide-react';
import { DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS, DEFAULT_SETTINGS } from '../utils/riskEngine';
import { testGeminiConnection, testNvidiaConnection } from '../utils/aiService';

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  settings, 
  onSaveSettings, 
  onResetDefaults,
  onExportData,
  onImportData 
}) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [apiKeyTesting, setApiKeyTesting] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState(null); // { success: boolean, message: string }

  const handleWeightChange = (key, val) => {
    const updated = {
      ...localSettings,
      weights: {
        ...localSettings.weights,
        [key]: Number(val),
      },
    };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const handleThresholdChange = (key, val) => {
    const updated = {
      ...localSettings,
      thresholds: {
        ...localSettings.thresholds,
        [key]: Number(val),
      },
    };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const handleDemoDateChange = (val) => {
    const updated = {
      ...localSettings,
      demoDate: val,
    };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const handleAiProviderChange = (provider) => {
    const updated = { ...localSettings, aiProvider: provider };
    setLocalSettings(updated);
    onSaveSettings(updated);
    setApiKeyStatus(null);
  };

  const handleTestProvider = async () => {
    setApiKeyTesting(true);
    setApiKeyStatus(null);

    try {
      const modelName = localSettings.aiProvider === 'nvidia'
        ? await testNvidiaConnection()
        : await testGeminiConnection();
      setApiKeyStatus({ success: true, message: `Connected. Using ${modelName} for live analysis.` });
    } catch (err) {
      setApiKeyStatus({
        success: false,
        message: `${localSettings.aiProvider === 'nvidia' ? 'NVIDIA' : 'Gemini'} connection failed: ${err.message}`,
      });
    } finally {
      setApiKeyTesting(false);
    }
  };

  const handleReset = () => {
    onResetDefaults();
    setLocalSettings(prev => ({
      ...DEFAULT_SETTINGS,
      aiProvider: prev.aiProvider || DEFAULT_SETTINGS.aiProvider,
    }));
    setApiKeyStatus(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="workspace-glass-modal bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Scoring Engine & Simulation Settings</h2>
              <p className="text-xs text-slate-500">Fine-tune weights, thresholds, demo timeline and AI credentials</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="px-6 py-5 overflow-y-auto space-y-6">
          {/* Timeline Demo Date Setting */}
          <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-blue-900 mb-1">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Configurable "Demo Date" (Simulated "Today")
                </label>
                <p className="text-xs text-blue-700 leading-relaxed">
                  All risk formulas, overdue flags, elapsed time percentages, and owner overload windows are calculated relative to this date for stable presentation results.
                </p>
              </div>
              <input 
                type="date"
                value={localSettings.demoDate || '2026-11-12'}
                onChange={(e) => handleDemoDateChange(e.target.value)}
                className="px-3 py-1.5 text-sm bg-white border border-blue-200 rounded-lg font-mono text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Rule Weights */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-slate-500" />
                Rule Weights (Points Added When Rule Fires)
              </h3>
              <span className="text-xs text-slate-400">Score = Sum of rules (capped at 100)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Overdue */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-sm font-medium text-slate-700 mb-1.5">
                  <span>Overdue Task</span>
                  <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs">
                    +{localSettings.weights.overdue} pts
                  </span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={localSettings.weights.overdue}
                  onChange={(e) => handleWeightChange('overdue', e.target.value)}
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-1">Due date passed & task not 100% complete.</p>
              </div>

              {/* Behind Schedule */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-sm font-medium text-slate-700 mb-1.5">
                  <span>Behind Schedule</span>
                  <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs">
                    +{localSettings.weights.behindSchedule} pts
                  </span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={localSettings.weights.behindSchedule}
                  onChange={(e) => handleWeightChange('behindSchedule', e.target.value)}
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-1">Completion % lags timeline elapsed % by ≥ {localSettings.thresholds.behindScheduleThresholdPct}%.</p>
              </div>

              {/* Blocked */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-sm font-medium text-slate-700 mb-1.5">
                  <span>Blocked Dependency</span>
                  <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs">
                    +{localSettings.weights.blocked} pts
                  </span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={localSettings.weights.blocked}
                  onChange={(e) => handleWeightChange('blocked', e.target.value)}
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-1">Upstream prerequisite is overdue or incomplete.</p>
              </div>

              {/* Overloaded Owner */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-sm font-medium text-slate-700 mb-1.5">
                  <span>Overloaded Owner</span>
                  <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs">
                    +{localSettings.weights.overloadedOwner} pts
                  </span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={localSettings.weights.overloadedOwner}
                  onChange={(e) => handleWeightChange('overloadedOwner', e.target.value)}
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-1">Owner has ≥ {localSettings.thresholds.overloadedTaskCount} open tasks due in next {localSettings.thresholds.overloadedWindowDays}d.</p>
              </div>

              {/* Silent Task */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 md:col-span-2">
                <div className="flex justify-between items-center text-sm font-medium text-slate-700 mb-1.5">
                  <span>Silent Task (Stale Status)</span>
                  <span className="font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded text-xs">
                    +{localSettings.weights.silentTask} pts
                  </span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={localSettings.weights.silentTask}
                  onChange={(e) => handleWeightChange('silentTask', e.target.value)}
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-1">No update logged for ≥ {localSettings.thresholds.silentDaysThreshold} days.</p>
              </div>
            </div>
          </div>

          {/* RAG Thresholds */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-500" />
              RAG Classification Boundaries
            </h3>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Green Max Ceiling (0 to {localSettings.thresholds.greenMax})</span>
                    <span className="text-emerald-700 font-bold">{localSettings.thresholds.greenMax} pts</span>
                  </div>
                  <input 
                    type="range"
                    min="10"
                    max="45"
                    value={localSettings.thresholds.greenMax}
                    onChange={(e) => handleThresholdChange('greenMax', e.target.value)}
                    className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Amber Max Ceiling ({localSettings.thresholds.greenMax + 1} to {localSettings.thresholds.amberMax})</span>
                    <span className="text-amber-700 font-bold">{localSettings.thresholds.amberMax} pts</span>
                  </div>
                  <input 
                    type="range"
                    min="35"
                    max="80"
                    value={localSettings.thresholds.amberMax}
                    onChange={(e) => handleThresholdChange('amberMax', e.target.value)}
                    className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="inline-block w-3 h-3 rounded-full bg-emerald-500"></span>
                <span>Green: 0 - {localSettings.thresholds.greenMax}</span>
                <span className="mx-1 text-slate-300">|</span>
                <span className="inline-block w-3 h-3 rounded-full bg-amber-500"></span>
                <span>Amber: {localSettings.thresholds.greenMax + 1} - {localSettings.thresholds.amberMax}</span>
                <span className="mx-1 text-slate-300">|</span>
                <span className="inline-block w-3 h-3 rounded-full bg-rose-600"></span>
                <span>Red: {localSettings.thresholds.amberMax + 1} - 100</span>
              </div>
            </div>
          </div>

          {/* AI Provider API Key Configuration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                AI Provider & Server Key
              </h3>
              <span className="text-[11px] text-slate-400">Key stays on the server</span>
            </div>

            <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl space-y-3">
              <p className="text-[11px] leading-relaxed text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                Provider requests now go through the local API proxy. The API key is read from the server environment and is never saved in browser storage.
              </p>
              <label className="block text-xs font-semibold text-slate-700">Provider</label>
              <select value={localSettings.aiProvider || 'gemini'} onChange={(e) => handleAiProviderChange(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="gemini">Google Gemini</option>
                <option value="nvidia">NVIDIA API Catalog</option>
              </select>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-700">
                  {import.meta.env.DEV ? (
                    <>Set <code className="font-mono bg-purple-100 px-1 rounded">{localSettings.aiProvider === 'nvidia' ? 'NVIDIA_API_KEY' : 'GEMINI_API_KEY'}</code> in <code className="font-mono bg-purple-100 px-1 rounded">.env.local</code>, then restart the dev server.</>
                  ) : (
                    <>Manage <code className="font-mono bg-purple-100 px-1 rounded">{localSettings.aiProvider === 'nvidia' ? 'NVIDIA_API_KEY' : 'GEMINI_API_KEY'}</code> in Vercel Project Settings → Environment Variables, then redeploy.</>
                  )}
                </p>
                <button
                  type="button"
                  onClick={handleTestProvider}
                  disabled={apiKeyTesting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                >
                  {apiKeyTesting ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              {apiKeyStatus && (
                <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${apiKeyStatus.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {apiKeyStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{apiKeyStatus.message}</span>
                </div>
              )}

              <p className="text-[11px] text-purple-700/80 leading-relaxed">
                If no API key is provided, the dashboard automatically utilizes calibrated offline fallbacks (<code className="font-mono bg-purple-100/70 px-1 py-0.5 rounded">aiFallback.json</code>) so demo presentations never fail.
              </p>
            </div>
          </div>

          {/* Data Safety Net: Export & Import */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-600" />
                Data Safety Net (JSON Backup & Restore)
              </h3>
              <span className="text-[11px] text-slate-400">Offline JSON portability</span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Save an instant backup snapshot of all projects, calibrated tasks, score weights, and AI drafts to a local JSON file, or restore from a previous backup.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const dataStr = onExportData();
                    const blob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `ppd-backup-${localSettings.demoDate || 'demo'}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>Export JSON Backup</span>
                </button>

                <label className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>Import JSON Backup</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          onImportData(event.target.result);
                          alert('Data backup imported successfully!');
                          onClose();
                        } catch (err) {
                          alert(`Import failed: ${err.message}`);
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Default Weights & Thresholds
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Done & Apply
          </button>
        </div>
      </div>
    </div>
  );
}
