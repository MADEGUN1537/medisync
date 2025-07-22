const CACHE_NAME = 'medisync-cache-v1';
const urlsToCache = [
    '/',
    '/dashboard.html',
    '/firebase.js',
    '/favicon.ico',
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.3/jspdf.plugin.autotable.min.js',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@500;700&family=Open+Sans:wght@400;600&display=swap'
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
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response; // Return cached response if available
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
                }).catch(error => {
                    console.error('Fetch failed:', error);
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
