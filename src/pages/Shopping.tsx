import { useEffect, useState } from 'react';
import { useShoppingStore } from '../store/useShoppingStore';
import { Check, ShoppingBag, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DecimalInput } from '../components/DecimalInput';
export default function Shopping() {
  const { items, fetchItems, loading, togglePurchased, clearPurchased, addItem } = useShoppingStore();
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const activeItems = items.filter(i => !i.is_purchased);
  const completedItems = items.filter(i => i.is_purchased);

  return (
    <div className="space-y-6 pb-20 md:pb-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Shopping List</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-xl font-medium shadow-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
          >
            + Add Item
          </button>
          {activeItems.length > 0 && (
            <button 
              onClick={() => navigate('/purchases')} 
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-medium shadow-sm hover:bg-primary-dark transition-colors"
            >
              <ShoppingBag size={18} /> Checkout
            </button>
          )}
        </div>
      </header>
      
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p>Your shopping list is empty.</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Active Items */}
          {activeItems.length > 0 && (
            <div className="space-y-2">
              {activeItems.map(item => (
                <div key={item.id} className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                  <button 
                    onClick={() => togglePurchased(item.id, true)}
                    className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-primary text-transparent hover:text-primary transition-colors"
                  >
                    <Check size={16} />
                  </button>
                  <div className="flex-1">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      {item.quantity} {item.unit || 'pcs'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Completed Items */}
          {completedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-500">Completed</h3>
                <button 
                  onClick={clearPurchased}
                  className="text-sm text-red-500 hover:underline"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-2 opacity-60">
                {completedItems.map(item => (
                  <div key={item.id} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-transparent">
                    <button 
                      onClick={() => togglePurchased(item.id, false)}
                      className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center"
                    >
                      <Check size={16} />
                    </button>
                    <div className="flex-1 line-through text-gray-500">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm">
                        {item.quantity} {item.unit || 'pcs'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <AddShoppingModal 
          onClose={() => setShowAddModal(false)}
          onAdd={async (item) => {
            const result = await addItem(item);
            if (result.action === 'merged') {
              alert(`"${result.item.name}" was already on your list. The quantity was updated to ${result.item.quantity} ${result.item.unit || 'pcs'}.`);
            }
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

function AddShoppingModal({ onClose, onAdd }: { onClose: () => void, onAdd: (item: any) => Promise<void> }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState<string|number>(1);
  const [unit, setUnit] = useState('pieces');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onAdd({ name, quantity: Number(quantity) || 0, unit });
    } catch (err: any) {
      setError(err.message || 'Failed to add item');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
      <div className="bg-surface dark:bg-surface-dark w-full max-w-md rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add to Shopping List</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Item Name</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary" placeholder="Milk" />
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <DecimalInput required value={quantity} onChange={setQuantity} className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Unit</label>
              <input type="text" value={unit} onChange={e => setUnit(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary" placeholder="litres, pcs..." />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition-colors mt-2">
            {loading ? 'Adding...' : 'Add to List'}
          </button>
        </form>
      </div>
    </div>
  );
}
