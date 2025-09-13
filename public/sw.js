const CACHE_NAME = 'raspisanie-v1.0.0';
const urlsToCache = [
  './',
  './favicon.svg',
  './icon-192.svg',
  './icon-512.svg',
  './manifest.json',
  './offline.html'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Возвращаем кэшированную версию, если она есть
        if (response) {
          return response;
        }
        
        // Клонируем запрос, так как он может быть использован только один раз
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then((response) => {
          // Проверяем, что получили валидный ответ
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Клонируем ответ, так как он может быть использован только один раз
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(() => {
          // Если запрос не удался, показываем офлайн-страницу
          if (event.request.destination === 'document') {
            return caches.match('./');
          }
        });
      })
  );
});

// Обработка push-уведомлений (для будущего использования)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Новое уведомление',
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
