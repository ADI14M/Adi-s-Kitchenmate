import type { PurchaseRecord } from '../store/usePurchaseStore';
import { getPurchaseAmountInPence, penceToPounds, getLondonDateParts } from './analyticsUtils.ts';

export type PurchaseType = 'main' | 'top_up';

export interface GroceryCycle {
  id: string; // usually starts with startDate
  cycleIndex: number;
  startDate: string; // YYYY-MM-DD (date of main purchase)
  expectedNextShoppingDate: string; // YYYY-MM-DD (startDate + 7 days)
  actualNextShoppingDate: string | null; // YYYY-MM-DD if closed, null if active
  isActive: boolean;
  mainPurchases: PurchaseRecord[];
  topUpPurchases: PurchaseRecord[];
  allPurchases: PurchaseRecord[];
  
  // Financials in integer pence & pounds
  spendingPence: number;
  spendingPounds: number;
  mainSpendingPounds: number;
  topUpSpendingPounds: number;
  budgetPence: number;
  budgetPounds: number;
  netPence: number; // budgetPence - spendingPence (positive = savings, negative = deficit)
  remainingBudgetPounds: number;
  overBudgetPounds: number;
  isOverBudget: boolean;
  
  // Grocery Efficiency & Duration
  totalDays: number; // days from startDate to actualNext (or to londonToday if active)
  extraDaysMaintained: number; // max(0, totalDays - 7)
  daysRemaining: number; // days remaining until expectedNextShoppingDate (0 if overdue or closed)
  daysOverdue: number; // days past expectedNextShoppingDate (0 if not overdue or closed)
  averageDailySpendingPounds: number; // spendingPounds / max(1, totalDays)
  
  // Status message
  statusMessage: string;
}

export type CumulativeBalanceStatus = 'savings' | 'deficit' | 'balanced';

export interface GroceryCycleSummary {
  activeCycle: GroceryCycle | null;
  closedCycles: GroceryCycle[];
  allCycles: GroceryCycle[];
  unclassifiedPurchases: PurchaseRecord[];
  
  weeklyBudgetPounds: number;
  weeklyBudgetPence: number;
  
  // Previous cycles carry-forward
  previousCumulativePence: number;
  previousCumulativePounds: number;
  previousCumulativeStatus: CumulativeBalanceStatus;
  
  // Current active cycle balance
  currentCycleNetPence: number;
  currentCycleNetPounds: number;
  
  // Overall cumulative balance (previous + current)
  overallCumulativePence: number;
  overallCumulativePounds: number;
  overallCumulativeStatus: CumulativeBalanceStatus;
  
  londonToday: string;
}

export const DEFAULT_WEEKLY_BUDGET_POUNDS = 20;
export const DEFAULT_WEEKLY_BUDGET_PENCE = 2000;

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
 * Computes all rolling grocery cycles, spending, budget balances, and cumulative
 * savings/deficit carry-forward.
 *
 * Rules:
 * - Only MAIN grocery shopping starts/resets a 7-day cycle.
 * - Next shopping date is automatically calculated as startDate + 7 days.
 * - Top-up shopping adds to the active cycle spending without altering cycle dates.
 * - If shopping occurs after the 7-day mark, extra days are tracked as grocery efficiency.
 * - Budget is £20 (2000 pence).
 * - Underspending becomes savings; overspending becomes deficit.
 * - Cumulative savings/deficits carry forward indefinitely.
 */
