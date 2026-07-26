self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("magiclink") || event.request.url.includes("access_token") || event.request.url.includes("refresh_token")) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.redirected) {
          const redirectUrl = new URL(response.url);
          if (redirectUrl.origin === self.location.origin) {
            return Response.redirect(redirectUrl.href);
          }
        }
        return response;
      }).catch(() => event.request)
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Camino", body: event.data?.text() || "Tienes una oración pendiente." };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Camino", {
      body: data.body || "Tienes una tarea espiritual pendiente.",
      data: data.url || "/",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data || "/";
  event.waitUntil(clients.openWindow(target));
});
