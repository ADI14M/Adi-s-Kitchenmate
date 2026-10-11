import { useEffect, useMemo, useState } from 'react';
import { usePurchaseStore } from '../store/usePurchaseStore';
import {
  computeAnalytics,
  type PeriodComparison,
} from '../lib/analyticsUtils';
import {
  TrendingDown,
  TrendingUp,
  Minus,
  RefreshCw,
  AlertCircle,
  Store,
  Calendar,
  PoundSterling,
  Receipt,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function Analytics() {
  const { purchases, loading, error, fetchPurchases } = usePurchaseStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPurchases();
    setIsRefreshing(false);
  };

  // Compute analytics based on Europe/London calendar boundaries
  const analytics = useMemo(() => {
    return computeAnalytics(purchases);
  }, [purchases]);

  // Color palette for store breakdown segments
  const storeColorClasses = [
    { bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/40' },
    { bar: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400', badge: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/40' },
    { bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', badge: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/40' },
    { bar: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-400', badge: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800/40' },
    { bar: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', badge: 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800/40' },
    { bar: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-400', badge: 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800/40' },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
              <Clock size={12} /> Europe/London
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time spending comparisons and store breakdown
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/80 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RefreshCw
              size={15}
              className={loading || isRefreshing ? 'animate-spin text-primary' : ''}
            />
            <span>{loading || isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <Link
            to="/purchases"
            className="bg-primary text-white px-3.5 py-2 rounded-xl text-sm font-medium shadow-sm hover:bg-primary-dark transition-colors whitespace-nowrap"
          >
            + Record Purchase
          </Link>
        </div>
      </header>

      {/* Explicit Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-800 dark:text-red-200 flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Failed to load purchase records from Supabase</h3>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-800/40 dark:hover:bg-red-800/60 font-medium text-xs rounded-lg transition-colors whitespace-nowrap"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && purchases.length === 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse space-y-3"
              >
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse h-64" />
        </div>
      ) : purchases.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
            <Receipt size={32} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h2 className="text-xl font-bold">No purchase records found</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Record your grocery and store receipts to immediately view historical spending analytics, weekly trends, and store breakdowns.
            </p>
          </div>
          <Link
            to="/purchases"
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm hover:bg-primary-dark transition-colors"
          >
            Record Your First Purchase
          </Link>
        </div>
      ) : (
        /* Populated Analytics Dashboard */
        <div className="space-y-6">
          {/* Top 3 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Total Spending Card */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Total Spending
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <PoundSterling size={18} />
                  </div>
                </div>
                <div className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                  £{analytics.totalSpending.toFixed(2)}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{analytics.totalPurchasesCount} {analytics.totalPurchasesCount === 1 ? 'purchase' : 'purchases'}</span>
                <span>Avg £{analytics.averageOrderValue.toFixed(2)} / purchase</span>
              </div>
            </div>

            {/* 2. This Week vs Last Week Card */}
            <ComparisonStatCard
              title="This Week"
              comparison={analytics.thisWeekVsLastWeek}
              periodType="week"
            />

            {/* 3. This Month vs Last Month Card */}
            <ComparisonStatCard
              title="This Month"
              comparison={analytics.thisMonthVsLastMonth}
              periodType="month"
            />
          </div>

          {/* Deep Dive Comparisons: Side-by-Side Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Week Comparison Detail Card */}
            <ComparisonDetailCard
              title="Weekly Trend Analysis"
              comparison={analytics.thisWeekVsLastWeek}
              periodType="week"
            />

            {/* Month Comparison Detail Card */}
            <ComparisonDetailCard
              title="Monthly Trend Analysis"
              comparison={analytics.thisMonthVsLastMonth}
              periodType="month"
            />
          </div>

          {/* Spending by Store */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Store size={20} className="text-primary" />
                  <h2 className="text-lg font-bold">Spending by Store</h2>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Breakdown across {analytics.storeBreakdown.length} {analytics.storeBreakdown.length === 1 ? 'store' : 'stores'} with recorded purchases
                </p>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Total: <span className="font-semibold text-gray-900 dark:text-gray-100">£{analytics.totalSpending.toFixed(2)}</span>
              </div>
            </div>

            {/* Proportional distribution bar */}
            <div className="w-full h-3 bg-gray-100 dark:bg-gray-700/60 rounded-full overflow-hidden flex shadow-inner">
              {analytics.storeBreakdown.map((item, idx) => {
                const palette = storeColorClasses[idx % storeColorClasses.length];
                return (
                  <div
                    key={item.store}
                    style={{ width: `${item.percentage}%` }}
                    className={`${palette.bar} h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full`}
                    title={`${item.store}: £${item.totalAmount.toFixed(2)} (${item.percentage}%)`}
                  />
                );
              })}
            </div>

            {/* Store List Breakdown */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {analytics.storeBreakdown.map((item, idx) => {
                const palette = storeColorClasses[idx % storeColorClasses.length];
                return (
                  <div
                    key={item.store}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3.5 h-3.5 rounded-full ${palette.bar} flex-shrink-0`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">
                            {item.store}
                          </h3>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${palette.badge} ${palette.text}`}>
                            {item.percentage}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {item.purchaseCount} {item.purchaseCount === 1 ? 'purchase' : 'purchases'} · Avg £{item.averagePerPurchase.toFixed(2)} / trip
                          {item.latestPurchaseDate && (
                            <span> · Last visit {format(new Date(item.latestPurchaseDate), 'd MMM yyyy')}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                      <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
                        £{item.totalAmount.toFixed(2)}
                      </span>
                      <div className="w-24 sm:w-28 bg-gray-100 dark:bg-gray-700/50 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className={`h-full ${palette.bar} rounded-full`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Historical Purchases That Feed Analytics */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-primary" />
                <h2 className="text-base font-bold">Purchase Records Contributing to Analytics</h2>
              </div>
              <Link
                to="/purchases"
                className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
              >
                Manage Purchases <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {purchases.map((purchase) => {
                const dateYMD = purchase.purchase_date;
                let periodBadge = 'Past Purchase';
                let badgeClass = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';

                if (dateYMD >= analytics.thisWeekVsLastWeek.currentRange.start && dateYMD <= analytics.thisWeekVsLastWeek.currentRange.end) {
                  periodBadge = 'This Week';
                  badgeClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40';
                } else if (dateYMD >= analytics.thisWeekVsLastWeek.previousRange.start && dateYMD <= analytics.thisWeekVsLastWeek.previousRange.end) {
                  periodBadge = 'Last Week';
                  badgeClass = 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40';
                } else if (dateYMD >= analytics.thisMonthVsLastMonth.currentRange.start && dateYMD <= analytics.thisMonthVsLastMonth.currentRange.end) {
                  periodBadge = 'This Month';
                  badgeClass = 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40';
                } else if (dateYMD >= analytics.thisMonthVsLastMonth.previousRange.start && dateYMD <= analytics.thisMonthVsLastMonth.previousRange.end) {
                  periodBadge = 'Last Month';
                  badgeClass = 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40';
                }

                return (
                  <div
                    key={purchase.id}
                    className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{purchase.store}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
                          {periodBadge}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {format(new Date(purchase.purchase_date), 'd MMM yyyy')}
                        {purchase.notes && ` · ${purchase.notes}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-base text-gray-900 dark:text-gray-100">
                        £{purchase.total_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Top Metric Card for Week or Month Comparison
 */
function ComparisonStatCard({
  title,
  comparison,
  periodType,
}: {
  title: string;
  comparison: PeriodComparison;
  periodType: 'week' | 'month';
}) {
  const previousLabel = periodType === 'week' ? 'last week' : 'last month';

  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {title}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
            {comparison.currentRange.label}
          </span>
        </div>
        <div className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          £{comparison.currentAmount.toFixed(2)}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60">
        <div className="flex items-center justify-between">
          <ComparisonBadge comparison={comparison} previousLabel={previousLabel} />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Prev: £{comparison.previousAmount.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Render a helpful, accurate comparison badge without NaN or fabricated values
 */
function ComparisonBadge({
  comparison,
  previousLabel,
}: {
  comparison: PeriodComparison;
  previousLabel: string;
}) {
  if (comparison.status === 'increase') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
        <TrendingUp size={12} />
        +{comparison.percentageChange}% (+£{comparison.diffAmount.toFixed(2)})
      </span>
    );
  }

  if (comparison.status === 'decrease') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
        <TrendingDown size={12} />
        {comparison.percentageChange}% (-£{Math.abs(comparison.diffAmount).toFixed(2)})
      </span>
    );
  }

  if (comparison.status === 'equal') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
        <Minus size={12} /> 0% vs {previousLabel}
      </span>
    );
  }

  if (comparison.status === 'new') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
        <Sparkles size={12} /> First active period
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
      <Info size={12} /> No activity
    </span>
  );
}

/**
 * Detailed Comparison Card with visual proportion and itemized purchases
 */
function ComparisonDetailCard({
  title,
  comparison,
  periodType,
}: {
  title: string;
  comparison: PeriodComparison;
  periodType: 'week' | 'month';
}) {
  const currentTitle = periodType === 'week' ? 'This Week' : 'This Month';
  const previousTitle = periodType === 'week' ? 'Last Week' : 'Last Month';

  // Calculate relative proportion for the visual bar
  const totalBoth = comparison.currentAmount + comparison.previousAmount;
  const currentWidthPct = totalBoth > 0 ? (comparison.currentAmount / totalBoth) * 100 : 50;
  const prevWidthPct = totalBoth > 0 ? (comparison.previousAmount / totalBoth) * 100 : 50;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">{title}</h3>
        <ComparisonBadge
          comparison={comparison}
          previousLabel={periodType === 'week' ? 'last week' : 'last month'}
        />
      </div>

      {/* Side-by-Side Values */}
      <div className="grid grid-cols-2 gap-4 bg-gray-50/80 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-100 dark:border-gray-700/60">
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {currentTitle}
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
            £{comparison.currentAmount.toFixed(2)}
          </div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
            {comparison.currentRange.label}
          </div>
          <div className="text-xs text-primary font-medium mt-1">
            {comparison.currentPurchases.length} {comparison.currentPurchases.length === 1 ? 'purchase' : 'purchases'}
          </div>
        </div>

        <div className="border-l border-gray-200 dark:border-gray-700 pl-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {previousTitle}
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
            £{comparison.previousAmount.toFixed(2)}
          </div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
            {comparison.previousRange.label}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
            {comparison.previousPurchases.length} {comparison.previousPurchases.length === 1 ? 'purchase' : 'purchases'}
          </div>
        </div>
      </div>

      {/* Visual Relative Spending Bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
          <span>{currentTitle} ({currentWidthPct.toFixed(0)}%)</span>
          <span>{previousTitle} ({prevWidthPct.toFixed(0)}%)</span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${currentWidthPct}%` }}
            className="bg-primary h-full transition-all duration-500"
            title={`${currentTitle}: £${comparison.currentAmount.toFixed(2)}`}
          />
          <div
            style={{ width: `${prevWidthPct}%` }}
            className="bg-gray-400 dark:bg-gray-500 h-full transition-all duration-500"
            title={`${previousTitle}: £${comparison.previousAmount.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Informative Helper Note if Partial History */}
      {comparison.helperText && (
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/30 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700/50">
          <Info size={13} className="text-gray-400 flex-shrink-0" />
          <span>{comparison.helperText}</span>
        </div>
      )}
    </div>
  );
}
