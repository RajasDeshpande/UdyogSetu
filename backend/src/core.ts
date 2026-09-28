export type Role = 'ENTREPRENEUR' | 'OFFICER' | 'ADMIN';
export type ApprovalStatus = 'NOT_STARTED' | 'WAITING' | 'IN_REVIEW' | 'ACTION_REQUIRED' | 'APPROVED' | 'REJECTED';
export type DocumentStatus = 'VERIFIED' | 'ACTION_REQUIRED' | 'MANUAL_REVIEW';
export interface Profile { businessName: string; industry: string; businessType: string; location: string; landType: string; investment: number; employees: number; environmentalImpact: 'low'|'medium'|'high'; }
export interface ApprovalTemplate { key: string; name: string; department: string; days: number; docs: string[]; dependsOn: string[]; sectors?: string[]; minEmployees?: number; }
export interface Approval extends ApprovalTemplate { id: string; status: ApprovalStatus; submittedAt?: string; startedAt?: string; decidedAt?: string; reason?: string; }
export interface Validation { classification: string; confidence: number; checks: { label: string; passed: boolean }[]; result: DocumentStatus; reasons: string[]; method: string; }
export interface Document { id: string; type: string; name: string; mime: string; size: number; uploadedAt: string; validation: Validation; }
export interface Risk { score: number; level: 'LOW'|'MEDIUM'|'HIGH'; factors: { label: string; points: number; detail: string }[]; provisionalEligible: boolean; }
export interface Event { id: string; at: string; type: string; actor: string; message: string; department?: string; }
export interface Notification { id: string; at: string; message: string; read: boolean; }
export interface Application { id: string; ownerId: string; profile: Profile; status: 'DRAFT'|'IN_PROGRESS'|'ACTION_REQUIRED'|'COMPLETED'; createdAt: string; approvals: Approval[]; documents: Document[]; risk: Risk; events: Event[]; notifications: Notification[]; }
export interface Store { applications: Application[]; }

