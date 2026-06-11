self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: '/notebook-transparent.png',
        badge: '/notebook-transparent.png',
        vibrate: [100, 50, 100],
        data: {
          url: '/'
        }
      };
      
      event.waitUntil(
        self.registration.showNotification(data.title || 'Cập nhật giá vàng', options)
      );
    } catch (err) {
      // Fallback if data is not JSON
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification('Cập nhật giá vàng Ngọc Của', {
          body: text,
          icon: '/notebook-transparent.png',
          badge: '/notebook-transparent.png',
          vibrate: [100, 50, 100],
          data: {
            url: '/'
          }
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If there's an open window, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
