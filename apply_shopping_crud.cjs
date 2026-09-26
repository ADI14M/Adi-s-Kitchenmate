const fs = require('fs');

let content = fs.readFileSync('src/pages/Shopping.tsx', 'utf-8');

// Imports
content = content.replace(
  "import { Check, ShoppingBag, X } from 'lucide-react';",
  "import { Check, ShoppingBag, X, Pencil, Trash2, Eye } from 'lucide-react';\\nimport type { ShoppingItem } from '../store/useShoppingStore';"
);

// State
content = content.replace(
  "const navigate = useNavigate();",
  `const navigate = useNavigate();
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [viewingItem, setViewingItem] = useState<ShoppingItem | null>(null);`
);

// Active items replacement
const activeItemsRegex = /<div key=\{item\.id\} className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">([\s\S]*?)<\/div>\s*<\/div>\s*\)\)\}/g;
const newActiveItem = `<div key={item.id} className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors group cursor-pointer" onClick={() => setViewingItem(item)}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); togglePurchased(item.id, true); }}
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
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); }} className="p-2 text-gray-400 hover:text-blue-500"><Pencil size={16}/></button>
                    <button onClick={(e) => { e.stopPropagation(); useShoppingStore.getState().deleteItem(item.id); }} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}`;
content = content.replace(activeItemsRegex, newActiveItem);

// Completed items replacement
const completedItemsRegex = /<div key=\{item\.id\} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900\/50 p-4 rounded-2xl border border-transparent">([\s\S]*?)<\/div>\s*<\/div>\s*\)\)\}/g;
const newCompletedItem = `<div key={item.id} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-transparent group cursor-pointer" onClick={() => setViewingItem(item)}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); togglePurchased(item.id, false); }}
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
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); }} className="p-2 text-gray-400 hover:text-blue-500"><Pencil size={16}/></button>
                      <button onClick={(e) => { e.stopPropagation(); useShoppingStore.getState().deleteItem(item.id); }} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}`;
content = content.replace(completedItemsRegex, newCompletedItem);

// Modals
const modals = `
      {showAddModal && (
        <AddShoppingModal 
          onClose={() => setShowAddModal(false)}
          onAdd={async (item) => {
            const result = await addItem(item);
            if (result.action === 'merged') {
              alert(\`Added to existing item "\${item.name}"\`);
            }
            setShowAddModal(false);
          }} 
        />
      )}

      {editingItem && (
        <EditShoppingModal item={editingItem} onClose={() => setEditingItem(null)} />
      )}

      {viewingItem && (
        <ViewShoppingModal item={viewingItem} onClose={() => setViewingItem(null)} />
      )}
`;
content = content.replace(/\{showAddModal && \([\s\S]*?\)\}/, modals);


const components = `
function EditShoppingModal({ item, onClose }: { item: ShoppingItem, onClose: () => void }) {
  const { updateItem } = useShoppingStore();
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState<string|number>(item.quantity);
  const [unit, setUnit] = useState(item.unit || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await updateItem(item.id, { name, quantity: Number(quantity)||0, unit });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update item');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
      <div className="bg-surface dark:bg-surface-dark w-full max-w-md rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Edit Shopping Item</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X size={20} />
          </button>
        </div>
        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Item Name</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <DecimalInput required value={quantity} onChange={setQuantity} className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Unit</label>
              <input type="text" value={unit} onChange={e => setUnit(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition-colors mt-2">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ViewShoppingModal({ item, onClose }: { item: ShoppingItem, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
      <div className="bg-surface dark:bg-surface-dark w-full max-w-sm rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{item.name}</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">Quantity to buy</p>
            <p className="text-xl font-bold">{item.quantity} <span className="text-base font-normal">{item.unit}</span></p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className={item.is_purchased ? "text-green-500 font-bold" : "text-amber-500 font-bold"}>
                {item.is_purchased ? "Purchased" : "Pending"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Added</span>
              <span className="text-gray-900 dark:text-gray-100">{new Date(item.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Linked to Inventory?</span>
              <span className="text-gray-900 dark:text-gray-100">{item.inventory_item_id ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/pages/Shopping.tsx', content + components);
