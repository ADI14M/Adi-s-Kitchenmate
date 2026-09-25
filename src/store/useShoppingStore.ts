import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface ShoppingItem {
  id: string;
  user_id: string;
  inventory_item_id?: string;
  name: string;
  quantity: number;
  unit?: string;
  is_purchased: boolean;
  created_at: string;
}

interface ShoppingState {
  items: ShoppingItem[];
  loading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  addItem: (item: Partial<ShoppingItem>) => Promise<{ action: 'added' | 'merged', item: ShoppingItem }>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  togglePurchased: (id: string, is_purchased: boolean) => Promise<void>;
  clearPurchased: () => Promise<void>;
}

export const useShoppingStore = create<ShoppingState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      set({ items: data as ShoppingItem[], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addItem: async (item) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Resolve inventory_item_id if not explicitly provided but item exists in inventory
      let finalInventoryItemId = item.inventory_item_id || null;
      if (!finalInventoryItemId && item.name) {
        const { data: invItems } = await supabase
          .from('inventory_items')
          .select('id')
          .ilike('name', item.name)
          .eq('user_id', user.id)
          .limit(1);
        if (invItems && invItems.length > 0) {
          finalInventoryItemId = invItems[0].id;
        }
      }

      // Call the atomic RPC to safely insert or merge
      const { data, error } = await supabase.rpc('add_shopping_item', {
        p_name: item.name,
        p_quantity: item.quantity || 1,
        p_unit: item.unit || null,
        p_inventory_item_id: finalInventoryItemId
      });

      if (error) throw error;
      
      const resultAction = data.action as 'added' | 'merged';
      const resultItem = data.item as ShoppingItem;

      set(state => {
        // If merged, replace the existing item
        if (resultAction === 'merged') {
          return {
            items: state.items.some(i => i.id === resultItem.id)
              ? state.items.map(i => i.id === resultItem.id ? resultItem : i)
              : [resultItem, ...state.items]
          };
        }
        // If added, insert at top
        return {
          items: state.items.some(i => i.id === resultItem.id) 
            ? state.items 
            : [resultItem, ...state.items]
        };
      });

      return { action: resultAction, item: resultItem };
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  },

  updateQuantity: async (id, quantity) => {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .update({ quantity })
        .eq('id', id);
        
      if (error) throw error;
      set({ items: get().items.map(i => i.id === id ? { ...i, quantity } : i) });
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  },

  togglePurchased: async (id, is_purchased) => {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .update({ is_purchased })
        .eq('id', id);
        
      if (error) throw error;
      set({ items: get().items.map(i => i.id === id ? { ...i, is_purchased } : i) });
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  },

  clearPurchased: async () => {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .delete()
        .eq('is_purchased', true);
        
      if (error) throw error;
      set({ items: get().items.filter(i => !i.is_purchased) });
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  }
}));
