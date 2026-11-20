import {runRegex} from './regex-engine.js';

self.onmessage = e => {
  const id = e.data.id;
  try {
    const result = runRegex(e.data);
    self.postMessage({id, result});
  } catch (error) {
    self.postMessage({id, error: error.message || String(error)});
  }
};