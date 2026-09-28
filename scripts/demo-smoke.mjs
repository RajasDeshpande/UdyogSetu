const base=process.env.API_URL||'http://localhost:4000/api';
async function call(path,method='GET',body,token){const r=await fetch(base+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(`${method} ${path}: ${r.status} ${data.error}`);return data}
const ent=await call('/auth/demo','POST',{role:'ENTREPRENEUR'});const off=await call('/auth/demo','POST',{role:'OFFICER'});
const profile={businessName:'Smoke Test Components Pvt. Ltd.',industry:'Manufacturing',businessType:'Private Limited',location:'Pune',landType:'Notified industrial estate',investment:4,employees:40,environmentalImpact:'low'};
const created=await call('/applications','POST',profile,ent.token);
if(created.approvals.length<10)throw Error('Too few approvals');
let denied=false;try{await call(`/applications/${created.id}/submit`,'POST',{},ent.token)}catch{denied=true}if(!denied)throw Error('Submission should require documents');
for(const type of [...new Set(created.approvals.flatMap(x=>x.docs))]){
  const text=`${type}\nBusiness: ${profile.businessName}\nLocation: Pune, Maharashtra\nPAN: ABCDE1234F\nProduction area and fire exit marked.\n`;
  const form=new FormData();form.append('applicationId',created.id);form.append('type',type);form.append('file',new Blob([text],{type:'text/plain'}),`${type.toLowerCase().replaceAll(' ','-')}.txt`);
  const r=await fetch(base+'/documents/upload',{method:'POST',headers:{Authorization:`Bearer ${ent.token}`},body:form});const data=await r.json();if(!r.ok)throw Error(data.error);if(data.document.validation.result!=='VERIFIED')throw Error(`${type} not verified`);
}
const submitted=await call(`/applications/${created.id}/submit`,'POST',{},ent.token);if(submitted.started.length<5)throw Error('Parallel routing failed');
let latest=await call(`/applications/${created.id}`,'GET',undefined,ent.token);const plan=latest.approvals.find(x=>x.key==='factory-plan');const fire=latest.approvals.find(x=>x.key==='fire');if(fire.status!=='WAITING')throw Error('Dependency not waiting');
await call(`/approvals/${plan.id}/approve`,'POST',{},off.token);latest=await call(`/applications/${created.id}`,'GET',undefined,ent.token);if(latest.approvals.find(x=>x.key==='fire').status!=='IN_REVIEW')throw Error('Dependency did not release');
console.log(`Demo smoke passed: ${created.id}, ${submitted.started.length} parallel starts, dependency released, entrepreneur state updated.`);
