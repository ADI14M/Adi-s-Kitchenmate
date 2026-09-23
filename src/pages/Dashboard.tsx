export default function Dashboard() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-2xl font-bold uppercase tracking-tight text-gray-500 dark:text-gray-400">
          Good Evening, Adi 👋
        </h1>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Placeholders for widgets */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">Kitchen Stock</h2>
          <p className="text-3xl font-bold">0</p>
          <p className="text-sm text-gray-500 mt-2">Total items</p>
        </div>
      </div>
    </div>
  );
}
