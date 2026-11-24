/**
 * Risk Scoring Engine for Predictive Project Dashboard
 * Transparent, deterministic rules running entirely in the browser.
 */

export const DEFAULT_WEIGHTS = {
  overdue: 40,
  behindSchedule: 25,
  blocked: 20,
  overloadedOwner: 10,
  silentTask: 5,
};

export const DEFAULT_THRESHOLDS = {
  greenMax: 29,
  amberMax: 59,
  behindScheduleThresholdPct: 20, // percentage point lag
  silentDaysThreshold: 5,         // days without update
  overloadedTaskCount: 4,         // tasks due in window
  overloadedWindowDays: 7,        // days window
};

export const DEFAULT_SETTINGS = {
  demoDate: '2026-11-12',
  weights: { ...DEFAULT_WEIGHTS },
  thresholds: { ...DEFAULT_THRESHOLDS },
  aiProvider: 'nvidia',
  selectedProjectId: 'all',
};

/**
 * Safely parse YYYY-MM-DD string into midnight UTC timestamp
 */
export function parseDateToMidnight(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/**
 * Format timestamp or date to YYYY-MM-DD
 */
export function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a task is marked complete
 */
export function isTaskComplete(task) {
  return Number(task.percentComplete) >= 100 || Boolean(task.completedOn);
}

/**
 * Compute overloaded owners: map of owner -> count of open tasks due within window
 */
export function calculateOverloadedOwners(tasks, demoDateStr, thresholds = DEFAULT_THRESHOLDS) {
  const demoDateMs = parseDateToMidnight(demoDateStr);
  const windowEndMs = demoDateMs + (thresholds.overloadedWindowDays || 7) * 86400000;
  
  const ownerCounts = {};
  
  for (const task of tasks) {
    if (isTaskComplete(task)) continue;
    if (!task.dueDate) continue;
    
    const dueMs = parseDateToMidnight(task.dueDate);
    // Task is open and due within [demoDate, demoDate + windowDays]
    if (dueMs >= demoDateMs && dueMs <= windowEndMs) {
      const owner = task.owner || 'Unassigned';
      ownerCounts[owner] = (ownerCounts[owner] || 0) + 1;
    }
  }
  
  return ownerCounts;
}

/**
 * Calculate risk score and rule breakdown for a single task
 */
export function calculateTaskRisk(task, allTasks = [], settings = DEFAULT_SETTINGS) {
  const weights = settings.weights || DEFAULT_WEIGHTS;
  const thresholds = settings.thresholds || DEFAULT_THRESHOLDS;
  const demoDateStr = settings.demoDate || '2026-11-12';
  const demoDateMs = parseDateToMidnight(demoDateStr);

  // Completed tasks are ALWAYS Green with score 0
  if (isTaskComplete(task)) {
    return {
      taskId: task.id,
      score: 0,
      status: 'GREEN',
      firedRules: [],
      isCompleted: true,
      timeElapsedPct: 100,
    };
  }

  const firedRules = [];
  let score = 0;

  const dueMs = parseDateToMidnight(task.dueDate);
  const startMs = parseDateToMidnight(task.startDate) || (dueMs - 86400000 * 7);
  const lastUpdateMs = parseDateToMidnight(task.lastUpdate) || startMs;

  // 1. Overdue: due date passed and task not complete: +40
  if (dueMs < demoDateMs) {
    const points = Number(weights.overdue) || 0;
    score += points;
    firedRules.push({
      rule: 'overdue',
      name: 'Task is Overdue',
      points,
      description: `Due date was ${task.dueDate}, which is past the demo date (${demoDateStr}).`,
    });
  }

  // 2. Behind schedule: percentComplete is at least threshold points below % of time elapsed: +25
  let timeElapsedPct = 0;
  if (dueMs <= startMs) {
    timeElapsedPct = 100;
  } else if (demoDateMs <= startMs) {
    timeElapsedPct = 0;
  } else if (demoDateMs >= dueMs) {
    timeElapsedPct = 100;
  } else {
    timeElapsedPct = Math.min(100, Math.max(0, ((demoDateMs - startMs) / (dueMs - startMs)) * 100));
  }

  const currentPercent = Number(task.percentComplete) || 0;
  const lag = timeElapsedPct - currentPercent;
  const behindThreshold = Number(thresholds.behindScheduleThresholdPct) || 20;

  if (lag >= behindThreshold) {
    const points = Number(weights.behindSchedule) || 0;
    score += points;
    firedRules.push({
      rule: 'behindSchedule',
      name: 'Behind Schedule',
      points,
      description: `Task has elapsed ${Math.round(timeElapsedPct)}% of its timeline, but is only ${currentPercent}% complete (lag: ${Math.round(lag)}% ≥ threshold ${behindThreshold}%).`,
    });
  }

  // 3. Blocked: the task it depends on is overdue or not complete past its due date: +20
  if (task.dependsOn) {
    const parent = allTasks.find((t) => t.id === task.dependsOn);
    if (parent) {
      const parentDueMs = parseDateToMidnight(parent.dueDate);
      const parentIsOverdueIncomplete = !isTaskComplete(parent) && parentDueMs < demoDateMs;
      
      if (parentIsOverdueIncomplete) {
        const points = Number(weights.blocked) || 0;
        score += points;
        firedRules.push({
          rule: 'blocked',
          name: 'Blocked by Overdue Dependency',
          points,
          description: `Pre-requisite task "${parent.name}" (#${parent.id}) is overdue and incomplete.`,
        });
      }
    }
  }

  // 4. Overloaded owner: owner has 4+ open tasks due within 7 days: +10
  const overloadedCounts = calculateOverloadedOwners(allTasks, demoDateStr, thresholds);
  const ownerTaskCount = overloadedCounts[task.owner] || 0;
  const overloadThreshold = Number(thresholds.overloadedTaskCount) || 4;

  if (ownerTaskCount >= overloadThreshold) {
    const points = Number(weights.overloadedOwner) || 0;
    score += points;
    firedRules.push({
      rule: 'overloadedOwner',
      name: 'Owner Overloaded',
      points,
      description: `Assignee ${task.owner} has ${ownerTaskCount} open tasks due within ${thresholds.overloadedWindowDays || 7} days (threshold: ≥ ${overloadThreshold}).`,
    });
  }

  // 5. Silent task: no update for more than the configured number of days: +5
  const msSinceUpdate = demoDateMs - lastUpdateMs;
  const daysSinceUpdate = Math.floor(msSinceUpdate / 86400000);
  const silentThreshold = Number(thresholds.silentDaysThreshold) || 5;

  if (daysSinceUpdate > silentThreshold) {
    const points = Number(weights.silentTask) || 0;
    score += points;
    firedRules.push({
      rule: 'silentTask',
      name: 'Silent Task (No Recent Updates)',
      points,
      description: `Last update was ${task.lastUpdate} (${daysSinceUpdate} days ago > threshold ${silentThreshold} days).`,
    });
  }

  // Score capped between 0 and 100
  const finalScore = Math.min(100, Math.max(0, score));

  // Determine RAG status
  const greenMax = Number(thresholds.greenMax) ?? 29;
  const amberMax = Number(thresholds.amberMax) ?? 59;

  let status = 'GREEN';
  if (finalScore > amberMax) {
    status = 'RED';
  } else if (finalScore > greenMax) {
    status = 'AMBER';
  }

  return {
    taskId: task.id,
    score: finalScore,
    status,
    firedRules,
    isCompleted: false,
    timeElapsedPct: Math.round(timeElapsedPct),
    daysSinceUpdate,
  };
}

/**
 * Score all tasks with summary statistics
 */
export function scoreAllTasks(tasks = [], settings = DEFAULT_SETTINGS) {
  const scoresById = {};
  let redCount = 0;
  let amberCount = 0;
  let greenCount = 0;
  let overdueCount = 0;

  const demoDateMs = parseDateToMidnight(settings.demoDate || '2026-11-12');

  for (const task of tasks) {
    const result = calculateTaskRisk(task, tasks, settings);
    scoresById[task.id] = result;

    if (result.status === 'RED') redCount++;
    else if (result.status === 'AMBER') amberCount++;
    else greenCount++;

    const dueMs = parseDateToMidnight(task.dueDate);
    if (!result.isCompleted && dueMs < demoDateMs) {
      overdueCount++;
    }
  }

  return {
    scoresById,
    summary: {
      total: tasks.length,
      red: redCount,
      amber: amberCount,
      green: greenCount,
      overdue: overdueCount,
    },
  };
}
