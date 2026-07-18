module.exports = {
  apps: [
    {
      name: "tenderlens",
      script: "npm",
      args: "run start:4000",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: "4000"
      },
      max_memory_restart: "768M"
    }
  ]
};
