import { useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import type { Theme } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';
import { Moon, Sun, Monitor, LogOut, Download, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { theme, setTheme, currency, setCurrency } = useSettingsStore();
  const { session, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const [inv, shop, pur] = await Promise.all([
        supabase.from('inventory_items').select('*'),
        supabase.from('shopping_items').select('*'),
        supabase.from('purchases').select('*, purchase_items(*)')
      ]);

      const data = {
        exportDate: new Date().toISOString(),
        user: user.email,
        inventory: inv.data,
        shoppingList: shop.data,
        purchases: pur.data
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kitchenmate-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const ThemeOption = ({ value, icon: Icon, label }: { value: Theme, icon: any, label: string }) => {
    const isActive = theme === value;
    return (
      <button
        onClick={() => setTheme(value)}
        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
          isActive 
            ? 'border-primary bg-primary/5 dark:bg-primary/10 text-primary' 
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
      >
        <Icon size={24} />
        <span className="font-semibold text-sm">{label}</span>
      </button>
    );
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </header>

      <div className="space-y-8">
        {/* Appearance */}
        <section>
          <h2 className="text-lg font-bold mb-3">Appearance</h2>
          <div className="grid grid-cols-3 gap-3">
            <ThemeOption value="light" icon={Sun} label="Light" />
            <ThemeOption value="dark" icon={Moon} label="Dark" />
            <ThemeOption value="system" icon={Monitor} label="System" />
          </div>
        </section>

        {/* Preferences */}
        <section>
          <h2 className="text-lg font-bold mb-3">Preferences</h2>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 flex justify-between items-center border-b border-gray-100 dark:border-gray-700">
              <div>
                <p className="font-semibold">Currency</p>
                <p className="text-sm text-gray-500">Used for purchases and analytics</p>
              </div>
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 font-medium"
              >
                <option value="GBP">GBP (£)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div className="p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">Timezone</p>
                <p className="text-sm text-gray-500">Europe/London</p>
              </div>
            </div>
          </div>
        </section>

        {/* Data */}
        <section>
          <h2 className="text-lg font-bold mb-3">Data</h2>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <button 
              onClick={handleExportData}
              disabled={exporting}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
            >
              <div>
                <p className="font-semibold">Export Data</p>
                <p className="text-sm text-gray-500">Download a JSON backup of your data</p>
              </div>
              <div className="text-primary bg-primary/10 p-2 rounded-full">
                {exported ? <Check size={20} /> : <Download size={20} />}
              </div>
            </button>
          </div>
        </section>

        {/* Account */}
        <section>
          <h2 className="text-lg font-bold mb-3">Account</h2>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500">Signed in as</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{session?.user?.email}</p>
            </div>
            <button 
              onClick={handleSignOut}
              className="w-full p-4 flex items-center justify-between text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors font-semibold"
            >
              Sign Out
              <LogOut size={20} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
