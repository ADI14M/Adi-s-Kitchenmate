-- Fix the database design for shopping items uniqueness

-- 1. Remove the flawed single constraint
ALTER TABLE shopping_items 
  DROP CONSTRAINT IF EXISTS shopping_items_user_id_inventory_item_id_key;

-- 2. Create a partial unique index for inventory-linked items
-- Ensures a user can only have one shopping item per inventory item
CREATE UNIQUE INDEX IF NOT EXISTS shopping_items_linked_idx 
  ON shopping_items (user_id, inventory_item_id) 
  WHERE inventory_item_id IS NOT NULL;

-- 3. Create a partial unique index for manual/unlinked items
-- Ensures a user can only have one unlinked manual item per normalized name
CREATE UNIQUE INDEX IF NOT EXISTS shopping_items_unlinked_idx 
  ON shopping_items (user_id, lower(name)) 
  WHERE inventory_item_id IS NULL;

-- 4. Create an atomic RPC to handle adding/merging shopping items securely
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
    -- Try to find existing item by inventory_item_id if linked
    IF p_inventory_item_id IS NOT NULL THEN
        SELECT id, quantity, is_purchased 
        INTO v_existing_id, v_existing_quantity, v_is_purchased
        FROM shopping_items
        WHERE user_id = auth.uid() AND inventory_item_id = p_inventory_item_id
        LIMIT 1;
    ELSE
        -- Try finding by normalized name if unlinked
        SELECT id, quantity, is_purchased 
        INTO v_existing_id, v_existing_quantity, v_is_purchased
        FROM shopping_items
        WHERE user_id = auth.uid() AND inventory_item_id IS NULL AND lower(name) = lower(p_name)
        LIMIT 1;
    END IF;

    -- If an existing row is found, UPDATE it
    IF v_existing_id IS NOT NULL THEN
        UPDATE shopping_items
        SET 
            quantity = CASE 
                WHEN is_purchased THEN p_quantity 
                ELSE quantity + p_quantity 
            END,
            is_purchased = FALSE
        WHERE id = v_existing_id
        RETURNING to_jsonb(shopping_items.*) INTO v_result;
        
        RETURN jsonb_build_object('action', 'merged', 'item', v_result);
    ELSE
        -- If no row exists, INSERT a new one
        INSERT INTO shopping_items (user_id, name, quantity, unit, inventory_item_id, is_purchased)
        VALUES (auth.uid(), p_name, p_quantity, p_unit, p_inventory_item_id, false)
        RETURNING to_jsonb(shopping_items.*) INTO v_result;
        
        RETURN jsonb_build_object('action', 'added', 'item', v_result);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
