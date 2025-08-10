module.exports = {
  apps: [
    {
      name: 'student-result-app',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/student-result-app',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/pm2/student-result-app-error.log',
      out_file: '/var/log/pm2/student-result-app-out.log',
      log_file: '/var/log/pm2/student-result-app-combined.log',
      time: true,
      // Restart policy
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      // Log rotation
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Health check
      min_uptime: '10s',
      max_restarts: 10
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-vps-ip',
      ref: 'origin/main',
      repo: 'https://github.com/your-username/student-result-app.git',
      path: '/var/www/student-result-app',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && npx prisma generate && npx prisma migrate deploy && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};

