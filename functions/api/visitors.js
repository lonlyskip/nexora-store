const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});

export async function onRequestPost({request,env}){
  try{
    if(!env.DB)return json({error:"قاعدة البيانات غير متاحة"},503);
    const body=await request.json();
    const visitorId=String(body.visitorId||"").trim();
    if(!/^[a-f0-9-]{36}$/i.test(visitorId))return json({error:"معرّف الزيارة غير صالح"},400);
    await env.DB.prepare("INSERT OR IGNORE INTO store_visitors(visitor_id) VALUES(?)").bind(visitorId).run();
    const row=await env.DB.prepare("SELECT COUNT(*) AS total FROM store_visitors").first();
    return json({ok:true,total:Number(row?.total||0)});
  }catch(error){
    console.error("NEXORA visitor counter failed",error?.name||"Error",error?.message||"Unknown error");
    return json({error:"تعذر تحميل عدد الزيارات"},500);
  }
}

export async function onRequestGet({env}){
  try{
    if(!env.DB)return json({error:"قاعدة البيانات غير متاحة"},503);
    const row=await env.DB.prepare("SELECT COUNT(*) AS total FROM store_visitors").first();
    return json({total:Number(row?.total||0)});
  }catch(error){
    console.error("NEXORA visitor count read failed",error?.name||"Error",error?.message||"Unknown error");
    return json({error:"تعذر تحميل عدد الزيارات"},500);
  }
}
