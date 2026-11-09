import { useEffect, useState, useMemo } from 'react';
import { useInventoryStore } from '../store/useInventoryStore';
import { usePurchaseStore } from '../store/usePurchaseStore';
import { computeGroceryCycles } from '../lib/groceryCycleUtils.ts';
import { Link } from 'react-router-dom';
import { ArrowRight, AlertTriangle, CheckCircle2, Award, Calendar, Sparkles, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 21) return "Good Evening";
  return "Good Night";
}

export default function Dashboard() {
  const { items, fetchItems, loading: invLoading } = useInventoryStore();
  const { purchases, fetchPurchases, loading: purchLoading } = usePurchaseStore();
  const [greeting, setGreeting] = useState(getGreeting());

  useEffect(() => {
    fetchItems();
    fetchPurchases();
  }, [fetchItems, fetchPurchases]);

  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const grocerySummary = useMemo(() => {
    return computeGroceryCycles(purchases, 20, 2);
  }, [purchases]);

  const { activeCycle, totalPreviousExtraDaysSaved, overallCumulativePounds, overallCumulativeStatus } = grocerySummary;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-gray-500 dark:text-gray-400">
            {greeting}, Adi 👋
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Your personal kitchen stock and rolling grocery shopping cycle
          </p>
        </div>
        <Link
          to="/purchases"
          className="bg-primary text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm hover:bg-primary-dark transition-colors whitespace-nowrap"
        >
          + Record Purchase
        </Link>
      </header>

      {/* Featured: Dedicated 7-Day Rolling Grocery Shopping Cycle Widget */}
      {purchLoading ? (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse h-48" />
      ) : activeCycle ? (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-5">
          {/* Header & Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Calendar size={18} className="text-primary" />
                  Rolling Grocery Cycle #{activeCycle.cycleIndex}
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  activeCycle.extraDaysMaintained > 0
                    ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                }`}>
                  {activeCycle.extraDaysMaintained > 0
                    ? `+${activeCycle.extraDaysMaintained} Extra Days Saved`
                    : `${activeCycle.daysRemaining} days left`}
                </span>
                {totalPreviousExtraDaysSaved > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 flex items-center gap-1">
                    <Award size={11} /> {totalPreviousExtraDaysSaved} extra days saved previously
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Started <strong>{format(new Date(activeCycle.startDate), 'd MMMM yyyy')}</strong> · Next shopping due <strong>{format(new Date(activeCycle.expectedNextShoppingDate), 'd MMMM yyyy')}</strong>
              </p>
            </div>

            <Link
              to="/analytics"
              className="text-xs text-primary font-bold hover:underline flex items-center gap-1 self-start sm:self-center"
            >
              Full Analytics <ArrowRight size={13} />
            </Link>
          </div>

          {/* Efficiency celebration banner if groceries lasted extra days */}
          {activeCycle.extraDaysMaintained > 0 && (
            <div className="p-3.5 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 border border-teal-200 dark:border-teal-800/40 rounded-xl text-teal-900 dark:text-teal-200 text-xs flex items-center gap-2">
              <Sparkles size={16} className="text-teal-600 dark:text-teal-400 flex-shrink-0" />
              <span>
                <strong>Your groceries lasted {activeCycle.extraDaysMaintained} extra {activeCycle.extraDaysMaintained === 1 ? 'day' : 'days'}. Great savings!</strong> Cycle running for {activeCycle.totalDays} days.
              </span>
            </div>
          )}

          {/* 10 Required Dashboard Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            {/* 1. Cycle Spending */}
            <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/60">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Cycle Spending
              </span>
              <p className="text-xl font-bold mt-1 text-gray-900 dark:text-gray-100">
                £{activeCycle.spendingPounds.toFixed(2)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                £{activeCycle.mainSpendingPounds.toFixed(2)} main + £{activeCycle.topUpSpendingPounds.toFixed(2)} top-up
              </p>
            </div>

            {/* 2. Base Budget Remaining */}
            <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/60">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                £20 Base Budget
              </span>
              <p className={`text-xl font-bold mt-1 ${activeCycle.isBaseExceeded ? 'text-gray-400 line-through' : 'text-emerald-600 dark:text-emerald-400'}`}>
                £{activeCycle.baseRemainingPounds.toFixed(2)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {activeCycle.isBaseExceeded ? 'Base budget exhausted' : 'Remaining from £20'}
              </p>
            </div>

            {/* 3. Extra £2 Allowance */}
            <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/60">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                £2 Extra Buffer
              </span>
              <p className={`text-xl font-bold mt-1 ${
                activeCycle.allowanceUsedPence > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
              }`}>
                £{activeCycle.allowanceRemainingPounds.toFixed(2)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {activeCycle.allowanceUsedPence > 0 ? `£${activeCycle.allowanceUsedPounds.toFixed(2)} used` : 'Untouched buffer'}
              </p>
            </div>

            {/* 4. Total Available (out of £22) */}
            <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/60">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Total Available
              </span>
              <p className={`text-xl font-bold mt-1 ${activeCycle.isOverMaxAllowance ? 'text-red-600 dark:text-red-400' : 'text-primary'}`}>
                £{activeCycle.totalAvailablePounds.toFixed(2)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Out of £{activeCycle.maxBudgetPounds.toFixed(2)} maximum
              </p>
            </div>
          </div>

          {/* Budget Status Bar & Cycle Days Elapsed */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-1.5">
                {activeCycle.budgetStatusCategory === 'within_base' && (
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    Within normal budget (£{activeCycle.baseRemainingPounds.toFixed(2)} remaining of £{activeCycle.baseBudgetPounds})
                  </span>
                )}
                {activeCycle.budgetStatusCategory === 'using_allowance' && (
                  <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-amber-500" />
                    Using extra allowance: £{activeCycle.allowanceUsedPounds.toFixed(2)} of £{activeCycle.extraAllowancePounds.toFixed(2)} used (£{activeCycle.allowanceRemainingPounds.toFixed(2)} buffer remaining)
                  </span>
                )}
                {activeCycle.budgetStatusCategory === 'over_allowance' && (
                  <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-red-500" />
                    You are £{activeCycle.overMaxPounds.toFixed(2)} over your weekly budget, including your £{activeCycle.extraAllowancePounds} extra allowance.
                  </span>
                )}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                Cycle Progress: <strong>{activeCycle.daysElapsed} days elapsed</strong> · <strong>{activeCycle.daysRemaining} days remaining</strong>
              </div>
            </div>

            {/* Visual Budget Progress Bar (2 segments: £20 Base + £2 Buffer) */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden flex">
              {/* Portion spent up to £20 */}
              <div
                className={`h-full transition-all duration-500 ${
                  activeCycle.isBaseExceeded ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (Math.min(activeCycle.spendingPounds, 20) / 22) * 100)}%` }}
                title={`Base spent: £${Math.min(activeCycle.spendingPounds, 20).toFixed(2)}`}
              />
              {/* Portion spent into £2 allowance */}
              {activeCycle.allowanceUsedPence > 0 && (
                <div
                  className="bg-amber-400 h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (activeCycle.allowanceUsedPounds / 22) * 100)}%` }}
                  title={`Allowance used: £${activeCycle.allowanceUsedPounds.toFixed(2)}`}
                />
              )}
              {/* Portion over £22 */}
              {activeCycle.isOverMaxAllowance && (
                <div
                  className="bg-red-500 h-full transition-all duration-500"
                  style={{ width: '10%' }}
                  title={`Over maximum: £${activeCycle.overMaxPounds.toFixed(2)}`}
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty cycle state */
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-gray-900 dark:text-gray-100">Rolling Grocery Cycle</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Record a <strong>Weekly Grocery Shop</strong> to start your rolling 7-day cycle and £20 + £2 weekly budget.
            </p>
          </div>
          <Link
            to="/purchases"
            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-dark transition-colors"
          >
            Start Cycle
          </Link>
        </div>
      )}

      {/* Grid: Pantry Stock & Continuous Cumulative Balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kitchen Stock Widget */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
          <div>
            <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">Kitchen Stock</h2>
            <p className="text-3xl font-bold">
              {invLoading ? (
                <span className="animate-pulse text-gray-300 dark:text-gray-600">...</span>
              ) : (
                items.length
              )}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex justify-between items-center text-xs text-gray-500">
            <span>Total tracked pantry items</span>
            <Link to="/inventory" className="text-primary font-medium hover:underline flex items-center gap-1">
              View Pantry <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Continuous Cumulative Balance Widget */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-semibold text-gray-700 dark:text-gray-200">Cumulative Balance</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                overallCumulativeStatus === 'savings'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                  : overallCumulativeStatus === 'deficit'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {overallCumulativeStatus === 'savings' ? 'Cumulative Savings' : overallCumulativeStatus === 'deficit' ? 'Cumulative Deficit' : 'Balanced'}
              </span>
            </div>

            <div className="mt-1">
              <span className={`text-3xl font-bold ${
                overallCumulativeStatus === 'savings'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : overallCumulativeStatus === 'deficit'
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                {overallCumulativeStatus === 'savings' ? '+' : overallCumulativeStatus === 'deficit' ? '-' : ''}£{overallCumulativePounds.toFixed(2)}
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Continuous rolling carry-forward from past grocery cycles
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex justify-between items-center text-xs text-gray-500">
            <span>£20 weekly target</span>
            <Link to="/analytics" className="text-primary font-medium hover:underline flex items-center gap-1">
              Details <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