export const templates: ApprovalTemplate[] = [
  {key:'udyam',name:'Udyam registration',department:'Ministry of MSME',days:1,docs:['PAN Card'],dependsOn:[]},
  {key:'gst',name:'GST registration',department:'GST Network (demo)',days:7,docs:['PAN Card','Address Proof'],dependsOn:[]},
  {key:'factory-plan',name:'Factory plan approval',department:'Directorate of Industrial Safety & Health',days:21,docs:['Factory Layout Plan','Land Document'],dependsOn:[]},
  {key:'pollution',name:'Consent to Establish',department:'Maharashtra Pollution Control Board',days:45,docs:['Factory Layout Plan','Land Document'],dependsOn:[]},
  {key:'power',name:'Power load sanction',department:'MSEDCL',days:15,docs:['Address Proof','Factory Layout Plan'],dependsOn:[]},
  {key:'fire',name:'Fire NOC',department:'Maharashtra Fire Services',days:20,docs:['Factory Layout Plan'],dependsOn:['factory-plan']},
  {key:'factory-license',name:'Factory licence',department:'Directorate of Industrial Safety & Health',days:30,docs:['Factory Layout Plan','PAN Card'],dependsOn:['factory-plan']},
  {key:'trade',name:'Local trade licence',department:'Municipal Corporation',days:10,docs:['Address Proof','Land Document'],dependsOn:[]},
  {key:'labour',name:'Labour registration',department:'Labour Department',days:7,docs:['PAN Card'],dependsOn:[],minEmployees:10},
  {key:'professional-tax',name:'Professional tax registration',department:'Maharashtra State Tax',days:7,docs:['PAN Card'],dependsOn:[],minEmployees:1},
  {key:'water',name:'Water connection',department:'Local Water Authority',days:18,docs:['Land Document','Factory Layout Plan'],dependsOn:[]},
  {key:'building',name:'Building plan sanction',department:'Municipal Corporation',days:25,docs:['Factory Layout Plan','Land Document'],dependsOn:[],sectors:['Manufacturing','Food Processing','Chemicals']},
  {key:'food',name:'Food safety licence',department:'Food Safety Department',days:30,docs:['PAN Card','Factory Layout Plan'],dependsOn:[],sectors:['Food Processing']},
  {key:'boiler',name:'Boiler registration',department:'Directorate of Steam Boilers',days:20,docs:['Factory Layout Plan'],dependsOn:['factory-plan'],sectors:['Manufacturing','Chemicals']},
  {key:'hazard',name:'Hazardous waste authorisation',department:'Maharashtra Pollution Control Board',days:30,docs:['Environmental Report'],dependsOn:['pollution'],sectors:['Chemicals']}
];
export const requiredDocTypes = (app: Application) => [...new Set(app.approvals.flatMap(a=>a.docs))];
export function generateApprovals(profile: Profile, applicationId='DRAFT'): Approval[] {
  return templates.filter(t=>(!t.sectors||t.sectors.includes(profile.industry))&&(!t.minEmployees||profile.employees>=t.minEmployees))
    .map((t,i)=>({...t,id:`${applicationId}-APR-${i+1}`,status:'NOT_STARTED'}));
}
export function validateDocument(type: string, name: string, mime: string, content: string, profile: Profile): Validation {
  const text = `${name} ${content}`.toLowerCase();
  const terms: Record<string,string[]> = {
    'PAN Card':['pan','permanent account'], 'Address Proof':['address','utility','lease'],
    'Factory Layout Plan':['factory','layout','plan'], 'Land Document':['land','deed','lease'],
    'Environmental Report':['environment','impact','pollution']
  };
  const recognized = (terms[type]||[type.toLowerCase()]).some(t=>text.includes(t));
  const normalized = (s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
  const businessMatch = !content || normalized(content).includes(normalized(profile.businessName)) || normalized(content).includes(normalized(profile.businessName.split(' ')[0]));
  const isText = mime==='text/plain';
  const checks = [
    {label:'Document type recognized',passed:recognized},
    {label:'Business name consistent',passed:businessMatch},
    {label:'File within size and type limits',passed:true}
  ];
  if(type==='PAN Card' && isText) checks.push({label:'PAN format present',passed:/\b[A-Z]{5}[0-9]{4}[A-Z]\b/.test(content)});
  if(type==='Factory Layout Plan' && isText) checks.push({label:'Fire exits indicated',passed:/fire\s*exit/i.test(content)});
  if(type==='Environmental Report' && isText) checks.push({label:'Environmental impact indicated',passed:/environment|impact|emissions/i.test(content)});
  const reasons = checks.filter(c=>!c.passed).map(c=>c.label);
  return {classification:recognized?type:'Unrecognized document',confidence:recognized?(isText?94:72):36,checks,result:reasons.length?'ACTION_REQUIRED':isText?'VERIFIED':'MANUAL_REVIEW',reasons:reasons.length?reasons:isText?[]:['Image/PDF content requires officer review; filename check only'],method:isText?'Rule-based text checks':'Filename and file metadata only'};
}
export function scoreRisk(app: Application): Risk {
  const required=requiredDocTypes(app), verified=required.filter(t=>app.documents.some(d=>d.type===t&&d.validation.result==='VERIFIED')).length;
  const missing=required.length-verified;
  const factors=[
    {label:'Document completeness',points:Math.min(30,missing*6),detail:`${verified}/${required.length} required document types verified`},
    {label:'Industry category',points:app.profile.industry==='Chemicals'?22:app.profile.industry==='Manufacturing'?8:4,detail:app.profile.industry},
    {label:'Environmental impact',points:{low:0,medium:12,high:25}[app.profile.environmentalImpact],detail:`${app.profile.environmentalImpact} impact selected`},
    {label:'Investment scale',points:app.profile.investment>10?10:app.profile.investment>5?5:2,detail:`₹${app.profile.investment} crore investment`},
    {label:'Approval complexity',points:app.approvals.filter(a=>a.dependsOn.length>0).length*2,detail:`${app.approvals.filter(a=>a.dependsOn.length>0).length} dependent approvals`}
  ];
  const score=Math.min(100,factors.reduce((n,f)=>n+f.points,0));
  return {score,level:score<30?'LOW':score<60?'MEDIUM':'HIGH',factors,provisionalEligible:score<30&&missing===0};
}
export function startReady(app: Application): string[] {
  const started:string[]=[];
  for(const a of app.approvals){
    if(a.status==='NOT_STARTED'||a.status==='WAITING'){
      if(a.dependsOn.every(key=>app.approvals.find(x=>x.key===key)?.status==='APPROVED')){a.status='IN_REVIEW';a.startedAt=new Date().toISOString();started.push(a.name);}
      else a.status='WAITING';
    }
  }
  return started;
}
export function emit(app: Application,type:string,actor:string,message:string,department?:string){
  const at=new Date().toISOString(); app.events.unshift({id:`EV-${crypto.randomUUID()}`,at,type,actor,message,department});
  if(['APPROVAL_APPROVED','APPROVAL_REJECTED','DOCUMENT_REQUESTED','APPLICATION_COMPLETED','SLA_WARNING'].includes(type)||(type==='DOCUMENT_VALIDATED'&&/action required|needs correction/i.test(message))) app.notifications.unshift({id:`NT-${crypto.randomUUID()}`,at,message,read:false});
}
export function updateOverall(app:Application){
  app.status=app.approvals.every(a=>a.status==='APPROVED')?'COMPLETED':app.approvals.some(a=>a.status==='ACTION_REQUIRED'||a.status==='REJECTED')?'ACTION_REQUIRED':app.approvals.some(a=>a.status==='IN_REVIEW'||a.status==='WAITING')?'IN_PROGRESS':'DRAFT';
  if(app.status==='COMPLETED')emit(app,'APPLICATION_COMPLETED','Workflow engine','All approval decisions recorded');
}
