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
  purchase_type?: 'main' | 'top_up' | null;
  created_at: string;
}

interface PurchaseState {
  purchases: PurchaseRecord[];
  loading: boolean;
  error: string | null;
  fetchPurchases: () => Promise<void>;
  recordPurchase: (
    store: string,
    date: string,
    total: number,
    notes: string,
    items: PurchaseItemPayload[],
    purchaseType?: 'main' | 'top_up'
  ) => Promise<void>;
  updatePurchase: (
    id: string,
    store: string,
    date: string,
    total: number,
    notes: string,
    items: PurchaseItemPayload[],
    purchaseType?: 'main' | 'top_up' | null
  ) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  classifyPurchase: (id: string, type: 'main' | 'top_up') => Promise<void>;
  getPurchaseItems: (id: string) => Promise<any[]>;
}

const LOCAL_TYPES_KEY = 'kitchenmate_purchase_types';

function getLocalClassifications(): Record<string, 'main' | 'top_up'> {
  try {
    const raw = localStorage.getItem(LOCAL_TYPES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalClassification(id: string, type: 'main' | 'top_up') {
  try {
    const existing = getLocalClassifications();
    existing[id] = type;
    localStorage.setItem(LOCAL_TYPES_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to save local classification', e);
  }
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
      
      const localOverrides = getLocalClassifications();
      const enriched = ((data || []) as any[]).map(p => ({
        ...p,
        purchase_type: p.purchase_type || localOverrides[p.id] || null,
      }));

      set({ purchases: enriched as PurchaseRecord[], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  recordPurchase: async (store, date, total, notes, items, purchaseType = 'main') => {
    try {
      // Scrub empty strings for optional UUIDs
      const scrubbedItems = items.map(item => ({
        ...item,
        shopping_item_id: item.shopping_item_id === '' ? null : item.shopping_item_id,
        inventory_item_id: item.inventory_item_id === '' ? null : item.inventory_item_id
      }));

      // Try calling RPC with p_purchase_type parameter
      const { data: purchaseId, error } = await supabase.rpc('record_purchase', {
        p_store: store,
        p_purchase_date: date,
        p_total_amount: total,
        p_notes: notes || null,
        p_items: scrubbedItems,
        p_purchase_type: purchaseType,
      });
      
      if (error) {
        // If RPC signature without p_purchase_type is running on Supabase, fallback
        if (error.message?.includes('p_purchase_type') || error.code === 'PGRST202') {
          const { data: fallbackId, error: fallbackError } = await supabase.rpc('record_purchase', {
            p_store: store,
            p_purchase_date: date,
            p_total_amount: total,
            p_notes: notes || null,
            p_items: scrubbedItems,
          });
          if (fallbackError) throw fallbackError;
          if (fallbackId) {
            saveLocalClassification(fallbackId, purchaseType);
            try {
              await supabase.from('purchases').update({ purchase_type: purchaseType }).eq('id', fallbackId);
            } catch {}
          }
        } else {
          throw error;
        }
      } else if (purchaseId) {
        saveLocalClassification(purchaseId, purchaseType);
      }
      
      await get().fetchPurchases();
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  },

  updatePurchase: async (id, store, date, total, notes, items, purchaseType = 'main') => {
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
        p_items: scrubbedItems,
        p_purchase_type: purchaseType || 'main',
      });
      
      if (error) {
        if (error.message?.includes('p_purchase_type') || error.code === 'PGRST202') {
          const { error: fallbackError } = await supabase.rpc('update_purchase', {
            p_purchase_id: id,
            p_store: store,
            p_purchase_date: date,
            p_total_amount: total,
            p_notes: notes || null,
            p_items: scrubbedItems,
          });
          if (fallbackError) throw fallbackError;
          if (purchaseType) {
            saveLocalClassification(id, purchaseType);
            try {
              await supabase.from('purchases').update({ purchase_type: purchaseType }).eq('id', id);
            } catch {}
          }
        } else {
          throw error;
        }
      } else if (purchaseType) {
        saveLocalClassification(id, purchaseType);
      }
      
      await get().fetchPurchases();
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  },

  classifyPurchase: async (id: string, type: 'main' | 'top_up') => {
    saveLocalClassification(id, type);
    // Optimistically update local Zustand state
    set({
      purchases: get().purchases.map(p => p.id === id ? { ...p, purchase_type: type } : p)
    });
    try {
      await supabase.from('purchases').update({ purchase_type: type }).eq('id', id);
    } catch (err) {
      console.warn('classifyPurchase direct update warning:', err);
    }
  },

  deletePurchase: async (id) => {
    try {
      const { error } = await supabase.rpc('delete_purchase', {
        p_purchase_id: id
      });
      if (error) throw error;
      
      try {
        const overrides = getLocalClassifications();
        delete overrides[id];
        localStorage.setItem(LOCAL_TYPES_KEY, JSON.stringify(overrides));
      } catch {}

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
