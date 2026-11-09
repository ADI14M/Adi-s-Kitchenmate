import assert from 'assert';
import {
  computeGroceryCycles,
  addDaysToYMD,
  daysBetweenYMD
} from './src/lib/groceryCycleUtils.ts';

console.log('================================================================');
console.log('🧪 RUNNING VERIFICATION SUITE: SCENARIOS A THROUGH G');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// Test 1: Date & Time helpers (Europe/London ISO calculations)
// -----------------------------------------------------------------------------
console.log('▶ TEST 1: Date arithmetic helpers');
assert.strictEqual(addDaysToYMD('2026-11-09', 7), '2026-11-16', '7 days after 9 Nov 2026 must be 16 Nov 2026');
assert.strictEqual(addDaysToYMD('2026-11-19', 7), '2026-11-26', '7 days after 19 Nov 2026 must be 26 Nov 2026');
assert.strictEqual(daysBetweenYMD('2026-11-09', '2026-11-16'), 7);
assert.strictEqual(daysBetweenYMD('2026-11-09', '2026-11-19'), 10);
assert.strictEqual(daysBetweenYMD('2026-11-16', '2026-11-19'), 3);
console.log('  ✔ addDaysToYMD and daysBetweenYMD accurate and free of timezone drift.\n');

// -----------------------------------------------------------------------------
// SCENARIO A:
// Main purchase £16 on 9 November → next shopping date 16 November.
// -----------------------------------------------------------------------------
console.log('▶ SCENARIO A: Main purchase £16 on 9 November');
const purchaseA = {
  id: 'p_nov9_main',
  store: 'Tesco',
  purchase_date: '2026-11-09',
  total_amount: 16.00,
  purchase_type: 'main',
  created_at: '2026-11-09T09:00:00Z',
};
const resA = computeGroceryCycles([purchaseA], 20, new Date('2026-11-09T10:00:00Z'));
assert(resA.activeCycle !== null, 'Active cycle must exist after main purchase');
assert.strictEqual(resA.activeCycle.startDate, '2026-11-09', 'Start date must be 9 Nov 2026');
assert.strictEqual(resA.activeCycle.expectedNextShoppingDate, '2026-11-16', 'Next shopping date must be 16 Nov 2026');
assert.strictEqual(resA.activeCycle.spendingPounds, 16.00, 'Spending must be £16.00');
assert.strictEqual(resA.activeCycle.remainingBudgetPounds, 4.00, 'Remaining budget must be £4.00');
assert.strictEqual(resA.activeCycle.isOverBudget, false, 'Must not be over budget');
console.log('  ✔ Cycle started: 9 Nov 2026');
console.log('  ✔ Expected next shopping date: 16 Nov 2026');
console.log('  ✔ Spending: £16.00, Remaining budget: £4.00');
console.log('  ✔ Scenario A PASSED.\n');

// -----------------------------------------------------------------------------
// SCENARIO B:
// Top-up £2 on 12 November → spending becomes £18, next shopping date remains 16 November.
// -----------------------------------------------------------------------------
console.log('▶ SCENARIO B: Top-up £2 on 12 November');
const purchaseB = {
  id: 'p_nov12_topup',
  store: 'Sainsbury Local',
  purchase_date: '2026-11-12',
  total_amount: 2.00,
  purchase_type: 'top_up',
  created_at: '2026-11-12T14:30:00Z',
};
const resB = computeGroceryCycles([purchaseA, purchaseB], 20, new Date('2026-11-12T15:00:00Z'));
assert.strictEqual(resB.activeCycle.startDate, '2026-11-09', 'Start date remains 9 Nov');
assert.strictEqual(resB.activeCycle.expectedNextShoppingDate, '2026-11-16', 'Top-up shopping must NOT change next shopping date');
assert.strictEqual(resB.activeCycle.spendingPounds, 18.00, 'Spending must be £18.00 (£16 + £2)');
assert.strictEqual(resB.activeCycle.remainingBudgetPounds, 2.00, 'Remaining budget must be £2.00 (£20 - £18)');
assert.strictEqual(resB.activeCycle.daysRemaining, 4, 'Days remaining until 16 Nov must be 4');
console.log('  ✔ Next shopping date remains 16 Nov 2026');
console.log('  ✔ Active cycle spending: £18.00 (£16 main + £2 top-up)');
console.log('  ✔ Remaining budget: £2.00');
console.log('  ✔ Scenario B PASSED.\n');

