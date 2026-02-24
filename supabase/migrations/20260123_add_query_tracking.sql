-- Migration to add persistent query tracking to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS query_count int DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_query_date date DEFAULT CURRENT_DATE;

-- Ensure all existing users have these values
UPDATE user_settings 
SET query_count = 0, last_query_date = CURRENT_DATE
WHERE query_count IS NULL;
