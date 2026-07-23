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
