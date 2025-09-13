const CACHE_NAME = 'raspisanie-v1.2.0';
const STATIC_CACHE = 'raspisanie-static-v1.2.0';
const DATA_CACHE = 'raspisanie-data-v1.2.0';

// Статические ресурсы для кэширования (относительные пути от index.html)
const urlsToCache = [
  './',
  './favicon.svg',
  './icon-192.svg',
  './icon-512.svg',
  './icon-144.svg',
  './icon-96.svg',
  './icon-72.svg',
  './icon-48.svg',
  './favicon.ico',
  './manifest.json',
  './screenshot-mobile.png',
  './screenshot-desktop.png'
];

// Данные для кэширования (данные уже встроены в HTML)
const dataUrlsToCache = [];

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Кэшируем статические ресурсы
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(urlsToCache);
      }),
      // Кэшируем данные
      caches.open(DATA_CACHE).then((cache) => {
        return cache.addAll(dataUrlsToCache);
      })
    ])
  );
  // Принудительная активация нового SW
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Очищаем ВСЕ старые кэши (более агрессивная очистка)
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheName.includes('v1.2.0')) {
              console.log('Удаляем старый кэш:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Берем контроль над всеми клиентами
      self.clients.claim()
    ])
  );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Пропускаем запросы не к нашему домену
  if (url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    handleRequest(request)
  );
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Стратегия для статических ресурсов
    if (isStaticResource(request)) {
      return await cacheFirst(request, STATIC_CACHE);
    }
    
    // Стратегия для данных (данные уже встроены в HTML, поэтому пропускаем)
    if (isDataRequest(request)) {
      // Возвращаем 404 для запросов к JSON файлам, так как данные встроены в HTML
      return new Response('Data is embedded in HTML', { status: 404, statusText: 'Not Found' });
    }
    
    // Стратегия для HTML страниц
    if (request.destination === 'document') {
      return await networkFirst(request, STATIC_CACHE);
    }
    
    // Для остальных запросов - сначала сеть, потом кэш
    return await networkFirst(request, STATIC_CACHE);
    
  } catch (error) {
    // Если это запрос HTML страницы, показываем кэшированную версию index.html
    if (request.destination === 'document') {
      const cachedIndex = await caches.match('./');
      if (cachedIndex) {
        return cachedIndex;
      }
    }
    
    // Для остальных запросов возвращаем ошибку
    return new Response('Оффлайн', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Проверка, является ли запрос статическим ресурсом
function isStaticResource(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

// Проверка, является ли запрос запросом данных
function isDataRequest(request) {
  const url = new URL(request.url);
  return url.pathname.includes('/data/') || url.pathname.includes('.json');
}

// Стратегия "Кэш сначала"
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// Стратегия "Сеть сначала"
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Для HTML страниц, если нет кэшированной версии, возвращаем базовую страницу
    if (request.destination === 'document') {
      const fallbackResponse = await caches.match('./');
      if (fallbackResponse) {
        return fallbackResponse;
      }
    }
    
    throw error;
  }
}

// Обработка push-уведомлений
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Новое уведомление о расписании',
    icon: './icon-192.svg',
    badge: './icon-72.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Открыть расписание',
        icon: './icon-192.svg'
      },
      {
        action: 'close',
        title: 'Закрыть',
        icon: './icon-192.svg'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Расписание уроков', options)
  );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// Обработка синхронизации в фоне
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Здесь можно добавить логику для обновления данных
  } catch (error) {
    // Обработка ошибок синхронизации
  }
}

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
    // Принудительная очистка всех кэшей
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('Принудительно удаляем кэш:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        // После очистки перезагружаем страницу
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'CACHE_CLEARED' });
          });
        });
      })
    );
  }
});