// -----------------------------------------------------------------------------
// SCENARIO C:
// Additional £5 top-up on 14 November → spending becomes £23, display £3 over budget.
// -----------------------------------------------------------------------------
console.log('▶ SCENARIO C: Additional £5 top-up on 14 November');
const purchaseC = {
  id: 'p_nov14_topup',
  store: 'Corner Bakery',
  purchase_date: '2026-11-14',
  total_amount: 5.00,
  purchase_type: 'top_up',
  created_at: '2026-11-14T11:00:00Z',
};
const resC = computeGroceryCycles([purchaseA, purchaseB, purchaseC], 20, new Date('2026-11-14T12:00:00Z'));
assert.strictEqual(resC.activeCycle.spendingPounds, 23.00, 'Total cycle spending must be £23.00');
assert.strictEqual(resC.activeCycle.isOverBudget, true, 'isOverBudget must be true');
assert.strictEqual(resC.activeCycle.overBudgetPounds, 3.00, 'Over budget amount must be £3.00');
assert.strictEqual(resC.activeCycle.remainingBudgetPounds, 0, 'Remaining budget must be 0');
assert.strictEqual(resC.activeCycle.expectedNextShoppingDate, '2026-11-16', 'Next shopping date remains 16 Nov 2026');
assert(resC.activeCycle.statusMessage.includes('You are £3.00 over your £20 weekly budget.'),
  'Status message must state: "You are £3.00 over your £20 weekly budget."');
console.log('  ✔ Total cycle spending: £23.00');
console.log('  ✔ Budget exceeded by £3.00');
console.log('  ✔ Status message: "' + resC.activeCycle.statusMessage + '"');
console.log('  ✔ Scenario C PASSED.\n');

// -----------------------------------------------------------------------------
// SCENARIO D:
// Main shopping on 19 November → previous cycle closes, 3 extra days recorded,
// and new cycle starts on 19 November with next shopping due 26 November.
// -----------------------------------------------------------------------------
console.log('▶ SCENARIO D: Main shopping on 19 November');
const purchaseD = {
  id: 'p_nov19_main',
  store: 'Aldi',
  purchase_date: '2026-11-19',
  total_amount: 14.50,
  purchase_type: 'main',
  created_at: '2026-11-19T09:30:00Z',
};
const resD = computeGroceryCycles([purchaseA, purchaseB, purchaseC, purchaseD], 20, new Date('2026-11-19T11:00:00Z'));
assert.strictEqual(resD.closedCycles.length, 1, 'Exactly 1 previous cycle should be closed');
const closedCycle1 = resD.closedCycles[0];
assert.strictEqual(closedCycle1.startDate, '2026-11-09');
assert.strictEqual(closedCycle1.expectedNextShoppingDate, '2026-11-16');
assert.strictEqual(closedCycle1.actualNextShoppingDate, '2026-11-19');
assert.strictEqual(closedCycle1.totalDays, 10, 'Total days between 9 Nov and 19 Nov must be 10');
assert.strictEqual(closedCycle1.extraDaysMaintained, 3, 'Extra days maintained must be 3 (10 - 7)');
assert.strictEqual(closedCycle1.spendingPounds, 23.00, 'Closed cycle spending must be £23.00');
assert.strictEqual(closedCycle1.overBudgetPounds, 3.00, 'Closed cycle was £3.00 over budget');
assert.strictEqual(closedCycle1.netPence, -300, 'Closed cycle deficit is 300p');

