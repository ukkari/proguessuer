-- Add the path column to the rounds table
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS path TEXT;

-- Add comment to the column
COMMENT ON COLUMN rounds.path IS 'The file path of the code snippet'; 