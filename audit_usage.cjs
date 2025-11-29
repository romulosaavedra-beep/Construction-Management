const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const extensions = ['.tsx', '.ts'];

function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== '.agent') {
                getAllFiles(filePath, fileList);
            }
        } else {
            if (extensions.includes(path.extname(file))) {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}

const allFiles = getAllFiles(projectRoot);

function getImports(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const importRegex = /import\s+.*?\s+from\s+['"](.*?)['"]/g;
    const imports = [];
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
    }
    // Also check for dynamic imports if any (rare in this project but good practice)
    const dynamicImportRegex = /import\(['"](.*?)['"]\)/g;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
        imports.push(match[1]);
    }
    return imports;
}

// Map of file basenames to their full paths (for easier checking)
// Note: This is a simplification. Ideally we resolve paths.
// But checking if the filename appears in imports is a good heuristic for "is used".
// If we want to be strict, we should resolve.

// Let's try a simpler approach first: Text search.
// If a file is named "Button.tsx", we search for "Button" in all other files.
// This might have false positives (e.g. variable named Button), but false negatives are unlikely if we search for import paths.

// Better approach:
// 1. Identify target files to check (components/*, modules/*).
// 2. For each target file, check if its path (relative or alias) or filename is mentioned in any other file.

const targets = [
    ...getAllFiles(path.join(projectRoot, 'components')),
    ...getAllFiles(path.join(projectRoot, 'modules'))
];

const unusedFiles = [];

targets.forEach(target => {
    const targetName = path.basename(target, path.extname(target));
    // We skip index files usually as they are entry points, but here we check if they are used.

    let isUsed = false;

    // Special case: App.tsx uses modules, index.tsx uses App.
    if (targetName === 'App' || targetName === 'index') return;

    for (const file of allFiles) {
        if (file === target) continue; // Don't check self

        const content = fs.readFileSync(file, 'utf-8');

        // Check for import of the file
        // We check for the filename without extension in import statements
        // This is a heuristic.
        // Example: import { Button } from './Button'; -> matches "Button"
        // Example: import Button from './Button'; -> matches "Button"

        // We can check if the filename appears in the content.
        // This is very broad but safe. If "Button" never appears in any other file, it's definitely unused.
        if (content.includes(targetName)) {
            isUsed = true;
            break;
        }
    }

    if (!isUsed) {
        unusedFiles.push(path.relative(projectRoot, target));
    }
});

console.log('Potential Unused Files:');
unusedFiles.forEach(f => console.log(f));
