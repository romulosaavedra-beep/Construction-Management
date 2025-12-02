-- Migration: Create budgets and budget_items tables with proper relationships
-- Each project can have multiple budgets, but each budget belongs to one project

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    last_modified_by UUID REFERENCES auth.users(id),
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT budgets_name_not_empty CHECK (char_length(name) > 0)
);

-- Create budget_items table
CREATE TABLE IF NOT EXISTS budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    nivel TEXT NOT NULL,
    pai TEXT,
    fonte TEXT,
    codigo TEXT,
    discriminacao TEXT NOT NULL,
    unidade TEXT,
    quantidade NUMERIC(15, 4) DEFAULT 0,
    mat_unit NUMERIC(15, 4) DEFAULT 0,
    mo_unit NUMERIC(15, 4) DEFAULT 0,
    expandido BOOLEAN DEFAULT FALSE,
    use_total_unit BOOLEAN DEFAULT FALSE,
    source_metadata JSONB,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT budget_items_discriminacao_not_empty CHECK (char_length(discriminacao) > 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_budgets_project_id ON budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_budgets_is_active ON budgets(is_active);
CREATE INDEX IF NOT EXISTS idx_budgets_created_at ON budgets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_budget_items_budget_id ON budget_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_display_order ON budget_items(display_order);
CREATE INDEX IF NOT EXISTS idx_budget_items_nivel ON budget_items(nivel);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
CREATE TRIGGER update_budgets_updated_at
    BEFORE UPDATE ON budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF NOT EXISTS update_budget_items_updated_at ON budget_items;
CREATE TRIGGER update_budget_items_updated_at
    BEFORE UPDATE ON budget_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for budgets
DROP POLICY IF EXISTS "Users can view budgets from their projects" ON budgets;
CREATE POLICY "Users can view budgets from their projects" ON budgets
    FOR SELECT
    USING (true); -- Adjust based on your auth requirements

DROP POLICY IF EXISTS "Users can insert budgets" ON budgets;
CREATE POLICY "Users can insert budgets" ON budgets
    FOR INSERT
    WITH CHECK (true); -- Adjust based on your auth requirements

DROP POLICY IF EXISTS "Users can update budgets" ON budgets;
CREATE POLICY "Users can update budgets" ON budgets
    FOR UPDATE
    USING (true); -- Adjust based on your auth requirements

DROP POLICY IF EXISTS "Users can delete budgets" ON budgets;
CREATE POLICY "Users can delete budgets" ON budgets
    FOR DELETE
    USING (true); -- Adjust based on your auth requirements

-- Create RLS policies for budget_items
DROP POLICY IF EXISTS "Users can view budget items" ON budget_items;
CREATE POLICY "Users can view budget items" ON budget_items
    FOR SELECT
    USING (true); -- Adjust based on your auth requirements

DROP POLICY IF EXISTS "Users can insert budget items" ON budget_items;
CREATE POLICY "Users can insert budget items" ON budget_items
    FOR INSERT
    WITH CHECK (true); -- Adjust based on your auth requirements

DROP POLICY IF EXISTS "Users can update budget items" ON budget_items;
CREATE POLICY "Users can update budget items" ON budget_items
    FOR UPDATE
    USING (true); -- Adjust based on your auth requirements

DROP POLICY IF EXISTS "Users can delete budget items" ON budget_items;
CREATE POLICY "Users can delete budget items" ON budget_items
    FOR DELETE
    USING (true); -- Adjust based on your auth requirements

-- Add comments for documentation
COMMENT ON TABLE budgets IS 'Stores budget information. Each project can have multiple budgets.';
COMMENT ON TABLE budget_items IS 'Stores individual items within a budget. Each budget can have multiple items.';
COMMENT ON COLUMN budgets.project_id IS 'Foreign key to projects table. Each budget belongs to one project.';
COMMENT ON COLUMN budget_items.budget_id IS 'Foreign key to budgets table. Each item belongs to one budget.';
