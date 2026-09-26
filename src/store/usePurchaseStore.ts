import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface PurchaseItemPayload {
  inventory_item_id?: string | null;
  name: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  total_price: number;
  shopping_item_id?: string | null;
}

export interface PurchaseRecord {
  id: string;
  store: string;
  purchase_date: string;
  total_amount: number;
  notes?: string;
  created_at: string;
}

interface PurchaseState {
  purchases: PurchaseRecord[];
  loading: boolean;
  error: string | null;
  fetchPurchases: () => Promise<void>;
  recordPurchase: (store: string, date: string, total: number, notes: string, items: PurchaseItemPayload[]) => Promise<void>;
  updatePurchase: (id: string, store: string, date: string, total: number, notes: string, items: PurchaseItemPayload[]) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  getPurchaseItems: (id: string) => Promise<any[]>;
}

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  purchases: [],
  loading: false,
  error: null,

  fetchPurchases: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .order('purchase_date', { ascending: false });
        
      if (error) throw error;
      set({ purchases: data as PurchaseRecord[], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  recordPurchase: async (store, date, total, notes, items) => {
    try {
      // Scrub empty strings for optional UUIDs
      const scrubbedItems = items.map(item => ({
        ...item,
        shopping_item_id: item.shopping_item_id === '' ? null : item.shopping_item_id,
        inventory_item_id: item.inventory_item_id === '' ? null : item.inventory_item_id
      }));

      const { error } = await supabase.rpc('record_purchase', {
        p_store: store,
        p_purchase_date: date,
        p_total_amount: total,
        p_notes: notes || null,
        p_items: scrubbedItems
      });
      
      if (error) throw error;
      
      await get().fetchPurchases();
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  },

  updatePurchase: async (id, store, date, total, notes, items) => {
    try {
      const scrubbedItems = items.map(item => ({
        ...item,
        shopping_item_id: item.shopping_item_id === '' ? null : item.shopping_item_id,
        inventory_item_id: item.inventory_item_id === '' ? null : item.inventory_item_id
      }));

      const { error } = await supabase.rpc('update_purchase', {
        p_purchase_id: id,
        p_store: store,
        p_purchase_date: date,
        p_total_amount: total,
        p_notes: notes || null,
        p_items: scrubbedItems
      });
      
      if (error) throw error;
      await get().fetchPurchases();
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  },

  deletePurchase: async (id) => {
    try {
      const { error } = await supabase.rpc('delete_purchase', {
        p_purchase_id: id
      });
      if (error) throw error;
      set({ purchases: get().purchases.filter(p => p.id !== id) });
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  },

  getPurchaseItems: async (id) => {
    try {
      const { data, error } = await supabase
        .from('purchase_items')
        .select('*')
        .eq('purchase_id', id);
      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  }
}));
