/*
  # Create Transactions Table for Transaction Data Intelligence
  
  1. New Tables
    - `transactions`
      - `id` (bigint, primary key) - Unique transaction identifier
      - `client_id` (text) - Client identifier for grouping transactions
      - `type` (text) - Transaction type (PURCHASE, REFUND, etc.)
      - `tran_amt` (decimal) - Transaction amount with 2 decimal precision
      - `tran_status` (text) - Status (APPROVED, DECLINED, CALL FOR AUTH)
      - `tran_date` (timestamp) - Transaction timestamp

  2. Security
    - Enable RLS on `transactions` table
    - Add policy for authenticated users to read transaction data
    - Add policy for public access to query transactions

  3. Initial Data
    - Insert 15 sample transaction records for testing
    - Data spans February to March 2025
    - Includes multiple clients (client1-client5) and transaction types
*/

CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT PRIMARY KEY,
    client_id TEXT NOT NULL,
    type TEXT NOT NULL,
    tran_amt DECIMAL(10,2) NOT NULL,
    tran_status TEXT NOT NULL,
    tran_date TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public read access for transactions"
  ON transactions
  FOR SELECT
  TO anon
  USING (true);

INSERT INTO transactions (id, client_id, type, tran_amt, tran_status, tran_date) VALUES
(101, 'client1', 'PURCHASE', 249.50, 'APPROVED', '2025-02-05 14:22:45'),
(102, 'client2', 'PURCHASE', 92.75, 'DECLINED', '2025-02-07 10:15:32'),
(103, 'client3', 'REFUND', 150.00, 'APPROVED', '2025-02-08 09:45:22'),
(104, 'client4', 'PURCHASE', 525.99, 'CALL FOR AUTH', '2025-02-10 16:30:55'),
(105, 'client5', 'PURCHASE', 1200.00, 'APPROVED', '2025-02-12 18:45:18'),
(106, 'client1', 'REFUND', 45.20, 'APPROVED', '2025-02-15 11:05:10'),
(107, 'client2', 'PURCHASE', 310.80, 'APPROVED', '2025-02-18 13:14:40'),
(108, 'client3', 'PURCHASE', 79.90, 'APPROVED', '2025-02-20 08:30:17'),
(109, 'client4', 'PURCHASE', 640.00, 'CALL FOR AUTH', '2025-02-22 20:50:05'),
(110, 'client5', 'REFUND', 215.00, 'APPROVED', '2025-02-25 12:44:09'),
(111, 'client1', 'PURCHASE', 89.99, 'DECLINED', '2025-03-01 10:12:30'),
(112, 'client2', 'REFUND', 32.50, 'APPROVED', '2025-03-03 17:25:40'),
(113, 'client3', 'PURCHASE', 420.00, 'APPROVED', '2025-03-05 09:50:18'),
(114, 'client4', 'PURCHASE', 750.75, 'APPROVED', '2025-03-07 19:40:12'),
(115, 'client5', 'REFUND', 260.25, 'APPROVED', '2025-03-10 08:20:33')
ON CONFLICT (id) DO NOTHING;