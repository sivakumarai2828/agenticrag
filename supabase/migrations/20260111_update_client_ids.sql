/* 
  SQL MIGRATION: RENAME CLIENT IDS TO READABLE FORMAT
  
  This script performs the following:
  1. Changes the client_id column from integer to text
  2. Migrates existing values: 5001 -> 'Client 1', 5002 -> 'Client 2', etc.
*/

-- 1. Alter the column type to TEXT using a forced cast
ALTER TABLE transactions 
ALTER COLUMN client_id TYPE TEXT 
USING client_id::TEXT;

-- 2. Update existing numerical values to the readable "Client N" format
UPDATE transactions SET client_id = 'Client 1' WHERE client_id = '5001';
UPDATE transactions SET client_id = 'Client 2' WHERE client_id = '5002';
UPDATE transactions SET client_id = 'Client 3' WHERE client_id = '5003';
UPDATE transactions SET client_id = 'Client 4' WHERE client_id = '5004';
UPDATE transactions SET client_id = 'Client 5' WHERE client_id = '5005';

-- 3. Add documentation to the column
COMMENT ON COLUMN transactions.client_id IS 'Readable client name (e.g., Client 1, Client 2)';
