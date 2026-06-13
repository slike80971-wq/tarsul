const { spawn } = require('child_process');

function startServer() {
  const child = spawn('npx', ['next', 'dev', '-p', '3000', '-H', '0.0.0.0'], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  child.on('exit', (code) => {
    console.log(`Server exited with code ${code}, restarting in 2s...`);
    setTimeout(startServer, 2000);
  });

  return child;
}

console.log('Starting Next.js keep-alive daemon...');
startServer();