import React, { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { 
  SlidersHorizontal, RotateCcw, Calendar, 
  Plus, Search, ArrowUpDown, Layers, User, 
  Trash2, Edit3, HelpCircle, FolderPlus, Sparkles, Info
} from 'lucide-react';

import { 
  getProjects, getTasks, getSettings, saveSettings, 
  saveProjects, saveTasks, resetDemo, initializeStorage,
  exportAllData, importAllData
} from './utils/storage';
import { scoreAllTasks, DEFAULT_SETTINGS } from './utils/riskEngine';

const SettingsModal = lazy(() => import('./components/SettingsModal'));
const TaskModal = lazy(() => import('./components/TaskModal'));
const ProjectModal = lazy(() => import('./components/ProjectModal'));
const BurndownChart = lazy(() => import('./components/BurndownChart'));
const WhyFlaggedDrawer = lazy(() => import('./components/WhyFlaggedDrawer'));
const WeeklyReportModal = lazy(() => import('./components/WeeklyReportModal'));
const AboutModal = lazy(() => import('./components/AboutModal'));

export default function App() {
  const [projects, setProjects] = useState(() => getProjects());
  const [tasks, setTasks] = useState(() => getTasks());
  const [settings, setSettings] = useState(() => getSettings());

  // Filter & Navigation State
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [ownerFilter, setOwnerFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('score');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'

  // Modals & Drawers
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isWeeklyReportOpen, setIsWeeklyReportOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [drawerTask, setDrawerTask] = useState(null);

  // Ensure storage is initialized
  useEffect(() => {
    initializeStorage();
  }, []);

  // Recalculate scores whenever tasks or settings change
  const { scoresById, summary: globalSummary } = useMemo(() => {
    return scoreAllTasks(tasks, settings);
  }, [tasks, settings]);

  // Tasks scoped by selected project
  const projectScopedTasks = useMemo(() => {
    if (selectedProjectId === 'all') return tasks;
    return tasks.filter((t) => t.projectId === selectedProjectId);
  }, [tasks, selectedProjectId]);

  // Scoped summary
  const scopedSummary = useMemo(() => {
    if (selectedProjectId === 'all') return globalSummary;
    let red = 0;
    let amber = 0;
    let green = 0;
    let overdue = 0;

    projectScopedTasks.forEach((t) => {
      const s = scoresById[t.id];
      if (s) {
        if (s.status === 'RED') red++;
        else if (s.status === 'AMBER') amber++;
        else green++;

        if (!s.isCompleted && t.dueDate < settings.demoDate) overdue++;
      }
    });

    return {
      total: projectScopedTasks.length,
      red,
      amber,
      green,
      overdue,
    };
  }, [projectScopedTasks, selectedProjectId, globalSummary, scoresById, settings.demoDate]);

  // Unique list of owners for filtering
  const allOwners = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => {
      if (t.owner) set.add(t.owner);
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Filtered & Sorted Tasks for Table Display
  const displayedTasks = useMemo(() => {
    return projectScopedTasks
      .filter((t) => {
        // Status filter
        const s = scoresById[t.id];
        if (statusFilter !== 'ALL' && s?.status !== statusFilter) return false;

        // Owner filter
        if (ownerFilter !== 'ALL' && t.owner !== ownerFilter) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = t.name.toLowerCase().includes(q);
          const matchId = t.id.toLowerCase().includes(q);
          const matchOwner = t.owner.toLowerCase().includes(q);
          if (!matchName && !matchId && !matchOwner) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const scoreA = scoresById[a.id]?.score ?? 0;
        const scoreB = scoresById[b.id]?.score ?? 0;

        let comp = 0;
        if (sortField === 'score') {
          comp = scoreA - scoreB;
        } else if (sortField === 'name') {
          comp = a.name.localeCompare(b.name);
        } else if (sortField === 'dueDate') {
          comp = (a.dueDate || '').localeCompare(b.dueDate || '');
        } else if (sortField === 'percentComplete') {
          comp = (a.percentComplete || 0) - (b.percentComplete || 0);
        } else if (sortField === 'owner') {
          comp = (a.owner || '').localeCompare(b.owner || '');
        }

        return sortDirection === 'asc' ? comp : -comp;
      });
  }, [projectScopedTasks, statusFilter, ownerFilter, searchQuery, sortField, sortDirection, scoresById]);

  // Project currently selected object
  const activeProject = useMemo(() => {
    if (selectedProjectId === 'all') return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Overall Project Health Badge calculation
  const overallHealth = useMemo(() => {
    if (scopedSummary.red > 0) return { label: 'CRITICAL', color: 'bg-rose-600 text-white', border: 'border-rose-300' };
    if (scopedSummary.amber > 0) return { label: 'AT RISK', color: 'bg-amber-500 text-white', border: 'border-amber-300' };
    return { label: 'HEALTHY', color: 'bg-emerald-600 text-white', border: 'border-emerald-300' };
  }, [scopedSummary]);

  // Handlers for Storage Updates
  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleResetDefaults = () => {
    const updated = {
      ...DEFAULT_SETTINGS,
      aiProvider: settings.aiProvider || DEFAULT_SETTINGS.aiProvider,
    };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleResetDemoData = () => {
    if (window.confirm('Reset all demo data back to original calibrated state? (2 Red, 3 Amber, 15 Green)')) {
      const reset = resetDemo();
      if (reset) {
        setProjects(reset.projects);
        setTasks(reset.tasks);
        setSettings(reset.settings);
        setSelectedProjectId('all');
        setStatusFilter('ALL');
        setOwnerFilter('ALL');
        setDrawerTask(null);
      }
    }
  };

  const handleSaveProject = (newProject) => {
    const updated = [...projects, newProject];
    setProjects(updated);
    saveProjects(updated);
    setSelectedProjectId(newProject.id);
  };

  const handleSaveTask = (taskData) => {
    let updated;
    const exists = tasks.some((t) => t.id === taskData.id);
    if (exists) {
      updated = tasks.map((t) => (t.id === taskData.id ? taskData : t));
    } else {
      updated = [...tasks, taskData];
    }
    setTasks(updated);
    saveTasks(updated);

    // If drawer is open on this task, update it
    if (drawerTask?.id === taskData.id) {
      setDrawerTask(taskData);
    }
  };

  const handleDeleteTask = (taskId) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    // Also remove dependsOn references pointing to this task
    const cleaned = updated.map((t) => (t.dependsOn === taskId ? { ...t, dependsOn: null } : t));
    setTasks(cleaned);
    saveTasks(cleaned);
    if (drawerTask?.id === taskId) {
      setDrawerTask(null);
    }
  };

  const handleOpenEditModal = (task) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setTaskToEdit(null);
    setIsTaskModalOpen(true);
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="workspace-shell min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Consulting Header */}
      <header className="workspace-header bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="workspace-logo w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-black text-xl tracking-tight">
              J
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                  JJAM / Projects
                </h1>
                <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Team 4 APM Demo
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Transparent Browser-Based Risk Scoring · Consulting Demo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Demo Date Badge */}
            <div 
              onClick={() => setIsSettingsOpen(true)}
              className="workspace-date-pill flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/70 border border-slate-200/80 text-xs font-medium text-slate-700 cursor-pointer transition"
              title="Click to adjust simulated demo date"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Simulated "Today":</span>
              <span className="font-mono font-bold text-blue-900">{settings.demoDate}</span>
            </div>

            {/* About Demo Button */}
            <button
              id="open-about-btn"
              type="button"
              onClick={() => setIsAboutOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-semibold text-blue-700 transition shadow-2xs"
            >
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span>About Demo</span>
            </button>

            {/* Settings Button */}
            <button
              id="open-settings-btn"
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Settings & Sliders</span>
            </button>

            {/* Reset Demo Button */}
            <button
              id="reset-demo-btn"
              type="button"
              onClick={handleResetDemoData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-semibold text-rose-700 transition shadow-xs"
              title="Restore calibrated 2 Red, 3 Amber sample state"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Reset Demo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="workspace-main max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 space-y-6">
        
        {/* Project Selector & Overview Bar (Feature A) */}
        <section className="workspace-overview bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <label htmlFor="project-select" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Active Project Scope:
              </label>
            </div>
            <select
              id="project-select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            >
              <option value="all">🌐 All Projects (Consolidated Portfolio)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  📁 {p.name} ({p.startDate} to {p.endDate})
                </option>
              ))}
            </select>

            <span className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono tracking-wider shadow-xs ${overallHealth.color}`}>
              RAG: {overallHealth.label}
            </span>
          </div>

          {/* Action Buttons to Add Project, Task, or Generate Weekly AI Report */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              id="weekly-report-btn"
              type="button"
              onClick={() => setIsWeeklyReportOpen(true)}
              className="workspace-secondary-action px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Weekly AI Report</span>
            </button>

            <button
              id="add-project-btn"
              type="button"
              onClick={() => setIsProjectModalOpen(true)}
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition"
            >
              <FolderPlus className="w-3.5 h-3.5 text-slate-500" />
              <span>Add Project</span>
            </button>

            <button
              id="add-task-btn"
              type="button"
              onClick={handleOpenCreateModal}
              className="workspace-primary-action px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </section>

        {/* Executive KPI Cards (Feature A) */}
        <section className="workspace-kpis grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Total Tasks */}
          <div className="workspace-kpi bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {selectedProjectId === 'all' ? 'Total Portfolio Tasks' : 'Project Tasks'}
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-slate-800">{scopedSummary.total}</span>
              <span className="text-xs text-slate-400 font-medium">
                {selectedProjectId === 'all' ? `${projects.length} Streams` : activeProject?.name}
              </span>
            </div>
          </div>

          {/* On Track (Green) */}
          <div 
            onClick={() => setStatusFilter(statusFilter === 'GREEN' ? 'ALL' : 'GREEN')}
            className={`workspace-kpi p-4 rounded-xl border cursor-pointer transition shadow-xs flex flex-col justify-between ${statusFilter === 'GREEN' ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-300'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">On Track (Green)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-emerald-700">{scopedSummary.green}</span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                Score ≤ {settings.thresholds.greenMax}
              </span>
            </div>
          </div>

          {/* At Risk (Amber) */}
          <div 
            onClick={() => setStatusFilter(statusFilter === 'AMBER' ? 'ALL' : 'AMBER')}
            className={`workspace-kpi p-4 rounded-xl border cursor-pointer transition shadow-xs flex flex-col justify-between ${statusFilter === 'AMBER' ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-500' : 'bg-white border-slate-200 hover:border-amber-300'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">At Risk (Amber)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-amber-600">{scopedSummary.amber}</span>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                Score {settings.thresholds.greenMax + 1}-{settings.thresholds.amberMax}
              </span>
            </div>
          </div>

          {/* High Risk (Red) */}
          <div 
            onClick={() => setStatusFilter(statusFilter === 'RED' ? 'ALL' : 'RED')}
            className={`workspace-kpi p-4 rounded-xl border cursor-pointer transition shadow-xs flex flex-col justify-between ${statusFilter === 'RED' ? 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-500' : 'bg-white border-slate-200 hover:border-rose-300'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">High Risk (Red)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-rose-600">{scopedSummary.red}</span>
              <span className="text-[11px] font-bold text-rose-700 bg-rose-100/70 px-1.5 py-0.5 rounded">
                Score ≥ {settings.thresholds.amberMax + 1}
              </span>
            </div>
          </div>

          {/* Overdue */}
          <div className="workspace-kpi bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue Tasks</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-slate-800">{scopedSummary.overdue}</span>
              <span className="text-[11px] font-medium text-slate-400">Past {settings.demoDate}</span>
            </div>
          </div>
        </section>

        {/* Burn-Down Chart (Feature A) */}
        <section>
          <Suspense fallback={<div className="h-72 rounded-xl border border-slate-200 bg-white animate-pulse" aria-label="Loading burn-down chart" />}>
            <BurndownChart
              project={activeProject}
              tasks={projectScopedTasks}
              demoDate={settings.demoDate}
            />
          </Suspense>
        </section>

        {/* Task Management & Table (Feature B & C) */}
        <section className="workspace-task-section bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Search task, ID or owner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 shadow-2xs"
                />
              </div>

              {/* Owner Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500">Owner:</span>
                <select
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                >
                  <option value="ALL">All Owners ({allOwners.length})</option>
                  {allOwners.map((owner) => (
                    <option key={owner} value={owner}>{owner}</option>
                  ))}
                </select>
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-1">
                {['ALL', 'RED', 'AMBER', 'GREEN'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`workspace-filter-pill px-2.5 py-1 text-xs font-bold rounded-md transition ${
                      statusFilter === st
                        ? `workspace-filter-pill-active workspace-filter-pill-active-${st.toLowerCase()} bg-slate-900 text-white shadow-xs`
                        : 'workspace-filter-pill-inactive bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">
                Showing {displayedTasks.length} of {projectScopedTasks.length} tasks
              </span>
              <button
                type="button"
                onClick={handleOpenCreateModal}
              className="workspace-primary-action px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Task</span>
              </button>
            </div>
          </div>

          {/* Interactive Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 font-semibold uppercase tracking-wider text-[11px] select-none">
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-blue-700 transition"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Task Name & ID</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Project</th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-blue-700 transition"
                    onClick={() => toggleSort('owner')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Owner</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-blue-700 transition"
                    onClick={() => toggleSort('dueDate')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Due Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-blue-700 transition min-w-[130px]"
                    onClick={() => toggleSort('percentComplete')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Progress</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 text-center cursor-pointer hover:text-blue-700 transition"
                    onClick={() => toggleSort('score')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Delay Risk</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">RAG Status</th>
                  <th className="py-3 px-4">Fired Risk Rules</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedTasks.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-400 text-xs">
                      No tasks match the active filters or search query.
                    </td>
                  </tr>
                ) : (
                  displayedTasks.map((task) => {
                    const scoreData = scoresById[task.id] || { score: 0, status: 'GREEN', firedRules: [] };
                    const project = projects.find((p) => p.id === task.projectId);

                    const statusBadgeClasses = {
                      RED: 'workspace-status workspace-status-red bg-rose-100 text-rose-800 border-rose-200',
                      AMBER: 'workspace-status workspace-status-amber bg-amber-100 text-amber-800 border-amber-200',
                      GREEN: 'workspace-status workspace-status-green bg-emerald-100 text-emerald-800 border-emerald-200',
                    }[scoreData.status];

                    const scorePillClasses = {
                      RED: 'workspace-score workspace-score-red bg-rose-600 text-white hover:bg-rose-700',
                      AMBER: 'workspace-score workspace-score-amber bg-amber-500 text-white hover:bg-amber-600',
                      GREEN: 'workspace-score workspace-score-green bg-emerald-600 text-white hover:bg-emerald-700',
                    }[scoreData.status];

                    return (
                      <tr 
                        key={task.id} 
                        className="hover:bg-blue-50/30 transition-colors group"
                      >
                        {/* Name & ID */}
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <div 
                            className="flex flex-col cursor-pointer"
                            onClick={() => setDrawerTask(task)}
                          >
                            <span className="font-semibold text-slate-800 group-hover:text-blue-600 transition">
                              {task.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                              ID: {task.id} {task.dependsOn ? `· Depends on #${task.dependsOn}` : ''}
                            </span>
                          </div>
                        </td>

                        {/* Project */}
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                            {project ? project.name : task.projectId}
                          </span>
                        </td>

                        {/* Owner */}
                        <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{task.owner}</span>
                          </div>
                        </td>

                        {/* Due Date */}
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className={`font-mono text-[11px] ${task.dueDate < settings.demoDate && task.percentComplete < 100 ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                              {task.dueDate}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {task.effortDays}d effort
                            </span>
                          </div>
                        </td>

                        {/* Progress */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${task.percentComplete === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                style={{ width: `${task.percentComplete}%` }}
                              ></div>
                            </div>
                            <span className="text-[11px] font-mono font-semibold text-slate-700 w-8 text-right">
                              {task.percentComplete}%
                            </span>
                          </div>
                        </td>

                        {/* Score (Click opens Drawer) */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setDrawerTask(task)}
                            className={`inline-flex items-center justify-center font-mono font-black text-xs px-2.5 py-1 rounded-full shadow-2xs transition transform hover:scale-105 cursor-pointer ${scorePillClasses}`}
                            title="Click to see why this task is flagged"
                          >
                            {scoreData.score}
                          </button>
                        </td>

                        {/* RAG Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border tracking-wider ${statusBadgeClasses}`}>
                            {scoreData.status}
                          </span>
                        </td>

                        {/* Fired Rules */}
                        <td className="py-3.5 px-4 max-w-xs">
                          {scoreData.firedRules.length === 0 ? (
                            <span className="text-[11px] text-slate-400 italic">On Track</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {scoreData.firedRules.map((r, i) => (
                                <span 
                                  key={i}
                                  onClick={() => setDrawerTask(task)}
                                  className={`workspace-risk-rule px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] font-medium transition cursor-pointer ${r.points >= 25 ? 'workspace-risk-rule-high' : ''}`}
                                  title={r.description}
                                >
                                  {r.name} <strong className="text-slate-900">+{r.points}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => setDrawerTask(task)}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Why is this flagged?"
                            >
                              <HelpCircle className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(task)}
                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition"
                              title="Edit task"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete task "${task.name}"?`)) {
                                  handleDeleteTask(task.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                              title="Delete task"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 px-4 text-center text-xs text-slate-500 flex flex-wrap items-center justify-center gap-3">
        <span>Changes are saved in this browser only.</span>
        <span>·</span>
        <span>Augmented Project Management · Team 4 Demo</span>
      </footer>

      {/* Settings Modal */}
      {isSettingsOpen && <Suspense fallback={null}><SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onResetDefaults={handleResetDefaults}
        onExportData={exportAllData}
        onImportData={(jsonStr) => {
          importAllData(jsonStr);
          setProjects(getProjects());
          setTasks(getTasks());
          setSettings(getSettings());
        }}
      /></Suspense>}

      {/* About This Demo Modal */}
      {isAboutOpen && <Suspense fallback={null}><AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      /></Suspense>}

      {/* Task Create / Edit Modal */}
      {isTaskModalOpen && <Suspense fallback={null}><TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
        projects={projects}
        allTasks={tasks}
        onSaveTask={handleSaveTask}
        demoDate={settings.demoDate}
      /></Suspense>}

      {/* Project Creation Modal */}
      {isProjectModalOpen && <Suspense fallback={null}><ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSaveProject={handleSaveProject}
        demoDate={settings.demoDate}
      /></Suspense>}

      {/* "Why is this flagged?" Side Drawer (Feature C, D, E) */}
      {drawerTask && <Suspense fallback={null}><WhyFlaggedDrawer
        isOpen={Boolean(drawerTask)}
        onClose={() => setDrawerTask(null)}
        task={drawerTask}
        scoreData={drawerTask ? scoresById[drawerTask.id] : null}
        project={drawerTask ? projects.find((p) => p.id === drawerTask.projectId) : null}
        allTasks={tasks}
        onEditTask={handleOpenEditModal}
        onDeleteTask={handleDeleteTask}
        demoDate={settings.demoDate}
        aiProvider={settings.aiProvider}
      /></Suspense>}

      {/* Weekly Executive Status Report Modal (Feature F) */}
      {isWeeklyReportOpen && <Suspense fallback={null}><WeeklyReportModal
        isOpen={isWeeklyReportOpen}
        onClose={() => setIsWeeklyReportOpen(false)}
        project={activeProject}
        tasks={projectScopedTasks}
        summary={scopedSummary}
        riskScores={scoresById}
        aiProvider={settings.aiProvider}
        demoDate={settings.demoDate}
      /></Suspense>}

    </div>
  );
}
