const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
function authorized(request,env){const token=request.headers.get("authorization")||"";return !!env.ADMIN_PASSWORD&&token==="Bearer "+env.ADMIN_PASSWORD}
const messages={
  paid:"تم التحقق يدويًا من وصول التحويل البنكي وتأكيد الدفع.",
  delivered:"تم تسليم الطلب. شكرًا لاختيارك NEXORA!"
};
export async function onRequestGet({request,env}){
  if(!authorized(request,env))return json({error:"غير مصرح"},401);
  if(!env.DB)return json({error:"قاعدة البيانات غير مهيأة"},503);
  try{
    const {results=[]}=await env.DB.prepare("SELECT id, plan_id, plan_name, price_sar, duration_days, discord_username, email, status, created_at, payment_method FROM orders ORDER BY created_at DESC LIMIT 500").all();
    return json({orders:results});
  }catch{return json({error:"تعذر قراءة الطلبات"},500)}
}
export async function onRequestPatch({request,env}){
  if(!authorized(request,env))return json({error:"غير مصرح"},401);
  if(!env.DB)return json({error:"قاعدة البيانات غير مهيأة"},503);
  try{
    const input=await request.json();
    if(!["paid","delivered"].includes(input.status)||typeof input.id!=="string"||!input.id.trim())return json({error:"بيانات التحديث غير صحيحة."},400);
    const order=await env.DB.prepare("SELECT id,email,status,payment_method FROM orders WHERE id=?").bind(input.id).first();
    if(!order)return json({error:"الطلب غير موجود"},404);
    if(order.status===input.status)return json({ok:true,unchanged:true});
    if(input.status==="paid"){
      if(order.payment_method!=="bank_transfer")return json({error:"لا يمكن تأكيد PayPal يدويًا؛ يتم التحقق منه تلقائيًا."},409);
      if(order.status!=="pending")return json({error:"لا يمكن تأكيد التحويل في الحالة الحالية."},409);
    }
    if(input.status==="delivered"&&order.status!=="paid")return json({error:"يجب تأكيد الدفع قبل تسليم الطلب."},409);
    const now=new Date().toISOString();
    const statements=[
      env.DB.prepare("UPDATE orders SET status=? WHERE id=? AND status=?").bind(input.status,input.id,order.status),
      env.DB.prepare("INSERT INTO order_status_events(id,order_id,status,message,created_at) SELECT ?,?,?,?,? WHERE changes()>0").bind(crypto.randomUUID(),input.id,input.status,messages[input.status],now)
    ];
    if(input.status==="paid"&&order.email){
      statements.push(env.DB.prepare("INSERT INTO invoice_email_jobs(order_id,status,attempts,created_at) SELECT ?,'queued',0,? WHERE EXISTS(SELECT 1 FROM orders WHERE id=? AND status='paid') ON CONFLICT(order_id) DO NOTHING").bind(input.id,now,input.id));
    }
    const result=await env.DB.batch(statements);
    if(!(result[0]?.meta?.changes>0))return json({error:"تغيرت حالة الطلب أثناء التحديث. حدّث القائمة وحاول مجددًا."},409);
    return json({ok:true,status:input.status,invoiceQueued:input.status==="paid"&&!!order.email});
  }catch(error){
    console.error("NEXORA admin order update failed",error?.message||"Unknown error");
    return json({error:"تعذر تحديث الطلب"},500);
  }
}
