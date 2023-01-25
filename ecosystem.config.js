module.exports = {
  apps: [
    { name: 'server', script: './dist/src/main.js' },
    { name: 'jobs-main', script: './dist/fibo/main.js' },
    { name: 'jobs-retrier', script: './dist/fibo/retrier.js' },
  ],
};
