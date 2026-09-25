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

      // 1. Resolve inventory_item_id if not explicitly provided but item exists in inventory
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

      // 2. Query the database directly to ensure we find any existing row 
      // MUST search by BOTH user_id and inventory_item_id WITHOUT filtering out purchased rows.
      let query = supabase
        .from('shopping_items')
        .select('*')
        .eq('user_id', user.id);
        
      if (finalInventoryItemId) {
        query = query.eq('inventory_item_id', finalInventoryItemId);
      } else {
        query = query.is('inventory_item_id', null).ilike('name', item.name!);
      }
      
      const { data: existingItems, error: searchError } = await query;
      if (searchError) throw searchError;
      
      const existing = existingItems && existingItems.length > 0 ? existingItems[0] : null;
      
      if (existing) {
        // 3. If an existing row is found, UPDATE that row instead of INSERTING another row.
        const newQuantity = existing.is_purchased 
          ? (item.quantity || 1) 
          : Number(existing.quantity) + (item.quantity || 1);

        const { data, error } = await supabase
          .from('shopping_items')
          .update({ quantity: newQuantity, is_purchased: false })
          .eq('id', existing.id)
          .select()
          .single();
          
        if (error) throw error;
        
        const mergedItem = data as ShoppingItem;
        // Update local state securely
        set(state => ({ 
          items: state.items.some(i => i.id === existing.id)
            ? state.items.map(i => i.id === existing.id ? mergedItem : i)
            : [mergedItem, ...state.items]
        }));
        
        return { action: 'merged', item: mergedItem };
      }

      // 4. Only INSERT when absolutely no row exists for that user + inventory item.
      const payload = { 
        ...item, 
        user_id: user.id,
        is_purchased: false,
        inventory_item_id: finalInventoryItemId 
      };

      const { data, error } = await supabase
        .from('shopping_items')
        .insert([payload])
        .select()
        .single();
        
      if (error) throw error;
      
      set(state => ({
        items: state.items.some(i => i.id === data.id) 
          ? state.items 
          : [data as ShoppingItem, ...state.items]
      }));
      return { action: 'added', item: data as ShoppingItem };
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
