import React, { useState, useEffect } from 'react';
import { X, Clock, Link2, CheckSquare, Save } from 'lucide-react';

export default function TaskModal({ 
  isOpen, 
  onClose, 
  taskToEdit, 
  projects, 
  allTasks, 
  onSaveTask,
  demoDate
}) {
  const isEditing = Boolean(taskToEdit);

  const [formData, setFormData] = useState({
    id: '',
    projectId: projects[0]?.id || 'prj-1',
    name: '',
    owner: 'Sarah Chen',
    startDate: '2026-11-01',
    dueDate: '2026-11-20',
    percentComplete: 0,
    effortDays: 5,
    dependsOn: '',
    lastUpdate: demoDate || '2026-11-12',
    completedOn: '',
  });

  useEffect(() => {
    if (taskToEdit) {
      setFormData({
        id: taskToEdit.id,
        projectId: taskToEdit.projectId || projects[0]?.id || 'prj-1',
        name: taskToEdit.name || '',
        owner: taskToEdit.owner || 'Sarah Chen',
        startDate: taskToEdit.startDate || '2026-11-01',
        dueDate: taskToEdit.dueDate || '2026-11-20',
        percentComplete: taskToEdit.percentComplete ?? 0,
        effortDays: taskToEdit.effortDays ?? 5,
        dependsOn: taskToEdit.dependsOn || '',
        lastUpdate: taskToEdit.lastUpdate || demoDate || '2026-11-12',
        completedOn: taskToEdit.completedOn || '',
      });
    } else {
      // New task ID generator
      const nextIdNum = allTasks.length + 1;
      const nextId = `tsk-${String(nextIdNum).padStart(2, '0')}`;
      setFormData({
        id: nextId,
        projectId: projects[0]?.id || 'prj-1',
        name: '',
        owner: 'Sarah Chen',
        startDate: demoDate || '2026-11-12',
        dueDate: '2026-11-25',
        percentComplete: 0,
        effortDays: 5,
        dependsOn: '',
        lastUpdate: demoDate || '2026-11-12',
        completedOn: '',
      });
    }
  }, [taskToEdit, projects, allTasks, demoDate]);

  const handlePercentChange = (val) => {
    const num = Math.min(100, Math.max(0, Number(val)));
    const updated = { ...formData, percentComplete: num };
    if (num === 100 && !updated.completedOn) {
      updated.completedOn = demoDate || '2026-11-12';
    } else if (num < 100) {
      updated.completedOn = '';
    }
    setFormData(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a task name.');
      return;
    }

    const payload = {
      ...formData,
      percentComplete: Number(formData.percentComplete),
      effortDays: Number(formData.effortDays) || 1,
      dependsOn: formData.dependsOn ? formData.dependsOn : null,
      completedOn: formData.percentComplete >= 100 ? (formData.completedOn || demoDate) : null,
    };

    onSaveTask(payload);
    onClose();
  };

  // List potential dependencies (excluding self)
  const potentialDependencies = allTasks.filter(
    (t) => !isEditing || t.id !== taskToEdit.id
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="workspace-glass-modal bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEditing ? `Edit Task #${taskToEdit.id}` : 'Create New Task'}
            </h2>
            <p className="text-xs text-slate-500">
              Changes update delay risk scores and burn-down charts immediately
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 overflow-y-auto space-y-4 text-xs">
          {/* Task Name */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text"
              required
              placeholder="e.g. Implement OAuth Security Integration"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
            />
          </div>

          {/* Project & Owner row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Project</label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Assignee / Owner</label>
              <input
                type="text"
                list="owner-options"
                required
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium"
              />
              <datalist id="owner-options">
                <option value="Sarah Chen" />
                <option value="Alex Rivera" />
                <option value="Marcus Taylor" />
                <option value="Priya Patel" />
              </datalist>
            </div>
          </div>

          {/* Dates & Effort */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Start Date</label>
              <input 
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Due Date <span className="text-rose-500">*</span>
              </label>
              <input 
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Effort (Days)</label>
              <input 
                type="number"
                min="1"
                max="60"
                required
                value={formData.effortDays}
                onChange={(e) => setFormData({ ...formData, effortDays: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800"
              />
            </div>
          </div>

          {/* Progress Slider */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-slate-800 font-semibold flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                Percent Complete
              </label>
              <span className="font-mono font-bold text-sm text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                {formData.percentComplete}%
              </span>
            </div>

            <input 
              type="range"
              min="0"
              max="100"
              step="5"
              value={formData.percentComplete}
              onChange={(e) => handlePercentChange(e.target.value)}
              className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0% Not Started</span>
              <span>50% In Progress</span>
              <span>100% Completed</span>
            </div>
          </div>

          {/* Upstream Dependency & Last Update */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5 text-slate-400" />
                Depends On (Prerequisite Task)
              </label>
              <select
                value={formData.dependsOn}
                onChange={(e) => setFormData({ ...formData, dependsOn: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-xs"
              >
                <option value="">None (No upstream dependency)</option>
                {potentialDependencies.map((pTask) => (
                  <option key={pTask.id} value={pTask.id}>
                    [{pTask.id}] {pTask.name} ({pTask.percentComplete}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Last Update Date
              </label>
              <input 
                type="date"
                required
                value={formData.lastUpdate}
                onChange={(e) => setFormData({ ...formData, lastUpdate: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800 text-xs"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Dates older than 5 days trigger the "Silent task" penalty.
              </p>
            </div>
          </div>

          {/* Completed On (active if 100%) */}
          {formData.percentComplete >= 100 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <label className="block text-emerald-900 font-semibold mb-1">
                Completed On Date
              </label>
              <input 
                type="date"
                value={formData.completedOn || demoDate}
                onChange={(e) => setFormData({ ...formData, completedOn: e.target.value })}
                className="px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg font-mono text-emerald-900 text-xs"
              />
              <p className="text-[10px] text-emerald-700 mt-1">
                Completed tasks are guaranteed <strong>GREEN</strong> (Score = 0).
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
