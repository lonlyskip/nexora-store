import {sendOrderStatusEmail} from "../../../_lib/status-email.js";
import {sendStoreMail,invoiceHtml} from "../../../_lib/mail.js";
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
function authorized(request,env){const token=request.headers.get("authorization")||"";return !!env.ADMIN_PASSWORD&&token==="Bearer "+env.ADMIN_PASSWORD}
export async function onRequestPost({request,env}){
  if(!authorized(request,env))return json({error:"غير مصرح"},401);
  if(!env.DB)return json({error:"قاعدة البيانات غير مهيأة"},503);
  try{
    const now=new Date(),nowIso=now.toISOString(),staleBefore=new Date(now.getTime()-10*60*1000).toISOString();
    const {results=[]}=await env.DB.prepare("SELECT j.order_id,j.status,j.attempts,o.email,o.plan_name,o.price_sar,o.duration_days,o.created_at,o.status AS order_status,c.first_name FROM invoice_email_jobs j JOIN orders o ON o.id=j.order_id LEFT JOIN customers c ON lower(c.email)=lower(o.email) WHERE o.status IN ('paid','delivered') AND j.attempts<5 AND (j.status IN ('queued','failed') OR (j.status='sending' AND j.last_attempt_at<?)) ORDER BY j.created_at ASC LIMIT 50").bind(staleBefore).all();
    const summary={found:results.length,sent:0,failed:0,skipped:0,details:[]};
    for(const row of results){
      const claimed=await env.DB.prepare("UPDATE invoice_email_jobs SET status='sending',attempts=attempts+1,last_attempt_at=?,last_error=NULL WHERE order_id=? AND attempts<5 AND (status IN ('queued','failed') OR (status='sending' AND last_attempt_at<?))").bind(nowIso,row.order_id,staleBefore).run();
      if(!(claimed.meta?.changes>0)){summary.skipped++;continue}
      try{
        const {results:events=[]}=await env.DB.prepare("SELECT status,message,created_at FROM order_status_events WHERE order_id=? ORDER BY created_at ASC").bind(row.order_id).all();
        const order={id:row.order_id,first_name:row.first_name||"عميل NEXORA",plan_name:row.plan_name,price_sar:row.price_sar,duration_days:row.duration_days,status:row.order_status,created_at:row.created_at,events};
        const document=invoiceHtml(order);
        await sendStoreMail(env,{to:row.email,subject:"فاتورتك من NEXORA — "+row.order_id,html:document,pdfHtml:document,pdfName:row.order_id+".pdf"});
        await env.DB.prepare("UPDATE invoice_email_jobs SET status='sent',sent_at=?,last_error=NULL WHERE order_id=? AND status='sending'").bind(new Date().toISOString(),row.order_id).run();
        summary.sent++;summary.details.push({orderId:row.order_id,status:"sent"});
      }catch(error){
        const detail=String(error?.code||"MAILER_UNKNOWN")+": "+String(error?.message||"Unknown error").slice(0,180);
        await env.DB.prepare("UPDATE invoice_email_jobs SET status='failed',last_error=? WHERE order_id=? AND status='sending'").bind(detail,row.order_id).run();
        console.error("NEXORA invoice retry failed",row.order_id,detail);
        summary.failed++;summary.details.push({orderId:row.order_id,status:"failed",error:detail});
      }
    }
    const {results:statusJobs=[]}=await env.DB.prepare("SELECT j.order_id,j.status AS email_status,j.event_id,o.email,o.plan_name,o.price_sar,o.duration_days,o.created_at,o.status AS order_status FROM order_status_email_jobs j JOIN orders o ON o.id=j.order_id WHERE j.delivery_status IN ('queued','failed') AND j.attempts<5 ORDER BY j.created_at ASC LIMIT 50").all();
    summary.statusEmailsFound=statusJobs.length;summary.statusEmailsSent=0;summary.statusEmailsFailed=0;
    for(const job of statusJobs){
      const event=await env.DB.prepare("SELECT id,status,message,created_at FROM order_status_events WHERE id=? AND order_id=?").bind(job.event_id,job.order_id).first();
      if(!event)continue;
      const result=await sendOrderStatusEmail(env,{id:job.order_id,email:job.email,plan_name:job.plan_name,price_sar:job.price_sar,duration_days:job.duration_days,created_at:job.created_at},event.status,event);
      if(result.sent)summary.statusEmailsSent++;else if(!result.alreadySent)summary.statusEmailsFailed++;
    }
    return json({ok:true,...summary,message:"تمت مراجعة الفواتير وتحديثات الحالات غير المرسلة ومحاولة إعادة إرسالها."});
  }catch(error){console.error("NEXORA invoice retry scan failed",error?.message||"Unknown error");return json({error:"تعذر فحص الفواتير. تأكد من تطبيق تحديث قاعدة البيانات."},500)}
}
