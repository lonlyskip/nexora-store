(()=>{
  try{
    let visitorId=localStorage.getItem("nexora_visitor_id");
    if(!visitorId){
      visitorId=crypto.randomUUID();
      localStorage.setItem("nexora_visitor_id",visitorId);
    }
    fetch("/api/visitors",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({visitorId}),
      cache:"no-store",
      keepalive:true
    }).catch(()=>{});
  }catch(error){
    console.warn("NEXORA visitor tracking unavailable");
  }
})();