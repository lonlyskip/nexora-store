const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export async function onRequestGet({env}){if(!env.PAYPAL_CLIENT_ID||!env.PAYPAL_CLIENT_SECRET)return json({error:"PayPal غير مهيأ"},503);return json({clientId:env.PAYPAL_CLIENT_ID,environment:env.PAYPAL_ENV==="live"?"live":"sandbox"});}
