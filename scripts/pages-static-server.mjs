/** Minimal static server: dist mounted at /json-workbench/ — no SPA fallback. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const prefix = '/json-workbench';

const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.txt': 'text/plain', '.json': 'application/json'};

http.createServer((req, res) => {
  if (!req.url?.startsWith(prefix)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  let rel = req.url.slice(prefix.length).split('?')[0] || '/';
  if (rel.endsWith('/')) rel = rel.slice(0, -1) || '/';
  const relFile = rel === '/' ? 'index.html' : rel.replace(/^\//, '');
  const file = path.normalize(path.join(dist, relFile));
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  const ext = path.extname(file);
  res.writeHead(200, {'Content-Type': types[ext] || 'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.PORT || 5299), '127.0.0.1');