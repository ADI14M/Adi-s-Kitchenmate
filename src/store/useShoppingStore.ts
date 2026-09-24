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

      // Check if it already exists (purchased or active)
      const existing = get().items.find(i => 
        (i.name.toLowerCase() === item.name?.toLowerCase() || 
         (i.inventory_item_id && i.inventory_item_id === item.inventory_item_id))
      );
      
      if (existing) {
        // If it was already purchased, start fresh with the new quantity. Otherwise add to existing quantity.
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
        // Update local state by replacing the existing item and ensuring it's at the top if we want, or just update in place.
        set({ items: get().items.map(i => i.id === existing.id ? mergedItem : i) });
        
        return { action: 'merged', item: mergedItem };
      }

      const payload = { 
        ...item, 
        user_id: user.id,
        is_purchased: false,
        inventory_item_id: item.inventory_item_id === '' ? null : item.inventory_item_id 
      };

      const { data, error } = await supabase
        .from('shopping_items')
        .insert([payload])
        .select()
        .single();
        
      if (error) throw error;
      set({ items: [data as ShoppingItem, ...get().items] });
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
