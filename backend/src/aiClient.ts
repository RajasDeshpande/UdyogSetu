import { Profile, Validation, validateDocument } from './core.js';
export async function validateWithFallback(type:string,name:string,mime:string,content:string,profile:Profile):Promise<Validation>{
  const url=process.env.AI_SERVICE_URL;
  if(url){try{const response=await fetch(`${url.replace(/\/$/,'')}/validate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,name,mime,content,profile}),signal:AbortSignal.timeout(1500)});if(response.ok)return await response.json() as Validation;}catch{/* local rules keep the demo usable */}}
  return validateDocument(type,name,mime,content,profile);
}
