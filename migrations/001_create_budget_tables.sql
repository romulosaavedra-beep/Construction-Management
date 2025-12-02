-- =====================================================
-- MIGRATION: Create Budget Tables for Orçamento Module
-- Description: Tables for budget management with Supabase
-- Author: Construction Management System
-- Date: 2025-12-01
-- =====================================================

-- ============================================================
-- TABLE 1: budgets
-- Description: Main budget container for each project
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'Orçamento Principal',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  last_modified_by UUID REFERENCES auth.users(id),
  version INTEGER DEFAULT 1 NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- Metadata for extensibility
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Unique constraint: one budget name per project
  CONSTRAINT unique_budget_name_per_project UNIQUE(project_id, name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_budgets_project_id ON budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_budgets_is_active ON budgets(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_budgets_created_at ON budgets(created_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_budgets_updated_at();

-- Comments
COMMENT ON TABLE budgets IS 'Budget containers for construction projects';
COMMENT ON COLUMN budgets.version IS 'Version number for optimistic locking';
COMMENT ON COLUMN budgets.metadata IS 'Extensible JSON field for future features';


-- ============================================================
-- TABLE 2: budget_items
-- Description: Individual line items within a budget (hierarchical)
-- ============================================================
CREATE TABLE IF NOT EXISTS budget_items (
  id BIGSERIAL PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  
  -- Hierarchy fields
  nivel VARCHAR(50) NOT NULL,
  pai BIGINT REFERENCES budget_items(id) ON DELETE CASCADE,
  
  -- Core budget data
  fonte VARCHAR(100),
  codigo VARCHAR(100),
  discriminacao TEXT NOT NULL,
  unidade VARCHAR(50),
  quantidade NUMERIC(15, 4) DEFAULT 0 NOT NULL,
  mat_unit NUMERIC(15, 2) DEFAULT 0 NOT NULL,
  mo_unit NUMERIC(15, 2) DEFAULT 0 NOT NULL,
  
  -- UI state
  expandido BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- AI import metadata
  use_total_unit BOOLEAN DEFAULT FALSE,
  source_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit & ordering
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  display_order INTEGER,
  
  -- Constraints
  CONSTRAINT check_valid_unidade CHECK (unidade IS NULL OR LENGTH(unidade) <= 50),
  CONSTRAINT check_positive_quantidade CHECK (quantidade >= 0),
  CONSTRAINT check_positive_mat_unit CHECK (mat_unit >= 0),
  CONSTRAINT check_positive_mo_unit CHECK (mo_unit >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_budget_items_budget_id ON budget_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_pai ON budget_items(pai);
CREATE INDEX IF NOT EXISTS idx_budget_items_nivel ON budget_items(nivel);
CREATE INDEX IF NOT EXISTS idx_budget_items_display_order ON budget_items(budget_id, display_order);
CREATE INDEX IF NOT EXISTS idx_budget_items_discriminacao ON budget_items USING gin(to_tsvector('portuguese', discriminacao));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_budget_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_budget_items_updated_at
  BEFORE UPDATE ON budget_items
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_items_updated_at();

-- Comments
COMMENT ON TABLE budget_items IS 'Line items for budgets with hierarchical structure';
COMMENT ON COLUMN budget_items.nivel IS 'Hierarchical level (e.g., "1.2.3")';
COMMENT ON COLUMN budget_items.pai IS 'Parent item ID for hierarchy';
COMMENT ON COLUMN budget_items.use_total_unit IS 'Whether to use total unit value (no Material/MO split)';
COMMENT ON COLUMN budget_items.source_metadata IS 'Metadata from AI import or manual entry';
COMMENT ON COLUMN budget_items.display_order IS 'Order of items in the budget for UI display';


-- ============================================================
-- TABLE 3: budget_column_settings
-- Description: User preferences for column visibility/width
-- ============================================================
CREATE TABLE IF NOT EXISTS budget_column_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Column configuration
  hidden_columns JSONB DEFAULT '["mat_mo_total"]'::jsonb,
  pinned_columns JSONB DEFAULT '[]'::jsonb,
  column_widths_view JSONB,
  column_widths_edit JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- One setting per user per project
  CONSTRAINT unique_settings_per_user_project UNIQUE(project_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_budget_column_settings_project_user ON budget_column_settings(project_id, user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_budget_column_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_budget_column_settings_updated_at
  BEFORE UPDATE ON budget_column_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_column_settings_updated_at();

-- Comments
COMMENT ON TABLE budget_column_settings IS 'User preferences for budget table columns';
COMMENT ON COLUMN budget_column_settings.hidden_columns IS 'Array of hidden column IDs';
COMMENT ON COLUMN budget_column_settings.pinned_columns IS 'Array of pinned column IDs';


-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_column_settings ENABLE ROW LEVEL SECURITY;

-- Budgets: Users can view/edit budgets from their projects
CREATE POLICY "Users can view budgets from their projects"
  ON budgets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = budgets.project_id
    )
  );

CREATE POLICY "Users can insert budgets to their projects"
  ON budgets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = budgets.project_id
    )
  );

CREATE POLICY "Users can update budgets from their projects"
  ON budgets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = budgets.project_id
    )
  );

CREATE POLICY "Users can delete budgets from their projects"
  ON budgets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = budgets.project_id
    )
  );

-- Budget Items: Users can view/edit items from their budgets
CREATE POLICY "Users can view budget items"
  ON budget_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budgets
      JOIN projects ON budgets.project_id = projects.id
      WHERE budgets.id = budget_items.budget_id
    )
  );

CREATE POLICY "Users can insert budget items"
  ON budget_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budgets
      JOIN projects ON budgets.project_id = projects.id
      WHERE budgets.id = budget_items.budget_id
    )
  );

CREATE POLICY "Users can update budget items"
  ON budget_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM budgets
      JOIN projects ON budgets.project_id = projects.id
      WHERE budgets.id = budget_items.budget_id
    )
  );

CREATE POLICY "Users can delete budget items"
  ON budget_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM budgets
      JOIN projects ON budgets.project_id = projects.id
      WHERE budgets.id = budget_items.budget_id
    )
  );

-- Column Settings: Users can only access their own settings
CREATE POLICY "Users can view their own column settings"
  ON budget_column_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own column settings"
  ON budget_column_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own column settings"
  ON budget_column_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own column settings"
  ON budget_column_settings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- GRANTS (if needed for service role)
-- ============================================================
-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON budgets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON budget_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON budget_column_settings TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE budget_items_id_seq TO authenticated;
