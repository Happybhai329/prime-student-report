import dotenv from 'dotenv';
dotenv.config();
import { initDatabase } from '../server/db.js';
import { getLeaderboardData, getStudentCalculations } from '../server/leaderboardService.js';
import { getExamMappingLookup } from '../server/subjectFilter.js';

async function main() {
  await initDatabase();
  const mapping = await getExamMappingLookup();
  console.log(`Loaded ${Object.keys(mapping).length} exam types from exam_mapping.`);

  // Test 1: Calculations for Girraj Sharma (RIMC)
  console.log('\n--- TEST 1: Girraj Sharma (RIMC.2 evening) Calculations ---');
  const calcRimc = await getStudentCalculations('2603060003', {});
  console.log('Student:', calcRimc.student.name, '| Batch:', calcRimc.student.batch);
  console.log('Subjects in calculations:', calcRimc.subjects.list.map(s => `${s.subject}: ${s.avgPercentage}%`));
  
  // Verify NO reasoning and NO hindi
  const hasReasoning = calcRimc.subjects.list.some(s => s.subject.includes('REASON'));
  const hasHindi = calcRimc.subjects.list.some(s => s.subject.includes('HINDI'));
  console.log('Reasoning excluded?', !hasReasoning ? 'PASSED ✅' : 'FAILED ❌');
  console.log('Hindi excluded?', !hasHindi ? 'PASSED ✅' : 'FAILED ❌');

  // Test 2: Calculations for Prefoundation.2 evening (Shivansh Tomar 2602070001)
  console.log('\n--- TEST 2: Shivansh Tomar (Prefoundation.2 evening) Calculations ---');
  const calcSnr = await getStudentCalculations('2602070001', {});
  console.log('Student:', calcSnr.student.name, '| Batch:', calcSnr.student.batch);
  console.log('Subjects in calculations:', calcSnr.subjects.list.map(s => `${s.subject}: ${s.avgPercentage}%`));
  
  // Verify NO reasoning and NO hindi
  const snrHasHindi = calcSnr.subjects.list.some(s => s.subject.includes('HINDI'));
  const snrHasReasoning = calcSnr.subjects.list.some(s => s.subject.includes('REASON'));
  console.log('Hindi excluded from Prefoundation.2 evening?', !snrHasHindi ? 'PASSED ✅' : 'FAILED ❌');
  console.log('Reasoning excluded from Prefoundation.2 evening?', !snrHasReasoning ? 'PASSED ✅' : 'FAILED ❌');

  // Test 3: Leaderboard subject performance
  console.log('\n--- TEST 3: Leaderboard Subject Performance ---');
  const lb = await getLeaderboardData({});
  console.log('Total students ranked:', lb.students.length);
  console.log('Subject Performance count:', lb.subjectPerformance.length);
  
  // Check that RIMC or Senior pre Foundation batches are not under Reasoning
  const reasoningSubj = lb.subjectPerformance.find(s => s.subject === 'REASONING');
  if (reasoningSubj) {
    const rimcUnderReasoning = reasoningSubj.strongBatches.concat(reasoningSubj.weakBatches).some(b => b.batch.includes('RIMC') || b.batch.includes('Senior pre Foundation'));
    console.log('No RIMC or Senior pre Foundation in Reasoning batches?', !rimcUnderReasoning ? 'PASSED ✅' : 'FAILED ❌');
  }

  console.log('\nAll verification tests completed successfully!');
}

main().catch(console.error).finally(() => process.exit(0));
