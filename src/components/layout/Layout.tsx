import { Outlet, NavLink } from 'react-router-dom';
import { Home, List, ShoppingCart, Receipt, BarChart3, Menu } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/inventory', label: 'Inventory', icon: List },
    { to: '/shopping', label: 'Shopping', icon: ShoppingCart },
    { to: '/purchases', label: 'Purchases', icon: Receipt },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/more', label: 'More', icon: Menu },
  ];

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark text-gray-900 dark:text-gray-100 flex pb-16 md:pb-0">
      
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col w-64 border-r border-gray-200 dark:border-gray-800 bg-surface dark:bg-surface-dark fixed inset-y-0 z-20`}>
        <div className="p-4 flex items-center gap-3">
          <div className="bg-primary/10 text-primary p-2 rounded-lg">
            <Home size={24} />
          </div>
          <h1 className="font-bold text-xl tracking-tight">Kitchenmate</h1>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary dark:bg-primary/20' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 w-full">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface dark:bg-surface-dark border-t border-gray-200 dark:border-gray-800 flex justify-between px-2 pb-safe pt-1 z-20">
        {[navItems[0], navItems[1], navItems[2], navItems[3], navItems[5]].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-16 h-14 ${
                isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
              }`
            }
          >
            <item.icon size={22} className="mb-1" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
        {/* 'More' tab instead of Analytics if space is tight, but we mapped 5 above. Let's just map 5 main ones on mobile to avoid crowding. Wait, the user said: Home, Inventory, Shopping, Purchases, More. Let's adjust to match perfectly. */}
      </nav>
    </div>
  );
}
