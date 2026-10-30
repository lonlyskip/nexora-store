export async function sendStoreMail(env, {to, subject, html, pdfHtml, pdfName}) {
  if (!env.MAILER_URL || !env.MAILER_SECRET) {
    console.error("NEXORA mailer configuration missing", {
      hasMailerUrl: Boolean(env.MAILER_URL),
      hasMailerSecret: Boolean(env.MAILER_SECRET)
    });
    throw Object.assign(new Error("خدمة البريد غير مهيأة"), {code:"MAILER_CONFIG_MISSING"});
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
    throw Object.assign(new Error("تعذر الاتصال بخدمة البريد"), {code:"MAILER_CONNECTION_FAILED"});
  }

  const responseText = await response.text();
  if (!response.ok) {
    console.error("NEXORA mailer HTTP response", response.status, responseText.slice(0, 300));
    throw Object.assign(new Error("خدمة البريد أعادت استجابة غير ناجحة"), {code:"MAILER_HTTP_ERROR", status:response.status});
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    console.error("NEXORA mailer returned invalid JSON", response.status, responseText.slice(0, 300));
    throw Object.assign(new Error("استجابة خدمة البريد غير صالحة"), {code:"MAILER_INVALID_RESPONSE"});
  }

  if (!result.ok) {
    const detail = String(result.error || "No error detail")
      .replace(/[\\r\\n\\t]+/g, " ")
      .slice(0, 120);
    console.error("NEXORA mailer rejected the request", response.status, detail);
    throw Object.assign(
      new Error(detail === "No error detail" ? "خدمة البريد رفضت الطلب دون توضيح" : "خدمة البريد رفضت الطلب: " + detail),
      {code:"MAILER_REJECTED", detail}
    );
  }

  return true;
}
export const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export function invoiceHtml(order, {background = true} = {}) {
  const firstName = escapeHtml(order.first_name || "عميل NEXORA");
  const statusLabels = {pending:"قيد المراجعة",paid:"تم التحقق من الدفع",delivered:"تم التسليم",cancelled:"ملغي"};
  const statusLabel = statusLabels[order.status] || "قيد المراجعة";
  const statusColors = {pending:"#ffd78b",paid:"#83e6aa",delivered:"#83dfff",cancelled:"#ff9ba5"};
  const statusColor = statusColors[order.status] || "#ffd78b";
  const statusMessages = {pending:"تم استلام طلبك بنجاح، وطلبك الآن قيد المراجعة.",paid:"تم تحديث طلبك والتحقق من حالة الدفع.",delivered:"تم تسليم طلبك بنجاح. شكرًا لاختيارك NEXORA!",cancelled:"تم إلغاء طلبك. إذا كان لديك استفسار، تواصل مع الدعم."};
  const statusMessage = statusMessages[order.status] || statusMessages.pending;
  const formatSaudiDate = value => new Date(value).toLocaleString("ar-SA", {timeZone:"Asia/Riyadh"});
  const eventRows = (order.events || []).map(event => `<tr><td style="padding:10px 4px;border-bottom:1px solid #ffffff18;color:#e6dadd">${escapeHtml(event.message)}</td><td style="padding:10px 4px;border-bottom:1px solid #ffffff18;text-align:left;color:#bca7ab;font-size:11px">${escapeHtml(formatSaudiDate(event.created_at))}</td></tr>`).join("");
  const image = "https://nexora-store-z31.pages.dev/IMG_4552.jpg";
  const backgroundStyle = background ? `background-image:linear-gradient(145deg,rgba(8,8,10,.12),rgba(28,8,13,.20)),url("${image}");background-size:cover;background-position:center top;background-repeat:no-repeat;` : "";
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEXORA Invoice</title><style>@media print{html,body,main,main *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{margin:0!important;padding:0!important;background:#090909!important}main{width:100%!important;max-width:760px!important;margin:0 auto!important;background-color:#100b0d!important;background-image:linear-gradient(145deg,rgba(8,8,10,.12),rgba(28,8,13,.20)),url("https://nexora-store-z31.pages.dev/IMG_4552.jpg")!important;background-size:cover!important;background-position:center top!important;background-repeat:no-repeat!important}main>section{background:transparent!important}button{display:none!important}}</style></head>
  <body style="margin:0;padding:32px 14px;background:#090909;font-family:Arial,sans-serif;color:#fff">
  <main style="position:relative;max-width:760px;margin:0 auto;border:1px solid #9d2638;border-radius:22px;overflow:hidden;background-color:#100b0d;box-shadow:0 20px 70px #0009">

  ${background ? `<img src="${image}" alt="" aria-hidden="true" style="position:absolute;inset:3%;width:94%;height:94%;object-fit:contain;object-position:center center;opacity:.42;z-index:0">` : ""}
  <header style="position:relative;z-index:1;padding:30px;text-align:center;background:linear-gradient(120deg,rgba(24,9,13,.78),rgba(58,16,26,.72));border-bottom:1px solid #8d2635">
  <img src="${image}" alt="NEXORA" style="width:54px;height:54px;object-fit:contain;padding:3px;background:#151015;border-radius:13px;border:1px solid #d44b5a;box-shadow:0 8px 28px #0008">
  <div style="font-size:28px;letter-spacing:5px;font-weight:800;margin-top:12px">NEXORA</div><div style="font-size:10px;letter-spacing:4px;color:#e6a3aa;margin-top:4px">AZ TOOL STORE</div></header>
  <section style="position:relative;z-index:1;padding:30px"><div style="font-size:11px;letter-spacing:2px;color:#f08b98">ORDER CONFIRMATION</div><h1 style="font-size:27px;margin:10px 0;color:#fff">مرحبًا ${firstName}،</h1><p style="color:#e4dadd;line-height:1.9">${statusMessage} حالة الطلب الحالية: ${statusLabel}. يمكنك العودة إلى حسابك للاطلاع على آخر التحديثات.</p>
  <div style="margin:24px 0;padding:18px;border:1px solid #6d2632;border-radius:14px;background:#160d10;text-align:center"><div style="font-size:10px;color:#c78b93">رقم الطلب</div><div style="font-size:24px;letter-spacing:2px;color:#ff9eaa;font-weight:bold;margin-top:7px">${escapeHtml(order.id)}</div></div>
  <table style="width:100%;border-collapse:collapse;color:#fff"><tr><td style="padding:14px;border-bottom:1px solid #ffffff22;color:#c8aeb2">الباقة</td><td style="padding:14px;border-bottom:1px solid #ffffff22;text-align:left;font-weight:bold">${escapeHtml(order.plan_name)}</td></tr><tr><td style="padding:14px;border-bottom:1px solid #ffffff22;color:#c8aeb2">المدة</td><td style="padding:14px;border-bottom:1px solid #ffffff22;text-align:left">${Number(order.duration_days)} يوم</td></tr><tr><td style="padding:14px;border-bottom:1px solid #ffffff22;color:#c8aeb2">الإجمالي</td><td style="padding:14px;border-bottom:1px solid #ffffff22;text-align:left;font-weight:bold;color:#ff9eaa">${Number(order.price_sar).toFixed(2)} ر.س</td></tr><tr><td style="padding:14px;color:#c8aeb2">الحالة</td><td style="padding:14px;text-align:left"><span style="background:#242024;color:${statusColor};border-radius:30px;padding:6px 12px;font-size:12px">${statusLabel}</span></td></tr></table>
  ${eventRows ? `<h3 style="margin-top:25px;color:#f08b98">سجل تحديثات الطلب</h3><table style="width:100%;border-collapse:collapse">${eventRows}</table>` : ""}
  <p style="margin-top:26px;padding:14px;border-right:3px solid #d43b50;background:#1b1114;color:#cdbfc1;font-size:12px;line-height:1.8">هذه فاتورة استلام طلب وليست إثبات دفع. لا يتم تأكيد الدفع إلا بعد التحقق منه.</p>
  <footer style="margin-top:28px;text-align:center;color:#bca7ab;font-size:12px;line-height:1.9">شكرًا لثقتك بنا ❤️<br><strong style="letter-spacing:3px;color:#fff">NEXORA STORE</strong><br><span style="font-size:10px;color:#8d777c">CRAFTED FOR YOUR EXPERIENCE</span></footer></section></main></body></html>`;
}
