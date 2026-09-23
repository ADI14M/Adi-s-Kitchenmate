import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,
  
  initialize: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      set({ 
        session, 
        user: session?.user || null,
        loading: false,
        initialized: true
      });

      supabase.auth.onAuthStateChange((_event, newSession) => {
        set({ 
          session: newSession, 
          user: newSession?.user || null 
        });
      });
    } catch (error) {
      console.error("Auth initialization error:", error);
      set({ loading: false, initialized: true });
    }
  },
  
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  }
}));
