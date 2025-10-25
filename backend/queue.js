const { Queue } = require('bullmq');

const redisConnection = {
  host: process.env.REDIS_URL.split('//')[1].split(':')[0] || 'localhost',
  port: process.env.REDIS_URL.split(':')[2] || 6379,
};

// This queue will handle all resource processing jobs
const resourceQueue = new Queue('resource-processing', {
  connection: redisConnection,
});

module.exports = { resourceQueue };
