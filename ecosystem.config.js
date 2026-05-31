module.exports = {
  apps: [
    {
      name: "mirch-masala-restaurant",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: "max", // Utilizes all available CPU cores for clustering in production
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "300M",
      autorestart: true,
      restart_delay: 4000,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
