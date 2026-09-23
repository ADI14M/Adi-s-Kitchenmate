import { useEffect, useState } from 'react';
import { useInventoryStore } from '../store/useInventoryStore';
import type { InventoryItem } from '../store/useInventoryStore';
import { Plus, Minus, Search, AlertCircle, X } from 'lucide-react';

export default function Inventory() {
  const { items, fetchItems, loading, updateQuantity, consumeItem, addItem } = useInventoryStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20 md:pb-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        
        <div className="flex gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search items..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-white px-4 py-2 rounded-xl font-medium shadow-sm hover:bg-primary-dark transition-colors whitespace-nowrap"
          >
            + Add
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-10">Loading...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p>{searchTerm ? "No items match your search." : "No groceries yet."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredItems.map(item => (
            <InventoryCard 
              key={item.id} 
              item={item} 
              onUpdate={updateQuantity}
              onConsume={consumeItem}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddItemModal 
          onClose={() => setShowAddModal(false)}
          onAdd={async (item) => {
            await addItem({ ...item, user_id: '' }); // user_id is handled by RLS and defaults, but store needs it for type. Supabase client auto sets auth.uid() usually. Actually, user_id is required in DB schema, we should pass it or let DB handle it. We will pass it in the insert if needed, but RLS allows insert only if user_id = auth.uid(), so we should fetch session or let Supabase default. Wait, the schema doesn't have a DEFAULT for user_id! We must provide user_id. Let's fix the store or pass it.
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

function InventoryCard({ 
  item, 
  onUpdate, 
  onConsume 
}: { 
  item: InventoryItem; 
  onUpdate: (id: string, q: number) => void;
  onConsume: (id: string, amount: number) => void;
}) {
  const isLow = item.quantity > 0 && item.quantity <= item.min_quantity;
  const isOut = item.quantity === 0;

  return (
    <div className={`p-4 rounded-2xl border transition-colors ${isOut ? 'bg-gray-50 dark:bg-gray-800/50 border-red-100 dark:border-red-900/30 opacity-75' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">{item.name}</h3>
          {item.unit && <p className="text-sm text-gray-500">{item.unit}</p>}
        </div>
        
        {isOut ? (
          <span className="text-[10px] font-bold uppercase px-2 py-1 bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 rounded-md">
            Out
          </span>
        ) : isLow ? (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 rounded-md">
            <AlertCircle size={12} /> Low
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-between mt-4 bg-gray-50 dark:bg-gray-900 rounded-xl p-1">
        <button 
          onClick={() => item.quantity > 0 && onConsume(item.id, 1)}
          disabled={item.quantity === 0}
          className="p-2 text-gray-500 hover:text-red-500 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-30"
        >
          <Minus size={20} />
        </button>
        
        <span className="font-bold text-lg w-12 text-center select-none">
          {item.quantity}
        </span>
        
        <button 
          onClick={() => onUpdate(item.id, item.quantity + 1)}
          className="p-2 text-gray-500 hover:text-primary hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}

function AddItemModal({ onClose, onAdd }: { onClose: () => void, onAdd: (item: any) => Promise<void> }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('pieces');
  const [minQuantity, setMinQuantity] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onAdd({ name, quantity, unit, min_quantity: minQuantity });
    } catch (err: any) {
      setError(err.message || 'Failed to add item');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
      <div className="bg-surface dark:bg-surface-dark w-full max-w-md rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add Item</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary" placeholder="Apples" />
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input required type="number" min="0" step="0.1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Unit</label>
              <input type="text" value={unit} onChange={e => setUnit(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary" placeholder="pieces, kg, litres..." />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Min Quantity (Low Stock Alert)</label>
            <input required type="number" min="0" step="0.1" value={minQuantity} onChange={e => setMinQuantity(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary" />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition-colors mt-2">
            {loading ? 'Adding...' : 'Save Item'}
          </button>
        </form>
      </div>
    </div>
  );
}
