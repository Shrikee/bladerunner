module.exports = {
  apps: [
    {
      name: 'alpha-decoder',
      script: 'index.js',
      watch: '.',
      node_args: '--max_old_space_size=4096',
    },
  ],
};
