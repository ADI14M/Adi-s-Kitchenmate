import assert from 'assert';
import {
  computeGroceryCycles,
  computeCycleBudget,
} from './src/lib/groceryCycleUtils.ts';

console.log('================================================================');
console.log('🧪 VERIFYING USER TEST SCENARIOS 1 THROUGH 8');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// SCENARIO 1: Shopping on 9 November → next date 16 November.
// -----------------------------------------------------------------------------
console.log('▶ SCENARIO 1: Shopping on 9 November → next date 16 November');
const shop1 = {
  id: 'p1',
  store: 'Tesco',
  purchase_date: '2026-11-09',
  total_amount: 15.00,
  purchase_type: 'main',
  created_at: '2026-11-09T09:00:00Z',
};
const res1 = computeGroceryCycles([shop1], 20, 2, new Date('2026-11-09T12:00:00Z'));
assert(res1.activeCycle !== null, 'Active cycle must exist');
assert.strictEqual(res1.activeCycle.startDate, '2026-11-09');
assert.strictEqual(res1.activeCycle.endDate, '2026-11-15', 'Cycle runs 9 Nov to 15 Nov');
assert.strictEqual(res1.activeCycle.expectedNextShoppingDate, '2026-11-16', 'Next date must be 16 Nov');
assert.strictEqual(res1.activeCycle.daysRemaining, 7, 'On 9 Nov, 7 days remain until 16 Nov');
assert.strictEqual(res1.activeCycle.daysElapsed, 0, 'On 9 Nov, 0 days elapsed');
console.log('  ✔ Start date: 9 Nov 2026');
console.log('  ✔ Cycle span: 9 Nov to 15 Nov');
console.log('  ✔ Next expected shopping date: 16 Nov 2026');
console.log('  ✔ Scenario 1 PASSED.\n');

// -----------------------------------------------------------------------------
// SCENARIO 2: Shopping on 16 November → next date 23 November.
// -----------------------------------------------------------------------------
console.log('▶ SCENARIO 2: Shopping on 16 November → next date 23 November');
const shop2OnTime = {
  id: 'p2_ontime',
  store: 'Aldi',
  purchase_date: '2026-11-16',
  total_amount: 18.00,
  purchase_type: 'main',
  created_at: '2026-11-16T10:00:00Z',
};
const res2 = computeGroceryCycles([shop1, shop2OnTime], 20, 2, new Date('2026-11-16T12:00:00Z'));
assert.strictEqual(res2.closedCycles.length, 1);
assert.strictEqual(res2.closedCycles[0].startDate, '2026-11-09');
assert.strictEqual(res2.closedCycles[0].actualNextShoppingDate, '2026-11-16');
assert.strictEqual(res2.closedCycles[0].extraDaysMaintained, 0, 'On-time shop has 0 extra days');

assert.strictEqual(res2.activeCycle.startDate, '2026-11-16');
assert.strictEqual(res2.activeCycle.endDate, '2026-11-22');
assert.strictEqual(res2.activeCycle.expectedNextShoppingDate, '2026-11-23', 'Next date must be 23 Nov');
console.log('  ✔ Previous cycle closed on 16 Nov 2026 (exact 7-day cycle)');
console.log('  ✔ New cycle start date: 16 Nov 2026');
console.log('  ✔ Next expected shopping date: 23 Nov 2026 (16 + 7)');
console.log('  ✔ Scenario 2 PASSED.\n');

// -----------------------------------------------------------------------------
// SCENARIO 3: Shopping late on 19 November → next date 26 November, with 3 extra days saved.
// -----------------------------------------------------------------------------
console.log('▶ SCENARIO 3: Shopping late on 19 November → next date 26 November, with 3 extra days saved');
const shop2Late = {
  id: 'p2_late',
  store: 'Aldi',
  purchase_date: '2026-11-19',
  total_amount: 16.50,
  purchase_type: 'main',
  created_at: '2026-11-19T09:30:00Z',
};
const res3 = computeGroceryCycles([shop1, shop2Late], 20, 2, new Date('2026-11-19T12:00:00Z'));
assert.strictEqual(res3.closedCycles.length, 1);
const closedC = res3.closedCycles[0];
assert.strictEqual(closedC.startDate, '2026-11-09');
assert.strictEqual(closedC.expectedNextShoppingDate, '2026-11-16');
assert.strictEqual(closedC.actualNextShoppingDate, '2026-11-19');
assert.strictEqual(closedC.totalDays, 10, '19 Nov - 9 Nov = 10 total days');
assert.strictEqual(closedC.extraDaysMaintained, 3, '10 - 7 = 3 extra days');
assert(closedC.efficiencyMessage.includes('Your groceries lasted 3 extra days. Great savings!'),
  'Closed cycle efficiency message must say "Your groceries lasted 3 extra days. Great savings!"');

