const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export async function onRequestPost(){return json({error:"استخدم PayPal Checkout لإتمام الطلب."},410);}
