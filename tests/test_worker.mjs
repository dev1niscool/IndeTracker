import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const root = 'https://example.github.io/IndeTracker/';

function worker() {
  const handlers = new Map();
  const storage = new Map();
  let remote = async () => new Response('{"version":1}', { status: 200 });
  const key = value => typeof value === 'string' ? value : value.url;
  const cache = {
    match: async value => storage.get(key(value))?.clone(),
    put: async (value, response) => storage.set(key(value), response.clone())
  };
  vm.runInNewContext(source, {
    URL, Request, Response, Headers,
    self: { location: { href: root + 'sw.js' }, addEventListener: (name, handler) => handlers.set(name, handler) },
    caches: { open: async () => cache },
    fetch: request => remote(request)
  });
  return {
    storage,
    setRemote(callback) { remote = callback; },
    request(path) {
      let result;
      handlers.get('fetch')({ request: new Request(root + path), respondWith: promise => result = promise });
      return result;
    }
  };
}

test('new timestamp keys replace one canonical copy of the published archive', async () => {
  const service = worker();
  await service.request('data/news.json?v=1');
  service.setRemote(async () => new Response('{"version":2}'));
  const response = await service.request('data/news.json?v=2');
  assert.equal((await response.json()).version, 2);
  assert.deepEqual([...service.storage.keys()], [root + 'data/news.json']);
});

test('a later offline visit can read the archive despite a different timestamp', async () => {
  const service = worker();
  await service.request('data/news.json?v=1');
  service.setRemote(async () => { throw new Error('offline'); });
  const response = await service.request('data/news.json?v=999');
  assert.equal(response.headers.get('X-Inde-Saved-Archive'), 'true');
  assert.equal((await response.json()).version, 1);
});

test('HTTP failures return a visibly marked saved copy, not a fake refresh', async () => {
  const service = worker();
  await service.request('data/news.json?v=1');
  service.setRemote(async () => new Response('unavailable', { status: 503 }));
  assert.equal((await service.request('data/news.json?v=2')).headers.get('X-Inde-Saved-Archive'), 'true');
});

test('versioned app assets reuse their canonical offline copy', async () => {
  const service = worker();
  await service.request('app.js?v=2');
  service.setRemote(async () => { throw new Error('offline'); });
  assert.equal((await service.request('app.js')).status, 200);
  assert.equal(service.storage.size, 1);
});
