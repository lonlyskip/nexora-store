import {sendStoreMail,invoiceHtml} from "./mail.js";

export async function sendOrderStatusEmail(env, order, status, event) {
  if (!order?.email) return {queued:false, skipped:true};
  const now=new Date().toISOString();
  await env.DB.prepare("INSERT INTO order_status_email_jobs(order_id,status,event_id,attempts,created_at) VALUES(?,?,?,?,?) ON CONFLICT(order_id,status) DO NOTHING")
    .bind(order.id,status,event.id,0,now).run();
  const claim=await env.DB.prepare("UPDATE order_status_email_jobs SET status='sending' WHERE order_id=? AND status=? AND status IN ('queued','failed') AND attempts<5").bind(order.id,status).run();
  if (!(claim.meta?.changes>0)) {
    const job=await env.DB.prepare("SELECT status FROM order_status_email_jobs WHERE order_id=? AND status=?").bind(order.id,status).first();
    return {queued:true,alreadySent:job?.status==="sent",busy:job?.status==="sending"};
  }
  try {
    const customer=await env.DB.prepare("SELECT first_name FROM customers WHERE lower(email)=lower(?)").bind(order.email).first();
    const {results:events=[]}=await env.DB.prepare("SELECT status,message,created_at FROM order_status_events WHERE order_id=? ORDER BY created_at ASC").bind(order.id).all();
    const document=invoiceHtml({...order,status,first_name:customer?.first_name||"عميل NEXORA",events:events.length?events:[event]});
    await env.DB.prepare("UPDATE order_status_email_jobs SET attempts=attempts+1,last_attempt_at=?,last_error=NULL WHERE order_id=? AND status=?").bind(now,order.id,status).run();
    await sendStoreMail(env,{to:order.email,subject:"تحديث طلبك من NEXORA — "+status+" — "+order.id,html:document,pdfHtml:document,pdfName:order.id+"-"+status+".pdf"});
    await env.DB.prepare("UPDATE order_status_email_jobs SET status='sent',sent_at=?,last_error=NULL WHERE order_id=? AND status=?").bind(new Date().toISOString(),order.id,status).run();
    return {queued:true,sent:true};
  } catch(error) {
    const detail=String(error?.code||"MAILER_UNKNOWN")+": "+String(error?.message||"Unknown error").slice(0,180);
    await env.DB.prepare("UPDATE order_status_email_jobs SET status='failed',last_error=? WHERE order_id=? AND status=?").bind(detail,order.id,status).run();
    console.error("NEXORA status email failed",order.id,status,detail);
    return {queued:true,sent:false};
  }
}