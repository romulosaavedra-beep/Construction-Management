const fs = require('fs');
const path = require('path');

const inputFile = 'd:\\_PROGRAMACAO\\Construction-Management\\Recursos Padrão do Sistema.txt';
const outputFile = 'd:\\_PROGRAMACAO\\Construction-Management\\seed_resources.sql';

try {
    const data = fs.readFileSync(inputFile, 'utf8');
    const lines = data.split('\n');

    let sqlStatements = [];
    let currentCategory = null;

    sqlStatements.push("BEGIN;");

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (line.startsWith('##')) {
            currentCategory = line.replace('##', '').trim();
        } else if (line.startsWith('-')) {
            if (currentCategory) {
                const resourceName = line.replace('-', '').trim();
                const safeName = resourceName.replace(/'/g, "''");
                const safeCategory = currentCategory.replace(/'/g, "''");

                const sql = `INSERT INTO resources (name, category, project_id) SELECT '${safeName}', '${safeCategory}', NULL WHERE NOT EXISTS (SELECT 1 FROM resources WHERE name = '${safeName}' AND category = '${safeCategory}' AND project_id IS NULL);`;
                sqlStatements.push(sql);
            }
        }
    }

    sqlStatements.push("COMMIT;");

    fs.writeFileSync(outputFile, sqlStatements.join('\n'), 'utf8');
    console.log('SQL file generated successfully.');
} catch (err) {
    console.error('Error:', err);
}
