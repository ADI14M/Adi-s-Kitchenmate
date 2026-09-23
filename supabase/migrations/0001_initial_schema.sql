-- Supabase Migration: 0001_initial_schema.sql
-- Description: Core schema for KitchenMate, covering inventory, shopping, and purchases

-- ==========================================
-- RESET SCHEMA (For clean re-runs)
-- ==========================================
DROP FUNCTION IF EXISTS record_purchase(TEXT, DATE, NUMERIC, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS adjust_inventory(UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS consume_inventory(UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS set_user_rls_policy(TEXT) CASCADE;

DROP TABLE IF EXISTS purchase_items CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS shopping_items CASCADE;
DROP TABLE IF EXISTS inventory_history CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. PROFILES (Extended User Data)
-- ==========================================
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 2. CATEGORIES
-- ==========================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name)
);

-- ==========================================
-- 3. INVENTORY ITEMS
-- ==========================================
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    location TEXT,
    quantity NUMERIC NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit TEXT,
    min_quantity NUMERIC NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name) -- Prevent duplicates of the same item name for a user
);

-- ==========================================
-- 4. INVENTORY HISTORY
-- ==========================================
CREATE TABLE inventory_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    change_amount NUMERIC NOT NULL,
    change_type TEXT NOT NULL, -- 'purchase', 'consumed', 'manual_adjustment'
    previous_quantity NUMERIC NOT NULL,
    new_quantity NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 5. SHOPPING ITEMS
-- ==========================================
CREATE TABLE shopping_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE, -- Optional link
    name TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit TEXT,
    is_purchased BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE NULLS NOT DISTINCT (user_id, inventory_item_id) -- Avoid duplicates of linked items
);

-- ==========================================
-- 6. PURCHASES
-- ==========================================
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    store TEXT NOT NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount NUMERIC NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 7. PURCHASE ITEMS
-- ==========================================
CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    unit TEXT,
    unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 8. SETTINGS
