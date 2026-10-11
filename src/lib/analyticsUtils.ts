import type { PurchaseRecord } from '../store/usePurchaseStore';

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  label: string; // e.g. "5 Oct – 11 Oct 2026"
}

export type ComparisonStatus = 'increase' | 'decrease' | 'equal' | 'new' | 'none';

export interface PeriodComparison {
  currentAmount: number;
  previousAmount: number;
  diffAmount: number;
  percentageChange: number | null;
  status: ComparisonStatus;
  helperText?: string;
  currentRange: DateRange;
  previousRange: DateRange;
  currentPurchases: PurchaseRecord[];
  previousPurchases: PurchaseRecord[];
}

export interface StoreSpending {
  store: string;
  totalAmount: number;
  percentage: number;
  purchaseCount: number;
  averagePerPurchase: number;
  latestPurchaseDate: string;
}

export interface AnalyticsSummary {
  totalSpending: number;
  totalPurchasesCount: number;
  averageOrderValue: number;
  thisWeekVsLastWeek: PeriodComparison;
  thisMonthVsLastMonth: PeriodComparison;
  storeBreakdown: StoreSpending[];
  londonToday: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Converts a monetary purchase total into exact integer pence using
 * the application's established purchase-total rounding rule (matching
 * Number(total_amount).toFixed(2) as displayed on the Purchases page).
 *
 * This prevents discrepancies between the sum of displayed purchase totals
 * and aggregated analytics caused by unrounded fractions or floating-point errors.
 */
export function getPurchaseAmountInPence(val: number | string | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) return 0;

  // Use toFixed(2) to align exactly with individual purchase card display
  const fixedStr = num.toFixed(2);
  const [whole, dec = '00'] = fixedStr.split('.');
  const wholeInt = parseInt(whole, 10) || 0;
  const decInt = parseInt(dec.padEnd(2, '0').slice(0, 2), 10) || 0;
  const sign = wholeInt < 0 || fixedStr.startsWith('-') ? -1 : 1;

  return sign * (Math.abs(wholeInt) * 100 + decInt);
}

/**
 * Converts integer pence to a 2-decimal GBP pounds value.
 */
export function penceToPounds(pence: number): number {
  return Math.round(pence) / 100;
}

/**
 * Extracts the calendar date parts in the Europe/London timezone.
 */
export function getLondonDateParts(date: Date = new Date()): { year: number; month: number; day: number; ymd: string } {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  let year = date.getUTCFullYear();
  let month = date.getUTCMonth() + 1;
  let day = date.getUTCDate();

  for (const part of parts) {
    if (part.type === 'year') year = parseInt(part.value, 10);
    if (part.type === 'month') month = parseInt(part.value, 10);
    if (part.type === 'day') day = parseInt(part.value, 10);
  }

  const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { year, month, day, ymd };
}

