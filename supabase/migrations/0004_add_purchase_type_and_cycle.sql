-- Supabase Migration: 0004_add_purchase_type_and_cycle.sql
-- Description: Adds purchase_type column ('main' vs 'top_up') to support Rolling Grocery Cycle & Weekly Budget tracking.
-- Preserves all existing records, RLS policies, and inventory synchronization.

-- ==============================================================================
-- 1. ADD COLUMN TO PURCHASES
-- ==============================================================================
-- Add purchase_type as nullable TEXT with check constraint.
-- Existing purchases safely remain NULL (unclassified), ensuring no historical data is lost, modified, or guessed.
ALTER TABLE purchases 
  ADD COLUMN IF NOT EXISTS purchase_type TEXT 
  CHECK (purchase_type IS NULL OR purchase_type IN ('main', 'top_up'));

COMMENT ON COLUMN purchases.purchase_type IS 'Distinguishes Main Grocery Shopping (resets 7-day rolling cycle) from Top-Up Shopping (adds to active cycle without resetting dates). NULL indicates legacy unclassified purchase.';

-- ==============================================================================
-- 2. UPDATE RECORD_PURCHASE RPC
-- ==============================================================================
-- Drop existing 5-parameter signature if present to ensure clean signature resolution
DROP FUNCTION IF EXISTS record_purchase(TEXT, DATE, NUMERIC, TEXT, JSONB);
DROP FUNCTION IF EXISTS record_purchase(TEXT, DATE, NUMERIC, TEXT, JSONB, TEXT);

CREATE OR REPLACE FUNCTION record_purchase(
    p_store TEXT,
    p_purchase_date DATE,
    p_total_amount NUMERIC,
    p_notes TEXT,
    p_items JSONB, -- Array of { inventory_item_id (optional), name, quantity, unit, unit_price, total_price, shopping_item_id (optional) }
    p_purchase_type TEXT DEFAULT 'main'
) RETURNS UUID AS $$
DECLARE
    v_purchase_id UUID;
    v_item JSONB;
    v_inv_id UUID;
    v_current_qty NUMERIC;
BEGIN
    -- Validate purchase type if provided
    IF p_purchase_type IS NOT NULL AND p_purchase_type NOT IN ('main', 'top_up') THEN
        RAISE EXCEPTION 'Invalid purchase_type. Must be "main" or "top_up".';
    END IF;

    -- 1. Create Purchase record with purchase_type
    INSERT INTO purchases (user_id, store, purchase_date, total_amount, notes, purchase_type)
    VALUES (auth.uid(), p_store, p_purchase_date, p_total_amount, p_notes, COALESCE(p_purchase_type, 'main'))
    RETURNING id INTO v_purchase_id;

    -- 2. Loop through purchase items and update inventory
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_inv_id := (v_item->>'inventory_item_id')::UUID;
        
        -- If inventory_item_id is null, find by name, or create
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

-- ==============================================================================
-- 3. UPDATE UPDATE_PURCHASE RPC
-- ==============================================================================
DROP FUNCTION IF EXISTS update_purchase(UUID, TEXT, DATE, NUMERIC, TEXT, JSONB);
DROP FUNCTION IF EXISTS update_purchase(UUID, TEXT, DATE, NUMERIC, TEXT, JSONB, TEXT);

CREATE OR REPLACE FUNCTION update_purchase(
    p_purchase_id UUID,
    p_store TEXT,
    p_purchase_date DATE,
    p_total_amount NUMERIC,
    p_notes TEXT,
    p_items JSONB,
    p_purchase_type TEXT DEFAULT 'main'
) RETURNS VOID AS $$
DECLARE
    v_old_item RECORD;
    v_new_item JSONB;
    v_inv_id UUID;
    v_current_qty NUMERIC;
BEGIN
    -- Ensure the user owns this purchase
    IF NOT EXISTS (SELECT 1 FROM purchases WHERE id = p_purchase_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Purchase not found or access denied.';
    END IF;

    -- Validate purchase type if provided
    IF p_purchase_type IS NOT NULL AND p_purchase_type NOT IN ('main', 'top_up') THEN
        RAISE EXCEPTION 'Invalid purchase_type. Must be "main" or "top_up".';
    END IF;

    -- Revert all OLD items in this purchase first
    FOR v_old_item IN SELECT * FROM purchase_items WHERE purchase_id = p_purchase_id
    LOOP
        SELECT quantity INTO v_current_qty FROM inventory_items WHERE id = v_old_item.inventory_item_id;

        UPDATE inventory_items
        SET quantity = GREATEST(0, quantity - v_old_item.quantity), updated_at = NOW()
        WHERE id = v_old_item.inventory_item_id;

        INSERT INTO inventory_history (user_id, item_id, change_amount, change_type, previous_quantity, new_quantity)
        VALUES (auth.uid(), v_old_item.inventory_item_id, -v_old_item.quantity, 'purchase_edited_revert', v_current_qty, GREATEST(0, v_current_qty - v_old_item.quantity));
    END LOOP;

    -- Delete all old purchase items (we will recreate them)
    DELETE FROM purchase_items WHERE purchase_id = p_purchase_id;

    -- Update purchase header including purchase_type
    UPDATE purchases
    SET store = p_store, 
        purchase_date = p_purchase_date, 
        total_amount = p_total_amount, 
        notes = p_notes,
        purchase_type = COALESCE(p_purchase_type, purchase_type, 'main')
    WHERE id = p_purchase_id;

    -- Insert new items and apply to inventory
    FOR v_new_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_inv_id := (v_new_item->>'inventory_item_id')::UUID;
        
        IF v_inv_id IS NULL THEN
            SELECT id INTO v_inv_id FROM inventory_items WHERE user_id = auth.uid() AND name = v_new_item->>'name';
            
            IF v_inv_id IS NULL THEN
                INSERT INTO inventory_items (user_id, name, quantity, unit)
                VALUES (auth.uid(), v_new_item->>'name', 0, v_new_item->>'unit')
                RETURNING id INTO v_inv_id;
            END IF;
        END IF;

        SELECT quantity INTO v_current_qty FROM inventory_items WHERE id = v_inv_id;

        INSERT INTO purchase_items (purchase_id, inventory_item_id, name, quantity, unit, unit_price, total_price)
        VALUES (p_purchase_id, v_inv_id, v_new_item->>'name', (v_new_item->>'quantity')::NUMERIC, v_new_item->>'unit', (v_new_item->>'unit_price')::NUMERIC, (v_new_item->>'total_price')::NUMERIC);

        UPDATE inventory_items
        SET quantity = quantity + (v_new_item->>'quantity')::NUMERIC, updated_at = NOW()
        WHERE id = v_inv_id;

        INSERT INTO inventory_history (user_id, item_id, change_amount, change_type, previous_quantity, new_quantity)
        VALUES (auth.uid(), v_inv_id, (v_new_item->>'quantity')::NUMERIC, 'purchase_edited_apply', v_current_qty, v_current_qty + (v_new_item->>'quantity')::NUMERIC);

    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 4. CLASSIFY_PURCHASE RPC (Optional helper for rapid classification)
-- ==============================================================================
CREATE OR REPLACE FUNCTION classify_purchase(
    p_purchase_id UUID,
    p_purchase_type TEXT
) RETURNS VOID AS $$
BEGIN
    IF p_purchase_type NOT IN ('main', 'top_up') THEN
        RAISE EXCEPTION 'Invalid purchase_type. Must be "main" or "top_up".';
    END IF;

    UPDATE purchases
    SET purchase_type = p_purchase_type
    WHERE id = p_purchase_id AND user_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase not found or access denied.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