-- ==========================================
CREATE TABLE user_settings (
    user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    theme TEXT DEFAULT 'system',
    currency TEXT DEFAULT 'GBP',
    expiry_warning_days INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- RLS POLICIES (Row Level Security)
-- ==========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policy (uses id)
CREATE POLICY "Users can only access their own profiles" ON profiles
FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. Generic policy function for tables with user_id
CREATE OR REPLACE FUNCTION set_user_rls_policy(table_name TEXT)
RETURNS void AS $$
BEGIN
    EXECUTE format('
        CREATE POLICY "Users can only access their own %I" ON %I
        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    ', table_name, table_name);
END;
$$ LANGUAGE plpgsql;

SELECT set_user_rls_policy('categories');
SELECT set_user_rls_policy('inventory_items');
SELECT set_user_rls_policy('inventory_history');
SELECT set_user_rls_policy('shopping_items');
SELECT set_user_rls_policy('purchases');
SELECT set_user_rls_policy('user_settings');

-- 3. Purchase items policy (based on purchase's user_id)
CREATE POLICY "Users can only access their own purchase_items" ON purchase_items
FOR ALL USING (
    EXISTS (SELECT 1 FROM purchases WHERE purchases.id = purchase_items.purchase_id AND purchases.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM purchases WHERE purchases.id = purchase_items.purchase_id AND purchases.user_id = auth.uid())
);

-- ==========================================
-- ATOMIC FUNCTIONS (RPC)
-- ==========================================

-- Function to consume inventory
CREATE OR REPLACE FUNCTION consume_inventory(
    p_item_id UUID,
    p_amount NUMERIC
) RETURNS void AS $$
DECLARE
    v_user_id UUID;
    v_current_quantity NUMERIC;
BEGIN
    -- Get current item details
    SELECT user_id, quantity INTO v_user_id, v_current_quantity
    FROM inventory_items
    WHERE id = p_item_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found';
    END IF;

    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    IF v_current_quantity < p_amount THEN
        RAISE EXCEPTION 'Insufficient quantity';
    END IF;

    -- Update inventory
    UPDATE inventory_items
    SET quantity = quantity - p_amount, updated_at = NOW()
    WHERE id = p_item_id;

    -- Log history
    INSERT INTO inventory_history (user_id, item_id, change_amount, change_type, previous_quantity, new_quantity)
    VALUES (v_user_id, p_item_id, -p_amount, 'consumed', v_current_quantity, v_current_quantity - p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually adjust inventory
CREATE OR REPLACE FUNCTION adjust_inventory(
    p_item_id UUID,
    p_new_quantity NUMERIC
) RETURNS void AS $$
DECLARE
    v_user_id UUID;
    v_current_quantity NUMERIC;
    v_difference NUMERIC;
BEGIN
    SELECT user_id, quantity INTO v_user_id, v_current_quantity
    FROM inventory_items
    WHERE id = p_item_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found';
    END IF;

    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    v_difference := p_new_quantity - v_current_quantity;

    IF v_difference != 0 THEN
        UPDATE inventory_items
        SET quantity = p_new_quantity, updated_at = NOW()
        WHERE id = p_item_id;

        INSERT INTO inventory_history (user_id, item_id, change_amount, change_type, previous_quantity, new_quantity)
        VALUES (v_user_id, p_item_id, v_difference, 'manual_adjustment', v_current_quantity, p_new_quantity);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record a complete purchase
-- Takes JSON payload of purchase and items
CREATE OR REPLACE FUNCTION record_purchase(
    p_store TEXT,
    p_purchase_date DATE,
    p_total_amount NUMERIC,
    p_notes TEXT,
    p_items JSONB -- Array of { inventory_item_id (optional), name, quantity, unit, unit_price, total_price, shopping_item_id (optional) }
) RETURNS UUID AS $$
DECLARE
    v_purchase_id UUID;
    v_item JSONB;
    v_inv_id UUID;
    v_current_qty NUMERIC;
BEGIN
    -- 1. Create Purchase
    INSERT INTO purchases (user_id, store, purchase_date, total_amount, notes)
    VALUES (auth.uid(), p_store, p_purchase_date, p_total_amount, p_notes)
    RETURNING id INTO v_purchase_id;

    -- 2. Loop through items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_inv_id := (v_item->>'inventory_item_id')::UUID;
        
        -- If inventory_item_id is null, try to find by name, or create
        IF v_inv_id IS NULL THEN
            SELECT id INTO v_inv_id FROM inventory_items WHERE user_id = auth.uid() AND name = v_item->>'name';
            
            IF v_inv_id IS NULL THEN
                INSERT INTO inventory_items (user_id, name, quantity, unit)
                VALUES (auth.uid(), v_item->>'name', 0, v_item->>'unit')
                RETURNING id INTO v_inv_id;
            END IF;
        END IF;

        -- Get current quantity before update
        SELECT quantity INTO v_current_qty FROM inventory_items WHERE id = v_inv_id;

        -- Add to purchase_items
        INSERT INTO purchase_items (purchase_id, inventory_item_id, name, quantity, unit, unit_price, total_price)
        VALUES (v_purchase_id, v_inv_id, v_item->>'name', (v_item->>'quantity')::NUMERIC, v_item->>'unit', (v_item->>'unit_price')::NUMERIC, (v_item->>'total_price')::NUMERIC);

        -- Update inventory quantity
        UPDATE inventory_items
        SET quantity = quantity + (v_item->>'quantity')::NUMERIC, updated_at = NOW()
        WHERE id = v_inv_id;

        -- Record inventory history
        INSERT INTO inventory_history (user_id, item_id, change_amount, change_type, previous_quantity, new_quantity)
        VALUES (auth.uid(), v_inv_id, (v_item->>'quantity')::NUMERIC, 'purchase', v_current_qty, v_current_qty + (v_item->>'quantity')::NUMERIC);

        -- If shopping_item_id is provided, mark as purchased
        IF v_item->>'shopping_item_id' IS NOT NULL THEN
            UPDATE shopping_items SET is_purchased = TRUE WHERE id = (v_item->>'shopping_item_id')::UUID AND user_id = auth.uid();
        END IF;
        
        -- Also clear from active shopping list if it matches inventory_item_id
        UPDATE shopping_items SET is_purchased = TRUE WHERE inventory_item_id = v_inv_id AND user_id = auth.uid();
        
    END LOOP;

    RETURN v_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
