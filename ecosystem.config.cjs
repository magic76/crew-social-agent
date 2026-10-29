module.exports = {
  apps: [{
    name: 'crew-social-agent',
    script: 'scripts/social-agent.mjs',
    args: 'daemon',
    interpreter: 'node',
    node_args: '--env-file=.env',
    cwd: __dirname,
    autorestart: true,
    restart_delay: 5000,
    watch: false,
    max_memory_restart: '250M',
    out_file: '.crew-social-agent/logs/out.log',
    error_file: '.crew-social-agent/logs/error.log',
    merge_logs: true,
    time: true
  }]
};
