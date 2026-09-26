import { useEffect, useState } from 'react';
import { usePurchaseStore } from '../store/usePurchaseStore';
import { useShoppingStore } from '../store/useShoppingStore';
import { Plus, X, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { DecimalInput } from '../components/DecimalInput';

export default function Purchases() {
  const { purchases, fetchPurchases, loading } = usePurchaseStore();
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  return (
    <div className="space-y-6 pb-20 md:pb-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Purchases</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-xl font-medium shadow-sm hover:bg-primary-dark transition-colors whitespace-nowrap"
        >
          + Record Purchase
        </button>
      </header>
      
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : purchases.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p>Make your first purchase to start seeing spending comparisons.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {purchases.map(purchase => (
            <div key={purchase.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg">{purchase.store}</h3>
                  <p className="text-sm text-gray-500">{format(new Date(purchase.purchase_date), 'dd MMM yyyy')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-primary">£{purchase.total_amount.toFixed(2)}</p>
                </div>
              </div>
              {purchase.notes && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{purchase.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddPurchaseModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

function AddPurchaseModal({ onClose }: { onClose: () => void }) {
  const { recordPurchase } = usePurchaseStore();
  const { items: shoppingItems } = useShoppingStore(); // We could auto-populate active items
  
  const [store, setStore] = useState('Tesco');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  // Start with empty items or auto-populate from active shopping list
  const activeShopping = shoppingItems.filter(i => !i.is_purchased);
  const [items, setItems] = useState(
    activeShopping.length > 0 
      ? activeShopping.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit || 'pcs', unit_price: 0, total_price: 0, shopping_item_id: i.id }))
      : [{ name: '', quantity: 1, unit: 'pcs', unit_price: 0, total_price: 0 }]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    
    // Auto calculate total
    if (field === 'unit_price' || field === 'quantity') {
      newItems[index].total_price = Number(newItems[index].quantity) * Number(newItems[index].unit_price);
    }
    setItems(newItems);
  };

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const formattedItems = items.filter(i => i.name.trim() !== '').map(i => ({
        ...i,
        quantity: Number(i.quantity) || 0,
        unit_price: Number(i.unit_price) || 0,
        total_price: Number(i.total_price) || 0
      }));
      await recordPurchase(store, date, totalAmount, notes, formattedItems);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record purchase');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
      <div className="bg-surface dark:bg-surface-dark w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingBag size={20} /> Record Purchase</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        {error && <p className="text-sm text-red-500 mb-4 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Store</label>
              <input required type="text" value={store} onChange={e => setStore(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary" placeholder="e.g. Tesco, Aldi" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Items</label>
              <button 
                type="button" 
                onClick={() => setItems([...items, { name: '', quantity: 1, unit: 'pcs', unit_price: 0, total_price: 0 }])}
                className="text-xs text-primary font-semibold flex items-center gap-1"
              >
                <Plus size={14} /> Add row
              </button>
            </div>
            
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-start bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                  <div className="flex-1">
                    <input required placeholder="Item name" value={item.name} onChange={e => handleItemChange(i, 'name', e.target.value)} className="w-full px-2 py-1 text-sm rounded bg-white dark:bg-gray-700 border-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="w-16">
                    <DecimalInput required placeholder="Qty" value={item.quantity} onChange={val => handleItemChange(i, 'quantity', val)} className="w-full px-2 py-1 text-sm rounded bg-white dark:bg-gray-700 border-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="w-16">
                    <input placeholder="Unit" value={item.unit} onChange={e => handleItemChange(i, 'unit', e.target.value)} className="w-full px-2 py-1 text-sm rounded bg-white dark:bg-gray-700 border-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="w-20">
                    <DecimalInput required placeholder="Price £" value={item.unit_price} onChange={val => handleItemChange(i, 'unit_price', val)} className="w-full px-2 py-1 text-sm rounded bg-white dark:bg-gray-700 border-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="w-20">
                    <div className="px-2 py-1 text-sm font-semibold text-gray-500">£{item.total_price.toFixed(2)}</div>
                  </div>
                  <button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="p-1 text-gray-400 hover:text-red-500 mt-1">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-800 pt-4">
            <span className="font-medium text-gray-500">Total Amount:</span>
            <span className="text-2xl font-bold text-primary">£{totalAmount.toFixed(2)}</span>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary resize-none" 
              placeholder="Any additional details..." 
            />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition-colors mt-2">
            {loading ? 'Saving...' : 'Save Purchase'}
          </button>
        </form>
      </div>
    </div>
  );
}
