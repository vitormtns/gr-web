import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve('dist/gr-web/browser');
const host = process.env.GR_PREVIEW_HOST || '127.0.0.1';
const port = Number(process.env.GR_PREVIEW_PORT || 4173);

if (!existsSync(join(root, 'index.html'))) {
  throw new Error('Build de produção ausente. Execute npm run build antes do preview.');
}

const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url || '/', `http://${host}`).pathname);
  const candidate = resolve(root, normalize(pathname).replace(/^[/\\]+/, ''));
  const isAssetRequest = extname(pathname) !== '';
  const safeFile = candidate.startsWith(`${root}\\`) || candidate.startsWith(`${root}/`) || candidate === root;
  const file = safeFile && existsSync(candidate) && statSync(candidate).isFile()
    ? candidate
    : isAssetRequest ? null : join(root, 'index.html');
  if (!file) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end('Arquivo não encontrado.');
    return;
  }
  const extension = extname(file);
  const immutable = /-[A-Z0-9]{8,}\.(?:css|js|woff2)$/i.test(file);
  response.writeHead(200, {
    'Content-Type': mime[extension] || 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  if (request.method === 'HEAD') response.end();
  else createReadStream(file).pipe(response);
}).listen(port, host, () => {
  console.log(`Preview de produção em http://${host}:${port}`);
});
