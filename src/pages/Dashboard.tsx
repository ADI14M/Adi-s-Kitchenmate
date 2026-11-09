import { useEffect, useState, useMemo } from 'react';
import { useInventoryStore } from '../store/useInventoryStore';
import { usePurchaseStore } from '../store/usePurchaseStore';
import { computeGroceryCycles } from '../lib/groceryCycleUtils.ts';
import { Link } from 'react-router-dom';
import { ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
    return computeGroceryCycles(purchases);
  }, [purchases]);

  const { activeCycle, overallCumulativePounds, overallCumulativeStatus } = grocerySummary;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-2xl font-bold uppercase tracking-tight text-gray-500 dark:text-gray-400">
          {greeting}, Adi 👋
        </h1>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <span>Total pantry items</span>
            <Link to="/inventory" className="text-primary font-medium hover:underline flex items-center gap-1">
              View Pantry <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Rolling Grocery Cycle Widget */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-semibold text-gray-700 dark:text-gray-200">Grocery Cycle</h2>
              {activeCycle && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeCycle.extraDaysMaintained > 0
                    ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                }`}>
                  {activeCycle.extraDaysMaintained > 0 ? `+${activeCycle.extraDaysMaintained} Extra Days` : `${activeCycle.daysRemaining}d left`}
                </span>
              )}
            </div>

            {purchLoading ? (
              <p className="text-3xl font-bold animate-pulse text-gray-300 dark:text-gray-600">...</p>
            ) : activeCycle ? (
              <div className="space-y-2 mt-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">£{activeCycle.spendingPounds.toFixed(2)}</span>
                  <span className="text-xs text-gray-500">/ £{activeCycle.budgetPounds.toFixed(2)}</span>
                </div>
                <div className="text-xs">
                  {activeCycle.isOverBudget ? (
                    <span className="text-red-500 font-semibold flex items-center gap-1">
                      <AlertTriangle size={12} /> £{activeCycle.overBudgetPounds.toFixed(2)} over budget
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> £{activeCycle.remainingBudgetPounds.toFixed(2)} remaining
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-2 text-xs text-gray-500">
                <p>No active cycle yet.</p>
                <p className="text-[11px] mt-0.5 text-gray-400">Record a Main Grocery Shopping to start tracking.</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex justify-between items-center text-xs text-gray-500">
            <span>
              {activeCycle ? `Due ${format(new Date(activeCycle.expectedNextShoppingDate), 'd MMM')}` : 'Rolling 7-day budget'}
            </span>
            <Link to="/analytics" className="text-primary font-medium hover:underline flex items-center gap-1">
              Tracker <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Cumulative Savings / Deficit Balance Widget */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-semibold text-gray-700 dark:text-gray-200">Budget Balance</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                overallCumulativeStatus === 'savings'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : overallCumulativeStatus === 'deficit'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
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
                Continuous rolling carry-forward
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
