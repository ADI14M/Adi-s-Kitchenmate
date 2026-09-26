const fs = require('fs');

let content = fs.readFileSync('src/pages/Inventory.tsx', 'utf-8');

// Imports
content = content.replace(
  "import { Plus, Minus, Search, AlertCircle, X } from 'lucide-react';",
  "import { Plus, Minus, Search, AlertCircle, X, Eye, Pencil, Trash2 } from 'lucide-react';"
);

// State
content = content.replace(
  "const [showAddModal, setShowAddModal] = useState(false);",
  `const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);`
);

// Pass props to InventoryCard
content = content.replace(
  /<InventoryCard\s*key=\{item\.id\}\s*item=\{item\}\s*onUpdate=\{updateQuantity\}\s*onConsume=\{consumeItem\}\s*\/>/g,
  `<InventoryCard 
              key={item.id} 
              item={item} 
              onUpdate={updateQuantity}
              onConsume={consumeItem}
              onView={() => setViewingItem(item)}
              onEdit={() => setEditingItem(item)}
              onDelete={() => setItemToDelete(item)}
            />`
);

// Modify InventoryCard props
content = content.replace(
  "onConsume: (id: string, amount: number) => void;",
  `onConsume: (id: string, amount: number) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;`
);

content = content.replace(
  "  onConsume \n}: { ",
  "  onConsume, onView, onEdit, onDelete\n}: { "
);

// Modify InventoryCard JSX to add buttons
const cardHeaderRegex = /<div className="flex justify-between items-start mb-3">([\s\S]*?)<\/div>\s*<div className="flex items-center justify-between mt-4/g;
const newCardHeader = `<div className="flex justify-between items-start mb-3">
        <div className="cursor-pointer group flex-1" onClick={onView}>
          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{item.name}</h3>
          {item.unit && <p className="text-sm text-gray-500">{item.unit}</p>}
        </div>
        
        <div className="flex items-center gap-1">
          {isOut ? (
            <span className="text-[10px] font-bold uppercase px-2 py-1 bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 rounded-md">Out</span>
          ) : isLow ? (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 rounded-md"><AlertCircle size={12} /> Low</span>
          ) : null}
          <div className="flex items-center ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1 text-gray-400 hover:text-blue-500 rounded"><Pencil size={14}/></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 size={14}/></button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4`;
content = content.replace(cardHeaderRegex, newCardHeader);

// Fix group class on main card
content = content.replace(
  `className={\`p-4 rounded-2xl border transition-colors \${isOut ? 'bg-gray-50 dark:bg-gray-800/50 border-red-100 dark:border-red-900/30 opacity-75' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm'}\`}`,
  `className={\`p-4 rounded-2xl border transition-colors group relative \${isOut ? 'bg-gray-50 dark:bg-gray-800/50 border-red-100 dark:border-red-900/30 opacity-75' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm'}\`}`
);

// Add Modals
const modals = `
      {showAddModal && (
        <AddItemModal onClose={() => setShowAddModal(false)} onAdd={async (item) => { await addItem(item); setShowAddModal(false); }} />
      )}
      
      {editingItem && (
        <EditItemModal item={editingItem} onClose={() => setEditingItem(null)} />
      )}

      {viewingItem && (
        <ViewItemModal item={viewingItem} onClose={() => setViewingItem(null)} />
      )}

      {itemToDelete && (
        <DeleteConfirmModal item={itemToDelete} onClose={() => setItemToDelete(null)} />
      )}
`;
content = content.replace(/\{showAddModal && \([\s\S]*?\)\}/, modals);


const components = `
function EditItemModal({ item, onClose }: { item: InventoryItem, onClose: () => void }) {
  const { updateItem } = useInventoryStore();
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState<string|number>(item.quantity);
  const [unit, setUnit] = useState(item.unit || '');
  const [minQuantity, setMinQuantity] = useState<string|number>(item.min_quantity);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await updateItem(item.id, { 
        name, 
        quantity: Number(quantity)||0, 
        unit, 
        min_quantity: Number(minQuantity)||0 
      });
      if (Number(quantity) !== item.quantity) {
        const { updateQuantity } = useInventoryStore.getState();
        await updateQuantity(item.id, Number(quantity));
      }
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
          <h2 className="text-xl font-bold">Edit Item</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X size={20} />
          </button>
        </div>
        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
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
          <div>
            <label className="block text-sm font-medium mb-1">Min Quantity (Low Stock Alert)</label>
            <DecimalInput required value={minQuantity} onChange={setMinQuantity} className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition-colors mt-2">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ViewItemModal({ item, onClose }: { item: InventoryItem, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
      <div className="bg-surface dark:bg-surface-dark w-full max-w-md rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{item.name}</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
              <p className="text-sm text-gray-500 mb-1">Current Stock</p>
              <p className="text-xl font-bold">{item.quantity} <span className="text-base font-normal">{item.unit}</span></p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
              <p className="text-sm text-gray-500 mb-1">Min Stock Alert</p>
              <p className="text-xl font-bold">{item.min_quantity} <span className="text-base font-normal">{item.unit}</span></p>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className={item.quantity <= item.min_quantity ? "text-amber-500 font-bold" : "text-green-500 font-bold"}>
                {item.quantity <= item.min_quantity ? "Low Stock" : "In Stock"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Updated</span>
              <span className="text-gray-900 dark:text-gray-100">{new Date(item.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ item, onClose }: { item: InventoryItem, onClose: () => void }) {
  const { deleteItem } = useInventoryStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await deleteItem(item.id);
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
        <h2 className="text-xl font-bold mb-2">Delete {item.name}?</h2>
        <p className="text-gray-500 mb-6 text-sm">
          This will permanently remove {item.name}. You won't be able to delete it if it's linked to past purchases.
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

fs.writeFileSync('src/pages/Inventory.tsx', content + components);
