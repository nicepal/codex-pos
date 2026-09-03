/**
 * PM2 process file for Codex POS.
 *
 * Public traffic enters Nginx on 8502. Node only binds loopback ports
 * inside the assigned range 8502–8900.
 *
 *   8502  Nginx (public HTTP)
 *   8510  API + Socket.IO (127.0.0.1)
 *   worker has no HTTP port
 */
const path = require('path');

const root = path.resolve(__dirname, '..');
const backend = path.join(root, 'backend');

module.exports = {
  apps: [
    {
      name: 'codexpos-api',
      cwd: backend,
      script: 'src/server.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      time: true,
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: 8510,
      },
    },
    {
      name: 'codexpos-worker',
      cwd: backend,
      script: 'src/workers/index.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
