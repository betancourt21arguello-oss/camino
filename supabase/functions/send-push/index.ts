import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

// Configuración de CORS obligatoria para que tu PWA pueda llamarla directamente (Trigger Manual)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de la petición preflight (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Extraemos los datos que nos envía el trigger (Cron, Webhook o Manual)
    const { title, message, targetUserId, url, scheduled } = await req.json()

    // Obtenemos las credenciales de OneSignal desde las variables de entorno de Supabase
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error('Falta configuración de OneSignal (ONESIGNAL_APP_ID o ONESIGNAL_REST_API_KEY)')
    }

    // Construimos el payload (cuerpo) del mensaje para OneSignal
    const payload: Record<string, any> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title, es: title },
      contents: { en: message, es: message },
    }

    // Si se proporciona una URL, se añade como botón de acción
    if (url) {
      payload.url = url
    }

    /* 
     * LÓGICA DE DESTINATARIOS:
     * Si enviamos un 'targetUserId' (el ID de Supabase del usuario), enviamos solo a él.
     * Si NO enviamos 'targetUserId', enviamos a todos (ideal para el Cron de las 3:00 PM).
     */
    if (targetUserId) {
      // OneSignal permite usar "External IDs". Aquí usamos el UUID de auth.users de Supabase
      payload.include_external_user_ids = [targetUserId]
    } else {
      payload.included_segments = ['Subscribed Users'] // Envío masivo a todos
    }

    // Hacemos la petición a la API de OneSignal
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`OneSignal API error: ${JSON.stringify(data)}`)
    }

    // Retornamos el éxito de la operación
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // Manejo de errores
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})