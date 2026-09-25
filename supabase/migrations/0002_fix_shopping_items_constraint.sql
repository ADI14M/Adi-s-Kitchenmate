-- Fix the duplicate key constraint for unlinked shopping items
-- The previous constraint used NULLS NOT DISTINCT which caused all manual (unlinked) items to collide.

ALTER TABLE shopping_items 
  DROP CONSTRAINT IF EXISTS shopping_items_user_id_inventory_item_id_key;

-- Add standard UNIQUE constraint which treats NULLs as distinct
ALTER TABLE shopping_items 
  ADD CONSTRAINT shopping_items_user_id_inventory_item_id_key UNIQUE (user_id, inventory_item_id);

-- Create an atomic RPC to handle adding/merging shopping items
CREATE OR REPLACE FUNCTION add_shopping_item(
    p_name TEXT,
    p_quantity NUMERIC,
    p_unit TEXT,
    p_inventory_item_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_existing_id UUID;
    v_existing_quantity NUMERIC;
    v_is_purchased BOOLEAN;
    v_result JSONB;
BEGIN
    -- 1. Try to find existing item by inventory_item_id or name
    IF p_inventory_item_id IS NOT NULL THEN
        SELECT id, quantity, is_purchased 
        INTO v_existing_id, v_existing_quantity, v_is_purchased
        FROM shopping_items
        WHERE user_id = auth.uid() AND inventory_item_id = p_inventory_item_id
        LIMIT 1;
    END IF;

    -- If not found by inventory_item_id, try finding by name (case-insensitive)
    IF v_existing_id IS NULL THEN
        SELECT id, quantity, is_purchased 
        INTO v_existing_id, v_existing_quantity, v_is_purchased
        FROM shopping_items
        WHERE user_id = auth.uid() AND lower(name) = lower(p_name)
        LIMIT 1;
    END IF;

    -- 2. If an existing row is found, UPDATE it
    IF v_existing_id IS NOT NULL THEN
        UPDATE shopping_items
        SET 
            quantity = CASE 
                WHEN is_purchased THEN p_quantity 
                ELSE quantity + p_quantity 
            END,
            is_purchased = FALSE,
            -- optionally update unit if we wanted, but we keep existing
            inventory_item_id = COALESCE(shopping_items.inventory_item_id, p_inventory_item_id)
        WHERE id = v_existing_id
        RETURNING to_jsonb(shopping_items.*) INTO v_result;
        
        RETURN jsonb_build_object('action', 'merged', 'item', v_result);
    ELSE
        -- 3. If no row exists, INSERT a new one
        INSERT INTO shopping_items (user_id, name, quantity, unit, inventory_item_id, is_purchased)
        VALUES (auth.uid(), p_name, p_quantity, p_unit, p_inventory_item_id, false)
        RETURNING to_jsonb(shopping_items.*) INTO v_result;
        
        RETURN jsonb_build_object('action', 'added', 'item', v_result);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
