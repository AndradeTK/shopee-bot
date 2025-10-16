module.exports = {
  apps: [{
    name: 'shopee-bot',
    script: 'npm',
    args: 'run dev',
    watch: false // Importante: Desativamos o watch do PM2
  }]
};
