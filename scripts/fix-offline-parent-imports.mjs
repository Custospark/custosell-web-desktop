/**
 * Files moved from offline/*.ts to offline/{module}/*.ts need one extra ../
 * for imports that escape the offline folder (store, api, slices, shared, modules).
 */
import fs from 'fs';
import path from 'path';

const OFFLINE = path.resolve(import.meta.dirname, '../src/renderer/app/store/offline');

const REPLACEMENTS = [
  [/from (['"])\.\.\/(store|slices)\//g, 'from $1../../$2/'],
  [/from (['"])\.\.\/(store|slices)\1/g, 'from $1../../$2$1'],
  [/from (['"])\.\.\/\.\.\/api\//g, 'from $1../../../api/'],
  [/from (['"])\.\.\/\.\.\/\.\.\/(shared|modules)\//g, 'from $1../../../../$2/'],
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  for (const [pattern, replacement] of REPLACEMENTS) {
    content = content.replace(pattern, replacement);
  }
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

let count = 0;
for (const entry of fs.readdirSync(OFFLINE, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name === 'testing') continue;
  const dir = path.join(OFFLINE, entry.name);
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.ts')) continue;
    if (fixFile(path.join(dir, file))) count++;
  }
}
console.log(`Fixed parent imports in ${count} files`);
