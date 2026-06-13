const { spawn } = require('child_process');
const fs = require('fs');
const log = fs.openSync('/home/z/my-project/dev.log', 'a');
const logErr = fs.openSync('/home/z/my-project/dev.log', 'a');

function start() {
  const child = spawn('npx', ['next', 'dev', '-p', '3000', '-H', '0.0.0.0'], {
    cwd: '/home/z/my-project',
    detached: true,
    stdio: [ 'ignore', log, logErr ],
    env: { ...process.env },
  });
  child.unref();
  child.on('exit', () => {
    fs.writeSync(logErr, `[${new Date().toISOString()}] Restarting...\n`);
    setTimeout(start, 2000);
  });
  fs.writeSync(log, `[${new Date().toISOString()}] Next.js started (pid ${child.pid})\n`);
}
start();

// Keep the daemon alive by writing heartbeat every 5 seconds
setInterval(() => {
  fs.appendFileSync('/home/z/my-project/.heartbeat', `${Date.now()}\n`);
}, 5000);
