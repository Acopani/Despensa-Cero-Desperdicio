// Service Worker para Despensa Cero Desperdicio
const CACHE_NAME = 'despensa-cero-v2.0';
const STATIC_CACHE_NAME = 'despensa-cero-static-v2.0';

// Archivos esenciales para cachear (toda la app para offline)
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles.css',
  './scanner.css',
  './app.js',
  './storage.js',
  './expiration-alerts.js',
  './scanner.js',
  './manual-form.js',
  './recipes.js',
  './recipes-ui.js',
  './register-sw.js',
  './lib/html5-qrcode.js',
  './assets/icon-192.svg',
  './assets/icon-512.svg',
  './assets/icon-maskable.svg'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cacheando archivos estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Instalación completada');
        return self.skipWaiting();
      })
  );
});

// Activar Service Worker y limpiar caches antiguos
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activando...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Eliminar caches antiguos
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Activación completada');
      return self.clients.claim();
    })
  );
});

// Interceptar fetch requests
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Para APIs externas: Network Only (no cachear)
  if (url.hostname === 'world.openfoodfacts.org' || 
      url.hostname === 'generativelanguage.googleapis.com' ||
      url.hostname === 'api.spoonacular.com') {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Para archivos locales: Cache First, Network Fallback
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          console.log('[Service Worker] Sirviendo desde cache:', event.request.url);
          return cachedResponse;
        }
        
        // Si no está en cache, ir a la red
        return fetch(event.request)
          .then(response => {
            // Si es una respuesta HTML o CSS, cachearla
            if (response.ok && 
                (event.request.destination === 'document' || 
                 event.request.destination === 'style' ||
                 event.request.destination === 'script')) {
              const responseToCache = response.clone();
              caches.open(STATIC_CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return response;
          })
          .catch(error => {
            console.log('[Service Worker] Error de fetch:', error);
            
            // Si estamos solicitando HTML y falla, mostrar página offline
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
            
            // Para otros recursos, mostrar error
            return new Response('Error de conexión', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Manejar mensajes desde la aplicación
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Manejar sync events (para futuras funcionalidades)
self.addEventListener('sync', event => {
  console.log('[Service Worker] Sync event:', event.tag);
});

// Manejar push notifications (para futuras alertas)
self.addEventListener('push', event => {
  console.log('[Service Worker] Push notification recibida:', event);
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Nueva alerta de tu despensa',
      icon: '/assets/icon-192.svg',
      badge: '/assets/icon-192.svg',
      tag: 'despensa-alert',
      renotify: true,
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'Ver'
        },
        {
          action: 'dismiss',
          title: 'Descartar'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification('Despensa Cero Desperdicio', options)
    );
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(windowClients => {
          if (windowClients.length > 0) {
            windowClients[0].focus();
          } else {
            clients.openWindow('/');
          }
        })
    );
  }
});