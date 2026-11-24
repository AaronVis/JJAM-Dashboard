/**
 * AI Service Module for Predictive Project Dashboard
 * Sends browser requests to the same-origin server AI proxy,
 * prompt auditing for explainability, and guaranteed fallback safety.
 */

import aiFallback from '../data/aiFallback.json' with { type: 'json' };

// System prompt enforced across all analysis queries
export const SYSTEM_INSTRUCTION = 
  "You are a project analyst. Use only the data provided. Cite task IDs and dates. If data is missing, say so. Do not invent facts.";

/**
 * Generate a deterministic hash for a task state to key cached AI insights
 */
export function computeTaskHash(task, firedRules = [], allTasks = []) {
  const parent = task.dependsOn ? allTasks.find((item) => item.id === task.dependsOn) : null;
  const children = allTasks
    .filter((item) => item.dependsOn === task.id)
    .map(({ id, name, dueDate, percentComplete, completedOn }) => ({ id, name, dueDate, percentComplete, completedOn }));
  const signature = JSON.stringify({
    task,
    parent,
    children,
    firedRules: firedRules.map(({ rule, name, points, description }) => ({ rule, name, points, description })),
  });

  // Simple fast string hash
  let hash = 0;
  for (let i = 0; i < signature.length; i++) {
    const char = signature.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h${Math.abs(hash).toString(16)}`;
}

export function computeWeeklyReportHash(project, tasks = [], summary = {}, riskScores = {}, demoDate = '') {
  const signature = JSON.stringify({
    reportSchema: 2,
    project: project ? { id: project.id, name: project.name, startDate: project.startDate, endDate: project.endDate } : null,
    tasks: tasks.map((task) => ({
      id: task.id,
      name: task.name,
      owner: task.owner,
      startDate: task.startDate,
      dueDate: task.dueDate,
      percentComplete: task.percentComplete,
      effortDays: task.effortDays,
      lastUpdate: task.lastUpdate,
      completedOn: task.completedOn,
      dependsOn: task.dependsOn,
      risk: riskScores[task.id] ? {
        score: riskScores[task.id].score,
        status: riskScores[task.id].status,
        firedRules: riskScores[task.id].firedRules,
      } : null,
    })),
    summary,
    demoDate,
  });
  let hash = 0;
  for (let i = 0; i < signature.length; i++) {
    hash = (hash << 5) - hash + signature.charCodeAt(i);
    hash |= 0;
  }
  return `h${Math.abs(hash).toString(16)}`;
}

/**
 * Robust JSON parser that handles markdown code blocks or surrounding text
 */
export function extractJsonFromText(rawText) {
  if (!rawText) return null;
  let cleaned = rawText.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Find boundaries of outer JSON object
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('Failed to parse JSON response directly:', err, cleaned);
    return null;
  }
}

async function callBackendProvider(provider, action, systemInstruction = '', promptText = '') {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 95000);
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, action, systemInstruction, promptText }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || ('AI proxy returned HTTP ' + response.status + '.'));
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('AI request timed out. Check the local API server and try again.');
    throw error;
  } finally { clearTimeout(timeoutId); }
}

export async function testGeminiConnection() {
  return (await callBackendProvider('gemini', 'test')).model;
}

export async function testNvidiaConnection() {
  return (await callBackendProvider('nvidia', 'test')).model;
}

/**
 * Generate AI Insights for an Amber or Red Task (Features D & E)
 * Returns { cause: string, forecast: string, actions: string[], isFallback: boolean, audit: { prompt, payloadSent } }
 */
export async function generateTaskAiInsights(task, scoreData, allTasks = [], providerName = 'gemini') {
  // Build structured task data payload ONLY (no assumptions)
  const parent = task.dependsOn ? allTasks.find((t) => t.id === task.dependsOn) : null;
  const blockedTasks = allTasks.filter((t) => t.dependsOn === task.id).map((t) => ({ id: t.id, name: t.name, dueDate: t.dueDate }));

  const structuredPayload = {
    task: {
      id: task.id,
      name: task.name,
      owner: task.owner,
      startDate: task.startDate,
      dueDate: task.dueDate,
      percentComplete: task.percentComplete,
      effortDays: task.effortDays,
      lastUpdate: task.lastUpdate,
      completedOn: task.completedOn,
      dependsOn: parent ? { id: parent.id, name: parent.name, dueDate: parent.dueDate, percentComplete: parent.percentComplete } : null,
      blockedDownstreamTasks: blockedTasks,
    },
    riskAssessment: {
      totalScore: scoreData?.score ?? 0,
      status: scoreData?.status ?? 'GREEN',
      firedRules: (scoreData?.firedRules || []).map((r) => ({
        ruleName: r.name,
        points: r.points,
        description: r.description,
      })),
    },
  };

  const userPrompt = `Analyze the following flagged project task using ONLY the provided structured facts:
${JSON.stringify(structuredPayload, null, 2)}

Provide your response in strictly valid JSON with this exact schema:
{
  "cause": "A concise, plain-language explanation of why this task is delayed citing specific IDs and dates (2-3 sentences)",
  "forecast": "A near-term delivery forecast grounded in the supplied completion, due date, dependencies, and risk signals. State uncertainty; do not invent probabilities or dates.",
  "actions": [
    "1-3 concrete, actionable next steps for the project manager to resolve or mitigate the delay"
  ]
}`;

  const auditInfo = {
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt: userPrompt,
    payloadSent: structuredPayload,
    model: 'Server-selected provider model',
  };

  // Attempt the configured live provider through the same-origin proxy.
  {
    try {
      const { result, model } = await callBackendProvider(providerName, 'generate', SYSTEM_INSTRUCTION, userPrompt);
      auditInfo.model = model;
      if (result && result.cause && result.forecast && Array.isArray(result.actions)) {
        return {
          cause: result.cause,
          forecast: result.forecast,
          actions: result.actions,
          isFallback: false,
          fallbackNotice: null,
          audit: auditInfo,
        };
      }
      throw new Error('AI response did not include cause, forecast, and actions in the expected format.');
    } catch (err) {
      console.warn(`Live ${providerName} API call failed, falling back to pre-generated sample:`, err.message);
      var liveError = err.message;
    }
  }

  // Fallback Layer: pre-written outputs or synthetic deterministic fallback
  const fallbackEntry = aiFallback.tasks?.[task.id];
  if (fallbackEntry) {
    return {
      cause: fallbackEntry.cause,
      forecast: fallbackEntry.forecast || `Based on the current ${scoreData?.status || 'risk'} status and ${task.percentComplete ?? 0}% completion, delivery may slip beyond ${task.dueDate || 'the planned due date'} unless the listed blockers are resolved. Treat this as a signal to review, not a statistical prediction.`,
      actions: fallbackEntry.actions,
      isFallback: true,
      fallbackNotice: liveError ? `${providerName === 'nvidia' ? 'NVIDIA' : 'Gemini'} unavailable: ${liveError}. Showing saved sample.` : `Add a ${providerName === 'nvidia' ? 'NVIDIA' : 'Gemini'} API key in Settings to enable live analysis. Showing saved sample.`,
      audit: auditInfo,
    };
  }

  // Synthetic deterministic fallback for newly created tasks
  return {
    cause: `Task ${task.id} (${task.name}) is flagged as ${scoreData?.status || 'AT RISK'} with a delay score of ${scoreData?.score || 0}/100. Key triggers include: ${(scoreData?.firedRules || []).map((r) => r.name).join(', ') || 'schedule variance'}.`,
    forecast: `At ${task.percentComplete ?? 0}% complete with a due date of ${task.dueDate || 'not set'}, this task may miss its target if current blockers or risk signals persist. Review progress and dependencies before committing to a revised date.`,
    actions: [
      `Review current completion velocity (${task.percentComplete}%) with assignee ${task.owner}.`,
      `Verify if target dueDate (${task.dueDate}) requires rescheduling or scope adjustment.`,
      `Check prerequisite dependencies to ensure downstream work is not blocked.`
    ],
    isFallback: true,
    fallbackNotice: liveError ? `${providerName === 'nvidia' ? 'NVIDIA' : 'Gemini'} unavailable: ${liveError}. Showing local analysis.` : `Add a ${providerName === 'nvidia' ? 'NVIDIA' : 'Gemini'} API key in Settings to enable live analysis. Showing local analysis.`,
    audit: auditInfo,
  };
}

/**
 * Generate Weekly Status Summary Report for Selected Project (Feature F)
 * Returns { summary: string, isFallback: boolean, audit: { prompt, payloadSent } }
 */
export function formatWeeklyReport(report = {}) {
  const formatList = (items, render) => (items || []).map((item, index) => `${index + 1}. ${render(item)}`).join('\n');
  const risks = formatList(report.keyRisks, (risk) => `[${risk.riskLevel || 'RISK'}] ${risk.taskId || ''} — ${risk.title || ''}\n   Evidence: ${risk.evidence || 'Not specified'}\n   Delivery impact: ${risk.deliveryImpact || 'Not specified'}`);
  const decisions = formatList(report.decisions, (item) => `[${item.priority || 'REVIEW'}] ${item.decision || ''}\n   Owner: ${item.owner || 'Project manager'} · Trigger: ${item.trigger || 'Next checkpoint'}`);
  const actions = formatList(report.actionPlan, (item) => `[${item.priority || 'P2'}] ${item.action || ''}\n   Owner: ${item.owner || 'Project manager'} · Timing: ${item.timing || 'Before next review'} · Success: ${item.successMeasure || 'Confirm resolution and update status'}`);
  return [
    'EXECUTIVE BRIEF', report.executiveBrief || '',
    `PROJECT HEALTH: ${report.overallStatus || 'REVIEW'}`,
    '', 'DELIVERY OUTLOOK', report.deliveryForecast || '',
    `Scenarios: Best case — ${report.scenarios?.bestCase || 'Not provided'} | Most likely — ${report.scenarios?.mostLikely || 'Not provided'} | Risk case — ${report.scenarios?.riskCase || 'Not provided'}`,
    `Confidence: ${report.forecastConfidence || 'LOW'} — ${report.confidenceBasis || 'Historical trend and capacity data are limited.'}`,
    '', 'CRITICAL DELIVERY RISKS', risks || 'No material risk items returned.',
    '', 'DECISIONS REQUIRED', decisions || 'No immediate decision identified.',
    '', 'PRIORITIZED ACTION PLAN', actions || 'Review highest-risk tasks with their owners.',
    '', 'WATCHLIST', (report.watchItems || []).map((item) => `• ${item}`).join('\n') || 'No watch items returned.',
    '', 'DATA LIMITATIONS', (report.dataGaps || []).map((item) => `• ${item}`).join('\n') || 'No data limitations returned.',
  ].join('\n');
}

export async function generateWeeklyReport(project, tasks = [], summary = {}, riskScores = {}, providerName = 'gemini', demoDate = '') {
  const projectId = project ? project.id : 'all';
  const projectName = project ? project.name : 'All Consolidated Projects';
  const asOfDate = demoDate || new Date().toISOString().slice(0, 10);
  const asOfMs = Date.parse(`${asOfDate}T00:00:00Z`);
  const dayOffset = (date) => {
    const dateMs = date ? Date.parse(`${date}T00:00:00Z`) : NaN;
    return Number.isFinite(asOfMs) && Number.isFinite(dateMs) ? Math.round((dateMs - asOfMs) / 86400000) : null;
  };
  const taskById = Object.fromEntries(tasks.map((task) => [task.id, task]));
  const ownerWorkload = Object.values(tasks.reduce((owners, task) => {
    if (!task.owner || (Number(task.percentComplete) || 0) >= 100 || task.completedOn) return owners;
    const owner = owners[task.owner] || { owner: task.owner, openTasks: 0, overdueTasks: 0, atRiskTasks: [] };
    owner.openTasks += 1;
    if ((dayOffset(task.dueDate) ?? 0) < 0) owner.overdueTasks += 1;
    if (['RED', 'AMBER'].includes(riskScores[task.id]?.status)) owner.atRiskTasks.push(task.id);
    owners[task.owner] = owner;
    return owners;
  }, {}));
  const completedTasks = tasks.filter((task) => task.completedOn || (Number(task.percentComplete) || 0) >= 100).length;
  const redTasks = tasks.filter((task) => riskScores[task.id]?.status === 'RED').length;
  const amberTasks = tasks.filter((task) => riskScores[task.id]?.status === 'AMBER').length;
  const greenTasks = tasks.filter((task) => riskScores[task.id]?.status === 'GREEN').length;
  const overallStatus = redTasks ? 'RED' : amberTasks ? 'AMBER' : 'GREEN';

  const structuredPayload = {
    asOfDate,
    project: {
      id: projectId,
      name: projectName,
      startDate: project?.startDate || 'N/A',
      endDate: project?.endDate || 'N/A',
    },
    metrics: {
      totalTasks: tasks.length,
      completedTasks,
      openTasks: tasks.length - completedTasks,
      redTasks,
      amberTasks,
      greenTasks,
      overdueTasks: summary.overdue ?? tasks.filter((task) => (Number(task.percentComplete) || 0) < 100 && !task.completedOn && (dayOffset(task.dueDate) ?? 0) < 0).length,
      overallStatus,
    },
    ownerWorkload,
    taskRegister: [...tasks]
      .sort((a, b) => (riskScores[b.id]?.score ?? 0) - (riskScores[a.id]?.score ?? 0))
      .map((task) => ({
        id: task.id,
        name: task.name,
        owner: task.owner,
        startDate: task.startDate,
        dueDate: task.dueDate,
        daysUntilDue: dayOffset(task.dueDate),
        lastUpdate: task.lastUpdate || 'Not recorded',
        daysSinceUpdate: dayOffset(task.lastUpdate) === null ? null : Math.abs(dayOffset(task.lastUpdate)),
        percentComplete: Math.min(100, Math.max(0, Number(task.percentComplete) || 0)),
        effortDays: Number(task.effortDays) || null,
        remainingEffortDays: Number.isFinite(Number(task.effortDays)) ? Math.round(Number(task.effortDays) * (1 - Math.min(100, Math.max(0, Number(task.percentComplete) || 0)) / 100) * 10) / 10 : null,
        requiredEffortPerCalendarDay: Number.isFinite(Number(task.effortDays)) && dayOffset(task.dueDate) > 0
          ? Math.round((Number(task.effortDays) * (1 - Math.min(100, Math.max(0, Number(task.percentComplete) || 0)) / 100) / dayOffset(task.dueDate)) * 100) / 100
          : null,
        completedOn: task.completedOn || null,
        riskScore: riskScores[task.id]?.score ?? 0,
        riskStatus: riskScores[task.id]?.status || 'UNKNOWN',
        riskSignals: (riskScores[task.id]?.firedRules || []).map((rule) => ({ name: rule.name, description: rule.description, points: rule.points })),
        dependsOn: task.dependsOn ? {
          id: task.dependsOn,
          name: taskById[task.dependsOn]?.name || 'Unknown prerequisite',
          status: riskScores[task.dependsOn]?.status || 'UNKNOWN',
          percentComplete: taskById[task.dependsOn]?.percentComplete ?? null,
          dueDate: taskById[task.dependsOn]?.dueDate || null,
        } : null,
        downstreamTasks: tasks.filter((candidate) => candidate.dependsOn === task.id).map((candidate) => candidate.id),
      })),
    dataLimitations: [
      'No historical status snapshots or actual completed-effort series were supplied; trend velocity and statistical on-time probabilities cannot be calculated.',
      'Calendar days to due date are known, but working calendars, team capacity, and availability are not supplied.',
    ],
  };

  const userPrompt = `Prepare a decision-ready weekly executive delivery report using ONLY the supplied facts. Analyze the whole task register, not only the highest risk rows. Prioritize the few risks that can change the delivery outcome, trace prerequisite-to-downstream impact, distinguish facts from judgment, and explain what the project manager should do next.

Rules:
- Cite exact task IDs, owners, dates, completion values, risk signals, and dependency IDs when available.
- Treat overdue and risk classifications as supplied facts. Do not invent schedule dates, probabilities, historical velocity, capacity, or commitments.
- A task's risk color is not its completion state. Never define success as changing RED to GREEN; use verifiable progress evidence such as completion percentage, resolved blocker, or confirmed dependency handoff.
- Owner open-task counts are workload indicators only, not proof of a capacity constraint. Do not claim resource constraints or overload unless the supplied facts explicitly establish them.
- Because no historical velocity or capacity is supplied, describe delivery as "at risk" and state the conditions that could affect the target. Do not say a slip is "most likely" or assert delivery after the end date unless the supplied effort and schedule facts support that conclusion.
- Keep each statement traceable to the supplied facts. Separate recorded evidence from management judgment, and do not add unsupported milestone names or consequences.
- Provide a qualitative forecast with best-case, most-likely, and risk scenarios. State the conditions that would change the outlook.
- When suggesting an owner, use the recorded task owner or the role "Project manager"; never invent a person.
- Return 2-4 critical risks, up to 3 decisions, 3-5 prioritized actions, and up to 4 watch items.
- Forecast confidence must be LOW when historical velocity/capacity data are absent; explain this limitation.

Facts:
${JSON.stringify(structuredPayload, null, 2)}

Return strictly valid JSON with this schema:
{
  "overallStatus": "RED | AMBER | GREEN, matching the supplied project RAG counts",
  "executiveBrief": "2-3 sentence executive judgment: current state, delivery implication, and the most important management focus",
  "deliveryForecast": "Qualitative forecast grounded in task-level evidence; do not claim an exact delivery date unless provided",
  "forecastConfidence": "LOW | MEDIUM | HIGH",
  "confidenceBasis": "Why this confidence level is appropriate, including missing historical velocity/capacity data",
  "scenarios": {"bestCase": "Evidence-based condition and outcome", "mostLikely": "Conditional current trajectory; do not imply statistical likelihood", "riskCase": "What could worsen and why"},
  "keyRisks": [{"taskId": "", "title": "", "riskLevel": "RED | AMBER", "evidence": "Specific facts and fired rules", "deliveryImpact": "Dependency or milestone consequence grounded in the task register"}],
  "decisions": [{"priority": "NOW | NEXT REVIEW", "decision": "Specific decision for PM/steering group", "owner": "Recorded owner or Project manager", "trigger": "Evidence-based condition for deciding"}],
  "actionPlan": [{"priority": "P1 | P2 | P3", "action": "Concrete action", "owner": "Recorded owner or Project manager", "timing": "Relative timing without inventing a calendar date", "successMeasure": "Observable evidence that resolves or reduces the risk"}],
  "watchItems": ["Specific condition to monitor and when to revisit the forecast"],
  "dataGaps": ["Material limitations that constrain forecast accuracy"]
}`;

  const auditInfo = {
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt: userPrompt,
    payloadSent: structuredPayload,
    model: 'Server-selected provider model',
  };

  {
    try {
      const { result, model } = await callBackendProvider(providerName, 'generate', SYSTEM_INSTRUCTION, userPrompt);
      auditInfo.model = model;
      if (result && result.executiveBrief && result.deliveryForecast && Array.isArray(result.keyRisks) && Array.isArray(result.actionPlan)) {
        return {
          summary: formatWeeklyReport(result),
          report: result,
          isFallback: false,
          fallbackNotice: null,
          audit: auditInfo,
        };
      }
      throw new Error('AI response did not include the complete executive report structure.');
    } catch (err) {
      console.warn(`Weekly report live ${providerName} call failed, using fallback:`, err.message);
      var liveError = err.message;
    }
  }

  // Fallback Layer
  const fallbackSummary = aiFallback.reports?.[projectId] || aiFallback.reports?.['all'];
  return {
    summary: fallbackSummary?.summary || 'Executive Project Status Summary unavailable.',
    isFallback: true,
    fallbackNotice: liveError ? `${providerName === 'nvidia' ? 'NVIDIA' : 'Gemini'} unavailable: ${liveError}. Showing saved sample.` : `Add a ${providerName === 'nvidia' ? 'NVIDIA' : 'Gemini'} API key in Settings to enable live reports. Showing saved sample.`,
    audit: auditInfo,
  };
}
