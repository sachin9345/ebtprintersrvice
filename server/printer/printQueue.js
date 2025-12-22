const { logError } = require("../utils/logger");


let queue = Promise.resolve();

function enqueue(job) {
  queue = queue.then(job).catch(logError);
  return queue;
}

module.exports = { enqueue };