// Active cycle should be the new cycle
assert(resD.activeCycle !== null, 'Active cycle must exist');
assert.strictEqual(resD.activeCycle.startDate, '2026-11-19', 'New cycle starts 19 Nov 2026');
assert.strictEqual(resD.activeCycle.expectedNextShoppingDate, '2026-11-26', 'Next shopping due 26 Nov 2026');
assert.strictEqual(resD.activeCycle.spendingPounds, 14.50, 'New cycle spending is £14.50');
assert.strictEqual(resD.activeCycle.remainingBudgetPounds, 5.50, 'New cycle remaining budget is £5.50');
console.log('  ✔ Previous cycle closed: 9 Nov to 19 Nov (10 total days)');
console.log('  ✔ Extra days maintained: 3 days');
console.log('  ✔ New cycle started: 19 Nov 2026');
console.log('  ✔ Next shopping due: 26 Nov 2026 (19 + 7)');
console.log('  ✔ Scenario D PASSED.\n');

// -----------------------------------------------------------------------------
// SCENARIO E: Cumulative Deficit/Savings Carry-Forward
// -----------------------------------------------------------------------------
console.log('▶ SCENARIO E: Cumulative deficit/savings carry forward');
// From Scenario D:
// Cycle 1: Spent £23 out of £20 -> -£3.00 deficit (-300 pence)
// Cycle 2: Spent £14.50 out of £20 -> +£5.50 underspending (+550 pence)
// Overall cumulative balance: -300 + 550 = +250 pence (+£2.50 savings)
assert.strictEqual(resD.previousCumulativePence, -300);
assert.strictEqual(resD.previousCumulativePounds, 3.00);
assert.strictEqual(resD.previousCumulativeStatus, 'deficit');
assert.strictEqual(resD.currentCycleNetPence, 550);
assert.strictEqual(resD.overallCumulativePence, 250);
assert.strictEqual(resD.overallCumulativePounds, 2.50);
assert.strictEqual(resD.overallCumulativeStatus, 'savings');
console.log('  ✔ Previous closed cycles deficit: £3.00');
console.log('  ✔ Active cycle net savings: £5.50');
console.log('  ✔ Overall cumulative savings: £2.50');

// Test prompt example:
// "Previous deficit: £5. Current cycle underspending: £3. Remaining cumulative deficit: £2."
const promptExC1 = { id: 'ex1', store: 'Shop', purchase_date: '2026-11-01', total_amount: 25.00, purchase_type: 'main', created_at: '2026-11-01T10:00:00Z' };
const promptExC2 = { id: 'ex2', store: 'Shop', purchase_date: '2026-11-08', total_amount: 17.00, purchase_type: 'main', created_at: '2026-11-08T10:00:00Z' };
const resEx = computeGroceryCycles([promptExC1, promptExC2], 20, new Date('2026-11-09T10:00:00Z'));
assert.strictEqual(resEx.previousCumulativePence, -500, 'Previous deficit must be £5 (500p)');
assert.strictEqual(resEx.previousCumulativeStatus, 'deficit');
assert.strictEqual(resEx.currentCycleNetPence, 300, 'Current cycle underspending must be £3 (300p)');
assert.strictEqual(resEx.overallCumulativePence, -200, 'Remaining cumulative deficit must be £2 (200p)');
assert.strictEqual(resEx.overallCumulativePounds, 2.00);
assert.strictEqual(resEx.overallCumulativeStatus, 'deficit');
console.log('  ✔ Prompt example verified: Previous deficit £5, Current underspending £3 -> Remaining deficit £2');
console.log('  ✔ Scenario E PASSED.\n');

// -----------------------------------------------------------------------------
// SCENARIO F: Edit and Delete Purchases
// -----------------------------------------------------------------------------
console.log('▶ SCENARIO F: Edit and delete operations update all calculations');
// 1. Edit: Reduce purchaseC from £5.00 to £2.00
const purchaseCEdited = { ...purchaseC, total_amount: 2.00 };
const resF1 = computeGroceryCycles([purchaseA, purchaseB, purchaseCEdited, purchaseD], 20, new Date('2026-11-19T11:00:00Z'));
// Cycle 1 spending is now £16 + £2 + £2 = £20.00. Budget is exact (£0 deficit/savings).
assert.strictEqual(resF1.closedCycles[0].spendingPounds, 20.00);
assert.strictEqual(resF1.closedCycles[0].netPence, 0);
assert.strictEqual(resF1.closedCycles[0].isOverBudget, false);
assert.strictEqual(resF1.previousCumulativePence, 0);
assert.strictEqual(resF1.overallCumulativePence, 550); // only cycle 2 underspending

