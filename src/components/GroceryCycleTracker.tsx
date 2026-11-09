import { useMemo, useState } from 'react';
import type { PurchaseRecord } from '../store/usePurchaseStore';
import { usePurchaseStore } from '../store/usePurchaseStore';
import {
  computeGroceryCycles,
} from '../lib/groceryCycleUtils.ts';
import {
  Calendar,
  AlertTriangle,
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  CheckCircle2,
  History,
  ShoppingBag,
  ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';

interface GroceryCycleTrackerProps {
  purchases: PurchaseRecord[];
}

export default function GroceryCycleTracker({ purchases }: GroceryCycleTrackerProps) {
  const { classifyPurchase } = usePurchaseStore();
  const [showHistory, setShowHistory] = useState(false);
  const [showUnclassified, setShowUnclassified] = useState(false);

  const summary = useMemo(() => {
    return computeGroceryCycles(purchases, 20, 2);
  }, [purchases]);

  const {
    activeCycle,
    closedCycles,
    unclassifiedPurchases,
    baseBudgetPounds,
    extraAllowancePounds,
    maxBudgetPounds,
    totalPreviousExtraDaysSaved,
    previousCumulativePounds,
    previousCumulativeStatus,
    previousCumulativePence,
    currentCycleNetPounds,
    currentCycleNetPence,
    overallCumulativePounds,
    overallCumulativeStatus,
  } = summary;

  // If no main purchase has been recorded at all
  if (!activeCycle && closedCycles.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold">Rolling Grocery Cycle & Budget Tracker</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Automatically resets every 7 days from your Weekly Grocery Shopping with £{baseBudgetPounds} base budget + £{extraAllowancePounds} extra allowance buffer
            </p>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-100 dark:border-gray-700/60 text-sm text-gray-600 dark:text-gray-300">
          <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
            No grocery cycle started yet
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            When you record your shopping, select <strong>Weekly Grocery Shopping</strong> to start your rolling 7-day grocery cycle. Any <strong>Small Top-Up Shopping</strong> will count towards your £{baseBudgetPounds} + £{extraAllowancePounds} budget without resetting your next shopping due date.
          </p>
        </div>

        {unclassifiedPurchases.length > 0 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Tag size={13} /> {unclassifiedPurchases.length} unclassified historical {unclassifiedPurchases.length === 1 ? 'purchase' : 'purchases'}
              </span>
              <button
                onClick={() => setShowUnclassified(!showUnclassified)}
                className="text-xs text-amber-800 dark:text-amber-300 font-bold hover:underline"
              >
                {showUnclassified ? 'Hide' : 'Review & Classify'}
              </button>
            </div>
            {showUnclassified && (
              <div className="divide-y divide-amber-200/60 dark:divide-amber-800/40 pt-2">
                {unclassifiedPurchases.map(p => (
                  <div key={p.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{p.store}</span>
                      <span className="text-gray-500 ml-2">£{p.total_amount.toFixed(2)} on {p.purchase_date}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => classifyPurchase(p.id, 'main')}
                        className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-semibold text-[11px]"
                      >
                        Weekly Shop
                      </button>
                      <button
                        onClick={() => classifyPurchase(p.id, 'top_up')}
                        className="px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-semibold text-[11px]"
                      >
                        Top-Up
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const cycle = activeCycle!;

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-700/60">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Rolling Grocery Cycle & Budget
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                Active Cycle #{cycle.cycleIndex}
              </span>
              {totalPreviousExtraDaysSaved > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40 flex items-center gap-1">
                  <Award size={11} /> {totalPreviousExtraDaysSaved} extra days saved previously
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Cycle started <strong>{format(new Date(cycle.startDate), 'd MMMM yyyy')}</strong> · Next shopping due <strong>{format(new Date(cycle.expectedNextShoppingDate), 'd MMMM yyyy')}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 font-medium border border-gray-200/60 dark:border-gray-700">
              Base: <strong>£{baseBudgetPounds}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-800/40">
              Buffer: <strong>+£{extraAllowancePounds}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/40">
              Max: <strong>£{maxBudgetPounds}</strong>
            </span>
          </div>
        </div>

        {/* Celebratory Achievement Banner if Groceries Lasted Extra Days */}
        {cycle.extraDaysMaintained > 0 && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/10 border border-teal-500/20 text-teal-900 dark:text-teal-200 flex items-start gap-3 shadow-sm animate-in fade-in duration-300">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
              <Award size={20} />
            </div>
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">Grocery Efficiency Achievement</h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.2 rounded-full bg-teal-200/80 text-teal-900 dark:bg-teal-900/60 dark:text-teal-200">
                  <Sparkles size={10} /> +{cycle.extraDaysMaintained} {cycle.extraDaysMaintained === 1 ? 'day' : 'days'}
                </span>
              </div>
              <p className="text-xs text-teal-800 dark:text-teal-300 leading-relaxed">
                <strong>Your groceries lasted {cycle.extraDaysMaintained} extra {cycle.extraDaysMaintained === 1 ? 'day' : 'days'}. Great savings!</strong> Your food supply has lasted {cycle.totalDays} days at an average of £{cycle.averageDailySpendingPounds.toFixed(2)}/day.
              </p>
            </div>
          </div>
        )}

        {/* 3 Core Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Cycle Spending & £20 + £2 Allowance Breakdown */}
          <div className="bg-gray-50/80 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-100 dark:border-gray-700/60 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Cycle Spending
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  cycle.budgetStatusCategory === 'over_allowance'
                    ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800/40'
                    : cycle.budgetStatusCategory === 'using_allowance'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                }`}>
                  {cycle.budgetStatusCategory === 'over_allowance' ? 'Over Max Allowance' : cycle.budgetStatusCategory === 'using_allowance' ? 'Buffer Active' : 'Within Budget'}
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                  £{cycle.spendingPounds.toFixed(2)}
                </span>
                <span className="text-xs text-gray-500">/ £{cycle.baseBudgetPounds.toFixed(2)} base</span>
              </div>

              {/* Multi-segment progress bar (£20 base + £2 buffer) */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden mt-3 flex">
                <div
                  className={`h-full transition-all duration-500 ${cycle.isBaseExceeded ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, (Math.min(cycle.spendingPounds, 20) / 22) * 100)}%` }}
                />
                {cycle.allowanceUsedPence > 0 && (
                  <div
                    className="bg-amber-400 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (cycle.allowanceUsedPounds / 22) * 100)}%` }}
                  />
                )}
                {cycle.isOverMaxAllowance && (
                  <div className="bg-red-500 h-full transition-all duration-500" style={{ width: '10%' }} />
                )}
              </div>

              {/* Status Message */}
              <div className="mt-3 text-xs">
                {cycle.budgetStatusCategory === 'within_base' && (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={13} /> £{cycle.baseRemainingPounds.toFixed(2)} remaining of £{cycle.baseBudgetPounds} base budget.
                  </span>
                )}
                {cycle.budgetStatusCategory === 'using_allowance' && (
                  <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <ShieldCheck size={13} /> £{cycle.allowanceUsedPounds.toFixed(2)} of £{cycle.extraAllowancePounds.toFixed(2)} extra allowance used (£{cycle.allowanceRemainingPounds.toFixed(2)} remaining).
                  </span>
                )}
                {cycle.budgetStatusCategory === 'over_allowance' && (
                  <span className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertTriangle size={13} /> You are £{cycle.overMaxPounds.toFixed(2)} over your weekly budget, including your £{cycle.extraAllowancePounds} extra allowance.
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-gray-700/60 flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span>Main: £{cycle.mainSpendingPounds.toFixed(2)}</span>
              <span>Top-ups: £{cycle.topUpSpendingPounds.toFixed(2)}</span>
            </div>
          </div>

          {/* Card 2: Cumulative Balance (Continuous Carry-Forward) */}
          <div className="bg-gray-50/80 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-100 dark:border-gray-700/60 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Cumulative Balance
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  overallCumulativeStatus === 'savings'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                    : overallCumulativeStatus === 'deficit'
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {overallCumulativeStatus === 'savings' ? 'Cumulative Savings' : overallCumulativeStatus === 'deficit' ? 'Cumulative Deficit' : 'Balanced'}
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-2">
                <span className={`text-2xl font-bold tracking-tight ${
                  overallCumulativeStatus === 'savings'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : overallCumulativeStatus === 'deficit'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {overallCumulativeStatus === 'savings' ? '+' : overallCumulativeStatus === 'deficit' ? '-' : ''}£{overallCumulativePounds.toFixed(2)}
                </span>
              </div>

              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 leading-snug">
                Continuous rolling carry-forward across all grocery cycles.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-gray-700/60 space-y-1 text-[11px]">
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Previous Cycles:</span>
                <span className={`font-semibold ${previousCumulativePence >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {previousCumulativePence >= 0 ? '+' : '-'}£{previousCumulativePounds.toFixed(2)} {previousCumulativeStatus}
                </span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Current Cycle:</span>
                <span className={`font-semibold ${currentCycleNetPence >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {currentCycleNetPence >= 0 ? '+' : '-'}£{currentCycleNetPounds.toFixed(2)} {currentCycleNetPence >= 0 ? 'savings' : 'deficit'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Timing & Days Elapsed / Remaining */}
          <div className="bg-gray-50/80 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-100 dark:border-gray-700/60 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Timing & Days
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  cycle.daysOverdue > 0
                    ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40'
                }`}>
                  {cycle.daysOverdue > 0 ? `+${cycle.daysOverdue} Extra Days` : `${cycle.daysRemaining} Days Left`}
                </span>
              </div>

              <div className="mt-2 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Cycle Start Date:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {format(new Date(cycle.startDate), 'dd MMM yyyy')}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Expected Next Shop:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {format(new Date(cycle.expectedNextShoppingDate), 'dd MMM yyyy')}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Days Elapsed:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {cycle.daysElapsed} {cycle.daysElapsed === 1 ? 'day' : 'days'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-gray-700/60 flex justify-between items-center text-[11px] text-gray-500 dark:text-gray-400">
              <span>Avg Daily Expenditure:</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                £{cycle.averageDailySpendingPounds.toFixed(2)} / day
              </span>
            </div>
          </div>
        </div>

        {/* Purchases in Active Cycle */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
              <Calendar size={15} className="text-primary" />
              Purchases in Active Cycle ({cycle.allPurchases.length})
            </h3>
            <span className="text-xs text-gray-500">
              Total: £{cycle.spendingPounds.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {cycle.allPurchases.map(p => (
              <div 
                key={p.id}
                className="p-3 rounded-xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">{p.store}</span>
                    {p.purchase_type === 'main' ? (
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                        Weekly Shop
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                        Top-Up
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {format(new Date(p.purchase_date), 'd MMM yyyy')}
                  </p>
                </div>
                <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                  £{p.total_amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Unclassified purchases notice if any */}
        {unclassifiedPurchases.length > 0 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Tag size={13} /> {unclassifiedPurchases.length} unclassified historical {unclassifiedPurchases.length === 1 ? 'purchase' : 'purchases'}
              </span>
              <button
                onClick={() => setShowUnclassified(!showUnclassified)}
                className="text-xs text-amber-800 dark:text-amber-300 font-bold hover:underline"
              >
                {showUnclassified ? 'Hide' : 'Review & Classify'}
              </button>
            </div>
            {showUnclassified && (
              <div className="divide-y divide-amber-200/60 dark:divide-amber-800/40 pt-2">
                {unclassifiedPurchases.map(p => (
                  <div key={p.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{p.store}</span>
                      <span className="text-gray-500 ml-2">£{p.total_amount.toFixed(2)} on {p.purchase_date}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => classifyPurchase(p.id, 'main')}
                        className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-semibold text-[11px]"
                      >
                        Weekly Shop
                      </button>
                      <button
                        onClick={() => classifyPurchase(p.id, 'top_up')}
                        className="px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-semibold text-[11px]"
                      >
                        Top-Up
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Closed Cycles History Accordion */}
        {closedCycles.length > 0 && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center justify-between w-full text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 py-1"
            >
              <span className="flex items-center gap-1.5">
                <History size={14} className="text-primary" />
                Previous Closed Grocery Cycles ({closedCycles.length})
              </span>
              {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showHistory && (
              <div className="mt-3 space-y-3">
                {closedCycles.slice().reverse().map(c => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/60 dark:bg-gray-800/50 space-y-2 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-gray-100">
                          Cycle #{c.cycleIndex}: {format(new Date(c.startDate), 'd MMM')} – {c.actualNextShoppingDate ? format(new Date(c.actualNextShoppingDate), 'd MMM yyyy') : ''}
                        </span>
                        {c.extraDaysMaintained > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.2 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40">
                            +{c.extraDaysMaintained} extra days
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-gray-100">
                          £{c.spendingPounds.toFixed(2)} spent
                        </span>
                        <span className={`font-semibold px-2 py-0.2 rounded text-[11px] ${
                          c.netPence >= 0 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' 
                            : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                        }`}>
                          {c.netPence >= 0 ? `+£${c.baseRemainingPounds.toFixed(2)} savings` : `-£${c.allowanceUsedPounds.toFixed(2)} deficit`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200/50 dark:border-gray-700/50">
                      <span>{c.efficiencyMessage} ({c.totalDays} days maintained)</span>
                      <span>{c.allPurchases.length} {c.allPurchases.length === 1 ? 'purchase' : 'purchases'} (Avg £{c.averageDailySpendingPounds.toFixed(2)}/day)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
