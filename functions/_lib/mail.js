export async function sendStoreMail(env, {to, subject, html, pdfHtml, pdfName}) {
  if (!env.MAILER_URL || !env.MAILER_SECRET) {
    console.error("NEXORA mailer configuration missing", {
      hasMailerUrl: Boolean(env.MAILER_URL),
      hasMailerSecret: Boolean(env.MAILER_SECRET)
    });
    throw new Error("خدمة البريد غير مهيأة");
  }

  let response;
  try {
    response = await fetch(env.MAILER_URL, {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({
        secret: env.MAILER_SECRET,
        to,
        subject,
        html,
        pdfHtml: pdfHtml || "",
        pdfName: pdfName || "NEXORA-invoice.pdf"
      })
    });
  } catch (error) {
    console.error("NEXORA mailer connection failed", error?.name || "Error", error?.message || "Unknown error");
    throw new Error("تعذر الاتصال بخدمة البريد");
  }

  const responseText = await response.text();
  if (!response.ok) {
    console.error("NEXORA mailer HTTP response", response.status, responseText.slice(0, 300));
    throw new Error("خدمة البريد أعادت استجابة غير ناجحة");
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    console.error("NEXORA mailer returned invalid JSON", response.status, responseText.slice(0, 300));
    throw new Error("استجابة خدمة البريد غير صالحة");
  }

  if (!result.ok) {
    console.error("NEXORA mailer rejected the request", response.status, result.error || "No error detail");
    throw new Error("خدمة البريد رفضت الطلب");
  }

  return true;
}
export const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export function invoiceHtml(order) {
  return `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:24px;color:#171717"><main style="max-width:620px;margin:auto;background:#fff;padding:32px;border-radius:14px"><h1 style="letter-spacing:3px">NEXORA</h1><h2>فاتورة طلب</h2><h2 style="color:#7655d9">${escapeHtml(order.id)}</h2><p>شكرًا لثقتك في NEXORA. استلمنا طلبك وسنراجع تفاصيله قبل التسليم.</p><table style="width:100%;border-collapse:collapse"><tr><td style="padding:12px;border-bottom:1px solid #ddd">الباقة</td><td style="padding:12px;border-bottom:1px solid #ddd">${escapeHtml(order.plan_name)}</td></tr><tr><td style="padding:12px;border-bottom:1px solid #ddd">المدة</td><td style="padding:12px;border-bottom:1px solid #ddd">${order.duration_days} يوم</td></tr><tr><td style="padding:12px;border-bottom:1px solid #ddd">المبلغ</td><td style="padding:12px;border-bottom:1px solid #ddd">${Number(order.price_sar).toFixed(2)} ر.س</td></tr><tr><td style="padding:12px;border-bottom:1px solid #ddd">الحالة</td><td style="padding:12px;border-bottom:1px solid #ddd">قيد المراجعة</td></tr></table><p style="margin-top:28px">هذه فاتورة طلب وليست إثبات دفع. لا يتم تأكيد الدفع إلا بعد التحقق منه.</p><p>شكرًا لك ❤️<br>NEXORA STORE</p></main></body></html>`;
}
