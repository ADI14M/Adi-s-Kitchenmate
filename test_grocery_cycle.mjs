import assert from 'assert';
import {
  computeGroceryCycles,
  computeCycleBudget,
  addDaysToYMD,
  daysBetweenYMD
} from './src/lib/groceryCycleUtils.ts';
import { computeAnalytics } from './src/lib/analyticsUtils.ts';

console.log('================================================================');
console.log('🧪 RUNNING PRODUCTION-READINESS AUDIT TEST SUITE (17 CHECKS)');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// CHECK 1: Shopping on 9 November → next date 16 November
// -----------------------------------------------------------------------------
console.log('▶ CHECK 1: Shopping on 9 November → next date 16 November');
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
console.log('  ✔ Start: 9 Nov 2026 | End: 15 Nov 2026 | Next expected: 16 Nov 2026');
console.log('  ✔ Check 1 PASSED.\n');

// -----------------------------------------------------------------------------
// CHECK 2: Shopping on 16 November → next date 23 November
// -----------------------------------------------------------------------------
console.log('▶ CHECK 2: Shopping on 16 November → next date 23 November');
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
console.log('  ✔ Cycle 1 closed on 16 Nov 2026 (exact 7-day cycle)');
console.log('  ✔ Cycle 2 started 16 Nov 2026 | Next expected: 23 Nov 2026');
console.log('  ✔ Check 2 PASSED.\n');

// -----------------------------------------------------------------------------
// CHECK 3: Shopping late on 19 November → next date 26 November, with 3 extra days saved
// -----------------------------------------------------------------------------
console.log('▶ CHECK 3: Shopping late on 19 November → next date 26 November, with 3 extra days saved');
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
assert(closedC.efficiencyMessage.includes('Your groceries lasted 3 extra days. Great savings!'));
assert.strictEqual(res3.totalPreviousExtraDaysSaved, 3);
assert.strictEqual(res3.activeCycle.startDate, '2026-11-19');
assert.strictEqual(res3.activeCycle.expectedNextShoppingDate, '2026-11-26');
console.log('  ✔ Cycle 1 maintained for 10 days (+3 extra days saved)');
console.log('  ✔ Cycle 2 started 19 Nov 2026 | Next expected: 26 Nov 2026');
console.log('  ✔ Check 3 PASSED.\n');

// -----------------------------------------------------------------------------
// CHECK 4: Spending £19 → within normal budget
// -----------------------------------------------------------------------------
console.log('▶ CHECK 4: Spending £19 → within normal budget');
const b4 = computeCycleBudget(1900, 20, 2);
assert.strictEqual(b4.spendingPounds, 19.00);
assert.strictEqual(b4.baseRemainingPounds, 1.00);
assert.strictEqual(b4.allowanceUsedPounds, 0.00);
assert.strictEqual(b4.allowanceRemainingPounds, 2.00);
assert.strictEqual(b4.totalAvailablePounds, 3.00);
assert.strictEqual(b4.isBaseExceeded, false);
assert.strictEqual(b4.isOverMaxAllowance, false);
assert.strictEqual(b4.budgetStatusCategory, 'within_base');
console.log('  ✔ Spent £19.00: Base rem = £1.00, Buffer rem = £2.00, Total available = £3.00');
console.log('  ✔ Check 4 PASSED.\n');

// -----------------------------------------------------------------------------
// CHECK 5: Spending £21 → £1 of extra allowance used
// -----------------------------------------------------------------------------
console.log('▶ CHECK 5: Spending £21 → £1 of extra allowance used');
const b5 = computeCycleBudget(2100, 20, 2);
assert.strictEqual(b5.spendingPounds, 21.00);
assert.strictEqual(b5.baseRemainingPounds, 0.00);
assert.strictEqual(b5.allowanceUsedPounds, 1.00);
assert.strictEqual(b5.allowanceRemainingPounds, 1.00);
assert.strictEqual(b5.totalAvailablePounds, 1.00);
assert.strictEqual(b5.isBaseExceeded, true);
assert.strictEqual(b5.isOverMaxAllowance, false);
assert.strictEqual(b5.budgetStatusCategory, 'using_allowance');
assert(b5.budgetStatusMessage.includes('Using extra allowance: £1.00 of £2.00 allowance used'));
console.log('  ✔ Spent £21.00: Allowance used = £1.00, Buffer rem = £1.00, Total available = £1.00');
console.log('  ✔ Check 5 PASSED.\n');

