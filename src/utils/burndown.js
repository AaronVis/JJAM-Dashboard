/**
 * Burndown Calculation Utility
 * Computes ideal remaining effort line vs actual remaining effort line
 * using effortDays, percentComplete, completedOn, and demoDate.
 */

import { parseDateToMidnight, formatDate } from './riskEngine.js';

/**
 * Generate burn-down data points for a given project (or all projects)
 * @param {Object} project - The selected project (or null for all projects)
 * @param {Array} tasks - Tasks belonging to the project(s)
 * @param {string} demoDateStr - Current simulated demo date ('YYYY-MM-DD')
 * @returns {Array} Array of timeline data points for Recharts
 */
export function calculateBurndownData(project, tasks = [], demoDateStr = '2026-11-12') {
  if (!tasks || tasks.length === 0) return [];

  const demoDateMs = parseDateToMidnight(demoDateStr);

  // Use project dates for the visible window, expanding it when task dates fall
  // outside the project plan. Keep the plan dates separate from the chart range.
  let plannedStartMs = project?.startDate ? parseDateToMidnight(project.startDate) : null;
  let plannedEndMs = project?.endDate ? parseDateToMidnight(project.endDate) : null;

  // Include all task dates in the chart window and fill missing project dates.
  for (const t of tasks) {
    const tStart = parseDateToMidnight(t.startDate);
    const tDue = parseDateToMidnight(t.dueDate);
    if (tStart && (!plannedStartMs || tStart < plannedStartMs)) plannedStartMs = tStart;
    if (tDue && (!plannedEndMs || tDue > plannedEndMs)) plannedEndMs = tDue;
  }

  if (!plannedStartMs || !plannedEndMs || plannedEndMs <= plannedStartMs) {
    // Fallback safe 30-day window
    plannedStartMs = demoDateMs - 15 * 86400000;
    plannedEndMs = demoDateMs + 15 * 86400000;
  }

  // Always show the simulated current date. Without this, a project ending
  // before today or starting in the future has no current actual-effort point.
  const startMs = Math.min(plannedStartMs, demoDateMs);
  const endMs = Math.max(plannedEndMs, demoDateMs);

  // Total effort days for all tasks in scope
  const totalEffortDays = tasks.reduce((sum, t) => sum + (Number(t.effortDays) || 1), 0);

  // Generate 8 to 15 checkpoint dates across [startMs, endMs]
  const totalDurationDays = Math.max(1, Math.round((endMs - startMs) / 86400000));
  const stepDays = Math.max(2, Math.round(totalDurationDays / 10));

  const checkpoints = [];
  for (let currentMs = startMs; currentMs <= endMs; currentMs += stepDays * 86400000) {
    checkpoints.push(currentMs);
  }
  // Ensure demoDateMs and endMs are included
  if (!checkpoints.includes(demoDateMs) && demoDateMs >= startMs && demoDateMs <= endMs) {
    checkpoints.push(demoDateMs);
  }
  if (!checkpoints.includes(endMs)) {
    checkpoints.push(endMs);
  }
  checkpoints.sort((a, b) => a - b);

  // Remove duplicate timestamps
  const uniqueCheckpoints = Array.from(new Set(checkpoints));

  return uniqueCheckpoints.map((checkpointMs) => {
    const dateFormatted = formatDate(checkpointMs);
    const isPastOrDemo = checkpointMs <= demoDateMs;

    // 1. Ideal line: each task burns down across its own scheduled dates.
    // This keeps a short task from being stretched across a much longer project.
    const idealRemaining = Math.round(tasks.reduce((remaining, task) => {
      const effort = Number(task.effortDays) || 1;
      const taskStartMs = parseDateToMidnight(task.startDate) || plannedStartMs;
      const taskDueMs = parseDateToMidnight(task.dueDate) || plannedEndMs;
      if (taskDueMs <= taskStartMs || checkpointMs >= taskDueMs) return remaining;
      if (checkpointMs <= taskStartMs) return remaining + effort;
      const progress = (checkpointMs - taskStartMs) / (taskDueMs - taskStartMs);
      return remaining + effort * (1 - progress);
    }, 0) * 10) / 10;

    // 2. Actual line: only computed up to demoDateMs (future points are undefined or null)
    let actualRemaining = null;
    if (isPastOrDemo) {
      let remaining = 0;
      for (const t of tasks) {
        const effort = Number(t.effortDays) || 1;
        const compDateMs = t.completedOn ? parseDateToMidnight(t.completedOn) : null;

        if (compDateMs && compDateMs <= checkpointMs) {
          // Completed prior to this checkpoint -> 0 remaining
          continue;
        }

        if (checkpointMs === demoDateMs) {
          // At demo date: use current task percentComplete
          const pct = Math.min(100, Math.max(0, Number(t.percentComplete) || 0));
          remaining += effort * (1 - pct / 100);
        } else {
          // Prior to demo date: estimate historical progress proportionally
          const tStart = parseDateToMidnight(t.startDate) || startMs;
          const tDue = parseDateToMidnight(t.dueDate) || endMs;
          if (checkpointMs <= tStart) {
            remaining += effort;
          } else {
            const currentPct = Number(t.percentComplete) || 0;
            const progressRatio = Math.min(1, (checkpointMs - tStart) / Math.max(86400000, demoDateMs - tStart));
            const estimatedPctAtCheckpoint = currentPct * progressRatio;
            remaining += effort * (1 - estimatedPctAtCheckpoint / 100);
          }
        }
      }
      actualRemaining = Math.round(remaining * 10) / 10;
    }

    return {
      date: dateFormatted,
      dateLabel: dateFormatted.slice(5), // 'MM-DD'
      idealRemaining,
      actualRemaining,
      isDemoToday: checkpointMs === demoDateMs,
    };
  });
}
