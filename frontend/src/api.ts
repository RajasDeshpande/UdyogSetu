export type Role='ENTREPRENEUR'|'OFFICER'|'ADMIN';
export type Status='NOT_STARTED'|'WAITING'|'IN_REVIEW'|'ACTION_REQUIRED'|'APPROVED'|'REJECTED';
export interface Profile { businessName:string; industry:string; businessType:string; location:string; landType:string; investment:number; employees:number; environmentalImpact:'low'|'medium'|'high' }
export interface Approval { id:string; key:string; name:string; department:string; days:number; docs:string[]; dependsOn:string[]; status:Status; startedAt?:string; reason?:string; decidedAt?:string }
export interface Validation { classification:string; confidence:number; checks:{label:string;passed:boolean}[]; result:'VERIFIED'|'ACTION_REQUIRED'|'MANUAL_REVIEW'; reasons:string[]; method:string }
export interface Document {id:string;type:string;name:string;mime:string;size:number;uploadedAt:string;validation:Validation}
export interface Risk {score:number;level:'LOW'|'MEDIUM'|'HIGH';factors:{label:string;points:number;detail:string}[];provisionalEligible:boolean}
export interface Event {id:string;at:string;type:string;actor:string;message:string;department?:string}
export interface Notification {id:string;at:string;message:string;read:boolean}
export interface Application {id:string;ownerId:string;profile:Profile;status:'DRAFT'|'IN_PROGRESS'|'ACTION_REQUIRED'|'COMPLETED';createdAt:string;approvals:Approval[];documents:Document[];risk:Risk;events:Event[];notifications:Notification[]}
export interface User {id:string;name:string;email:string;role:Role}
export interface Analytics {applications:number;documents:number;approvals:number;distribution:{name:string;value:number}[];risk:{name:string;value:number}[];departments:{name:string;total:number;pending:number}[];simulation:{traditionalDays:number;parallelDays:number;assumption:string}}
const base='/api';
export function getSession():{token:string;user:User}|null {try{return JSON.parse(localStorage.getItem('udyog-session')||'null')}catch{return null}}
export function setSession(s:{token:string;user:User}|null){if(s)localStorage.setItem('udyog-session',JSON.stringify(s));else localStorage.removeItem('udyog-session')}
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
  const session=getSession(); const headers:Record<string,string>={...(options.headers as Record<string,string>||{})};
  if(session)headers.Authorization=`Bearer ${session.token}`;
  if(options.body && !(options.body instanceof FormData))headers['Content-Type']='application/json';
  let response:Response;
  try{response=await fetch(base+path,{...options,headers})}catch{throw new Error('Cannot connect to the Udyog Setu API. Check that the backend is running.')}
  const data=await response.json().catch(()=>({error:'Unexpected server response.'}));
  if(!response.ok)throw new Error(data.error||'Unable to complete this action.');
  return data as T;
}
export const post=<T>(path:string,data?:unknown)=>api<T>(path,{method:'POST',body:JSON.stringify(data||{})});
export const formatDate=(s?:string)=>s?new Date(s).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'—';
export const daysLeft=(a:Approval)=>a.startedAt?Math.ceil((new Date(a.startedAt).getTime()+a.days*86400000-Date.now())/86400000):a.days;