// -----------------------------------------------------------------------------
// CHECK 6: Spending £22 → exactly within the maximum allowance
// -----------------------------------------------------------------------------
console.log('▶ CHECK 6: Spending £22 → exactly within the maximum allowance');
const b6 = computeCycleBudget(2200, 20, 2);
assert.strictEqual(b6.spendingPounds, 22.00);
assert.strictEqual(b6.baseRemainingPounds, 0.00);
assert.strictEqual(b6.allowanceUsedPounds, 2.00);
assert.strictEqual(b6.allowanceRemainingPounds, 0.00);
assert.strictEqual(b6.totalAvailablePounds, 0.00);
assert.strictEqual(b6.isBaseExceeded, true);
assert.strictEqual(b6.isOverMaxAllowance, false);
assert.strictEqual(b6.budgetStatusCategory, 'using_allowance');
console.log('  ✔ Spent £22.00: Full £2.00 allowance used, £0 buffer remaining, £0 over max');
console.log('  ✔ Check 6 PASSED.\n');

// -----------------------------------------------------------------------------
// CHECK 7: Spending £24 → £2 over the maximum allowance
// -----------------------------------------------------------------------------
console.log('▶ CHECK 7: Spending £24 → £2 over the maximum allowance');
const b7 = computeCycleBudget(2400, 20, 2);
assert.strictEqual(b7.spendingPounds, 24.00);
assert.strictEqual(b7.baseRemainingPounds, 0.00);
assert.strictEqual(b7.allowanceUsedPounds, 2.00);
assert.strictEqual(b7.allowanceRemainingPounds, 0.00);
assert.strictEqual(b7.totalAvailablePounds, 0.00);
assert.strictEqual(b7.isOverMaxAllowance, true);
assert.strictEqual(b7.overMaxPounds, 2.00);
assert.strictEqual(b7.budgetStatusCategory, 'over_allowance');
assert.strictEqual(b7.budgetStatusMessage, 'You are £2.00 over your weekly budget, including your £2 extra allowance.');
console.log('  ✔ Spent £24.00: £2.00 over maximum allowance');
console.log('  ✔ Message: "' + b7.budgetStatusMessage + '"');
console.log('  ✔ Check 7 PASSED.\n');

// -----------------------------------------------------------------------------
// CHECK 8: Editing or deleting a purchase recalculates figures correctly
// -----------------------------------------------------------------------------
console.log('▶ CHECK 8: Editing and deleting purchase updates figures');
const pMain = { id: 'm1', store: 'Tesco', purchase_date: '2026-11-09', total_amount: 16.00, purchase_type: 'main', created_at: '2026-11-09T09:00:00Z' };
const pTop1 = { id: 't1', store: 'Lidl', purchase_date: '2026-11-11', total_amount: 3.00, purchase_type: 'top_up', created_at: '2026-11-11T12:00:00Z' };
const pTop2 = { id: 't2', store: 'Bakery', purchase_date: '2026-11-13', total_amount: 4.00, purchase_type: 'top_up', created_at: '2026-11-13T10:00:00Z' };

// Initial: 16 + 3 + 4 = £23.00 (£1 over £22 max)
const resInit = computeGroceryCycles([pMain, pTop1, pTop2], 20, 2, new Date('2026-11-14T12:00:00Z'));
assert.strictEqual(resInit.activeCycle.spendingPounds, 23.00);
assert.strictEqual(resInit.activeCycle.isOverMaxAllowance, true);

// Edit pTop2 from £4 to £2 -> total becomes £21.00
const pTop2Edited = { ...pTop2, total_amount: 2.00 };
const resEdit = computeGroceryCycles([pMain, pTop1, pTop2Edited], 20, 2, new Date('2026-11-14T12:00:00Z'));
assert.strictEqual(resEdit.activeCycle.spendingPounds, 21.00);
assert.strictEqual(resEdit.activeCycle.isOverMaxAllowance, false);
assert.strictEqual(resEdit.activeCycle.allowanceUsedPounds, 1.00);

// Delete pTop1 -> total becomes £18.00
const resDelete = computeGroceryCycles([pMain, pTop2Edited], 20, 2, new Date('2026-11-14T12:00:00Z'));
assert.strictEqual(resDelete.activeCycle.spendingPounds, 18.00);
assert.strictEqual(resDelete.activeCycle.baseRemainingPounds, 2.00);
assert.strictEqual(resDelete.activeCycle.allowanceUsedPounds, 0.00);
console.log('  ✔ Edit and delete accurately restored balances.');
console.log('  ✔ Check 8 PASSED.\n');