// 2. Delete: Delete purchaseB (top-up £2)
const resF2 = computeGroceryCycles([purchaseA, purchaseC, purchaseD], 20, new Date('2026-11-19T11:00:00Z'));
// Cycle 1 spending is now £16 + £5 = £21.00 (£1 deficit)
assert.strictEqual(resF2.closedCycles[0].spendingPounds, 21.00);
assert.strictEqual(resF2.closedCycles[0].overBudgetPounds, 1.00);
assert.strictEqual(resF2.closedCycles[0].netPence, -100);

// 3. Edit purchase type: Change purchaseD from 'main' to 'top_up'
const purchaseDAsTopup = { ...purchaseD, purchase_type: 'top_up' };
const resF3 = computeGroceryCycles([purchaseA, purchaseB, purchaseC, purchaseDAsTopup], 20, new Date('2026-11-19T11:00:00Z'));
// Now there is only 1 cycle (Cycle 1 starting on 9 Nov), which remains active!
assert.strictEqual(resF3.closedCycles.length, 0, 'No cycle closed because purchaseD became top-up');
assert.strictEqual(resF3.activeCycle.startDate, '2026-11-09');
assert.strictEqual(resF3.activeCycle.spendingPounds, 37.50, 'All 4 purchases belong to Cycle 1');
console.log('  ✔ Editing purchase amount instantly updates cycle spending and cumulative balances.');
console.log('  ✔ Deleting purchase removes its spending and recomputes all cycles.');
console.log('  ✔ Reclassifying purchase type seamlessly alters cycle boundary.');
console.log('  ✔ Scenario F PASSED.\n');

// -----------------------------------------------------------------------------
// SCENARIO G: Grocery Efficiency Delay & Historical Safety
// -----------------------------------------------------------------------------
console.log('▶ SCENARIO G: Grocery efficiency delay and historical safety');
// Shopping delayed by 3 days: 9 Nov main shop, today is 19 Nov (before next main shop is logged)
const resDelay = computeGroceryCycles([purchaseA], 20, new Date('2026-11-19T12:00:00Z'));
assert.strictEqual(resDelay.activeCycle.daysOverdue, 3, 'Days overdue must be 3');
assert.strictEqual(resDelay.activeCycle.extraDaysMaintained, 3, 'Extra days maintained must be 3');
assert.strictEqual(resDelay.activeCycle.totalDays, 10, 'Total days maintained must be 10');
assert(resDelay.activeCycle.statusMessage.includes('Great! You managed to maintain your groceries for 3 extra days.'),
  'Status message must praise maintaining groceries for 3 extra days');
assert.strictEqual(resDelay.activeCycle.budgetPounds, 20, 'Budget must NOT increase because shopping was delayed');

// Unclassified legacy purchases
const legacyPurchase = {
  id: 'legacy_1',
  store: 'Corner Market',
  purchase_date: '2026-10-20',
  total_amount: 8.50,
  // purchase_type: undefined / null (legacy record)
  created_at: '2026-10-20T10:00:00Z',
};
const resLegacy = computeGroceryCycles([legacyPurchase, purchaseA], 20, new Date('2026-11-09T10:00:00Z'));
assert.strictEqual(resLegacy.unclassifiedPurchases.length, 1, 'Legacy purchases are safely flagged as unclassified');
assert.strictEqual(resLegacy.activeCycle.startDate, '2026-11-09', 'Legacy purchase does NOT reset cycle without explicit classification');
console.log('  ✔ Extra days maintained celebration displayed accurately.');
console.log('  ✔ Budget remains £20.00 without artificial inflation.');
console.log('  ✔ Legacy unclassified purchases are preserved safely without guessing.');
console.log('  ✔ Scenario G PASSED.\n');

console.log('================================================================');
console.log('🎉 ALL SCENARIOS A, B, C, D, E, F, G SUCCESSFULLY VERIFIED!');
console.log('================================================================');
