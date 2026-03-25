// PM2 Ecosystem Configuration - iuria LexFutura
// Use: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: "iuria-api",
      script: "npx",
      args: "tsx server/index.ts",
      cwd: "/app",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 5000,
      },
      error_file: "./logs/api-error.log",
      out_file: "./logs/api-out.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "iuria-worker",
      script: "python3",
      args: "scraper/workers/monitoring_worker.py run_daemon 300",
      cwd: "/app",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env: {
        API_BASE_URL: "http://localhost:5000",
        NODE_ENV: "production",
      },
      error_file: "./logs/worker-error.log",
      out_file: "./logs/worker-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
