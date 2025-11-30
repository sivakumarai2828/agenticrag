/*
  # Update client_id from integer to text

  1. Changes
    - Alter `transactions.client_id` column from integer to text
    - Update existing data to convert numeric IDs to text format (5001 → 'client1', etc.)
  
  2. Data Migration
    - Converts client_id 5001 → 'client1'
    - Converts client_id 5002 → 'client2'
    - Converts client_id 5003 → 'client3'
    - Converts client_id 5004 → 'client4'
    - Converts client_id 5005 → 'client5'
  
  3. Notes
    - Preserves all existing transaction data
    - Updates column type to support alphanumeric client identifiers
*/

-- Step 1: Alter column type from integer to text
ALTER TABLE transactions 
ALTER COLUMN client_id TYPE TEXT USING client_id::text;

-- Step 2: Update the data to proper text format
UPDATE transactions SET client_id = 
  CASE client_id
    WHEN '5001' THEN 'client1'
    WHEN '5002' THEN 'client2'
    WHEN '5003' THEN 'client3'
    WHEN '5004' THEN 'client4'
    WHEN '5005' THEN 'client5'
    ELSE client_id
  END
WHERE client_id IN ('5001', '5002', '5003', '5004', '5005');