import { calculateBurndownData } from './src/utils/burndown.js';
import sampleData from './src/data/sampleData.json' with { type: 'json' };

console.log('--- RUNNING SPRINT 2 BURN-DOWN & LOGIC VERIFICATION ---');

const project1 = sampleData.projects[0];
const tasks1 = sampleData.tasks.filter(t => t.projectId === project1.id);

console.log(`Testing Project: "${project1.name}" (${tasks1.length} tasks)`);
const burndown = calculateBurndownData(project1, tasks1, '2026-11-12');

console.log(`Generated ${burndown.length} burndown checkpoints:`);
burndown.forEach(pt => {
  console.log(`  Date: ${pt.date} | Ideal: ${pt.idealRemaining}d | Actual: ${pt.actualRemaining !== null ? pt.actualRemaining + 'd' : 'N/A (Future)'} ${pt.isDemoToday ? '[TODAY]' : ''}`);
});

// Check that ideal starts at total effort and finishes at 0
const totalEffort = tasks1.reduce((sum, t) => sum + (t.effortDays || 0), 0);
const firstPt = burndown[0];
const lastPt = burndown[burndown.length - 1];

console.log(`\nTotal Effort: ${totalEffort} days`);
console.log(`First point ideal: ${firstPt.idealRemaining} (Expected: ~${totalEffort})`);
console.log(`Last point ideal: ${lastPt.idealRemaining} (Expected: 0)`);

// Check demo date is included
const demoPt = burndown.find(pt => pt.isDemoToday);
console.log(`Demo date point found: ${Boolean(demoPt)} (${demoPt?.date})`);

// Check future points have null actual
const futurePts = burndown.filter(pt => pt.date > '2026-11-12');
const futureAllNull = futurePts.every(pt => pt.actualRemaining === null);
console.log(`Future points have actualRemaining = null: ${futureAllNull}`);

if (lastPt.idealRemaining === 0 && demoPt && futureAllNull) {
  console.log('\n>>> SPRINT 2 BURN-DOWN VERIFICATION PASSED! <<<');
  process.exit(0);
} else {
  console.error('\n>>> SPRINT 2 BURN-DOWN VERIFICATION FAILED! <<<');
  process.exit(1);
}
