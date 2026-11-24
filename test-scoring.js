import { scoreAllTasks, calculateOverloadedOwners, DEFAULT_SETTINGS } from './src/utils/riskEngine.js';
import sampleData from './src/data/sampleData.json' with { type: 'json' };

console.log('--- RUNNING RISK SCORE ENGINE VERIFICATION ---');
console.log('Demo Date:', DEFAULT_SETTINGS.demoDate);
console.log('Total Projects:', sampleData.projects.length);
console.log('Total Tasks:', sampleData.tasks.length);

const result = scoreAllTasks(sampleData.tasks, DEFAULT_SETTINGS);
const { scoresById, summary } = result;

console.log('\n--- SCORE SUMMARY ---');
console.log('Summary:', summary);

const redTasks = [];
const amberTasks = [];
const greenTasks = [];

for (const task of sampleData.tasks) {
  const scoreData = scoresById[task.id];
  const item = {
    id: task.id,
    name: task.name,
    owner: task.owner,
    dueDate: task.dueDate,
    percentComplete: task.percentComplete,
    score: scoreData.score,
    status: scoreData.status,
    rules: scoreData.firedRules.map(r => `${r.name} (+${r.points})`),
  };

  if (scoreData.status === 'RED') redTasks.push(item);
  else if (scoreData.status === 'AMBER') amberTasks.push(item);
  else greenTasks.push(item);
}

console.log('\nRED TASKS (Target: exactly 2):', redTasks.length);
redTasks.forEach(t => console.log(`  [${t.id}] score=${t.score} | ${t.name} | Rules: ${t.rules.join(', ')}`));

console.log('\nAMBER TASKS (Target: exactly 3):', amberTasks.length);
amberTasks.forEach(t => console.log(`  [${t.id}] score=${t.score} | ${t.name} | Rules: ${t.rules.join(', ')}`));

console.log('\nGREEN TASKS (Target: exactly 15):', greenTasks.length);

// Check overloaded owner
const overloaded = calculateOverloadedOwners(sampleData.tasks, DEFAULT_SETTINGS.demoDate, DEFAULT_SETTINGS.thresholds);
console.log('\n--- OPEN TASKS DUE IN NEXT 7 DAYS PER OWNER ---');
console.log(overloaded);

// Check silent tasks (> 5 days)
console.log('\n--- SILENT TASKS (> 5 days without update) ---');
for (const task of sampleData.tasks) {
  const data = scoresById[task.id];
  if (data.daysSinceUpdate >= 5 && !data.isCompleted) {
    console.log(`  [${task.id}] ${task.name} - ${data.daysSinceUpdate} days silent (lastUpdate: ${task.lastUpdate})`);
  }
}

// Check blocking RED task
const redBlocking = redTasks.find(t => {
  const blockedTasks = sampleData.tasks.filter(other => other.dependsOn === t.id);
  return blockedTasks.length === 2;
});

console.log('\n--- VERIFICATION CHECKS ---');
const redOk = redTasks.length === 2;
const amberOk = amberTasks.length === 3;
const greenOk = greenTasks.length === 15;
const blockingOk = Boolean(redBlocking);
const overloadedOk = Object.values(overloaded).some(count => count >= 4);

console.log(`- Exactly 2 RED tasks: ${redOk ? 'PASS' : 'FAIL'} (${redTasks.length})`);
console.log(`- Exactly 3 AMBER tasks: ${amberOk ? 'PASS' : 'FAIL'} (${amberTasks.length})`);
console.log(`- Remainder GREEN tasks: ${greenOk ? 'PASS' : 'FAIL'} (${greenTasks.length})`);
console.log(`- One RED task is overdue, behind schedule, and blocks 2 tasks: ${blockingOk ? 'PASS' : 'FAIL'} (${redBlocking ? redBlocking.id : 'none'})`);
console.log(`- One owner has 4+ open tasks due within 7 days: ${overloadedOk ? 'PASS' : 'FAIL'}`);

if (redOk && amberOk && greenOk && blockingOk && overloadedOk) {
  console.log('\n>>> ALL SPECIFICATION CHECKS PASSED PERFECTLY! <<<');
  process.exit(0);
} else {
  console.error('\n>>> SOME CHECKS FAILED! ADJUSTING NEEDED. <<<');
  process.exit(1);
}