// -----------------------------------------------------------------------------
// CHECK 9: Deleting the latest weekly purchase re-anchors to previous valid weekly purchase
// -----------------------------------------------------------------------------
console.log('▶ CHECK 9: Deleting latest weekly purchase re-anchors to previous valid weekly purchase');
const pShop1 = { id: 's1', store: 'Tesco', purchase_date: '2026-11-09', total_amount: 16.00, purchase_type: 'main', created_at: '2026-11-09T09:00:00Z' };
const pTopUp = { id: 'tu1', store: 'Corner Shop', purchase_date: '2026-11-12', total_amount: 2.50, purchase_type: 'top_up', created_at: '2026-11-12T10:00:00Z' };
const pShop2 = { id: 's2', store: 'Aldi', purchase_date: '2026-11-19', total_amount: 17.00, purchase_type: 'main', created_at: '2026-11-19T09:00:00Z' };

// Before deletion: 2 cycles (Cycle 1 closed, Cycle 2 active)
const resBeforeDelete = computeGroceryCycles([pShop1, pTopUp, pShop2], 20, 2, new Date('2026-11-20T12:00:00Z'));
assert.strictEqual(resBeforeDelete.closedCycles.length, 1);
assert.strictEqual(resBeforeDelete.activeCycle.startDate, '2026-11-19');

// User deletes pShop2 (latest weekly purchase)
const resAfterDelete = computeGroceryCycles([pShop1, pTopUp], 20, 2, new Date('2026-11-20T12:00:00Z'));
assert.strictEqual(resAfterDelete.closedCycles.length, 0, 'No closed cycles remain');
assert.strictEqual(resAfterDelete.activeCycle.startDate, '2026-11-09', 'Active cycle correctly re-anchors to 9 Nov 2026');
assert.strictEqual(resAfterDelete.activeCycle.expectedNextShoppingDate, '2026-11-16');
assert.strictEqual(resAfterDelete.activeCycle.spendingPounds, 18.50, '16.00 + 2.50 = £18.50');
console.log('  ✔ Successfully re-anchored to previous valid weekly purchase (9 Nov 2026)');
console.log('  ✔ Check 9 PASSED.\n');

// -----------------------------------------------------------------------------
// CHECK 10: Editing a weekly purchase date recalculates affected cycles
// -----------------------------------------------------------------------------
console.log('▶ CHECK 10: Editing weekly purchase date recalculates affected cycles');
// Change pShop2 from 19 Nov to 17 Nov
const pShop2Shifted = { ...pShop2, purchase_date: '2026-11-17' };
const resShifted = computeGroceryCycles([pShop1, pTopUp, pShop2Shifted], 20, 2, new Date('2026-11-20T12:00:00Z'));
assert.strictEqual(resShifted.closedCycles[0].startDate, '2026-11-09');
assert.strictEqual(resShifted.closedCycles[0].actualNextShoppingDate, '2026-11-17', 'Cycle 1 now closed on 17 Nov');
assert.strictEqual(resShifted.closedCycles[0].totalDays, 8, '17 Nov - 9 Nov = 8 days');
assert.strictEqual(resShifted.closedCycles[0].extraDaysMaintained, 1, '8 - 7 = 1 extra day');
assert.strictEqual(resShifted.activeCycle.startDate, '2026-11-17', 'Cycle 2 now starts on 17 Nov');
assert.strictEqual(resShifted.activeCycle.expectedNextShoppingDate, '2026-11-24', '17 Nov + 7 = 24 Nov');
console.log('  ✔ Shifted cycle end and start dates recalculated accurately');
console.log('  ✔ Check 10 PASSED.\n');

// -----------------------------------------------------------------------------
// CHECK 11: Top-up editing & deleting must NOT reset cycle dates
// -----------------------------------------------------------------------------
console.log('▶ CHECK 11: Top-up editing and deleting does not reset cycle dates');
// Active cycle starts 9 Nov, expected next 16 Nov
const pTopUpEdited = { ...pTopUp, total_amount: 5.00, purchase_date: '2026-11-14' };
const resTopUpEdited = computeGroceryCycles([pShop1, pTopUpEdited], 20, 2, new Date('2026-11-15T12:00:00Z'));
assert.strictEqual(resTopUpEdited.activeCycle.startDate, '2026-11-09', 'Start date must remain 9 Nov');
assert.strictEqual(resTopUpEdited.activeCycle.expectedNextShoppingDate, '2026-11-16', 'Next date must remain 16 Nov');
assert.strictEqual(resTopUpEdited.activeCycle.spendingPounds, 21.00);

