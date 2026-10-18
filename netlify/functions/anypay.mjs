// Apple Inside Apps — Netlify same-domain AnyPay callback proxy.
// The actual payment validator lives in Supabase and currently FAILS CLOSED.
// Do not enable payment fulfillment until an authenticated payment ledger exists.
const TARGET = "https://cmcfwkfhyxfljpowbkpj.supabase.co/functions/v1/ap";
const baseHeaders = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};

export default async function handler(request) {
  if (request.method === "GET") {
    return new Response(JSON.stringify({
      ok: true,
      service: "Apple Inside Apps AnyPay bridge",
      payments_enabled: false
    }), {
      status: 200,
      headers: {...baseHeaders, "content-type":"application/json; charset=utf-8"}
    });
  }
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {...baseHeaders, allow:"GET, POST"}
    });
  }
  if (Number(request.headers.get("content-length") || "0") > 8192)
    return new Response("Payload Too Large", {status:413,headers:baseHeaders});
  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/x-www-form-urlencoded") &&
      !contentType.startsWith("application/json") &&
      !contentType.startsWith("multipart/form-data"))
    return new Response("Unsupported Media Type", {status:415,headers:baseHeaders});
  try {
    const rawBody = await request.arrayBuffer();
    if (rawBody.byteLength > 8192)
      return new Response("Payload Too Large",{status:413,headers:baseHeaders});
    const upstream = await fetch(TARGET,{
      method:"POST",
      headers:{"content-type":request.headers.get("content-type")||"application/x-www-form-urlencoded"},
      body:rawBody,
      redirect:"error",
      signal:AbortSignal.timeout(7000)
    });
    // Keep the upstream status, so failed validation cannot masquerade as payment success.
    const text = await upstream.text();
    return new Response(text,{
      status:upstream.status,
      headers:{...baseHeaders,
        "content-type":upstream.headers.get("content-type")||"text/plain; charset=utf-8"}
    });
  } catch (_) {
    return new Response("Payment callback unavailable", {status:503,headers:baseHeaders});
  }
}
