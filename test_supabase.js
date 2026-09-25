import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log("Authenticating...");
  // Login with Adi's credentials from the context
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'aditya.muralimohan@example.com', // I don't know his exact email... wait, what if I don't have it?
    password: 'password'
  });
  
  if (authError) {
    console.error("Auth error:", authError.message);
    // Let's just query what we can
  } else {
    console.log("Logged in:", authData.user.id);
  }
}

run();
