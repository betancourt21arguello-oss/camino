export default function handler(req) {
  return new Response(JSON.stringify({ ok: true, path: req.url }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
