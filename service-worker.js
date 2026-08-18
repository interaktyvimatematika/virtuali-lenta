/* Virtuali lenta – GitHub outage protection / offline application shell.
   Build: P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.7.10.11.17.13-OFFLINE-COLD-START-RECONCILE

   Principai:
   - pagrindinis tos pačios kilmės HTML/CSS/JS komplektas išsaugomas atominiu būdu;
   - jei bent vienas pagrindinis failas nepasiekiamas diegimo metu, naujas SW neaktyvuojamas;
   - navigacijai pirmiausia bandomas tinklas, o GitHub nepasiekiant grąžinama paskutinė pilna kopija;
   - versijuoti statiniai failai imami iš tiksliai tos pačios cache kartos;
   - MathLive/Firebase CDN resursai papildomai kaupiami runtime cache, bet nėra būtini SW aktyvacijai. */

const SHELL_BUILD = 'P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.7.10.11.17.13-OFFLINE-COLD-START-RECONCILE';
const SHELL_PREFIX = 'virtuali-lenta-shell-';
const SHELL_CACHE = SHELL_PREFIX + SHELL_BUILD;
const RUNTIME_CACHE = 'virtuali-lenta-runtime-v1';
const NAVIGATION_NETWORK_TIMEOUT_MS = 2200;

const PRECACHE_RELATIVE = [
  './',
  './index.html',
  './styles.css?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.7.10.9.1-BOARD-STYLUS-FIT-WIDTH-GEOMETRY-HARDENING',
  './tasks.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.2',
  './app-bootstrap.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.2',
  './ui-tooltip.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.2',
  './app-state.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.2',
  './board-grid.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.2',
  './board-camera.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.2',
  './board-drawing.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.2',
  './board-input.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.2',
  './board-stylus-fit-patch.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.7.10.11.17.13-OFFLINE-COLD-START-RECONCILE',
  './board-objects.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.2',
  './board-object-factory.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.2',
  './board-text-editor.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.2',
  './board-math-field.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.2',
  './board-math-toolbar.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.2',
  './board-practice-ui.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.2',
  './math-semantic-input.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.7.10.9.1-BOARD-STYLUS-FIT-WIDTH-GEOMETRY-HARDENING',
  './app.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.7.10.11.17.13-OFFLINE-COLD-START-RECONCILE',
  './p2-lessons.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.7.10.11.16-FIRST-LESSON-LOCK-TEST-CLOCK',
  './grade10-review-v6-patch.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.7.10.11.16-FIRST-LESSON-LOCK-TEST-CLOCK',
  './grade11b-review-v2-patch.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.7.10.11.17.3-GRADE11B-REVIEW-V2-LATEX',
  './p2-catalog.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.2',
  './p2-library-ui.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.2',
  './p2-rich-prompt-editor.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.5',
  './p2-library-editor.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.7.10.9.1-BOARD-STYLUS-FIT-WIDTH-GEOMETRY-HARDENING',
  './p327-library-editor-semantic-bridge.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.7.10.9.1-BOARD-STYLUS-FIT-WIDTH-GEOMETRY-HARDENING',
  './p2-students-ui.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.2',
  './p2-schedule-ui.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.2',
  './p2-progress-draft.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.2',
  './p2-ui.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.7.10.11.17.5.1-SAMANTA-UNWORKED-V1-CLEANUP',
  './online-sync.js?v=P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.7.10.11.17.13-OFFLINE-COLD-START-RECONCILE'
];

const EXTERNAL_SEED_URLS = [
  'https://cdn.jsdelivr.net/npm/mathlive@0.110.0/mathlive.min.js',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js'
];

function scopeUrl(relative) {
  return new URL(relative, self.registration.scope).href;
}

function isCacheableResponse(response) {
  return !!response && (response.ok || response.type === 'opaque');
}

