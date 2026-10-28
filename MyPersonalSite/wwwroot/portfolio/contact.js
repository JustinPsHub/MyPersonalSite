(()=>{
 'use strict';
 const form=document.querySelector('#contact-form');if(!form)return;
 const button=document.querySelector('#contact-submit'),status=document.querySelector('#contact-status'),ready=document.querySelector('#contact-ready');
 let token='',address='';
 const unavailable='Email contact is temporarily unavailable. Please try again or use GitHub.';
 async function readData(response){try{return await response.json()}catch{throw new Error(unavailable)}}
 async function request(url,options){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{return await fetch(url,{...options,signal:controller.signal})}catch{throw new Error(unavailable)}finally{clearTimeout(timer)}}
 const fail=message=>{status.textContent=message;button.disabled=false;button.textContent='Try again'};
 async function prepare(){button.disabled=true;try{const response=await request('/api/contact',{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store'});const data=await readData(response);if(!response.ok||typeof data.token!=='string')throw new Error(data.message||'Contact is temporarily unavailable. Please try again later or use GitHub.');token=data.token;document.querySelector('#contact-token').value=token;button.disabled=false;button.innerHTML='Email Justin <span aria-hidden="true">↗</span>';status.textContent=''}catch(error){token='';fail(error.message)}}
 form.addEventListener('submit',async event=>{event.preventDefault();if(!token){await prepare();return}button.disabled=true;status.textContent='Opening email…';
  const send=()=>request('/api/contact',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({token,company:form.elements.company.value}),cache:'no-store'});
  try{let response=await send();if(response.status===425){await new Promise(resolve=>setTimeout(resolve,2000));response=await send()}const data=await readData(response);if(!response.ok)throw new Error(data.message||'Please try again.');if(typeof data.email!=='string'||data.email.length>254||data.mailto!=='mailto:'+encodeURIComponent(data.email))throw new Error('Please refresh the page and try again.');address=data.email;document.querySelector('#open-email').href=data.mailto;document.querySelector('#contact-address').textContent=address;form.hidden=true;ready.hidden=false;status.textContent='Use the link if your email app doesn’t open.';window.open(data.mailto,'_self');
  }catch(error){token='';fail(error.message)}
 });
 document.querySelector('#copy-contact-email').addEventListener('click',async()=>{if(!address)return;try{await navigator.clipboard.writeText(address);status.textContent='Email address copied.'}catch{status.textContent='You can select and copy the address above.'}});
 prepare();
})();