assert.strictEqual(res3.totalPreviousExtraDaysSaved, 3, 'Total extra days saved from previous cycles must be 3');
assert.strictEqual(res3.activeCycle.startDate, '2026-11-19');
assert.strictEqual(res3.activeCycle.endDate, '2026-11-25');
assert.strictEqual(res3.activeCycle.expectedNextShoppingDate, '2026-11-26', 'Next date must be 26 Nov');
console.log('  ✔ Previous cycle: 9 Nov to 19 Nov (10 days maintained)');
console.log('  ✔ Extra days saved: 3 days ("' + closedC.efficiencyMessage + '")');
console.log('  ✔ New cycle start date: 19 Nov 2026');
console.log('  ✔ Next expected shopping date: 26 Nov 2026');
console.log('  ✔ Scenario 3 PASSED.\n');

// -----------------------------------------------------------------------------
// SCENARIO 4: Spending £19 → within normal budget.
// -----------------------------------------------------------------------------
console.log('▶ SCENARIO 4: Spending £19 → within normal budget');
const b4 = computeCycleBudget(1900, 20, 2); // 1900 pence = £19.00
assert.strictEqual(b4.spendingPounds, 19.00);
assert.strictEqual(b4.baseRemainingPounds, 1.00, 'Base remaining must be £1.00');
assert.strictEqual(b4.allowanceUsedPounds, 0.00, 'Allowance used must be £0.00');
assert.strictEqual(b4.allowanceRemainingPounds, 2.00, 'Full £2 allowance remains');
assert.strictEqual(b4.totalAvailablePounds, 3.00, 'Total available must be £1 base + £2 allowance = £3.00');
assert.strictEqual(b4.isBaseExceeded, false);
assert.strictEqual(b4.isOverMaxAllowance, false);
assert.strictEqual(b4.budgetStatusCategory, 'within_base');
console.log('  ✔ Spending £19.00: Base remaining = £1.00, Allowance remaining = £2.00, Total available = £3.00');
console.log('  ✔ Status: "' + b4.budgetStatusMessage + '"');
console.log('  ✔ Scenario 4 PASSED.\n');

// -----------------------------------------------------------------------------
// SCENARIO 5: Spending £21 → £1 of extra allowance used.
// -----------------------------------------------------------------------------
console.log('▶ SCENARIO 5: Spending £21 → £1 of extra allowance used');
const b5 = computeCycleBudget(2100, 20, 2); // 2100 pence = £21.00
assert.strictEqual(b5.spendingPounds, 21.00);
assert.strictEqual(b5.baseRemainingPounds, 0.00, 'Base remaining must be £0.00');
assert.strictEqual(b5.allowanceUsedPounds, 1.00, 'Allowance used must be £1.00');
assert.strictEqual(b5.allowanceRemainingPounds, 1.00, 'Allowance remaining must be £1.00');
assert.strictEqual(b5.totalAvailablePounds, 1.00, 'Total available must be £1.00');
assert.strictEqual(b5.isBaseExceeded, true);
assert.strictEqual(b5.isOverMaxAllowance, false);
assert.strictEqual(b5.budgetStatusCategory, 'using_allowance');
assert(b5.budgetStatusMessage.includes('Using extra allowance: £1.00 of £2.00 allowance used'));
console.log('  ✔ Spending £21.00: Allowance used = £1.00, Buffer remaining = £1.00, Total available = £1.00');
console.log('  ✔ Status: "' + b5.budgetStatusMessage + '"');
console.log('  ✔ Scenario 5 PASSED.\n');

// -----------------------------------------------------------------------------
// SCENARIO 6: Spending £22 → exactly within the maximum allowance.
// -----------------------------------------------------------------------------
console.log('▶ SCENARIO 6: Spending £22 → exactly within the maximum allowance');
const b6 = computeCycleBudget(2200, 20, 2); // 2200 pence = £22.00
assert.strictEqual(b6.spendingPounds, 22.00);
assert.strictEqual(b6.baseRemainingPounds, 0.00);
assert.strictEqual(b6.allowanceUsedPounds, 2.00, 'All £2.00 of allowance used');
assert.strictEqual(b6.allowanceRemainingPounds, 0.00);
assert.strictEqual(b6.totalAvailablePounds, 0.00);
assert.strictEqual(b6.isBaseExceeded, true);
assert.strictEqual(b6.isOverMaxAllowance, false, '£22 is within max allowance');
assert.strictEqual(b6.overMaxPounds, 0.00);
assert.strictEqual(b6.budgetStatusCategory, 'using_allowance');
console.log('  ✔ Spending £22.00: Exactly £2.00 of allowance used, £0 buffer remaining, £0 over max');
console.log('  ✔ Scenario 6 PASSED.\n');

