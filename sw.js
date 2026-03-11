const APP_VERSION = '3.2.0';
const CACHE_PREFIX = 'wordsafari';
const PRECACHE_NAME = `${CACHE_PREFIX}-precache-v${APP_VERSION}`;
const RUNTIME_NAME = `${CACHE_PREFIX}-runtime-v${APP_VERSION}`;

const ANIMAL_ASSET_PATHS = [
    './assets/animals/lion.png',
    './assets/animals/elephant.png',
    './assets/animals/giraffe.png',
    './assets/animals/zebra.png',
    './assets/animals/cheetah.png',
    './assets/animals/rhino.png',
    './assets/animals/warthog.png',
    './assets/animals/bear.png',
    './assets/animals/wolf.png',
    './assets/animals/deer.png',
    './assets/animals/owl.png',
    './assets/animals/fox.png',
    './assets/animals/squirrel.png',
    './assets/animals/woodpecker.png',
    './assets/animals/hippo.png',
    './assets/animals/croc.png',
    './assets/animals/frog.png',
    './assets/animals/otter.png',
    './assets/animals/kingfisher.png',
    './assets/animals/python.png',
    './assets/animals/flamingo.png',
    './assets/animals/polar_bear.png',
    './assets/animals/penguin.png',
    './assets/animals/seal.png',
    './assets/animals/walrus.png',
    './assets/animals/orca.png',
    './assets/animals/narwhal.png',
    './assets/animals/camel.png',
    './assets/animals/scorpion.png',
    './assets/animals/vulture.png',
    './assets/animals/dolphin.png',
    './assets/animals/shark.png',
    './assets/animals/octopus.png',
    './assets/animals/sea_turtle.png',
    './assets/animals/jellyfish.png',
    './assets/animals/clownfish.png',
    './assets/animals/manta.png',
    './assets/animals/arctic_fox.svg',
    './assets/animals/fennec.svg',
    './assets/animals/meerkat.svg',
    './assets/animals/horned_lizard.svg',
    './assets/animals/roadrunner.svg'
];

const APP_SHELL_ASSETS = [
    './',
    './index.html',
    './offline.html',
    './css/style.css',
    './manifest.json',
    './js/main.js',
    './js/data.js',
    './js/audio.js',
    './js/achievements.js',
    './js/progression.js',
    './js/game.js',
    './js/ui.js',
    './js/svgTemplates.js',
    './js/svgFactory.js',
    './assets/icons/icon.svg',
    './assets/icons/favicon-32.png',
    './assets/icons/apple-touch-icon-180.png',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './assets/icons/icon-maskable-512.png',
    './assets/screenshots/screenshot-home.svg',
    './assets/screenshots/screenshot-gameplay.svg',
    './assets/screenshots/screenshot-desktop.svg',
    ...ANIMAL_ASSET_PATHS
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(PRECACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL_ASSETS))
            .catch((error) => {
                console.error('Precache failed:', error);
                throw error;
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => Promise.all(
            cacheNames
                .filter((name) => name.startsWith(`${CACHE_PREFIX}-`) && ![PRECACHE_NAME, RUNTIME_NAME].includes(name))
                .map((name) => caches.delete(name))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

function isSafeRequest(request) {
    return request.method === 'GET' && request.url.startsWith('http');
}

function isNavigationRequest(request) {
    return request.mode === 'navigate' || request.destination === 'document';
}

function isSameOrigin(url) {
    return url.origin === self.location.origin;
}

function isStaticAssetRequest(request, url) {
    if (!isSameOrigin(url)) return false;

    const staticDestinations = new Set(['style', 'script', 'image', 'font', 'manifest']);
    if (staticDestinations.has(request.destination)) return true;

    return (
        url.pathname.startsWith('/css/') ||
        url.pathname.startsWith('/js/') ||
        url.pathname.startsWith('/assets/') ||
        url.pathname.endsWith('.json') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.png')
    );
}

async function networkFirstForNavigation(request) {
    const runtimeCache = await caches.open(RUNTIME_NAME);

    try {
        const fresh = await fetch(request);
        runtimeCache.put(request, fresh.clone());
        return fresh;
    } catch (error) {
        const cached = await runtimeCache.match(request);
        if (cached) return cached;

        const precachedPage = await caches.match(request);
        if (precachedPage) return precachedPage;

        return caches.match('./offline.html');
    }
}

async function staleWhileRevalidate(request) {
    const runtimeCache = await caches.open(RUNTIME_NAME);
    const cached = await runtimeCache.match(request);

    const networkFetch = fetch(request)
        .then((response) => {
            if (response && response.status === 200) {
                runtimeCache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => null);

    if (cached) {
        return cached;
    }

    const networkResponse = await networkFetch;
    if (networkResponse) {
        return networkResponse;
    }

    return caches.match(request);
}

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (!isSafeRequest(request)) return;

    const url = new URL(request.url);

    if (isNavigationRequest(request)) {
        event.respondWith(networkFirstForNavigation(request));
        return;
    }

    if (isStaticAssetRequest(request, url)) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    // Cross-origin and non-static requests are passed through.
    event.respondWith(fetch(request).catch(() => caches.match(request)));
});
