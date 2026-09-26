const fs = require('fs');

let content = fs.readFileSync('src/pages/Purchases.tsx', 'utf-8');

// Imports
content = content.replace(
  "import { Plus, X, ShoppingBag } from 'lucide-react';",
  "import { Plus, X, ShoppingBag, Pencil, Trash2, Eye } from 'lucide-react';\nimport type { PurchaseRecord } from '../store/usePurchaseStore';"
);

// State
content = content.replace(
  "const [showAddModal, setShowAddModal] = useState(false);",
  `const [showAddModal, setShowAddModal] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState<PurchaseRecord | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseRecord | null>(null);
  const [purchaseToDelete, setPurchaseToDelete] = useState<PurchaseRecord | null>(null);`
);

// Purchases mapping
const purchaseCardsRegex = /<div key=\{purchase\.id\} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">([\s\S]*?)<\/div>\s*<\/div>\s*\)\)\}/g;
const newPurchaseCard = `<div key={purchase.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow group cursor-pointer" onClick={() => setViewingPurchase(purchase)}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{purchase.store}</h3>
                  <p className="text-sm text-gray-500">{format(new Date(purchase.purchase_date), 'dd MMM yyyy')}</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="font-bold text-lg text-primary">£{purchase.total_amount.toFixed(2)}</p>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                    <button onClick={(e) => { e.stopPropagation(); setEditingPurchase(purchase); }} className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"><Pencil size={16}/></button>
                    <button onClick={(e) => { e.stopPropagation(); setPurchaseToDelete(purchase); }} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={16}/></button>
                  </div>
                </div>
              </div>
              {purchase.notes && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{purchase.notes}</p>}
            </div>
          ))}`;
content = content.replace(purchaseCardsRegex, newPurchaseCard);

// Modals
const modals = `
      {showAddModal && (
        <AddPurchaseModal onClose={() => setShowAddModal(false)} />
      )}
      
      {viewingPurchase && (
        <ViewPurchaseModal purchase={viewingPurchase} onClose={() => setViewingPurchase(null)} />
      )}

      {editingPurchase && (
        <EditPurchaseModal purchase={editingPurchase} onClose={() => setEditingPurchase(null)} />
      )}

      {purchaseToDelete && (
        <DeletePurchaseModal purchase={purchaseToDelete} onClose={() => setPurchaseToDelete(null)} />
      )}
`;
content = content.replace(/\{showAddModal && \([\s\S]*?\)\}/, modals);


const components = `
function ViewPurchaseModal({ purchase, onClose }: { purchase: PurchaseRecord, onClose: () => void }) {
  const { getPurchaseItems } = usePurchaseStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPurchaseItems(purchase.id).then(data => {
      setItems(data);
      setLoading(false);
    });
  }, [purchase.id]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
      <div className="bg-surface dark:bg-surface-dark w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2"><ShoppingBag size={24} /> {purchase.store}</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <div className="mb-6 space-y-2">
          <div className="flex justify-between text-gray-500">
            <span>Date:</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium">{format(new Date(purchase.purchase_date), 'dd MMM yyyy')}</span>
          </div>
          {purchase.notes && (
            <div className="flex justify-between text-gray-500">
              <span>Notes:</span>
              <span className="text-gray-900 dark:text-gray-100">{purchase.notes}</span>
            </div>
          )}
        </div>

        <h3 className="font-bold text-lg mb-3">Items</h3>
        {loading ? (
          <p className="text-gray-500">Loading items...</p>
        ) : (
          <div className="space-y-2 mb-6">
            {items.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.quantity} {item.unit || 'pcs'} @ £{Number(item.unit_price).toFixed(2)}</p>
                </div>
                <div className="font-bold text-gray-900 dark:text-gray-100">
                  £{Number(item.total_price).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-800 pt-4">
          <span className="font-medium text-gray-500">Total Amount:</span>
          <span className="text-2xl font-bold text-primary">£{purchase.total_amount.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function EditPurchaseModal({ purchase, onClose }: { purchase: PurchaseRecord, onClose: () => void }) {
  const { updatePurchase, getPurchaseItems } = usePurchaseStore();
  
  const [store, setStore] = useState(purchase.store);
  const [date, setDate] = useState(purchase.purchase_date.split('T')[0]);
  const [notes, setNotes] = useState(purchase.notes || '');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    getPurchaseItems(purchase.id).then(data => {
      setItems(data.map(i => ({
        ...i,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price
      })));
      setLoading(false);
    });
  }, [purchase.id]);

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    if (field === 'unit_price' || field === 'quantity') {
      newItems[index].total_price = Number(newItems[index].quantity) * Number(newItems[index].unit_price);
    }
    setItems(newItems);
  };

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const formattedItems = items.filter(i => i.name.trim() !== '').map(i => ({
        ...i,
        quantity: Number(i.quantity) || 0,
        unit_price: Number(i.unit_price) || 0,
        total_price: Number(i.total_price) || 0
      }));
      await updatePurchase(purchase.id, store, date, totalAmount, notes, formattedItems);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update purchase');
      setSaving(false);
    }
  };

  if (loading) return null; // or a spinner

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
      <div className="bg-surface dark:bg-surface-dark w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><Pencil size={20} /> Edit Purchase</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        {error && <p className="text-sm text-red-500 mb-4 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Store</label>
              <input required type="text" value={store} onChange={e => setStore(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary" />
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
                    <div className="px-2 py-1 text-sm font-semibold text-gray-500">£{Number(item.total_price).toFixed(2)}</div>
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
            />
          </div>

          <button type="submit" disabled={saving} className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition-colors mt-2">
            {saving ? 'Saving...' : 'Save Purchase'}
          </button>
        </form>
      </div>
    </div>
  );
}

function DeletePurchaseModal({ purchase, onClose }: { purchase: PurchaseRecord, onClose: () => void }) {
  const { deletePurchase } = usePurchaseStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await deletePurchase(purchase.id);
      onClose();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
      <div className="bg-surface dark:bg-surface-dark w-full max-w-sm rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-800 text-center">
        <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-4">
          <Trash2 size={24} />
        </div>
        <h2 className="text-xl font-bold mb-2">Delete this purchase?</h2>
        <p className="text-gray-500 mb-6">
          This will permanently delete the purchase from <strong>{purchase.store}</strong> on {format(new Date(purchase.purchase_date), 'dd MMM yyyy')} for £{purchase.total_amount.toFixed(2)}. 
          The inventory quantities that came from this purchase will be reversed to keep your pantry perfectly accurate.
        </p>
        
        {error && <p className="text-sm text-red-500 mb-4 bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p>}
        
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={loading} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors">
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/pages/Purchases.tsx', content + components);
