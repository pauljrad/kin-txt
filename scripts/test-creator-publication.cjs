const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict'), ts=require('typescript');
const {webcrypto}=require('node:crypto');
function load(file,api,fetch){let handler;const source=fs.readFileSync(file,'utf8').replace(/^import .*;\n/gm,'');const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
vm.runInNewContext(js,{serve:f=>handler=f,createClient:()=>api,Deno:{env:{get:()=> 'test'}},crypto:webcrypto,TextEncoder,Response,Request,AbortSignal,fetch,console:{error(){}},setTimeout:f=>{f();return 0}});return handler;}
(async()=>{
for(const fail of [false,true]){
 const emails=[],updates=[];
 const submission={id:'submission',creator_user_id:'owner',creator_email:'outdated@example.test',title:'A TXT',status:'pending'};
 const api={auth:{admin:{getUserById:async id=>{assert.equal(id,'owner');return {data:{user:{email:'current@example.test'}}};}}},rpc:async()=>({data:{success:true,status:'approved',publicationId:'publication'}}),from:()=>{const b={select:()=>b,eq:()=>b,maybeSingle:async()=>({data:submission}),update:x=>{updates.push(x);return b}};return b;}};
 const handler=load('supabase/functions/creator-review/index.ts',api,async(url,options)=>{emails.push(JSON.parse(options.body));assert.equal(options.headers['Idempotency-Key'],'creator-published/publication');return new Response('{}',{status:fail?503:200});});
 const response=await handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({token:'x'.repeat(40),action:'approve'})}));const result=await response.json();
 assert.equal(result.success,true);assert.equal(result.status,'approved');assert.equal(result.emailSent,!fail);assert.equal(emails.length,fail?3:1);assert.deepEqual(emails[0].to,['current@example.test']);assert.equal(emails[0].subject,'Your TXT has been published');assert.equal(updates.at(-1).publication_email_status,fail?'failed':'sent');
}
let called=false;
const api={auth:{getUser:async()=>({data:{user:{id:'real-owner'}}})},rpc:async(name,args)=>{called=true;assert.equal(name,'remove_creator_publication');assert.equal(args.p_creator,'real-owner');return {error:null};}};
const remove=load('supabase/functions/delete-creator-publication/index.ts',api);
assert.equal((await remove(new Request('https://example.test',{method:'POST',body:'{}'}))).status,401);assert.equal(called,false);
const response=await remove(new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({submissionId:'11111111-1111-1111-1111-111111111111',creatorId:'forged-owner'})}));assert.equal(response.status,200);assert.equal(called,true);
console.log('PASS: current account email, idempotency, delivery failure reporting, auth and server-selected owner');
})().catch(e=>{console.error(e);process.exit(1)});
