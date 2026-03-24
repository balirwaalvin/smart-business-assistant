import { spawn } from 'node:child_process';

const port = process.env.PORT || '3000';
const host = process.env.HOSTNAME || '0.0.0.0';
const nextBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const child = spawn(nextBin, ['next', 'start', '-p', port, '-H', host], {
  stdio: 'inherit',
  shell: false,
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
