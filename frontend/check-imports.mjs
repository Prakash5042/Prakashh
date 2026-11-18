import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const files = [
  'src/main.jsx',
  'src/App.jsx', 
  'src/layouts/MainLayout.jsx',
  'src/pages/Home.jsx',
  'src/components/Downloader.jsx',
  'src/components/Navbar.jsx',
  'src/components/ToolPanel.jsx',
  'src/hooks/useProcessor.js',
  'src/services/api.js',
];

const exts = ['.jsx', '.js', '.ts', '.tsx', ''];

function tryResolve(base, imp) {
  if (!imp.startsWith('.')) return true; // external package, skip
  const candidates = [
    join(dirname(base), imp),
    ...exts.map(e => join(dirname(base), imp + e)),
    join(dirname(base), imp, 'index.js'),
    join(dirname(base), imp, 'index.jsx'),
  ];
  return candidates.some(c => existsSync(c));
}

let ok = true;
files.forEach(f => {
  const absFile = join(__dirname, f);
  if (!existsSync(absFile)) { console.log('MISSING FILE: ' + f); ok = false; return; }
  const content = readFileSync(absFile, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    const m = line.match(/from\s+['"](.+)['"]/);
    if (m) {
      const imp = m[1];
      if (!tryResolve(absFile, imp)) {
        console.log('BAD IMPORT in ' + f + ':' + (i+1) + ' -> ' + imp);
        ok = false;
      }
    }
  });
});

if (ok) console.log('All imports look resolvable!');
