// Kills any process using PORT before the dev server starts
const { execSync } = require('child_process');
const PORT = process.env.PORT || 4000;
try {
  const out = execSync('netstat -ano').toString();
  const re  = new RegExp(`0\\.0\\.0\\.0:${PORT}\\s+\\S+\\s+LISTENING\\s+(\\d+)`);
  const m   = out.match(re);
  if (m) {
    execSync(`taskkill /PID ${m[1]} /F /T`, { stdio: 'ignore' });
    console.log(`Freed port ${PORT} (killed PID ${m[1]})`);
  }
} catch (e) { /* nothing to kill */ }
