-- Migration: Fix nivel field type from INTEGER to TEXT
-- This allows hierarchical numbering like "1", "1.1", "1.2.3", etc.

-- Alter the nivel column type
ALTER TABLE budget_items 
ALTER COLUMN nivel TYPE TEXT USING nivel::TEXT;

-- Update the index if needed (PostgreSQL will handle this automatically)
-- The existing index idx_budget_items_nivel will work with TEXT type