function toYMD(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDayMonth(d: Date): string {
  const day = d.getUTCDate();
  const m = MONTH_SHORT_NAMES[d.getUTCMonth()];
  return `${day} ${m}`;
}

function formatDayMonthYear(d: Date): string {
  const day = d.getUTCDate();
  const m = MONTH_SHORT_NAMES[d.getUTCMonth()];
  const y = d.getUTCFullYear();
  return `${day} ${m} ${y}`;
}

export function getLondonCalendarRanges(referenceDate: Date = new Date()): {
  londonToday: string;
  thisWeek: DateRange;
  lastWeek: DateRange;
  thisMonth: DateRange;
  lastMonth: DateRange;
} {
  const { year, month, day, ymd } = getLondonDateParts(referenceDate);

  // UTC Date representing midnight on the London calendar day
  const curDate = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = curDate.getUTCDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  // In Europe/London (ISO 8601), week starts on Monday (1) and ends on Sunday (0)
  const daysSinceMonday = (dayOfWeek + 6) % 7;

  // This Week (Mon - Sun)
  const thisWeekStart = new Date(Date.UTC(year, month - 1, day - daysSinceMonday));
  const thisWeekEnd = new Date(Date.UTC(year, month - 1, day - daysSinceMonday + 6));

  // Last Week (Mon - Sun)
  const lastWeekStart = new Date(Date.UTC(year, month - 1, day - daysSinceMonday - 7));
  const lastWeekEnd = new Date(Date.UTC(year, month - 1, day - daysSinceMonday - 1));

  // This Month (1st to last day of current calendar month)
  const thisMonthStart = new Date(Date.UTC(year, month - 1, 1));
  const thisMonthEnd = new Date(Date.UTC(year, month, 0));

  // Last Month (1st to last day of previous calendar month)
  const lastMonthStart = new Date(Date.UTC(year, month - 2, 1));
  const lastMonthEnd = new Date(Date.UTC(year, month - 1, 0));

  return {
    londonToday: ymd,
    thisWeek: {
      start: toYMD(thisWeekStart),
      end: toYMD(thisWeekEnd),
      label: `${formatDayMonth(thisWeekStart)} – ${formatDayMonthYear(thisWeekEnd)}`,
    },
    lastWeek: {
      start: toYMD(lastWeekStart),
      end: toYMD(lastWeekEnd),
      label: `${formatDayMonth(lastWeekStart)} – ${formatDayMonthYear(lastWeekEnd)}`,
    },
    thisMonth: {
      start: toYMD(thisMonthStart),
      end: toYMD(thisMonthEnd),
      label: `${MONTH_NAMES[thisMonthStart.getUTCMonth()]} ${thisMonthStart.getUTCFullYear()}`,
    },
    lastMonth: {
      start: toYMD(lastMonthStart),
      end: toYMD(lastMonthEnd),
      label: `${MONTH_NAMES[lastMonthStart.getUTCMonth()]} ${lastMonthStart.getUTCFullYear()}`,
    },
  };
}

function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function calculatePeriodComparison(
  currentPurchases: PurchaseRecord[],
  previousPurchases: PurchaseRecord[],
  currentRange: DateRange,
  previousRange: DateRange
): PeriodComparison {
  const currentPence = currentPurchases.reduce(
    (acc, p) => acc + getPurchaseAmountInPence(p.total_amount),
    0
  );
  const previousPence = previousPurchases.reduce(
    (acc, p) => acc + getPurchaseAmountInPence(p.total_amount),
    0
  );

  const currentAmount = penceToPounds(currentPence);
  const previousAmount = penceToPounds(previousPence);
  const diffPence = currentPence - previousPence;
  const diffAmount = penceToPounds(diffPence);

  let percentageChange: number | null = null;
  let status: ComparisonStatus = 'none';
  let helperText: string | undefined;

  if (previousPence > 0) {
    percentageChange = roundToTwo((diffPence / previousPence) * 100);
    if (diffPence > 0) {
      status = 'increase';
    } else if (diffPence < 0) {
      status = 'decrease';
    } else {
      status = 'equal';
      helperText = 'Same spending as previous period';
    }
  } else if (previousPence === 0 && currentPence > 0) {
    status = 'new';
    helperText = 'No spending recorded in previous period';
  } else if (previousPence === 0 && currentPence === 0) {
    status = 'none';
    helperText = 'No spending recorded in either period';
  }

  return {
    currentAmount,
    previousAmount,
    diffAmount,
    percentageChange,
    status,
    helperText,
    currentRange,
    previousRange,
    currentPurchases,
    previousPurchases,
  };
}

export function computeAnalytics(
  purchases: PurchaseRecord[],
  referenceDate: Date = new Date()
): AnalyticsSummary {
  const ranges = getLondonCalendarRanges(referenceDate);

  // Total Spending in integer pence
  const totalSpendingPence = purchases.reduce(
    (acc, p) => acc + getPurchaseAmountInPence(p.total_amount),
    0
  );
  const totalSpending = penceToPounds(totalSpendingPence);
  const totalPurchasesCount = purchases.length;
  const averageOrderValue =
    totalPurchasesCount > 0
      ? penceToPounds(Math.round(totalSpendingPence / totalPurchasesCount))
      : 0;

  // Filter purchases for week comparison
  const thisWeekPurchases = purchases.filter(
    (p) => p.purchase_date >= ranges.thisWeek.start && p.purchase_date <= ranges.thisWeek.end
  );
  const lastWeekPurchases = purchases.filter(
    (p) => p.purchase_date >= ranges.lastWeek.start && p.purchase_date <= ranges.lastWeek.end
  );

  const thisWeekVsLastWeek = calculatePeriodComparison(
    thisWeekPurchases,
    lastWeekPurchases,
    ranges.thisWeek,
    ranges.lastWeek
  );

  // Filter purchases for month comparison
  const thisMonthPurchases = purchases.filter(
    (p) => p.purchase_date >= ranges.thisMonth.start && p.purchase_date <= ranges.thisMonth.end
  );
  const lastMonthPurchases = purchases.filter(
    (p) => p.purchase_date >= ranges.lastMonth.start && p.purchase_date <= ranges.lastMonth.end
  );

  const thisMonthVsLastMonth = calculatePeriodComparison(
    thisMonthPurchases,
    lastMonthPurchases,
    ranges.thisMonth,
    ranges.lastMonth
  );

  // Store Breakdown using integer pence to guarantee exact sum match
  const storeMap = new Map<string, { totalPence: number; count: number; latestDate: string }>();

  for (const purchase of purchases) {
    const store = (purchase.store || 'Unknown Store').trim();
    const pence = getPurchaseAmountInPence(purchase.total_amount);
    const existing = storeMap.get(store);

    if (existing) {
      existing.totalPence += pence;
      existing.count += 1;
      if (purchase.purchase_date > existing.latestDate) {
        existing.latestDate = purchase.purchase_date;
      }
    } else {
      storeMap.set(store, {
        totalPence: pence,
        count: 1,
        latestDate: purchase.purchase_date || '',
      });
    }
  }

  const storeBreakdown: StoreSpending[] = Array.from(storeMap.entries())
    .map(([store, data]) => {
      const totalAmount = penceToPounds(data.totalPence);
      const percentage =
        totalSpendingPence > 0
          ? roundToTwo((data.totalPence / totalSpendingPence) * 100)
          : 0;
      const avg = penceToPounds(Math.round(data.totalPence / data.count));

      return {
        store,
        totalAmount,
        percentage,
        purchaseCount: data.count,
        averagePerPurchase: avg,
        latestPurchaseDate: data.latestDate,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    totalSpending,
    totalPurchasesCount,
    averageOrderValue,
    thisWeekVsLastWeek,
    thisMonthVsLastMonth,
    storeBreakdown,
    londonToday: ranges.londonToday,
  };
}
