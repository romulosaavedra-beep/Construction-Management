# Instruções para Executar a Migration do Supabase

## Pré-requisitos

1. Acesso ao Dashboard do Supabase
2. Projeto Supabase já configurado
3. Tabela `projects` já existente

## Passo a Passo

### Opção 1: Via Dashboard do Supabase (Recomendado)

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Navegue para **SQL Editor** no menu lateral
4. Clique em **New Query**
5. Cole todo o conteúdo do arquivo `migrations/001_create_budget_tables.sql`
6. Clique em **Run** para executar a migration

### Opção 2: Via Supabase CLI (Avançado)

```bash
# 1. Install Supabase CLI (se ainda não tiver)
npm install -g supabase

# 2. Login no Supabase
supabase login

# 3. Link ao projeto
supabase link --project-ref seu-project-ref

# 4. Execute a migration
supabase db push
```

## Verificação Pós-Migration

Execute as seguintes queries para verificar que tudo foi criado corretly:

```sql
-- 1. Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('budgets', 'budget_items', 'budget_column_settings');

-- 2. Verificar RLS habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('budgets', 'budget_items', 'budget_column_settings');

-- 3. Verificar policies criadas
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('budgets', 'budget_items', 'budget_column_settings');

-- 4. Verificar indexes criados
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('budgets', 'budget_items', 'budget_column_settings');
```

## Troubleshooting

### Erro: "relation projects does not exist"
A tabela `projects` precisa existir antes. Verifique se foi criada em migrations anteriores.

### Erro: "permission denied"
Verifique se você está conectado com as credenciais corretas e tem permissões de admin no projeto.

### Erro: "already exists"
Se a migration já foi executada parcialmente, você pode dropar as tabelas e reexecutar:

```sql
DROP TABLE IF EXISTS budget_column_settings CASCADE;
DROP TABLE IF EXISTS budget_items CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
```

**ATENÇÃO**: Isso irá deletar todos os dados!

## Próximos Passos

Após executar a migration com sucesso:

1. ✅ Testar hook `useBudgets` no frontend
2. ✅ Executar migração de dados do localStorage
3. ✅ Atualizar componente `Orcamento.tsx` para usar Supabase
