import { 
  generateTaskAiInsights, 
  generateWeeklyReport, 
  computeTaskHash, 
  extractJsonFromText,
  GEMINI_MODEL_NAME 
} from './src/utils/aiService.js';
import sampleData from './src/data/sampleData.json' with { type: 'json' };
import { scoreAllTasks, DEFAULT_SETTINGS } from './src/utils/riskEngine.js';

console.log('--- RUNNING SPRINT 3 AI SERVICE & FALLBACK VERIFICATION ---');
console.log('Configured Gemini Model:', GEMINI_MODEL_NAME);

// 1. Test JSON extraction helper
console.log('\n1. Testing JSON extraction helper:');
const raw1 = '```json\n{"cause": "Test delay", "actions": ["Action 1"]}\n```';
const parsed1 = extractJsonFromText(raw1);
console.log('Extracted markdown codeblock:', parsed1?.cause === 'Test delay' ? 'PASS' : 'FAIL');

const raw2 = 'Here is the response:\n{"summary": "5-line summary"}\nHope this helps!';
const parsed2 = extractJsonFromText(raw2);
console.log('Extracted surrounded JSON:', parsed2?.summary === '5-line summary' ? 'PASS' : 'FAIL');

// 2. Test Offline Fallback for RED task (tsk-04)
console.log('\n2. Testing Offline Fallback for RED task (tsk-04):');
const { scoresById } = scoreAllTasks(sampleData.tasks, DEFAULT_SETTINGS);
const task4 = sampleData.tasks.find(t => t.id === 'tsk-04');
const res4 = await generateTaskAiInsights(task4, scoresById['tsk-04'], sampleData.tasks, '');

console.log('- Is Fallback:', res4.isFallback ? 'PASS (true)' : 'FAIL');
console.log('- Fallback Notice:', res4.fallbackNotice);
console.log('- Cause:', res4.cause);
console.log('- Actions count:', res4.actions.length);
console.log('- Audit payload exists:', Boolean(res4.audit?.payloadSent));

// 3. Test Offline Fallback for AMBER task (tsk-05)
console.log('\n3. Testing Offline Fallback for AMBER task (tsk-05):');
const task5 = sampleData.tasks.find(t => t.id === 'tsk-05');
const res5 = await generateTaskAiInsights(task5, scoresById['tsk-05'], sampleData.tasks, '');

console.log('- Is Fallback:', res5.isFallback ? 'PASS (true)' : 'FAIL');
console.log('- Actions count:', res5.actions.length);

// 4. Test Weekly Report Fallback
console.log('\n4. Testing Weekly Report Fallback:');
const prj1 = sampleData.projects[0];
const prjTasks = sampleData.tasks.filter(t => t.projectId === prj1.id);
const report = await generateWeeklyReport(prj1, prjTasks, { red: 2, amber: 2, green: 9, overdue: 2 }, '');

console.log('- Is Fallback:', report.isFallback ? 'PASS (true)' : 'FAIL');
console.log('- Summary lines:\n' + report.summary);

// 5. Test Hash computation
console.log('\n5. Testing Task Hash computation:');
const hashA = computeTaskHash(task4, scoresById['tsk-04'].firedRules);
const task4Modified = { ...task4, percentComplete: 60 };
const hashB = computeTaskHash(task4Modified, scoresById['tsk-04'].firedRules);
console.log(`Original Hash: ${hashA}`);
console.log(`Modified Progress Hash: ${hashB}`);
console.log(`Hash sensitive to changes: ${hashA !== hashB ? 'PASS' : 'FAIL'}`);

if (res4.isFallback && res4.actions.length > 0 && report.isFallback && hashA !== hashB) {
  console.log('\n>>> SPRINT 3 AI SERVICE VERIFICATION ALL PASSED! <<<');
  process.exit(0);
} else {
  console.error('\n>>> SPRINT 3 VERIFICATION FAILED! <<<');
  process.exit(1);
}
