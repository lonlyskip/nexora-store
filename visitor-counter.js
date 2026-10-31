(()=>{
  const output=document.getElementById("visitor-count");
  if(!output)return;
  const show=value=>{if(Number.isFinite(Number(value)))output.textContent=new Intl.NumberFormat("ar-SA").format(Number(value));};
  (async()=>{
    try{
      let visitorId=localStorage.getItem("nexora_visitor_id");
      if(!visitorId){visitorId=crypto.randomUUID();localStorage.setItem("nexora_visitor_id",visitorId);}
      const response=await fetch("/api/visitors",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({visitorId}),cache:"no-store"});
      const data=await response.json();
      if(response.ok&&data.ok)show(data.total);
    }catch(error){
      try{const response=await fetch("/api/visitors",{cache:"no-store"});const data=await response.json();if(response.ok)show(data.total);}catch{}
    }
  })();
})();
