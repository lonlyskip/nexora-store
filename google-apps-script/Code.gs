// NEXORA Gmail delivery bridge. Deploy as a Web App executing as your Google account.
const NEXORA_SECRET = "REPLACE_WITH_A_LONG_RANDOM_SECRET";
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");
    if (!NEXORA_SECRET || data.secret !== NEXORA_SECRET) return output({ok:false});
    if (!data.to || !data.subject || !data.html) return output({ok:false});
    const options = {htmlBody:data.html, name:"NEXORA STORE"};
    if (data.pdfHtml) {
      const pdf = HtmlService.createHtmlOutput(data.pdfHtml).getBlob().getAs(MimeType.PDF).setName(data.pdfName || "NEXORA-invoice.pdf");
      options.attachments = [pdf];
    }
    GmailApp.sendEmail(data.to, data.subject, "يرجى عرض هذه الرسالة باستخدام بريد يدعم HTML.", options);
    return output({ok:true});
  } catch (err) { return output({ok:false}); }
}
function output(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
