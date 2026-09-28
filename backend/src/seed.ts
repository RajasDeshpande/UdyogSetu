import bcrypt from 'bcryptjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Application, Document, Profile, Store, emit, generateApprovals, scoreRisk, startReady, validateDocument } from './core.js';

export const dataFile=resolve(process.cwd(),'data/store.json');
export const demoUsers=[
  {id:'USR-ENT-1',name:'Aarav Kulkarni',email:'entrepreneur@demo.udyogsetu.in',role:'ENTREPRENEUR' as const},
  {id:'USR-OFF-1',name:'Meera Patil',email:'officer@demo.udyogsetu.in',role:'OFFICER' as const},
  {id:'USR-ADM-1',name:'Ananya Deshmukh',email:'admin@demo.udyogsetu.in',role:'ADMIN' as const}
];
export const passwordHash=bcrypt.hashSync('Demo@2026',10);
const names=['GreenForge Manufacturing Pvt. Ltd.','Sahyadri Agro Foods LLP','Konkan Precision Works','Pune BioChem Industries','Vidarbha Textile Mills','Nashik Cold Chain Logistics','Satara Electronics Pvt. Ltd.','Western Paper Products','Aurangabad Auto Components','Kolhapur Foods & Spices'];
const industries=['Manufacturing','Food Processing','Manufacturing','Chemicals','Textiles','Logistics','Electronics','Manufacturing','Manufacturing','Food Processing'];
const places=['Pune','Nashik','Pune','Raigad','Nagpur','Nashik','Satara','Kolhapur','Chhatrapati Sambhajinagar','Kolhapur'];
export function sampleText(type:string,p:Profile,bad=false){
  const base=`${type}\nBusiness: ${bad?'Different Industries LLP':p.businessName}\nLocation: ${p.location}, Maharashtra\n`;
  if(type==='PAN Card')return base+'PAN: ABCDE1234F\n';
  if(type==='Factory Layout Plan')return base+(bad?'Production area marked; loading bay marked.':'Production area, loading bay and fire exit marked.');
  return base+'Reference: DEMO-2026-101';
}
function makeDoc(type:string,p:Profile,i:number,bad=false):Document{
  const text=sampleText(type,p,bad);
  return {id:`DOC-${i}-${type.replace(/\W/g,'').slice(0,8)}`,type,name:`${type.toLowerCase().replace(/ /g,'-')}.txt`,mime:'text/plain',size:Buffer.byteLength(text),uploadedAt:new Date(Date.now()-86400000*(i+1)).toISOString(),validation:validateDocument(type,`${type}.txt`,'text/plain',text,p)};
}
export function makeSeed():Store{
  const applications:Application[]=names.map((businessName,i)=>{
    const profile:Profile={businessName,industry:industries[i],businessType:i%3===0?'Private Limited':'LLP',location:places[i],landType:i%2?'Private industrial land':'Notified industrial estate',investment:[8.5,4.5,3.2,18,6.1,2.7,9.4,5.6,7.8,2.2][i],employees:[85,72,44,120,96,38,77,53,82,35][i],environmentalImpact:i===3||i===4?'high':i===1?'medium':'low'};
    const appId=`US-MH-2026-${String(124+i).padStart(5,'0')}`;
    const app:Application={id:appId,ownerId:i===0?'USR-ENT-1':`SEED-${i}`,profile,status:'DRAFT',createdAt:new Date(Date.now()-86400000*(i+2)).toISOString(),approvals:generateApprovals(profile,appId),documents:[],risk:{score:0,level:'LOW',factors:[],provisionalEligible:false},events:[],notifications:[]};
    const required=[...new Set(app.approvals.flatMap(a=>a.docs))];
    app.documents=required.map((type,j)=>makeDoc(type,profile,i*10+j,i===0&&type==='Factory Layout Plan'));
    if(i>0){
      startReady(app);app.status='IN_PROGRESS';
      app.approvals.forEach((a,j)=>{ if(j<i%5)a.status='APPROVED'; else if(j===i%5&&i%3===0)a.status='ACTION_REQUIRED'; else if(j===i%5&&i===7)a.status='REJECTED'; });
      if(i%4===0)app.approvals.find(a=>a.status==='IN_REVIEW')!.startedAt=new Date(Date.now()-86400000*16).toISOString();
    }
    app.risk=scoreRisk(app);
    emit(app,'APPLICATION_CREATED','Entrepreneur','Business application created');
    if(i===0)emit(app,'DOCUMENT_VALIDATED','Rule-based validation','Factory Layout Plan needs correction before submission');
    else emit(app,'APPROVAL_SUBMITTED','Workflow engine',`${app.approvals.filter(a=>a.status==='IN_REVIEW').length} independent approvals routed in parallel`);
    return app;
  });
  return {applications};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/src/seed.ts')){
  const store=makeSeed();mkdirSync(dirname(dataFile),{recursive:true});writeFileSync(dataFile,JSON.stringify(store,null,2));
  const dir=resolve(process.cwd(),'uploads');mkdirSync(dir,{recursive:true});
  for(const app of store.applications)for(const doc of app.documents)writeFileSync(resolve(dir,doc.id),sampleText(doc.type,app.profile,app.id==='US-MH-2026-00124'&&doc.type==='Factory Layout Plan'));
  console.log(`Seeded ${dataFile}`);
}
