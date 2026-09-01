import { cookies } from "next/headers";
import { and,eq,gt } from "drizzle-orm";
import { getDb } from "@/db";
import { members,sessions } from "@/db/schema";
const hex=(b:ArrayBuffer)=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
export async function hashPin(email:string,pin:string){return hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`${email.toLowerCase()}|${pin}|mengs-v2`)))}
export async function currentUser(){const token=(await cookies()).get("mengs_session")?.value;if(!token)return null;const rows=await getDb().select({id:members.id,name:members.name,email:members.email,role:members.role}).from(sessions).innerJoin(members,eq(sessions.memberId,members.id)).where(and(eq(sessions.id,token),gt(sessions.expiresAt,new Date()),eq(members.active,true))).limit(1);return rows[0] as {id:number;name:string;email:string|null;role:"admin"|"treasurer"|"member"}|undefined||null}
export async function createSession(memberId:number){const token=crypto.randomUUID()+crypto.randomUUID(),expires=new Date(Date.now()+2592000000);await getDb().insert(sessions).values({id:token,memberId,expiresAt:expires});(await cookies()).set("mengs_session",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:2592000})}
export async function clearSession(){const c=await cookies(),token=c.get("mengs_session")?.value;if(token)await getDb().delete(sessions).where(eq(sessions.id,token));c.delete("mengs_session")}
