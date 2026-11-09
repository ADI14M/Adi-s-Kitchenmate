import type { PurchaseRecord } from '../store/usePurchaseStore';
import { getPurchaseAmountInPence, penceToPounds, getLondonDateParts } from './analyticsUtils.ts';

export type PurchaseType = 'main' | 'top_up';

export const BASE_BUDGET_POUNDS = 20;
export const BASE_BUDGET_PENCE = 2000;
export const EXTRA_ALLOWANCE_POUNDS = 2;
export const EXTRA_ALLOWANCE_PENCE = 200;
export const MAX_BUDGET_POUNDS = 22;
export const MAX_BUDGET_PENCE = 2200;

export type BudgetStatusCategory = 'within_base' | 'using_allowance' | 'over_allowance';

export interface CycleBudgetBreakdown {
  baseBudgetPounds: number; // 20
  baseBudgetPence: number; // 2000
  extraAllowancePounds: number; // 2
  extraAllowancePence: number; // 200
  maxBudgetPounds: number; // 22
  maxBudgetPence: number; // 2200

  spendingPence: number;
  spendingPounds: number;

  // Base £20 budget breakdown
  baseRemainingPence: number;
  baseRemainingPounds: number;
  isBaseExceeded: boolean;

  // Extra £2 allowance breakdown
  allowanceUsedPence: number;
  allowanceUsedPounds: number;
  allowanceRemainingPence: number;
  allowanceRemainingPounds: number;

  // Total available amount out of £22
  totalAvailablePence: number;
  totalAvailablePounds: number;

  // Over maximum £22 allowance
  isOverMaxAllowance: boolean;
  overMaxPence: number;
  overMaxPounds: number;

  budgetStatusCategory: BudgetStatusCategory;
  budgetStatusMessage: string;
}

export interface GroceryCycle extends CycleBudgetBreakdown {
  id: string;
  cycleIndex: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (startDate + 6 days, e.g. 9 Nov to 15 Nov)
  expectedNextShoppingDate: string; // YYYY-MM-DD (startDate + 7 days, e.g. 16 Nov)
  actualNextShoppingDate: string | null; // YYYY-MM-DD if closed, null if active
  isActive: boolean;
  
  mainPurchases: PurchaseRecord[];
  topUpPurchases: PurchaseRecord[];
  allPurchases: PurchaseRecord[];
  mainSpendingPounds: number;
  topUpSpendingPounds: number;

  // Days & Timing
  daysElapsed: number; // Days elapsed since startDate
  daysRemaining: number; // Days until expectedNextShoppingDate (0 if overdue or closed)
  daysOverdue: number; // Days past expectedNextShoppingDate (0 if not overdue)
  extraDaysMaintained: number; // Days grocery lasted beyond standard 7 days
  totalDays: number; // Total days maintained in this cycle
  averageDailySpendingPounds: number;
  efficiencyMessage: string;

  // Continuous savings / deficit carry-forward (relative to £20 base budget)
  netPence: number; // baseBudgetPence - spendingPence
}

export type CumulativeBalanceStatus = 'savings' | 'deficit' | 'balanced';

export interface GroceryCycleSummary {
  activeCycle: GroceryCycle | null;
  closedCycles: GroceryCycle[];
  allCycles: GroceryCycle[];
  unclassifiedPurchases: PurchaseRecord[];

  baseBudgetPounds: number;
  extraAllowancePounds: number;
  maxBudgetPounds: number;

  // Extra days saved from previous closed cycles
  totalPreviousExtraDaysSaved: number;

  // Previous cycles cumulative balance
  previousCumulativePence: number;
  previousCumulativePounds: number;
  previousCumulativeStatus: CumulativeBalanceStatus;

  // Current cycle net balance (relative to £20 base budget)
  currentCycleNetPence: number;
  currentCycleNetPounds: number;

  // Overall cumulative balance (previous + current)
  overallCumulativePence: number;
  overallCumulativePounds: number;
  overallCumulativeStatus: CumulativeBalanceStatus;

  londonToday: string;
}

/**
 * Adds an integer number of days to a YYYY-MM-DD string,
 * strictly operating at UTC midnight to eliminate timezone drift.
 */
