/**
 * Tiny demo REST API ("Petstore-lite") used as the system under test.
 * It also serves the OpenAPI spec and Prometheus metrics so the whole
 * QA pipeline can run locally with zero external dependencies.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client';
import { UI_HTML } from './ui.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3000', 10);
const SPEC_PATH = path.resolve(__dirname, '../../specs/petstore-openapi.json');

// ---------- Observability ----------
const registry = new Registry();
collectDefaultMetrics({ register: registry });

const httpRequests = new Counter({
  name: 'qa_demo_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});
const httpDuration = new Histogram({
  name: 'qa_demo_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [registry],
});

// ---------- In-memory data ----------
interface Pet {
  id: number;
  name: string;
  tag?: string;
  status: 'available' | 'pending' | 'sold';
}
const pets = new Map<number, Pet>();
let nextId = 1;
// seed
for (const p of [
  { name: 'Rex', tag: 'dog', status: 'available' as const },
  { name: 'Whiskers', tag: 'cat', status: 'pending' as const },
  { name: 'Goldie', tag: 'fish', status: 'sold' as const },
]) {
  pets.set(nextId, { id: nextId, ...p });
  nextId++;
}

// ---------- Helpers ----------
function send(res: ServerResponse, status: number, body?: unknown, headers: Record<string, string> = {}) {
  const payload = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    ...headers,
  });
  res.end(payload);
}

async function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('invalid-json'));
      }
    });
    req.on('error', reject);
  });
}

// ---------- Routing ----------
const server = createServer(async (req, res) => {
  const start = process.hrtime.bigint();
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const route = routeKey(req.method || 'GET', url.pathname);
  let status = 500;

  const finish = () => {
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequests.inc({ method: req.method || 'GET', route, status: String(status) });
    httpDuration.observe({ method: req.method || 'GET', route }, seconds);
  };

  try {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      status = 204;
      return send(res, 204);
    }

    // Health & meta
    if (url.pathname === '/health') {
      status = 200;
      return send(res, 200, { status: 'ok', uptime: process.uptime() });
    }
    if (url.pathname === '/metrics') {
      status = 200;
      res.writeHead(200, { 'Content-Type': registry.contentType });
      return res.end(await registry.metrics());
    }
    if (url.pathname === '/openapi.json') {
      status = 200;
      const spec = await readFile(SPEC_PATH, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(spec);
    }

    if (url.pathname === '/ui' || url.pathname === '/ui/') {
      status = 200;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(UI_HTML);
    }

    // GET /pets
    if (req.method === 'GET' && url.pathname === '/pets') {
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      const statusFilter = url.searchParams.get('status');
      let list = Array.from(pets.values());
      if (statusFilter) list = list.filter((p) => p.status === statusFilter);
      status = 200;
      return send(res, 200, list.slice(0, limit));
    }

    // POST /pets
    if (req.method === 'POST' && url.pathname === '/pets') {
      let body: any;
      try {
        body = await readBody(req);
      } catch {
        status = 400;
        return send(res, 400, { error: 'Malformed JSON body' });
      }
      if (!body || typeof body.name !== 'string' || body.name.length < 1) {
        status = 422;
        return send(res, 422, { error: 'Validation failed', details: ['name is required'] });
      }
      const pet: Pet = {
        id: nextId++,
        name: body.name,
        tag: body.tag,
        status: body.status || 'available',
      };
      pets.set(pet.id, pet);
      status = 201;
      return send(res, 201, pet);
    }

    // GET /pets/:id
    const petMatch = url.pathname.match(/^\/pets\/(\d+)$/);
    if (petMatch) {
      const id = parseInt(petMatch[1], 10);
      const pet = pets.get(id);

      if (req.method === 'GET') {
        if (!pet) {
          status = 404;
          return send(res, 404, { error: 'Pet not found' });
        }
        status = 200;
        return send(res, 200, pet);
      }

      if (req.method === 'DELETE') {
        if (!pet) {
          status = 404;
          return send(res, 404, { error: 'Pet not found' });
        }
        pets.delete(id);
        status = 204;
        return send(res, 204);
      }

      if (req.method === 'PUT') {
        if (!pet) {
          status = 404;
          return send(res, 404, { error: 'Pet not found' });
        }
        let body: any;
        try {
          body = await readBody(req);
        } catch {
          status = 400;
          return send(res, 400, { error: 'Malformed JSON body' });
        }
        if (body !== undefined && (typeof body !== 'object' || body === null || Array.isArray(body))) {
      status = 400;
      return send(res, 400, { error: 'Request body must be a JSON object' });
    }
    if (body?.name !== undefined) pet.name = body.name;
        if (body?.tag !== undefined) pet.tag = body.tag;
        if (body?.status !== undefined) pet.status = body.status;
        status = 200;
        return send(res, 200, pet);
      }
    }

    // GET /pets/:id — non-numeric id -> 400
    if (req.method === 'GET' && /^\/pets\/[^/]+$/.test(url.pathname)) {
      status = 400;
      return send(res, 400, { error: 'Invalid pet id' });
    }

    // GET /store/inventory
    if (req.method === 'GET' && url.pathname === '/store/inventory') {
      const inv: Record<string, number> = {};
      for (const p of pets.values()) inv[p.status] = (inv[p.status] || 0) + 1;
      status = 200;
      return send(res, 200, inv);
    }

    status = 404;
    return send(res, 404, { error: 'Not found', path: url.pathname });
  } catch (err) {
    status = 500;
    return send(res, 500, { error: 'Internal server error', detail: String(err) });
  } finally {
    finish();
  }
});

function routeKey(method: string, pathname: string): string {
  if (/^\/pets\/\d+$/.test(pathname)) return `${method} /pets/:id`;
  if (/^\/pets\/[^/]+$/.test(pathname)) return `${method} /pets/:id`;
  return `${method} ${pathname}`;
}

server.listen(PORT, () => {
  console.log(`\n🐾  QA Demo API listening on http://localhost:${PORT}`);
  console.log(`    OpenAPI spec:  http://localhost:${PORT}/openapi.json`);
  console.log(`    Metrics:       http://localhost:${PORT}/metrics`);
  console.log(`    Health:        http://localhost:${PORT}/health\n`);
});