async function seedExternalRuntimeCache() {
  const cache = await caches.open(RUNTIME_CACHE);
  await Promise.allSettled(EXTERNAL_SEED_URLS.map(async url => {
    const request = new Request(url, { mode: 'cors', credentials: 'omit', cache: 'reload' });
    const response = await withTimeout(
      signal => fetch(request, { signal }),
      3000
    );
    if (isCacheableResponse(response)) await cache.put(request, response.clone());
  }));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const requests = PRECACHE_RELATIVE.map(relative =>
      new Request(scopeUrl(relative), { cache: 'reload', credentials: 'same-origin' })
    );
    // addAll yra tyčia: tai atominis saugiklis. Vieno core failo klaida = sena veikianti versija lieka aktyvi.
    await cache.addAll(requests);
    await seedExternalRuntimeCache();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => {
      if (key.startsWith(SHELL_PREFIX) && key !== SHELL_CACHE) return caches.delete(key);
      return Promise.resolve(false);
    }));
    await self.clients.claim();
  })());
});

async function withTimeout(promiseFactory, ms) {
  const controller = new AbortController();
  let timer = null;
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        try { controller.abort(); } catch (_) {}
        reject(new Error('network-timeout'));
      }, ms);
    });
    return await Promise.race([promiseFactory(controller.signal), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function navigationResponse(request) {
  try {
    const response = await withTimeout(
      signal => fetch(request, { signal, cache: 'no-store' }),
      NAVIGATION_NETWORK_TIMEOUT_MS
    );
    if (response && response.ok) return response;
    throw new Error('navigation-network-failed');
  } catch (_) {
    const cache = await caches.open(SHELL_CACHE);
    return (await cache.match(scopeUrl('./index.html')))
      || (await cache.match(scopeUrl('./')))
      || new Response(
        '<!doctype html><meta charset="utf-8"><title>Virtuali lenta</title><body style="font-family:system-ui;padding:24px">Programos vietinė kopija dar neparuošta. Prisijunk prie interneto ir bent kartą sėkmingai atidaryk lentą.</body>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
  }
}

async function sameOriginAssetResponse(request) {
  const shell = await caches.open(SHELL_CACHE);
  const exact = await shell.match(request);
  if (exact) return exact;

  const runtime = await caches.open(RUNTIME_CACHE);
  const runtimeExact = await runtime.match(request);
  if (runtimeExact) return runtimeExact;

  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      await runtime.put(request, response.clone());
      return response;
    }
    throw new Error('static-network-failed');
  } catch (_) {
    // Atsarginis kelias senesnei pilnai kopijai, jei naujas HTML jau gautas, o GitHub nutrūko tarp užklausų.
    const fallback = await shell.match(request, { ignoreSearch: true });
    if (fallback) return fallback;
    const runtimeFallback = await runtime.match(request, { ignoreSearch: true });
    if (runtimeFallback) return runtimeFallback;
    return Response.error();
  }
}

function shouldRuntimeCacheExternal(url) {
  if (url.hostname === 'cdn.jsdelivr.net') return true;
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/10.12.5/')) return true;
  return false;
}

async function externalRuntimeResponse(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) await cache.put(request, response.clone());
    return response;
  } catch (_) {
    const fallback = await cache.match(request, { ignoreSearch: true });
    return fallback || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (!request || request.method !== 'GET') return;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);

  if (url.origin === scope.origin && url.pathname.startsWith(scope.pathname)) {
    if (request.mode === 'navigate') {
      event.respondWith(navigationResponse(request));
    } else {
      event.respondWith(sameOriginAssetResponse(request));
    }
    return;
  }

  if (shouldRuntimeCacheExternal(url)) {
    event.respondWith(externalRuntimeResponse(request));
  }
});

self.addEventListener('message', event => {
  if (event.data?.type === 'P2_GET_OFFLINE_SHELL_STATUS') {
    event.source?.postMessage?.({
      type: 'P2_OFFLINE_SHELL_STATUS',
      build: SHELL_BUILD,
      cache: SHELL_CACHE
    });
  }
});