export function addDaysToYMD(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(num => parseInt(num, 10));
  const utcDate = new Date(Date.UTC(y, m - 1, d + days));
  const newY = utcDate.getUTCFullYear();
  const newM = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const newD = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${newY}-${newM}-${newD}`;
}

/**
 * Calculates the exact integer day difference between two YYYY-MM-DD dates (b - a).
 * If b > a, returns positive integer.
 */
export function daysBetweenYMD(startYMD: string, endYMD: string): number {
  const [y1, m1, d1] = startYMD.split('-').map(num => parseInt(num, 10));
  const [y2, m2, d2] = endYMD.split('-').map(num => parseInt(num, 10));
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((t2 - t1) / MS_PER_DAY);
}

/**
 * Computes exact £20 base budget + £2 extra allowance breakdown in integer pence.
 *
 * Rules:
 * - Spending up to £20: Within normal budget. Full £2 allowance remains untouched.
 * - Spending between £20 and £22: Base budget exhausted; shows how much of £2 allowance has been used.
 * - Spending above £22: Over maximum allowance; shows clear warning:
 *   "You are £X over your weekly budget, including your £2 extra allowance."
 */
export function computeCycleBudget(
  spendingPence: number,
  baseBudgetPounds: number = BASE_BUDGET_POUNDS,
  extraAllowancePounds: number = EXTRA_ALLOWANCE_POUNDS
): CycleBudgetBreakdown {
  const baseBudgetPence = Math.round(baseBudgetPounds * 100);
  const extraAllowancePence = Math.round(extraAllowancePounds * 100);
  const maxBudgetPence = baseBudgetPence + extraAllowancePence;

  const maxBudgetPounds = penceToPounds(maxBudgetPence);
  const spendingPounds = penceToPounds(spendingPence);

  let baseRemainingPence = 0;
  let isBaseExceeded = false;
  let allowanceUsedPence = 0;
  let allowanceRemainingPence = extraAllowancePence;
  let totalAvailablePence = 0;
  let isOverMaxAllowance = false;
  let overMaxPence = 0;
  let budgetStatusCategory: BudgetStatusCategory = 'within_base';
  let budgetStatusMessage = '';

  if (spendingPence <= baseBudgetPence) {
    // 1. Within normal £20 budget
    baseRemainingPence = baseBudgetPence - spendingPence;
    isBaseExceeded = false;
    allowanceUsedPence = 0;
    allowanceRemainingPence = extraAllowancePence;
    totalAvailablePence = baseRemainingPence + allowanceRemainingPence;
    isOverMaxAllowance = false;
    overMaxPence = 0;
    budgetStatusCategory = 'within_base';

    const baseRemPounds = penceToPounds(baseRemainingPence);
    budgetStatusMessage = `Within normal budget. £${baseRemPounds.toFixed(2)} remaining of £${baseBudgetPounds} base budget.`;
  } else if (spendingPence <= maxBudgetPence) {
    // 2. Spending into £2 extra allowance buffer
    baseRemainingPence = 0;
    isBaseExceeded = true;
    allowanceUsedPence = spendingPence - baseBudgetPence;
    allowanceRemainingPence = maxBudgetPence - spendingPence;
    totalAvailablePence = allowanceRemainingPence;
    isOverMaxAllowance = false;
    overMaxPence = 0;
    budgetStatusCategory = 'using_allowance';

    const usedPounds = penceToPounds(allowanceUsedPence);
    const remPounds = penceToPounds(allowanceRemainingPence);
    budgetStatusMessage = `Using extra allowance: £${usedPounds.toFixed(2)} of £${extraAllowancePounds.toFixed(2)} allowance used (£${remPounds.toFixed(2)} buffer remaining).`;
  } else {
    // 3. Exceeded maximum £22 allowed spending
    baseRemainingPence = 0;
    isBaseExceeded = true;
    allowanceUsedPence = extraAllowancePence;
    allowanceRemainingPence = 0;
    totalAvailablePence = 0;
    isOverMaxAllowance = true;
    overMaxPence = spendingPence - maxBudgetPence;
    budgetStatusCategory = 'over_allowance';

    const overPounds = penceToPounds(overMaxPence);
    budgetStatusMessage = `You are £${overPounds.toFixed(2)} over your weekly budget, including your £${extraAllowancePounds} extra allowance.`;
  }

  return {
    baseBudgetPounds,
    baseBudgetPence,
    extraAllowancePounds,
    extraAllowancePence,
    maxBudgetPounds,
    maxBudgetPence,
    spendingPence,
    spendingPounds,
    baseRemainingPence,
    baseRemainingPounds: penceToPounds(baseRemainingPence),
    isBaseExceeded,
    allowanceUsedPence,
    allowanceUsedPounds: penceToPounds(allowanceUsedPence),
    allowanceRemainingPence,
    allowanceRemainingPounds: penceToPounds(allowanceRemainingPence),
    totalAvailablePence,
    totalAvailablePounds: penceToPounds(totalAvailablePence),
    isOverMaxAllowance,
    overMaxPence,
    overMaxPounds: penceToPounds(overMaxPence),
    budgetStatusCategory,
    budgetStatusMessage,
  };
}

/**
 * Computes all rolling grocery cycles, spending, budget balances, and cumulative
 * savings/deficit carry-forward.
 */
export function computeGroceryCycles(
  purchases: PurchaseRecord[],
  baseBudgetPounds: number = BASE_BUDGET_POUNDS,
  extraAllowancePounds: number = EXTRA_ALLOWANCE_POUNDS,
  referenceDate: Date = new Date()
): GroceryCycleSummary {
  const { ymd: londonToday } = getLondonDateParts(referenceDate);

  const unclassifiedPurchases = purchases.filter(p => !p.purchase_type);

  // Filter main purchases and sort chronologically
  const mainPurchases = purchases
    .filter(p => p.purchase_type === 'main')
    .sort((a, b) => a.purchase_date.localeCompare(b.purchase_date) || a.created_at.localeCompare(b.created_at));

  if (mainPurchases.length === 0) {
    return {
      activeCycle: null,
      closedCycles: [],
      allCycles: [],
      unclassifiedPurchases,
      baseBudgetPounds,
      extraAllowancePounds,
      maxBudgetPounds: baseBudgetPounds + extraAllowancePounds,
      totalPreviousExtraDaysSaved: 0,
      previousCumulativePence: 0,
      previousCumulativePounds: 0,
      previousCumulativeStatus: 'balanced',
      currentCycleNetPence: 0,
      currentCycleNetPounds: 0,
      overallCumulativePence: 0,
      overallCumulativePounds: 0,
      overallCumulativeStatus: 'balanced',
      londonToday,
    };
  }

  // Group unique main purchase dates
  const uniqueMainDates: string[] = [];
  for (const p of mainPurchases) {
    if (!uniqueMainDates.includes(p.purchase_date)) {
      uniqueMainDates.push(p.purchase_date);
    }
  }

  const getPurchasesInInterval = (startDate: string, nextStartDate: string | null): PurchaseRecord[] => {
    return purchases.filter(p => {
      const date = p.purchase_date;
      if (nextStartDate) {
        return date >= startDate && date < nextStartDate;
      }
      return date >= startDate;
    });
  };

  const cycles: GroceryCycle[] = [];

  for (let i = 0; i < uniqueMainDates.length; i++) {
    const startDate = uniqueMainDates[i];
    const isLast = i === uniqueMainDates.length - 1;
    const nextMainDate = isLast ? null : uniqueMainDates[i + 1];
    
    // 7-day cycle runs from startDate to startDate + 6 days
    const endDate = addDaysToYMD(startDate, 6);
    // Next expected shopping date is startDate + 7 days
    const expectedNextShoppingDate = addDaysToYMD(startDate, 7);

    const cyclePurchases = getPurchasesInInterval(startDate, nextMainDate);
    const mainList = cyclePurchases.filter(p => p.purchase_type === 'main');
    const topUpList = cyclePurchases.filter(p => p.purchase_type === 'top_up' || !p.purchase_type);

    const spendingPence = cyclePurchases.reduce(
      (sum, p) => sum + getPurchaseAmountInPence(p.total_amount),
      0
    );
    const mainSpendingPence = mainList.reduce(
      (sum, p) => sum + getPurchaseAmountInPence(p.total_amount),
      0
    );
    const topUpSpendingPence = topUpList.reduce(
      (sum, p) => sum + getPurchaseAmountInPence(p.total_amount),
      0
    );

    const mainSpendingPounds = penceToPounds(mainSpendingPence);
    const topUpSpendingPounds = penceToPounds(topUpSpendingPence);

    // Compute exact budget breakdown
    const budgetInfo = computeCycleBudget(spendingPence, baseBudgetPounds, extraAllowancePounds);

    let totalDays: number;
    let extraDaysMaintained: number;
    let daysElapsed: number;
    let daysRemaining = 0;
    let daysOverdue = 0;
    let efficiencyMessage = '';

    if (!isLast && nextMainDate) {
      // Closed cycle
      totalDays = Math.max(1, daysBetweenYMD(startDate, nextMainDate));
      daysElapsed = totalDays;
      extraDaysMaintained = Math.max(0, totalDays - 7);
      daysRemaining = 0;
      daysOverdue = extraDaysMaintained;

      if (extraDaysMaintained > 0) {
        efficiencyMessage = `Your groceries lasted ${extraDaysMaintained} extra ${extraDaysMaintained === 1 ? 'day' : 'days'}. Great savings!`;
      } else {
        efficiencyMessage = `Groceries lasted standard 7-day cycle.`;
      }
    } else {
      // Active cycle
      daysElapsed = Math.max(0, daysBetweenYMD(startDate, londonToday));
      totalDays = Math.max(1, daysElapsed);

      const diffToExpected = daysBetweenYMD(londonToday, expectedNextShoppingDate);
      if (diffToExpected >= 0) {
        daysRemaining = diffToExpected;
        daysOverdue = 0;
        extraDaysMaintained = 0;
        efficiencyMessage = `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining until next shopping date.`;
      } else {
        daysRemaining = 0;
        daysOverdue = Math.abs(diffToExpected);
        extraDaysMaintained = daysOverdue;
        efficiencyMessage = `Your groceries lasted ${extraDaysMaintained} extra ${extraDaysMaintained === 1 ? 'day' : 'days'}. Great savings!`;
      }
    }

    const averageDailySpendingPounds = penceToPounds(
      Math.round(spendingPence / Math.max(1, totalDays))
    );

    // Net balance relative to £20 base budget (positive = savings, negative = deficit)
    const netPence = budgetInfo.baseBudgetPence - spendingPence;

    cycles.push({
      ...budgetInfo,
      id: `cycle-${startDate}-${i}`,
      cycleIndex: i + 1,
      startDate,
      endDate,
      expectedNextShoppingDate,
      actualNextShoppingDate: nextMainDate,
      isActive: isLast,
      mainPurchases: mainList,
      topUpPurchases: topUpList,
      allPurchases: cyclePurchases,
      mainSpendingPounds,
      topUpSpendingPounds,
      daysElapsed,
      daysRemaining,
      daysOverdue,
      extraDaysMaintained,
      totalDays,
      averageDailySpendingPounds,
      efficiencyMessage,
      netPence,
    });
  }

  const closedCycles = cycles.filter(c => !c.isActive);
  const activeCycle = cycles.find(c => c.isActive) || null;

  const totalPreviousExtraDaysSaved = closedCycles.reduce(
    (sum, c) => sum + c.extraDaysMaintained,
    0
  );

  // Previous cycles cumulative balance
  const previousCumulativePence = closedCycles.reduce(
    (sum, c) => sum + c.netPence,
    0
  );
  const previousCumulativePounds = penceToPounds(Math.abs(previousCumulativePence));
  const previousCumulativeStatus: CumulativeBalanceStatus =
    previousCumulativePence > 0 ? 'savings' : previousCumulativePence < 0 ? 'deficit' : 'balanced';

  // Active cycle net
  const currentCycleNetPence = activeCycle ? activeCycle.netPence : 0;
  const currentCycleNetPounds = penceToPounds(Math.abs(currentCycleNetPence));

  // Overall cumulative balance
  const overallCumulativePence = previousCumulativePence + currentCycleNetPence;
  const overallCumulativePounds = penceToPounds(Math.abs(overallCumulativePence));
  const overallCumulativeStatus: CumulativeBalanceStatus =
    overallCumulativePence > 0 ? 'savings' : overallCumulativePence < 0 ? 'deficit' : 'balanced';

  return {
    activeCycle,
    closedCycles,
    allCycles: cycles,
    unclassifiedPurchases,
    baseBudgetPounds,
    extraAllowancePounds,
    maxBudgetPounds: baseBudgetPounds + extraAllowancePounds,
    totalPreviousExtraDaysSaved,
    previousCumulativePence,
    previousCumulativePounds,
    previousCumulativeStatus,
    currentCycleNetPence,
    currentCycleNetPounds,
    overallCumulativePence,
    overallCumulativePounds,
    overallCumulativeStatus,
    londonToday,
  };
}
