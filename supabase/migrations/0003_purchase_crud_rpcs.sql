-- Supabase Migration: 0003_purchase_crud_rpcs.sql
-- Description: RPCs for updating and deleting purchases while correctly maintaining inventory quantities and history.

-- ==========================================
-- 1. DELETE PURCHASE RPC
-- ==========================================
CREATE OR REPLACE FUNCTION delete_purchase(p_purchase_id UUID)
RETURNS VOID AS $$
DECLARE
    v_item RECORD;
    v_current_qty NUMERIC;
BEGIN
    -- Ensure the user owns this purchase
    IF NOT EXISTS (SELECT 1 FROM purchases WHERE id = p_purchase_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Purchase not found or access denied.';
    END IF;

    -- Revert inventory for all items in this purchase
    FOR v_item IN SELECT * FROM purchase_items WHERE purchase_id = p_purchase_id
    LOOP
        -- Get current quantity before update
        SELECT quantity INTO v_current_qty FROM inventory_items WHERE id = v_item.inventory_item_id;

        -- Decrease inventory quantity
        UPDATE inventory_items
        SET quantity = GREATEST(0, quantity - v_item.quantity), updated_at = NOW()
        WHERE id = v_item.inventory_item_id;

        -- Record inventory history for reversal
        INSERT INTO inventory_history (user_id, item_id, change_amount, change_type, previous_quantity, new_quantity)
        VALUES (auth.uid(), v_item.inventory_item_id, -v_item.quantity, 'purchase_deleted', v_current_qty, GREATEST(0, v_current_qty - v_item.quantity));
    END LOOP;

    -- Delete the purchase (purchase_items will cascade)
    DELETE FROM purchases WHERE id = p_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 2. UPDATE PURCHASE RPC
-- ==========================================
CREATE OR REPLACE FUNCTION update_purchase(
    p_purchase_id UUID,
    p_store TEXT,
    p_purchase_date DATE,
    p_total_amount NUMERIC,
    p_notes TEXT,
    p_items JSONB -- Array of { id (optional), inventory_item_id (optional), name, quantity, unit, unit_price, total_price, shopping_item_id (optional) }
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

    -- Update purchase header
    UPDATE purchases
    SET store = p_store, purchase_date = p_purchase_date, total_amount = p_total_amount, notes = p_notes
    WHERE id = p_purchase_id;

    -- Insert new items and apply to inventory
    FOR v_new_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_inv_id := (v_new_item->>'inventory_item_id')::UUID;
        
        -- If inventory_item_id is null, try to find by name, or create
        IF v_inv_id IS NULL THEN
            SELECT id INTO v_inv_id FROM inventory_items WHERE user_id = auth.uid() AND name = v_new_item->>'name';
            
            IF v_inv_id IS NULL THEN
                INSERT INTO inventory_items (user_id, name, quantity, unit)
                VALUES (auth.uid(), v_new_item->>'name', 0, v_new_item->>'unit')
                RETURNING id INTO v_inv_id;
            END IF;
        END IF;

        -- Get current quantity before update
        SELECT quantity INTO v_current_qty FROM inventory_items WHERE id = v_inv_id;

        -- Add to purchase_items
        INSERT INTO purchase_items (purchase_id, inventory_item_id, name, quantity, unit, unit_price, total_price)
        VALUES (p_purchase_id, v_inv_id, v_new_item->>'name', (v_new_item->>'quantity')::NUMERIC, v_new_item->>'unit', (v_new_item->>'unit_price')::NUMERIC, (v_new_item->>'total_price')::NUMERIC);

        -- Update inventory quantity
        UPDATE inventory_items
        SET quantity = quantity + (v_new_item->>'quantity')::NUMERIC, updated_at = NOW()
        WHERE id = v_inv_id;

        -- Record inventory history for new addition
        INSERT INTO inventory_history (user_id, item_id, change_amount, change_type, previous_quantity, new_quantity)
        VALUES (auth.uid(), v_inv_id, (v_new_item->>'quantity')::NUMERIC, 'purchase_edited_apply', v_current_qty, v_current_qty + (v_new_item->>'quantity')::NUMERIC);

    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
