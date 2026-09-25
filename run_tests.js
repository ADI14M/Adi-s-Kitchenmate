import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Very simple env parser for the 2 lines in .env.local
const envContent = fs.readFileSync(join(__dirname, '.env.local'), 'utf-8');
const VITE_SUPABASE_URL = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const VITE_SUPABASE_ANON_KEY = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log("1. Checking if the 'add_shopping_item' RPC exists by trying to call it without auth...");
  const { error: rpcCheckError } = await supabase.rpc('add_shopping_item', {
    p_name: 'test', p_quantity: 1, p_unit: 'pcs', p_inventory_item_id: null
  });
  
  if (rpcCheckError && (rpcCheckError.message.includes('Could not find') || rpcCheckError.code === 'PGRST202' || rpcCheckError.message.includes('function add_shopping_item() does not exist'))) {
    console.error("❌ MIGRATION PENDING: The 'add_shopping_item' RPC DOES NOT EXIST on the remote database!");
    console.error("Error details:", rpcCheckError.message);
    console.error("This confirms that 0002_fix_shopping_items_constraint.sql has NOT been applied to production.");
    return;
  }
  
  console.log("RPC Check:", rpcCheckError ? rpcCheckError.message : "RPC exists!");

  console.log("\n2. Creating test user to safely test operations without touching existing data...");
  const email = `test_${Date.now()}@example.com`;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'SafeTestPassword123!',
  });

  if (authError) {
    console.error("Failed to create test user:", authError.message);
    return;
  }
  console.log("Test user created and logged in:", authData.user.id);

  console.log("\n3. Testing atomic RPC for unlinked items (Tomato, Potato, Kothambri, Bananas)...");
  const items = ['Tomato', 'Potato', 'Kothambri', 'Bananas'];
  
  for (const item of items) {
    const { data, error } = await supabase.rpc('add_shopping_item', {
      p_name: item,
      p_quantity: 1,
      p_unit: 'pieces',
      p_inventory_item_id: null
    });
    if (error) {
      console.error(`Error adding ${item}:`, error.message);
    } else {
      console.log(`Success adding ${item}:`, data.action);
    }
  }

  console.log("\n4. Testing re-adding Tomato (should merge, not error)...");
  const { data: mergeData, error: mergeError } = await supabase.rpc('add_shopping_item', {
    p_name: 'Tomato',
    p_quantity: 5,
    p_unit: 'pieces',
    p_inventory_item_id: null
  });
  if (mergeError) {
    console.error("Error merging Tomato:", mergeError.message);
  } else {
    console.log("Success merging Tomato:", mergeData.action, "- New Quantity:", mergeData.item.quantity);
  }

  console.log("\n5. Verifying database state for test user...");
  const { data: finalItems } = await supabase.from('shopping_items').select('*').eq('user_id', authData.user.id);
  console.log(`Total separate rows: ${finalItems.length} (Expected: 4)`);
  console.log("Rows:");
  finalItems.forEach(i => console.log(`- ${i.name}: ${i.quantity} ${i.unit}`));

  console.log("\n6. Cleaning up test user data...");
  await supabase.from('shopping_items').delete().eq('user_id', authData.user.id);
  console.log("Test data cleaned up.");
}

run();
