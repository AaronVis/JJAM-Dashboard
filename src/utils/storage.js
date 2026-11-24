/**
 * Storage Abstraction Module for Predictive Project Dashboard
 * Encapsulates all browser localStorage operations so a cloud DB can replace it cleanly.
 */

import sampleData from '../data/sampleData.json' with { type: 'json' };
import { DEFAULT_SETTINGS } from './riskEngine.js';

const STORAGE_KEYS = {
  PROJECTS: 'ppd_projects',
  TASKS: 'ppd_tasks',
  SETTINGS: 'ppd_settings',
  AI_CACHE: 'ppd_ai_cache',
};

/**
 * Initialize storage with sample data if localStorage is empty
 */
export function initializeStorage() {
  try {
    const existingProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    const existingTasks = localStorage.getItem(STORAGE_KEYS.TASKS);

    if (!existingProjects || !existingTasks) {
      resetDemo();
    }
  } catch (err) {
    console.error('Failed to initialize localStorage:', err);
  }
}

/**
 * Reset all data to the verified demo sample state
 */
export function resetDemo() {
  try {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(sampleData.projects));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(sampleData.tasks));
    
    // Preserve provider selection while resetting demoDate, weights, and thresholds
    const currentSettings = getSettings();
    const freshSettings = {
      ...DEFAULT_SETTINGS,
      aiProvider: currentSettings.aiProvider || DEFAULT_SETTINGS.aiProvider,
    };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(freshSettings));
    
    // Clear AI cache
    localStorage.removeItem(STORAGE_KEYS.AI_CACHE);

    return {
      projects: sampleData.projects,
      tasks: sampleData.tasks,
      settings: freshSettings,
    };
  } catch (err) {
    console.error('Failed to reset demo data:', err);
    return null;
  }
}

/**
 * Projects CRUD
 */
export function getProjects() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (!data) return sampleData.projects;
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : sampleData.projects;
  } catch (err) {
    console.error('Error reading projects:', err);
    return sampleData.projects;
  }
}

export function saveProjects(projects) {
  try {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  } catch (err) {
    console.error('Error saving projects:', err);
  }
}

/**
 * Tasks CRUD
 */
export function getTasks() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!data) return sampleData.tasks;
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : sampleData.tasks;
  } catch (err) {
    console.error('Error reading tasks:', err);
    return sampleData.tasks;
  }
}

export function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch (err) {
    console.error('Error saving tasks:', err);
  }
}

/**
 * Settings
 */
export function getSettings() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(data);
    if (Object.hasOwn(parsed, 'apiKey')) {
      delete parsed.apiKey;
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed));
    }
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      weights: { ...DEFAULT_SETTINGS.weights, ...(parsed.weights || {}) },
      thresholds: { ...DEFAULT_SETTINGS.thresholds, ...(parsed.thresholds || {}) },
    };
  } catch (err) {
    console.error('Error reading settings:', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings) {
  try {
    const safeSettings = { ...settings };
    delete safeSettings.apiKey;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(safeSettings));
  } catch (err) {
    console.error('Error saving settings:', err);
  }
}

/**
 * AI Cache (persists accepted/generated insights across reloads)
 */
export function getAiCache() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.AI_CACHE);
    return data ? JSON.parse(data) : {};
  } catch (err) {
    console.error('Error reading AI cache:', err);
    return {};
  }
}

export function saveAiCache(cache) {
  try {
    localStorage.setItem(STORAGE_KEYS.AI_CACHE, JSON.stringify(cache));
  } catch (err) {
    console.error('Error saving AI cache:', err);
  }
}

export function setTaskAiInsight(taskKey, insight) {
  const cache = getAiCache();
  cache[taskKey] = {
    ...insight,
    updatedAt: new Date().toISOString(),
  };
  saveAiCache(cache);
}

export function getTaskAiInsight(taskKey) {
  const cache = getAiCache();
  return cache[taskKey] || null;
}

/**
 * Export and Import safety net
 */
export function exportAllData() {
  return JSON.stringify({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    projects: getProjects(),
    tasks: getTasks(),
    settings: getSettings(),
    aiCache: getAiCache(),
  }, null, 2);
}

export function importAllData(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.projects || !parsed.tasks) {
      throw new Error('Invalid backup file structure: missing projects or tasks.');
    }
    saveProjects(parsed.projects);
    saveTasks(parsed.tasks);
    if (parsed.settings) saveSettings(parsed.settings);
    if (parsed.aiCache) saveAiCache(parsed.aiCache);
    return true;
  } catch (err) {
    console.error('Failed to import backup:', err);
    throw err;
  }
}