// Delete top-up completely
const resTopUpDeleted = computeGroceryCycles([pShop1], 20, 2, new Date('2026-11-15T12:00:00Z'));
assert.strictEqual(resTopUpDeleted.activeCycle.startDate, '2026-11-09', 'Start date must remain 9 Nov');
assert.strictEqual(resTopUpDeleted.activeCycle.expectedNextShoppingDate, '2026-11-16', 'Next date must remain 16 Nov');
assert.strictEqual(resTopUpDeleted.activeCycle.spendingPounds, 16.00);
console.log('  ✔ Start and next shopping dates remain invariant when editing or deleting top-ups');
console.log('  ✔ Check 11 PASSED.\n');

// -----------------------------------------------------------------------------
// CHECK 12: Multiple top-ups accumulate into the correct active cycle
// -----------------------------------------------------------------------------
console.log('▶ CHECK 12: Multiple top-ups accumulate into correct active cycle');
const tuA = { id: 'tuA', store: 'Tesco', purchase_date: '2026-11-10', total_amount: 1.50, purchase_type: 'top_up', created_at: '2026-11-10T09:00:00Z' };
const tuB = { id: 'tuB', store: 'Lidl', purchase_date: '2026-11-12', total_amount: 2.25, purchase_type: 'top_up', created_at: '2026-11-12T09:00:00Z' };
const tuC = { id: 'tuC', store: 'Bakery', purchase_date: '2026-11-14', total_amount: 1.75, purchase_type: 'top_up', created_at: '2026-11-14T09:00:00Z' };
const resMultiTopUp = computeGroceryCycles([pShop1, tuA, tuB, tuC], 20, 2, new Date('2026-11-15T12:00:00Z'));
// 16.00 + 1.50 + 2.25 + 1.75 = 21.50
assert.strictEqual(resMultiTopUp.activeCycle.spendingPounds, 21.50);
assert.strictEqual(resMultiTopUp.activeCycle.topUpSpendingPounds, 5.50);
assert.strictEqual(resMultiTopUp.activeCycle.allPurchases.length, 4);
console.log('  ✔ 3 top-ups (£5.50 total) accumulated into Cycle 1 correctly (total £21.50)');
console.log('  ✔ Check 12 PASSED.\n');

// -----------------------------------------------------------------------------
// CHECK 13: Backdated purchases use purchase_date, NOT created_at
// -----------------------------------------------------------------------------
console.log('▶ CHECK 13: Purchases use actual purchase_date, not created_at');
// User entered the receipt on 15 Nov, but actual purchase took place on 9 Nov
const backdatedMain = {
  id: 'bm1',
  store: 'Tesco',
  purchase_date: '2026-11-09', // Actual shop date
  created_at: '2026-11-15T22:45:00Z', // Entered 6 days later
  total_amount: 16.00,
  purchase_type: 'main',
};
const resBackdated = computeGroceryCycles([backdatedMain], 20, 2, new Date('2026-11-16T12:00:00Z'));
assert.strictEqual(resBackdated.activeCycle.startDate, '2026-11-09', 'Must use 9 Nov as cycle start, not 15 Nov created_at');
assert.strictEqual(resBackdated.activeCycle.expectedNextShoppingDate, '2026-11-16', 'Next date must be 16 Nov');
console.log('  ✔ Cycle correctly anchored to purchase_date (9 Nov) regardless of created_at (15 Nov)');
console.log('  ✔ Check 13 PASSED.\n');

// -----------------------------------------------------------------------------
// CHECK 14: Daylight-saving changes (Spring forward & Fall back crossing)
// -----------------------------------------------------------------------------
console.log('▶ CHECK 14: Daylight saving time transitions (Spring forward & Fall back)');
// Fall back occurs last Sunday of October (e.g. 25 Oct 2026 in UK)
// A 7-day cycle starting on 22 Oct 2026 must end on 28 Oct 2026, next due 29 Oct 2026
assert.strictEqual(addDaysToYMD('2026-10-22', 7), '2026-10-29', 'October DST transition must be exact 7 days');
assert.strictEqual(daysBetweenYMD('2026-10-22', '2026-10-29'), 7);

