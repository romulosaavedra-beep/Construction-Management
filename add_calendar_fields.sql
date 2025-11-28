-- Adicionar campos de calendário à tabela projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS work_schedule TEXT DEFAULT 'mon-fri';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS half_day_saturday BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS half_day_sunday BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS custom_holidays JSONB DEFAULT '[]';

-- Comentários explicativos
COMMENT ON COLUMN projects.work_schedule IS 'Padrão de trabalho semanal: mon-fri, mon-sat, mon-sat-half, mon-sun, mon-sun-half';
COMMENT ON COLUMN projects.half_day_saturday IS 'Se sábado é meio turno';
COMMENT ON COLUMN projects.half_day_sunday IS 'Se domingo é meio turno';
COMMENT ON COLUMN projects.custom_holidays IS 'Feriados customizados específicos do projeto (formato: [{date: "YYYY-MM-DD", name: "Nome"}])';
