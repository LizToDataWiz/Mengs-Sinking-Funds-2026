import { cookies } from "next/headers";
import { env } from "cloudflare:workers";
const hex=(b:ArrayBuffer)=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
export async function hashPin(email:string,pin:string){return hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`${email.toLowerCase()}|${pin}|mengs-v1`)))}
export async function currentUser(){const token=(await cookies()).get("mengs_session")?.value;if(!token)return null;return await env.DB.prepare("SELECT m.id,m.name,m.email,m.role FROM sessions s JOIN members m ON m.id=s.member_id WHERE s.id=? AND s.expires_at>datetime('now') AND m.active=1").bind(token).first() as {id:number;name:string;email:string;role:"admin"|"member"}|null}
export async function createSession(memberId:number){const token=crypto.randomUUID()+crypto.randomUUID(),now=new Date(),expires=new Date(now.getTime()+2592000000).toISOString();await env.DB.prepare("INSERT INTO sessions(id,member_id,expires_at,created_at) VALUES(?,?,?,?)").bind(token,memberId,expires,now.toISOString()).run();(await cookies()).set("mengs_session",token,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:2592000})}
export async function clearSession(){const c=await cookies(),token=c.get("mengs_session")?.value;if(token)await env.DB.prepare("DELETE FROM sessions WHERE id=?").bind(token).run();c.delete("mengs_session")}
