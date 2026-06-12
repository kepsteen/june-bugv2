import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'apps/web/dist');
const target = path.join(root, 'apps/api/public');

if (!fs.existsSync(source)) {
  console.error(`Web build output not found: ${source}`);
  console.error('Run pnpm --filter @starter/web build first.');
  process.exit(1);
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });
console.log(`Copied ${source} -> ${target}`);
