const PLANS=[{id:'daily',name:'Daily',duration:'يوم واحد',price:4.99},{id:'weekly',name:'Weekly',duration:'7 أيام',price:9.99},{id:'monthly',name:'Monthly',duration:'30 يومًا',price:24.99,popular:true},{id:'3months',name:'3 Months',duration:'90 يومًا',price:69.99},{id:'6months',name:'6 Months',duration:'180 يومًا',price:129.99},{id:'annual',name:'Annual',duration:'365 يومًا',price:199.99}];
const sar=n=>new Intl.NumberFormat('ar-SA',{style:'currency',currency:'SAR',minimumFractionDigits:2}).format(n),$=s=>document.querySelector(s);
const plans=$('#plans'),dialog=$('#checkout'),form=$('#order-form'),status=$('#form-status'),cartDialog=$('#cart-dialog'),cartContent=$('#cart-content'),cartCount=$('#cart-count'),cartCheckout=$('#cart-checkout'),accountDialog=$('#account-dialog'),ordersDialog=$('#orders-dialog'),requestCodeForm=$('#request-code-form'),verifyCodeForm=$('#verify-code-form'),authStatus=$('#customer-auth-status');
let cartItems=[],customerEmail='',customerFirstName='',isLoggedIn=false,pendingCheckout=false;
$('#year').textContent=new Date().getFullYear();
function renderCart(){cartCount.textContent=String(cartItems.length);cartCheckout.disabled=!cartItems.length;if(!cartItems.length){cartContent.innerHTML='<p class="muted">السلة فارغة حاليًا. اختر باقة لإضافتها.</p>';return;}cartContent.innerHTML=cartItems.map((p,i)=>'<div class="cart-line"><div><strong>'+escapeText(p.name)+'</strong><small>'+escapeText(p.duration)+'</small></div><strong class="cart-price">'+sar(p.price)+'</strong><button type="button" class="remove-cart" data-remove-index="'+i+'">إزالة</button></div>').join('')+'<div class="cart-total"><strong>الإجمالي</strong><strong>'+sar(cartItems.reduce((sum,p)=>sum+p.price,0))+'</strong></div>';}
function setLoggedIn(value,email=''){isLoggedIn=value;if(email)customerEmail=email;$('#account-label').textContent=value?'حسابي':'تسجيل الدخول';$('#orders-open').hidden=!value;if(value){$('#account-title').textContent='حسابي';$('#customer-login').hidden=true;$('#customer-area').hidden=false;$('#profile-name').textContent=customerFirstName||'عميل NEXORA';$('#profile-email').textContent=customerEmail;}else{$('#account-title').textContent='تسجيل الدخول';$('#customer-login').hidden=false;$('#customer-area').hidden=true;}}
function openAccount(){accountDialog.showModal();if(isLoggedIn)loadCustomerOrders();}
$('#order-form').addEventListener('submit',e=>e.preventDefault());
function openCheckout(){if(!cartItems.length)return;$('#plan-id').value=cartItems[0].id;$('#chosen-name').textContent=cartItems[0].name;$('#chosen-price').textContent=sar(cartItems[0].price);status.textContent='';form.reset();$('#paypal-buttons').innerHTML='';if(cartDialog.open)cartDialog.close();dialog.showModal();loadPayPalButtons();}
function requireLoginForCheckout(){if(isLoggedIn){openCheckout();return;}pendingCheckout=true;cartDialog.close();accountDialog.showModal();setLoggedIn(false);authStatus.textContent='سجّل الدخول أولًا، وبعدها نكمل طلبك مباشرة.';}
plans.innerHTML=PLANS.map(p=>'<article class="plan '+(p.popular?'popular':'')+'">'+(p.popular?'<span class="badge">الأكثر اختيارًا</span>':'')+'<h3>'+p.name+'</h3><div class="duration">'+p.duration+'</div><div class="amount">'+sar(p.price)+'</div><ul><li>مدة اشتراك واضحة</li><li>تسليم يدوي بعد التحقق</li><li>التواصل عبر Discord</li></ul><button class="primary wide" data-plan="'+p.id+'">إضافة إلى السلة</button></article>').join('');
plans.addEventListener('click',e=>{const b=e.target.closest('[data-plan]');if(!b)return;const selected=PLANS.find(x=>x.id===b.dataset.plan);if(cartItems.length&&cartItems[0].id!==selected.id){alert('الدفع حاليًا لباقـة واحدة في كل عملية. أزل الباقة الحالية أولًا.');return;}if(!cartItems.length)cartItems.push(selected);renderCart();b.textContent='تمت الإضافة ✓';setTimeout(()=>{if(b.isConnected)b.textContent='إضافة إلى السلة';},1400);});
$('#cart-open').addEventListener('click',()=>{renderCart();cartDialog.showModal();});$('#account-open').addEventListener('click',openAccount);$('#orders-open').addEventListener('click',()=>{ordersDialog.showModal();if(isLoggedIn)loadCustomerOrders();});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.close).close()));
cartContent.addEventListener('click',e=>{const remove=e.target.closest('[data-remove-index]');if(remove){cartItems.splice(Number(remove.dataset.removeIndex),1);renderCart();}});cartCheckout.addEventListener('click',requireLoginForCheckout);$('#close-modal').addEventListener('click',()=>dialog.close());[dialog,cartDialog,accountDialog,ordersDialog].forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close();}));
async function loadPayPalButtons(){const root=$('#paypal-buttons');root.innerHTML='<p class="status">جارٍ تحميل خيارات الدفع…</p>';try{const configResponse=await fetch('/api/paypal/config',{cache:'no-store'}),config=await configResponse.json();if(!configResponse.ok)throw new Error(config.error||'تعذر تحميل PayPal');if(!window.paypal){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://www.paypal.com/sdk/js?client-id='+encodeURIComponent(config.clientId)+'&currency=SAR&intent=capture&components=buttons&disable-funding=card,credit';script.onload=resolve;script.onerror=()=>reject(new Error('تعذر تحميل PayPal'));document.head.appendChild(script);});}root.innerHTML='';await window.paypal.Buttons({style:{layout:'vertical',shape:'rect',label:'paypal'},fundingSource:window.paypal.FUNDING.PAYPAL,createOrder:async()=>{if(!isLoggedIn)throw new Error('سجّل الدخول أولًا');const plan=cartItems[0];if(!plan)throw new Error('السلة فارغة');const response=await fetch('/api/paypal/create-order',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({planId:plan.id,discord:$('#discord').value.trim()})});const data=await response.json();if(!response.ok)throw new Error(data.error||'تعذر إنشاء الدفع');window.nexoraPendingOrderId=data.orderId;return data.id;},onApprove:async(data)=>{status.textContent='جارٍ التحقق من الدفع…';const response=await fetch('/api/paypal/capture-order',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({paypalOrderId:data.orderID,orderId:window.nexoraPendingOrderId})});const result=await response.json();if(!response.ok)throw new Error(result.error||'تعذر تأكيد الدفع');const plan=cartItems.shift();renderCart();form.reset();await loadCustomerOrders();dialog.close();$('#success-order-ids').textContent=result.orderId;$('#success-email-note').textContent=result.emailSent?'تم تأكيد الدفع وإرسال الفاتورة إلى بريدك.':'تم تأكيد الدفع. قد يتأخر إرسال الفاتورة إلى بريدك.';$('#success-dialog').showModal();},onCancel:()=>{status.textContent='تم إلغاء عملية الدفع. لم يتم تأكيد الطلب.';},onError:(error)=>{status.textContent=error?.message||'حدث خطأ أثناء الدفع. لا تعاود الدفع قبل مراجعة حالة الطلب.';}}).render('#paypal-buttons');}catch(error){root.innerHTML='<p class="status">'+escapeText(error.message||'تعذر تجهيز الدفع')+'</p>';}}

requestCodeForm.addEventListener('submit',async e=>{e.preventDefault();customerEmail=$('#customer-email').value.trim().toLowerCase();customerFirstName=$('#customer-first-name').value.trim();authStatus.textContent='جارٍ إرسال الرمز…';const button=requestCodeForm.querySelector('button[type=submit]');button.disabled=true;try{const r=await fetch('/api/auth/request-code',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({email:customerEmail,firstName:customerFirstName})}),d=await r.json();if(!r.ok)throw new Error(d.error||'تعذر إرسال الرمز');requestCodeForm.hidden=true;verifyCodeForm.hidden=false;authStatus.textContent='تم إرسال رمز التحقق بنجاح';$('#customer-code').focus();}catch(err){authStatus.textContent=err.message;}finally{button.disabled=false;}});
$('#resend-code').addEventListener('click',async()=>{const button=$('#resend-code');button.disabled=true;button.textContent='جارٍ إعادة الإرسال…';authStatus.textContent='';try{const r=await fetch('/api/auth/request-code',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({email:customerEmail,firstName:customerFirstName})}),d=await r.json();if(!r.ok)throw new Error(d.error||'تعذر إعادة إرسال الرمز');authStatus.textContent='تم إرسال رمز تحقق جديد بنجاح';$('#customer-code').value='';$('#customer-code').focus();}catch(err){authStatus.textContent=err.message;}finally{button.disabled=false;button.textContent='إعادة إرسال رمز التحقق';}});
$('#refresh-orders').addEventListener('click',async()=>{const b=$('#refresh-orders');b.disabled=true;b.textContent='جارٍ تحديث الطلبات…';await loadCustomerOrders();b.disabled=false;b.textContent='↻ تحديث الطلبات';});
$('#change-email').addEventListener('click',()=>{verifyCodeForm.hidden=true;requestCodeForm.hidden=false;$('#customer-code').value='';authStatus.textContent='';});
verifyCodeForm.addEventListener('submit',async e=>{e.preventDefault();authStatus.textContent='جارٍ التحقق…';const button=verifyCodeForm.querySelector('button[type=submit]');button.disabled=true;try{const r=await fetch('/api/auth/verify-code',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({email:customerEmail,code:$('#customer-code').value.trim(),firstName:customerFirstName})}),d=await r.json();if(!r.ok)throw new Error(d.error||'تعذر تسجيل الدخول');setLoggedIn(true,d.email||customerEmail);customerFirstName=d.firstName||customerFirstName;requestCodeForm.hidden=true;verifyCodeForm.hidden=true;authStatus.textContent='';await loadCustomerOrders();if(accountDialog.open)accountDialog.close();if(pendingCheckout){pendingCheckout=false;openCheckout();}}catch(err){authStatus.textContent=err.message;}finally{button.disabled=false;}});
async function loadCustomerOrders(){try{const r=await fetch('/api/customer/orders',{credentials:'same-origin',cache:'no-store'}),d=await r.json();if(!r.ok){setLoggedIn(false);return false;}setLoggedIn(true,d.email);customerFirstName=d.firstName||customerFirstName;$('#profile-name').textContent=customerFirstName||'عميل NEXORA';$('#profile-email').textContent=customerEmail;renderOrders(d.orders||[]);return true;}catch{setLoggedIn(false);authStatus.textContent='تعذر تحميل بيانات الحساب';return false;}}
function renderOrders(orders){const root=$('#customer-orders');if(!orders.length){root.innerHTML='<div class="empty-orders"><span>🧾</span><strong>ما عندك طلبات حتى الآن</strong><p>أول ما تطلب اشتراكك بتلقى تفاصيله هنا.</p></div>';return;}root.innerHTML=orders.map(o=>'<article class="order-card"><div class="order-card-head"><div><small>رقم الطلب</small><strong>'+escapeText(o.id)+'</strong></div><span class="order-status status-'+escapeText(o.status)+'">'+statusArabic(o.status)+'</span></div><div class="order-details"><div><small>الباقة</small><strong>'+escapeText(o.plan_name)+'</strong></div><div><small>المدة</small><strong>'+Number(o.duration_days)+' يوم</strong></div><div><small>الإجمالي</small><strong>'+sar(Number(o.price_sar))+'</strong></div><div><small>تاريخ الطلب</small><strong>'+new Date(o.created_at).toLocaleDateString('ar-SA',{timeZone:'Asia/Riyadh'})+'</strong></div></div><div class="order-events">'+(o.events||[]).map(ev=>'<p><span></span>'+escapeText(ev.message)+' <small>'+new Date(ev.created_at).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'})+'</small></p>').join('')+'</div><a class="invoice-link" href="/api/customer/invoice?id='+encodeURIComponent(o.id)+'" target="_blank" rel="noopener">عرض الفاتورة ↗</a></article>').join('');}
function statusArabic(s){return({pending:'قيد المراجعة',paid:'تم التحقق من الدفع',delivered:'تم التسليم',cancelled:'ملغي'})[s]||s;}
function escapeText(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
$('#customer-logout').addEventListener('click',async()=>{await fetch('/api/customer/orders',{method:'DELETE',credentials:'same-origin'});if(ordersDialog.open)ordersDialog.close();setLoggedIn(false);customerEmail='';customerFirstName='';requestCodeForm.reset();requestCodeForm.hidden=false;verifyCodeForm.hidden=true;authStatus.textContent='تم تسجيل الخروج';});
(async()=>{const ok=await loadCustomerOrders();if(!ok){requestCodeForm.hidden=false;verifyCodeForm.hidden=true;}})();

$('#success-close').addEventListener('click',()=>$('#success-dialog').close());
$('#success-view-orders').addEventListener('click',()=>{$('#success-dialog').close();ordersDialog.showModal();loadCustomerOrders();});


// Block copying from all private storefront dialogs, including text selected inside form fields.
const privateCopyAreas = ['#cart-dialog', '#checkout', '#orders-dialog', '#account-dialog', '#success-dialog'];
const privateCopyStyle = document.createElement('style');
privateCopyStyle.textContent = privateCopyAreas.join(',') + ' , ' + privateCopyAreas.map(s=>s+' *').join(',') + ' { -webkit-user-select: none !important; user-select: none !important; }';
document.head.appendChild(privateCopyStyle);
document.addEventListener('copy', event => {
  const active = document.activeElement;
  const selection = window.getSelection();
  const selectedNodes = [];
  if (selection && !selection.isCollapsed) {
    for (let i = 0; i < selection.rangeCount; i++) {
      const range = selection.getRangeAt(i);
      selectedNodes.push(range.startContainer, range.endContainer);
    }
  }
  const isPrivate = (node) => {
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return !!element && privateCopyAreas.some(selector => element.closest(selector));
  };
  if (privateCopyAreas.some(selector => active?.closest?.(selector)) || selectedNodes.some(isPrivate)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

// Prevent copying storefront essentials (plans, cart, checkout and order details).
// Form fields remain copyable so customers can manage their own input.
document.addEventListener('copy', event => {
  const active = document.activeElement;
  if (active && active.matches('input, textarea, [contenteditable="true"]')) return;
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;
  const protectedAreas = ['#plans', '#cart-dialog', '#checkout', '#orders-dialog'];
  const selectedNodes = [];
  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i);
    selectedNodes.push(range.startContainer, range.endContainer);
  }
  const touchesProtectedArea = selectedNodes.some(node => {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return element && protectedAreas.some(selector => element.closest(selector));
  });
  if (touchesProtectedArea) event.preventDefault();
});


// Global copy policy: only text entered in editable fields may be copied.
// Pasting into fields remains available; this does not block normal typing.
document.addEventListener('copy', event => {
  const active = document.activeElement;
  const isEditableField = active && (
    active.matches('input:not([type="button"]):not([type="submit"]):not([type="reset"]), textarea') ||
    active.isContentEditable
  );
  if (!isEditableField) event.preventDefault();
}, true);
