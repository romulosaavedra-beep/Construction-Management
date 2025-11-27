import re

def parse_and_generate_sql(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    sql_statements = []
    current_category = None
    
    sql_statements.append("BEGIN;")
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        if line.startswith('##'):
            current_category = line.replace('##', '').strip()
        elif line.startswith('-'):
            if current_category:
                resource_name = line.replace('-', '').strip()
                # Escape single quotes
                safe_name = resource_name.replace("'", "''")
                safe_category = current_category.replace("'", "''")
                
                # Use ON CONFLICT DO NOTHING to avoid duplicates if unique constraint exists, 
                # otherwise just insert. Assuming no unique constraint on (name, category) for now, 
                # but let's check if we can make it idempotent.
                # Since we don't know if there's a unique constraint, we'll just do INSERT.
                # But to be safe against re-runs, we can use WHERE NOT EXISTS
                
                sql = f"""
                INSERT INTO resources (name, category, project_id)
                SELECT '{safe_name}', '{safe_category}', NULL
                WHERE NOT EXISTS (
                    SELECT 1 FROM resources WHERE name = '{safe_name}' AND category = '{safe_category}' AND project_id IS NULL
                );
                """
                sql_statements.append(sql.strip())

    sql_statements.append("COMMIT;")

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_statements))

parse_and_generate_sql('d:\\_PROGRAMACAO\\Construction-Management\\Recursos Padrão do Sistema.txt', 'd:\\_PROGRAMACAO\\Construction-Management\\seed_resources.sql')