export function computeGroceryCycles(
  purchases: PurchaseRecord[],
  budgetPounds: number = DEFAULT_WEEKLY_BUDGET_POUNDS,
  referenceDate: Date = new Date()
): GroceryCycleSummary {
  const { ymd: londonToday } = getLondonDateParts(referenceDate);
  const budgetPence = Math.round(budgetPounds * 100);

  // Separate unclassified purchases
  const unclassifiedPurchases = purchases.filter(p => !p.purchase_type);

  // Filter main purchases and sort chronologically
  const mainPurchases = purchases
    .filter(p => p.purchase_type === 'main')
    .sort((a, b) => a.purchase_date.localeCompare(b.purchase_date) || a.created_at.localeCompare(b.created_at));

  // If there are no main purchases recorded yet, return empty state
  if (mainPurchases.length === 0) {
    return {
      activeCycle: null,
      closedCycles: [],
      allCycles: [],
      unclassifiedPurchases,
      weeklyBudgetPounds: budgetPounds,
      weeklyBudgetPence: budgetPence,
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

  // Group main purchases by date to identify cycle start boundaries.
  // Multiple main purchases on the same calendar day share the same cycle start.
  const uniqueMainDates: string[] = [];
  for (const p of mainPurchases) {
    if (!uniqueMainDates.includes(p.purchase_date)) {
      uniqueMainDates.push(p.purchase_date);
    }
  }

  // Helper to check if a purchase belongs to cycle interval [startDate, nextStartDate)
  // Or [startDate, +inf) for the active cycle
  const getPurchasesInInterval = (startDate: string, nextStartDate: string | null): PurchaseRecord[] => {
    return purchases.filter(p => {
      // Must be classified or top-up/main. If unclassified, we don't automatically classify it as main,
      // but if it falls within the cycle window, we count its spending so the budget stays accurate.
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

    const spendingPounds = penceToPounds(spendingPence);
    const mainSpendingPounds = penceToPounds(mainSpendingPence);
    const topUpSpendingPounds = penceToPounds(topUpSpendingPence);

    const netPence = budgetPence - spendingPence;
    const isOverBudget = netPence < 0;
    const remainingBudgetPounds = isOverBudget ? 0 : penceToPounds(netPence);
    const overBudgetPounds = isOverBudget ? penceToPounds(Math.abs(netPence)) : 0;

    let totalDays: number;
    let extraDaysMaintained: number;
    let daysRemaining = 0;
    let daysOverdue = 0;
    let statusMessage = '';

    if (!isLast && nextMainDate) {
      // Closed cycle
      totalDays = Math.max(1, daysBetweenYMD(startDate, nextMainDate));
      extraDaysMaintained = Math.max(0, totalDays - 7);
      
      if (isOverBudget) {
        statusMessage = `You were £${overBudgetPounds.toFixed(2)} over your £${budgetPounds} weekly budget.`;
      } else {
        statusMessage = `Under budget by £${remainingBudgetPounds.toFixed(2)}.`;
      }

      if (extraDaysMaintained > 0) {
        statusMessage += ` Maintained groceries for ${extraDaysMaintained} extra ${extraDaysMaintained === 1 ? 'day' : 'days'}.`;
      }
    } else {
      // Active cycle
      const daysFromStartToToday = Math.max(0, daysBetweenYMD(startDate, londonToday));
      // Total days so far
      totalDays = Math.max(1, daysFromStartToToday);
      
      const diffToExpected = daysBetweenYMD(londonToday, expectedNextShoppingDate);
      if (diffToExpected >= 0) {
        daysRemaining = diffToExpected;
        daysOverdue = 0;
        extraDaysMaintained = 0;
      } else {
        daysRemaining = 0;
        daysOverdue = Math.abs(diffToExpected);
        extraDaysMaintained = daysOverdue;
      }

      if (isOverBudget) {
        statusMessage = `You are £${overBudgetPounds.toFixed(2)} over your £${budgetPounds} weekly budget.`;
      } else {
        statusMessage = `£${remainingBudgetPounds.toFixed(2)} remaining of your £${budgetPounds} weekly budget.`;
      }

      if (extraDaysMaintained > 0) {
        statusMessage = `Great! You managed to maintain your groceries for ${extraDaysMaintained} extra ${extraDaysMaintained === 1 ? 'day' : 'days'}. ${statusMessage}`;
      }
    }

    const averageDailySpendingPounds = penceToPounds(
      Math.round(spendingPence / Math.max(1, totalDays))
    );

    cycles.push({
      id: `cycle-${startDate}-${i}`,
      cycleIndex: i + 1,
      startDate,
      expectedNextShoppingDate,
      actualNextShoppingDate: nextMainDate,
      isActive: isLast,
      mainPurchases: mainList,
      topUpPurchases: topUpList,
      allPurchases: cyclePurchases,
      spendingPence,
      spendingPounds,
      mainSpendingPounds,
      topUpSpendingPounds,
      budgetPence,
      budgetPounds,
      netPence,
      remainingBudgetPounds,
      overBudgetPounds,
      isOverBudget,
      totalDays,
      extraDaysMaintained,
      daysRemaining,
      daysOverdue,
      averageDailySpendingPounds,
      statusMessage,
    });
  }

  const closedCycles = cycles.filter(c => !c.isActive);
  const activeCycle = cycles.find(c => c.isActive) || null;

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
    weeklyBudgetPounds: budgetPounds,
    weeklyBudgetPence: budgetPence,
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
