// Apple Inside Apps — same-domain AnyPay notification bridge for Vercel.
// Site and callback will share the Vercel deployment hostname.
// This route does NOT mark orders paid; it forwards an untouched signed
// provider notification to the existing fail-closed Supabase verifier.
const TARGET = "https://cmcfwkfhyxfljpowbkpj.supabase.co/functions/v1/ap";

export default {
  async fetch(request) {
    if (request.method === "GET") {
      return new Response(JSON.stringify({
        ok: true,
        service: "Apple Inside Apps AnyPay bridge",
        accepting_payments: false
      }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
      });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {status: 405, headers: {"allow":"GET, POST"}});
    }
    const size = Number(request.headers.get("content-length") || "0");
    if (size > 8192) return new Response("Payload Too Large", {status:413});
    const media = (request.headers.get("content-type") || "").toLowerCase();
    if (!media.startsWith("application/x-www-form-urlencoded") &&
        !media.startsWith("application/json") &&
        !media.startsWith("multipart/form-data")) {
      return new Response("Unsupported Media Type", {status:415});
    }
    try {
      const body = await request.arrayBuffer();
      if (body.byteLength > 8192) return new Response("Payload Too Large", {status:413});
      const upstream = await fetch(TARGET, {
        method: "POST",
        headers: {"content-type":request.headers.get("content-type") || "application/x-www-form-urlencoded"},
        body,
        redirect: "error",
        signal: AbortSignal.timeout(7000)
      });
      const raw = await upstream.text();
      return new Response(raw, {
        status:upstream.status,
        headers: {
          "content-type":upstream.headers.get("content-type") || "text/plain; charset=utf-8",
          "cache-control":"no-store"
        }
      });
    } catch (_) {
      return new Response("Payment callback not ready", {status:503,headers:{"cache-control":"no-store"}});
    }
  }
};
