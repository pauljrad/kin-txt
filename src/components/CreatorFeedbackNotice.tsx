import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
export function CreatorFeedbackNotice() {
  const {user}=useAuth(); const navigate=useNavigate(); const shown=useRef(new Set<string>());
  const {data}=useQuery({queryKey:['creator-feedback-notices',user?.id], enabled:!!user,refetchInterval:15000,
    queryFn:async()=>{
      const {data,error}=await supabase.from('notifications').select('id,payload').eq('user_id',user!.id).eq('type','creator_feedback').eq('is_read',false).order('created_at',{ascending:false});
      if(error) throw error; return data;
    }});
  useEffect(()=>{
    for(const n of data??[]){
      if(shown.current.has(n.id)) continue;
      shown.current.add(n.id);
      const p=n.payload as {title:string;submission_id:string;decision:string};
      toast(p.decision === 'approved' ? 'Your TXT has been published' : 'Notes from editor',{id:n.id,description:`${p.title} — ${p.decision==='approved'?'Published':p.decision==='rejected'?'Rejected':'Resubmission requested'}`,duration:12000,
        action:{label:p.decision==='approved'?'View submission':'Read notes',onClick:()=>{
          navigate(`/create?tab=submissions&submission=${p.submission_id}`);
          void supabase.from('notifications').update({is_read:true}).eq('id',n.id);
        }}});
    }
  },[data,navigate]);
  return null;
}
