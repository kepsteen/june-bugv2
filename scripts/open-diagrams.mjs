import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'docs/diagrams/index.html');

const openInBrowser = () => {
  if (process.platform === 'darwin') {
    return execFile('open', [indexPath]);
  }

  if (process.platform === 'win32') {
    return execFile('cmd', ['/c', 'start', '', indexPath], { shell: true });
  }

  return execFile('xdg-open', [indexPath]);
};

console.log(`Opening ${indexPath}`);
openInBrowser().on('error', (error) => {
  console.error('Failed to open diagrams:', error.message);
  process.exit(1);
});
