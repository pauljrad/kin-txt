import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
const headers = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Content-Type":"application/json"};
serve(async req => {
 if(req.method==="OPTIONS") return new Response(null,{headers});
 try {
  const jwt=req.headers.get("Authorization")?.replace(/^Bearer /,"");
  if(!jwt) return new Response(JSON.stringify({error:"Sign in to delete your published TXT."}),{status:401,headers});
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const {data:{user},error}=await admin.auth.getUser(jwt);
  if(error||!user) return new Response(JSON.stringify({error:"Please sign in again."}),{status:401,headers});
  const {submissionId}=await req.json();
  if(typeof submissionId!=="string"||!/^[0-9a-f-]{36}$/i.test(submissionId)) return new Response(JSON.stringify({error:"Invalid submission."}),{status:400,headers});
  const {error:removeError}=await admin.rpc("remove_creator_publication",{p_submission:submissionId,p_creator:user.id});
  if(removeError) return new Response(JSON.stringify({error:"This published TXT could not be deleted. Check that it belongs to your account."}),{status:409,headers});
  return new Response(JSON.stringify({success:true}),{headers});
 } catch {return new Response(JSON.stringify({error:"Could not delete this TXT. Please try again."}),{status:500,headers});}
});