// -----------------------------------------------------------------------------
// SCENARIO 7: Spending £24 → £2 over the maximum allowance.
// -----------------------------------------------------------------------------
console.log('▶ SCENARIO 7: Spending £24 → £2 over the maximum allowance');
const b7 = computeCycleBudget(2400, 20, 2); // 2400 pence = £24.00
assert.strictEqual(b7.spendingPounds, 24.00);
assert.strictEqual(b7.baseRemainingPounds, 0.00);
assert.strictEqual(b7.allowanceUsedPounds, 2.00);
assert.strictEqual(b7.allowanceRemainingPounds, 0.00);
assert.strictEqual(b7.totalAvailablePounds, 0.00);
assert.strictEqual(b7.isOverMaxAllowance, true, 'Spending £24 is over maximum allowance');
assert.strictEqual(b7.overMaxPounds, 2.00, 'Must be £2.00 over maximum allowance');
assert.strictEqual(b7.budgetStatusCategory, 'over_allowance');
assert(b7.budgetStatusMessage.includes('You are £2.00 over your weekly budget, including your £2 extra allowance.'));
console.log('  ✔ Spending £24.00: £2.00 over maximum allowance');
console.log('  ✔ Warning: "' + b7.budgetStatusMessage + '"');
console.log('  ✔ Scenario 7 PASSED.\n');

// -----------------------------------------------------------------------------
// SCENARIO 8: Editing or deleting a purchase recalculates the figures correctly.
// -----------------------------------------------------------------------------
console.log('▶ SCENARIO 8: Editing or deleting a purchase recalculates figures correctly');
const pMain = { id: 'm1', store: 'Tesco', purchase_date: '2026-11-09', total_amount: 16.00, purchase_type: 'main', created_at: '2026-11-09T09:00:00Z' };
const pTop1 = { id: 't1', store: 'Lidl', purchase_date: '2026-11-11', total_amount: 3.00, purchase_type: 'top_up', created_at: '2026-11-11T12:00:00Z' };
const pTop2 = { id: 't2', store: 'Bakery', purchase_date: '2026-11-13', total_amount: 4.00, purchase_type: 'top_up', created_at: '2026-11-13T10:00:00Z' };

// Initial state: 16 + 3 + 4 = £23.00 (exceeds £22 max allowance by £1.00)
const resInit = computeGroceryCycles([pMain, pTop1, pTop2], 20, 2, new Date('2026-11-14T12:00:00Z'));
assert.strictEqual(resInit.activeCycle.spendingPounds, 23.00);
assert.strictEqual(resInit.activeCycle.isOverMaxAllowance, true);
assert.strictEqual(resInit.activeCycle.overMaxPounds, 1.00);

// Action A: Edit pTop2 from £4.00 to £2.00
const pTop2Edited = { ...pTop2, total_amount: 2.00 };
const resEdit = computeGroceryCycles([pMain, pTop1, pTop2Edited], 20, 2, new Date('2026-11-14T12:00:00Z'));
// Spending is now 16 + 3 + 2 = £21.00 (£1 of allowance used, not over max)
assert.strictEqual(resEdit.activeCycle.spendingPounds, 21.00);
assert.strictEqual(resEdit.activeCycle.isOverMaxAllowance, false);
assert.strictEqual(resEdit.activeCycle.allowanceUsedPounds, 1.00);
assert.strictEqual(resEdit.activeCycle.allowanceRemainingPounds, 1.00);

// Action B: Delete pTop1
const resDelete = computeGroceryCycles([pMain, pTop2Edited], 20, 2, new Date('2026-11-14T12:00:00Z'));
// Spending is now 16 + 2 = £18.00 (within £20 base budget)
assert.strictEqual(resDelete.activeCycle.spendingPounds, 18.00);
assert.strictEqual(resDelete.activeCycle.baseRemainingPounds, 2.00);
assert.strictEqual(resDelete.activeCycle.allowanceUsedPounds, 0.00);
assert.strictEqual(resDelete.activeCycle.totalAvailablePounds, 4.00); // £2 base + £2 allowance

console.log('  ✔ Editing purchase correctly updated spending from £23.00 to £21.00 (restoring allowance).');
console.log('  ✔ Deleting purchase correctly updated spending to £18.00 (restoring base budget to £2.00 remaining).');
console.log('  ✔ Scenario 8 PASSED.\n');

console.log('================================================================');
console.log('🎉 ALL USER SCENARIOS 1 THROUGH 8 VERIFIED 100% SUCCESSFULLY!');
console.log('================================================================');
