import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function More() {
  const signOut = useAuthStore(state => state.signOut);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">More</h1>
      </header>
      
      <div className="space-y-2">
        <Link to="/analytics" className="block bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm font-medium">
          Analytics & Comparisons
        </Link>
        <div className="block bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm font-medium">
          Settings
        </div>
        <button 
          onClick={() => signOut()}
          className="block w-full text-left bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm font-medium text-red-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
