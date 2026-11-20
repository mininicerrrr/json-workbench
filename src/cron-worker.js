import {nextRuns} from './cron.js';

self.onmessage = e => {
  const {id, expression, timeZone, count, fromMs} = e.data;
  self.postMessage({id, lifecycle: 'started'});
  try {
    const result = nextRuns(expression, timeZone, count, fromMs ?? Date.now());
    self.postMessage({id, result});
  } catch (error) {
    self.postMessage({id, error: error.message || String(error)});
  }
};