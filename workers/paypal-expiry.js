import {sendOrderStatusEmail} from "../functions/_lib/status-email.js";
export default {
  async scheduled(controller, env, ctx) {
    if (!env.DB) throw new Error("D1 binding DB is missing");
    const { results = [] } = await env.DB.prepare(
      "SELECT id, plan_name, price_sar, duration_days, payment_method, discord_username, email, created_at FROM orders WHERE status='pending' AND payment_method='paypal' AND paypal_order_id IS NOT NULL AND datetime(created_at) <= datetime('now','-10 minutes') ORDER BY created_at ASC LIMIT 100"
    ).all();
    for (const order of results) {
      const now = new Date().toISOString();
      const eventId = crypto.randomUUID();
      const eventMessage = "انتهت مهلة الدفع عبر PayPal (10 دقائق) وتم إلغاء الطلب تلقائيًا. يمكنك إنشاء طلب جديد.";
      const result = await env.DB.batch([
        env.DB.prepare("UPDATE orders SET status='cancelled' WHERE id=? AND status='pending' AND payment_method='paypal'").bind(order.id),
        env.DB.prepare("INSERT INTO order_status_events(id,order_id,status,message,created_at) SELECT ?,?,'cancelled',?,? WHERE changes() > 0").bind(
          eventId,
          order.id,
          eventMessage,
          now
        )
      ]);
      if (!(result[0]?.meta?.changes > 0)) continue;
      await sendOrderStatusEmail(env, {...order,status:"cancelled"}, "cancelled", {id:eventId,status:"cancelled",message:eventMessage,created_at:now});
      if (env.DISCORD_WEBHOOK) {
        try {
          await fetch(env.DISCORD_WEBHOOK, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ embeds: [{
              title: "إلغاء طلب PayPal تلقائيًا — NEXORA",
              color: 15158332,
              fields: [
                { name: "رقم الطلب", value: order.id },
                { name: "طريقة الدفع", value: "PayPal", inline: true },
                { name: "السبب", value: "لم يكتمل الدفع خلال 10 دقائق", inline: true },
                { name: "الباقة", value: order.plan_name },
                { name: "المبلغ", value: Number(order.price_sar).toFixed(2) + " SAR" },
                { name: "Discord", value: order.discord_username }
              ],
              timestamp: now
            }] })
          });
        } catch (error) {
          console.error("Could not notify Discord about expired PayPal order", order.id, error?.message);
        }
      }
    }
  }
};
