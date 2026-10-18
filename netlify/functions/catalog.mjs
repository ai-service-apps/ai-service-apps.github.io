// Public Apple Inside Apps product catalog proxy.
// Same-origin API for Netlify; does not expose secrets, IPA manifests or payment credentials.
const SOURCE = "https://cmcfwkfhyxfljpowbkpj.supabase.co/functions/v1/apps-orders";
export default async function handler(request) {
  if (request.method !== "GET") return new Response("Method Not Allowed",{status:405,headers:{"allow":"GET"}});
  try {
    const upstream = await fetch(SOURCE,{method:"GET",redirect:"error",signal:AbortSignal.timeout(6000),headers:{"accept":"application/json"}});
    if (!upstream.ok) return new Response(JSON.stringify({ok:false,apps:[]}),{status:503,headers:{"content-type":"application/json","cache-control":"no-store"}});
    const data = await upstream.json();
    if (!data || data.ok !== true || !Array.isArray(data.apps)) throw new Error("BAD_CATALOG");
    const apps = data.apps.map(a=>({
      slug:String(a.slug||""),title:String(a.title||""),description:String(a.description||""),
      price_rub:Number.isInteger(a.price_rub)?a.price_rub:null,
      is_available:Boolean(a.is_available)
    }));
    return new Response(JSON.stringify({ok:true,apps}),{
      status:200,
      headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}
    });
  } catch (_) {
    return new Response(JSON.stringify({ok:false,apps:[]}),{
      status:503,
      headers:{"content-type":"application/json","cache-control":"no-store"}
    });
  }
}
