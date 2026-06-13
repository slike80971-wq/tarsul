/**
 * Next.js Keeper - Keeps the Next.js dev server alive
 */
import { spawn } from 'child_process';

function startNext() {
  const child = spawn('npx', ['next', 'dev', '-p', '3000', '-H', '0.0.0.0'], {
    cwd: '/home/z/my-project',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  child.stdout.on('data', (data: Buffer) => {
    process.stdout.write(data.toString());
  });

  child.stderr.on('data', (data: Buffer) => {
    process.stderr.write(data.toString());
  });

  child.on('exit', (code) => {
    console.log(`\nNext.js exited (${code}), restarting in 3s...`);
    setTimeout(startNext, 3000);
  });
}

console.log('Starting Next.js Keeper...');
startNext();

// Keep the process alive
setInterval(() => {}, 10000);
