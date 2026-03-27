import { spawn } from 'node:child_process';
import path from 'node:path';

const safeDistDir = '.next-dev/safe';

const env = {
  ...process.env,
  NEXT_DIST_DIR: safeDistDir,
};

const nextCli = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');

const child = spawn(process.execPath, [nextCli, 'dev', '--webpack'], {
  stdio: 'inherit',
  env,
});

child.on('error', (error) => {
  console.error('Failed to start Next.js dev server:', error.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
