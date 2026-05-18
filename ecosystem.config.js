// PM2 进程管理配置（本地服务器）
module.exports = {
  apps: [{
    name: 'sellerfast-api',
    script: './backend/src/index.js',
    cwd: '/home/lighthouse/project/sellerfast',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/home/lighthouse/project/sellerfast/logs/error.log',
    out_file: '/home/lighthouse/project/sellerfast/logs/out.log',
    max_memory_restart: '300M',
  }]
};
