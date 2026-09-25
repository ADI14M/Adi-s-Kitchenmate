import { useEffect, useState } from 'react';
import { useInventoryStore } from '../store/useInventoryStore';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 21) return "Good Evening";
  return "Good Night";
}

export default function Dashboard() {
  const { items, fetchItems, loading } = useInventoryStore();
  const [greeting, setGreeting] = useState(getGreeting());

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    // Lightweight interval to check if greeting should update (every 1 minute)
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-2xl font-bold uppercase tracking-tight text-gray-500 dark:text-gray-400">
          {greeting}, Adi 👋
        </h1>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Placeholders for widgets */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">Kitchen Stock</h2>
          <p className="text-3xl font-bold">
            {loading ? (
              <span className="animate-pulse text-gray-300 dark:text-gray-600">...</span>
            ) : (
              items.length
            )}
          </p>
          <p className="text-sm text-gray-500 mt-2">Total items</p>
        </div>
      </div>
    </div>
  );
}
