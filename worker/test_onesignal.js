/**
 * Script de prueba para verificar el endpoint de OneSignal Create Message API.
 *
 * Uso:
 *   node test_onesignal.js <WORKER_URL>
 *
 * Ejemplo:
 *   node test_onesignal.js https://camino-api.byp.workers.dev
 */

const WORKER_URL = process.argv[2] || "https://camino-api.byp.workers.dev";

async function testDivinaMisericordia() {
  console.log("=== Probando notificación de Divina Misericordia ===");
  console.log(`URL: ${WORKER_URL}/notifications/onesignal/divina-misericordia`);

  try {
    const res = await fetch(
      `${WORKER_URL}/notifications/onesignal/divina-misericordia`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );

    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log("Response:", JSON.stringify(data, null, 2));

    if (data.ok) {
      console.log("\n✅ Notificación enviada correctamente.");
    } else {
      console.log("\n❌ Error enviando notificación:", data.error || "Desconocido");
      console.log("   Asegúrate de configurar los secrets:");
      console.log("   wrangler secret put ONESIGNAL_APP_ID");
      console.log("   wrangler secret put ONESIGNAL_REST_API_KEY");
    }
  } catch (e) {
    console.error("Error de red:", e.message);
  }
}

async function testCustomNotification() {
  console.log("\n=== Probando notificación personalizada ===");
  console.log(`URL: ${WORKER_URL}/notifications/onesignal/send`);

  try {
    const res = await fetch(`${WORKER_URL}/notifications/onesignal/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headings: { es: "Test de Camino 📿", en: "Camino Test 📿" },
        contents: {
          es: "Esta es una notificación de prueba. Si la ves, ¡OneSignal funciona!",
          en: "This is a test notification. If you see it, OneSignal works!",
        },
        url: "https://camino-6vx.pages.dev/?devotion=divina-misericordia",
        data: { devotion: "divina-misericordia", module: "rosario" },
        included_segments: ["Subscribed Users"],
      }),
    });

    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error de red:", e.message);
  }
}

(async () => {
  console.log("Camino - Test de Notificaciones OneSignal\n");
  await testDivinaMisericordia();
  await testCustomNotification();
  console.log("\n=== Pruebas completadas ===");
})();