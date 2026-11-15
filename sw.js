// 상하이 여행 오프라인 서비스 워커
// 이 파일은 build.ps1이 site/sw.js로 복사하면서 버전을 바꿔 넣어요. 직접 고치려면 이 파일을 고치세요.
const VERSION = '20261115-194629';
const CACHE = 'shanghai-trip-' + VERSION;

// 처음 한 번 열 때 통째로 저장해 둘 파일들
const ASSETS = [
  './',
  './index.html',
  './pc.html',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // cache:'reload' = 브라우저 HTTP 캐시를 건너뛰고 서버에서 새로 받아 저장
      .then((cache) => cache.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('shanghai-trip-') && k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// 캐시를 먼저 보여 주고(현지 와이파이가 느리거나 막혀도 바로 열림),
// 인터넷이 되면 뒤에서 새 버전을 받아 다음에 열 때 반영해요.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 구글 지도, 네이버 검색 같은 바깥 링크는 건드리지 않아요.
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    let cached = await cache.match(req, { ignoreSearch: true });
    if (!cached && req.mode === 'navigate') {
      cached = await cache.match('./index.html');
    }

    const network = fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
        return res;
      })
      .catch(() => undefined);

    if (cached) {
      event.waitUntil(network);
      return cached;
    }
    const res = await network;
    return res || new Response('오프라인 상태예요. 인터넷이 될 때 한 번 열어 두면 다음부터는 오프라인에서도 열려요.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  })());
});
