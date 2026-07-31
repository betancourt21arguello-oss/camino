// OneSignal requires message event handler to be added during initial evaluation
self.addEventListener('message', (event) => {
  // Forward all messages to OneSignal SDK
  try {
    if (event.data && typeof event.data === 'object') {
      // Let OneSignal SDK handle the message
      const keys = Object.keys(event.data);
      if (keys.length > 0) {
        // Message will be handled by OneSignal after import
      }
    }
  } catch (error) {
    console.error('[OneSignal SW] Error in message handler:', error);
  }
});

importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
