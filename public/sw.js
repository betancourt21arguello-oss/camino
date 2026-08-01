self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// ── OneSignal: Handle message events at top level ─────────────────
// This must be added during initial evaluation, not deferred
self.addEventListener('message', (event) => {
  try {
    const data = event.data || {};
    if (data.notification) {
      // Handle notification display requests from OneSignal
      self.registration.showNotification(data.notification.title || 'Camino', {
        body: data.notification.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: data.notification.tag || 'camino-notification',
        data: data.notification.data || {},
      });
    }
  } catch (error) {
    console.error('[Camino SW] Error handling message:', error);
  }
});

// ── Security: Validate request origins ──────────────────────────
// Only handle fetch events for same-origin requests and known
// trusted origins to prevent SSRF and other attacks.
const TRUSTED_ORIGINS = [
  self.location.origin,
  'https://asfqkirsogozshlzcfpe.supabase.co',
  'wss://asfqkirsogozshlzcfpe.supabase.co',
];

function isTrustedRequest(url) {
  try {
    const parsed = new URL(url);
    return TRUSTED_ORIGINS.some(origin => {
      const trusted = new URL(origin);
      return parsed.origin === trusted.origin ||
             parsed.origin === self.location.origin ||
             parsed.hostname.endsWith('.pages.dev') ||
             parsed.hostname.endsWith('.supabase.co');
    });
  } catch {
    return false;
  }
}

self.addEventListener("fetch", (event) => {
  // Only intercept auth-related requests for security
  if (event.request.url.includes("magiclink") || 
      event.request.url.includes("access_token") || 
      event.request.url.includes("refresh_token")) {
    
    // Validate origin before handling
    if (!isTrustedRequest(event.request.url)) {
      return; // Let the browser handle it normally
    }
    
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
      // Android 13+ requires notification permission
      // Using 'requireInteraction' to ensure notifications are seen
      requireInteraction: true,
      tag: 'camino-notification',
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  let target = "/";
  const data = event.notification.data;
  if (data) {
    // OneSignal envía data como objeto; puede contener url o devotion
    if (typeof data === "string") {
      target = data;
    } else if (typeof data === "object") {
      if (data.url) {
        target = data.url;
      } else if (data.devotion) {
        target = "/?devotion=" + encodeURIComponent(data.devotion);
      }
    }
  }
  event.waitUntil(clients.openWindow(target));
});