// Spring forward occurs last Sunday of March (e.g. 29 Mar 2026 in UK)
// A 7-day cycle starting on 26 Mar 2026 must end on 1 Apr 2026, next due 2 Apr 2026
assert.strictEqual(addDaysToYMD('2026-03-26', 7), '2026-04-02', 'March DST transition must be exact 7 days');
assert.strictEqual(daysBetweenYMD('2026-03-26', '2026-04-02'), 7);
console.log('  ✔ Zero drift across UK daylight saving clock shifts');
console.log('  ✔ Check 14 PASSED.\n');

// -----------------------------------------------------------------------------
// CHECK 15: Historical unclassified purchases compatibility
// -----------------------------------------------------------------------------
console.log('▶ CHECK 15: Historical unclassified purchases compatibility');
const legacy1 = { id: 'leg1', store: 'Old Shop 1', purchase_date: '2026-09-01', total_amount: 12.00, created_at: '2026-09-01T10:00:00Z' };
const legacy2 = { id: 'leg2', store: 'Old Shop 2', purchase_date: '2026-09-15', total_amount: 30.00, created_at: '2026-09-15T10:00:00Z' };
const legacy3 = { id: 'leg3', store: 'Old Shop 3', purchase_date: '2026-10-01', total_amount: 18.00, created_at: '2026-10-01T10:00:00Z' };

// Case 1: Account only has legacy purchases (no main purchase classified yet)
const resOnlyLegacy = computeGroceryCycles([legacy1, legacy2, legacy3], 20, 2, new Date('2026-11-09T12:00:00Z'));
assert.strictEqual(resOnlyLegacy.activeCycle, null, 'Must NOT invent an active cycle for legacy purchases');
assert.strictEqual(resOnlyLegacy.closedCycles.length, 0, 'Must NOT invent closed cycles');
assert.strictEqual(resOnlyLegacy.totalPreviousExtraDaysSaved, 0, 'Must NOT invent fake extra days saved');
assert.strictEqual(resOnlyLegacy.unclassifiedPurchases.length, 3, 'All 3 legacy purchases safely identified as unclassified');

// Case 2: User records their first Weekly Grocery Shopping on 9 Nov
const resFirstMain = computeGroceryCycles([legacy1, legacy2, legacy3, pShop1], 20, 2, new Date('2026-11-09T12:00:00Z'));
assert.strictEqual(resFirstMain.activeCycle.startDate, '2026-11-09', 'Active cycle starts on 9 Nov');
assert.strictEqual(resFirstMain.closedCycles.length, 0, 'No fake previous cycles created');
assert.strictEqual(resFirstMain.totalPreviousExtraDaysSaved, 0, 'No fake savings created');
assert.strictEqual(resFirstMain.unclassifiedPurchases.length, 3, 'Historical purchases remain untouched');
console.log('  ✔ Zero fake cycles, zero fake dates, zero fake savings created for legacy records');
console.log('  ✔ Check 15 PASSED.\n');

// -----------------------------------------------------------------------------
// CHECK 16: Early shopping handling (groceries shopped after 5 days, before 7 days)
// -----------------------------------------------------------------------------
console.log('▶ CHECK 16: Early shopping handling (shopped 5 days later)');
const shopEarly = {
  id: 'early_shop',
  store: 'Waitrose',
  purchase_date: '2026-11-14', // Shopped 5 days after 9 Nov
  total_amount: 17.50,
  purchase_type: 'main',
  created_at: '2026-11-14T11:00:00Z',
};
const resEarly = computeGroceryCycles([shop1, shopEarly], 20, 2, new Date('2026-11-14T12:00:00Z'));
assert.strictEqual(resEarly.closedCycles.length, 1);
assert.strictEqual(resEarly.closedCycles[0].startDate, '2026-11-09');
assert.strictEqual(resEarly.closedCycles[0].actualNextShoppingDate, '2026-11-14');
assert.strictEqual(resEarly.closedCycles[0].totalDays, 5);
assert.strictEqual(resEarly.closedCycles[0].extraDaysMaintained, 0, 'Early shop has 0 extra days maintained');
assert.strictEqual(resEarly.activeCycle.startDate, '2026-11-14');
assert.strictEqual(resEarly.activeCycle.expectedNextShoppingDate, '2026-11-21');
console.log('  ✔ Closed Cycle 1 accurately recorded 5 days total, 0 extra days saved');
console.log('  ✔ Active Cycle 2 immediately anchored to actual date 14 Nov, next due 21 Nov');
console.log('  ✔ Check 16 PASSED.\n');

