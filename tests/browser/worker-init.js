const Orig = Worker;
const ops = {construct: 0, terminate: 0};
window.__workerOps = ops;
window.Worker = function PatchedWorker(...args) {
  ops.construct += 1;
  const w = new Orig(...args);
  const origTerm = w.terminate.bind(w);
  w.terminate = function patchedTerminate() {
    ops.terminate += 1;
    return origTerm();
  };
  return w;
};
window.Worker.prototype = Orig.prototype;