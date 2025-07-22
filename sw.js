const CACHE_NAME = 'medisync-cache-v1';
const urlsToCache = [
    '/',
    '/dashboard.html',
    '/firebase.js',
    '/favicon.ico'
];

// Install event: Cache essential files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Cache addAll failed:', error);
            })
    );
    self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event: Serve cached content when offline
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (url.pathname.includes('/send-sms')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                console.error('API fetch failed:', event.request.url);
                return new Response(JSON.stringify({ status: 'error', message: 'Offline: Unable to send SMS' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(networkResponse => {
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    return networkResponse;
                }).catch(() => {
                    console.error('Fetch failed:', event.request.url);
                    return caches.match('/dashboard.html');
                });
            })
    );
});

// Message event: Handle medication reminders
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SCHEDULE_REMINDERS') {
        const reminders = event.data.reminders || [];
        reminders.forEach(reminder => {
            const reminderTime = new Date(reminder.reminderTime);
            const now = new Date();
            const delay = reminderTime - now;
            if (delay > 0) {
                setTimeout(() => {
                    self.registration.showNotification('Medication Reminder', {
                        body: `Time to take ${reminder.name} (${reminder.dosage}) at ${reminder.time}`,
                        icon: '/favicon.ico',
                        data: { medId: reminder.medId, name: reminder.name, dosage: reminder.dosage, time: reminder.time }
                    });
                }, delay);
            }
        });
    }
});

// Notification click event: Open dashboard on click
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/dashboard.html')
    );
});
