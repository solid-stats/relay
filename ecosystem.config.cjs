module.exports = {
  apps: [
    {
      name: 'sg-stats-relay',
      script: 'src/server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: 8787
      }
    }
  ]
};