// -----------------------------------------------------------------------------
// CHECK 17: computeAnalytics integration (Total spending, Store breakdown, Calendar Month)
// -----------------------------------------------------------------------------
console.log('▶ CHECK 17: computeAnalytics integrity (Store breakdown, Monthly analytics, Cycles)');
// Self-contained data for check 17 to avoid variable dependency
const c17_legacy1 = { id: 'c17_leg1', store: 'Old Shop 1', purchase_date: '2026-09-01', total_amount: 12.00, created_at: '2026-09-01T10:00:00Z' };
const c17_legacy2 = { id: 'c17_leg2', store: 'Old Shop 2', purchase_date: '2026-09-15', total_amount: 30.00, created_at: '2026-09-15T10:00:00Z' };
const c17_legacy3 = { id: 'c17_leg3', store: 'Old Shop 3', purchase_date: '2026-10-01', total_amount: 18.00, created_at: '2026-10-01T10:00:00Z' };
const c17_main1 = { id: 'c17_m1', store: 'Tesco', purchase_date: '2026-11-09', total_amount: 15.00, purchase_type: 'main', created_at: '2026-11-09T09:00:00Z' };
const c17_topup = { id: 'c17_tu', store: 'Tesco', purchase_date: '2026-11-11', total_amount: 2.00, purchase_type: 'top_up', created_at: '2026-11-11T10:00:00Z' };
const c17_main2 = { id: 'c17_m2', store: "Sainsbury's", purchase_date: '2026-11-19', total_amount: 17.00, purchase_type: 'main', created_at: '2026-11-19T09:00:00Z' };

const allTestPurchases = [c17_legacy1, c17_legacy2, c17_legacy3, c17_main1, c17_topup, c17_main2];
// Reference date: 20 Nov 2026
const analyticsRes = computeAnalytics(allTestPurchases, new Date('2026-11-20T12:00:00Z'));

// Total spending: 12 + 30 + 18 + 15 + 2 + 17 = £94.00
assert.strictEqual(analyticsRes.totalSpending, 94.00, 'Total spending must be exact sum £94.00');
assert.strictEqual(analyticsRes.totalPurchasesCount, 6);

// Store breakdown: Tesco = 15 + 2 = £17.00
const tescoEntry = analyticsRes.storeBreakdown.find(s => s.store === 'Tesco');
assert(tescoEntry, 'Tesco entry must exist');
assert.strictEqual(tescoEntry.totalAmount, 17.00);
assert.strictEqual(tescoEntry.purchaseCount, 2);

// Calendar Month: Nov 2026 purchases = 15 + 2 + 17 = £34.00
assert.strictEqual(analyticsRes.thisMonthVsLastMonth.currentAmount, 34.00, 'November calendar month spending must be £34.00');
// Calendar Month: Oct 2026 purchases = £18.00
assert.strictEqual(analyticsRes.thisMonthVsLastMonth.previousAmount, 18.00, 'October calendar month spending must be £18.00');

// Rolling Grocery Cycle in Analytics: Active cycle is c17_main2 (19 Nov), previous Cycle 1 (9 Nov)
// Active cycle (19 Nov): c17_main2 = £17.00
assert.strictEqual(analyticsRes.thisWeekVsLastWeek.currentAmount, 17.00, 'Active cycle spending must be £17.00');
// Previous cycle (9 Nov - 19 Nov): c17_main1 + c17_topup = £17.00
assert.strictEqual(analyticsRes.thisWeekVsLastWeek.previousAmount, 17.00, 'Previous cycle spending must be £17.00 (£15+£2)');
console.log('  ✔ Total spending: £94.00 across 6 purchases exact match');
console.log('  ✔ Store breakdown correctly groups stores with exact sums');
console.log('  ✔ Calendar month comparison strictly preserved (Nov £34.00 vs Oct £18.00)');
console.log('  ✔ Rolling grocery cycle accurately powers cycle comparison');
console.log('  ✔ Check 17 PASSED.\n');

console.log('================================================================');
console.log('🎉 ALL 17 PRODUCTION-READINESS AUDIT CHECKS PASSED WITH 100% SUCCESS!');
console.log('================================================================');
