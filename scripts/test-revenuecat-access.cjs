const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ts=require(process.env.TYPESCRIPT_PATH || 'typescript');
const source=fs.readFileSync('supabase/functions/revenuecat-webhook/index.ts','utf8').replace(/^import .*;\n/gm,'');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
async function run(existing,event){let handle,writes=[];const builder={select(){return this},eq(){return this},async maybeSingle(){return {data:existing}},async upsert(row){writes.push(row);return {error:null}}};vm.runInNewContext(code,{serve:f=>handle=f,createClient:()=>({from:()=>builder}),Deno:{env:{get:key=>key==='REVENUECAT_WEBHOOK_AUTH'?'test-secret':'test'}},Response,console});let res=await handle({method:'POST',headers:new Headers({Authorization:'test-secret'}),json:async()=>({event:{app_user_id:'test-user',...event}})});assert.equal(res.status,200);return writes;}
(async()=>{
const expiry={type:'EXPIRATION',product_id:'rc_promo_Pro_daily',expiration_at_ms:1000};
assert.equal((await run({status:'lifetime',plan:'owner_access'},expiry)).length,0);
assert.equal((await run({status:'active',stripe_subscription_id:'sub_test'},expiry)).length,0);
assert.equal((await run({status:'active',current_period_end:new Date(2000).toISOString()},expiry)).length,0);
assert.equal((await run({status:'active',current_period_end:new Date(1000).toISOString()},expiry))[0].status,'canceled');
assert.equal((await run({status:'active'},{type:'SUBSCRIPTION_PAUSED'})).length,0);
assert.equal((await run({status:'canceled'},{type:'RENEWAL',product_id:'monthly',expiration_at_ms:3000}))[0].status,'active');
assert.equal((await run({status:'active'},{type:'CANCELLATION'})).length,0);
console.log('PASS: owner/Stripe access protected; stale expiry ignored; genuine expiry and renewal work; pause/cancellation retain access');
})().catch(e=>{console.error(e);process.exit(1)});
