import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  category_id?: string;
  location?: string;
  quantity: number;
  unit?: string;
  min_quantity: number;
  expiry_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface InventoryState {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  addItem: (item: Partial<InventoryItem>) => Promise<void>;
  updateQuantity: (id: string, newQuantity: number) => Promise<void>;
  consumeItem: (id: string, amount: number) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name');
      
      if (error) throw error;
      set({ items: data as InventoryItem[], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addItem: async (item) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Scrub empty strings for optional UUIDs
      const payload = { 
        ...item, 
        user_id: user.id,
        category_id: item.category_id === '' ? null : item.category_id 
      };

      const { data, error } = await supabase
        .from('inventory_items')
        .insert([payload])
        .select()
        .single();
        
      if (error) throw error;
      set({ items: [...get().items, data as InventoryItem].sort((a,b) => a.name.localeCompare(b.name)) });
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  },

  updateQuantity: async (id, newQuantity) => {
    try {
      const { error } = await supabase.rpc('adjust_inventory', {
        p_item_id: id,
        p_new_quantity: newQuantity
      });
      if (error) throw error;
      
      set({
        items: get().items.map(i => i.id === id ? { ...i, quantity: newQuantity } : i)
      });
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  },

  consumeItem: async (id, amount) => {
    try {
      const { error } = await supabase.rpc('consume_inventory', {
        p_item_id: id,
        p_amount: amount
      });
      if (error) throw error;

      set({
        items: get().items.map(i => i.id === id ? { ...i, quantity: i.quantity - amount } : i)
      });
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  }
}));
