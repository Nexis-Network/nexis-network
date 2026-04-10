import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

console.log('Starting dead file cleanup...');
const deadText = fs.readFileSync('purely_dead.txt', 'utf8');
const lines = deadText.split('\n').filter(Boolean);

const files = new Set();
for (const line of lines) {
  const match = line.match(/^([^:]+):/);
  if (match) {
    files.add(match[1]);
  }
}

let deletedCount = 0;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  try {
    // Only process files in src or tests
    if (!file.startsWith('src/') && !file.startsWith('tests/')) continue;
    
    const parsed = path.parse(file);
    const importName = parsed.name;
    
    // Extremely common names or Next.js conventions are too risky to grep effectively
    if (['index', 'route', 'page', 'layout', 'constants', 'types', 'utils', 'default', 'config', 'schema'].includes(importName)) {
       continue;
    }

    // Find if the filename is imported/referenced anywhere else
    const grepCmd = `git grep -l "${importName}" || true`;
    const grepOut = execSync(grepCmd, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    
    // Filter out the file itself, our analysis txt files, and markdown docs
    const references = grepOut.filter(f => 
      f !== file && 
      !f.includes('purely_dead') && 
      !f.includes('dead_code') && 
      !f.endsWith('.md') && 
      !f.includes('package.json')
    );
    
    if (references.length === 0) {
      console.log(`Deleting completely unreferenced file: ${file}`);
      fs.unlinkSync(file);
      deletedCount++;
    }
  } catch (e) {
    console.error(`Error processing ${file}: ${e.message}`);
  }
}

console.log(`Cleanup complete. Deleted ${deletedCount} fully unreferenced files.`);
