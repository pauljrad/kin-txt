import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CreatorSubmission {
  id: string; title: string; body: string; content_type: string; status: string;
  submitted_at: string; feedback: { notes: string; decision: string; sentAt: string }[];
}
const labels: Record<string,string> = {pending:'Under review', approved:'Published', rejected:'Rejected', revision_required:'Resubmission requested'};
export function CreatorSubmissions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [filter,setFilter] = useState('all');
  const {data=[],isPending,error,refetch} = useQuery({
    queryKey:['creator-submissions',user?.id], enabled:!!user,
    refetchInterval:30000,
    queryFn:async()=>{
      const {data,error}=await supabase.from('creator_submissions' as any)
        .select('id,title,body,content_type,status,submitted_at,feedback')
        .eq('creator_user_id',user!.id).order('submitted_at',{ascending:false});
      if(error) throw error;
      return data as unknown as CreatorSubmission[];
    }
  });
  if(isPending) return <p role="status">Loading your submissions…</p>;
  if(error) return <div role="alert">Could not load your submissions. <button onClick={()=>refetch()}>Try again</button></div>;
  return <section aria-label="My submissions" className="space-y-4">
    <label className="block text-sm">Show <select className="ml-2 bg-background border border-border rounded-lg p-2" value={filter} onChange={e=>setFilter(e.target.value)}>
      <option value="all">All submissions</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
    </select></label>
    {!data.length && <p className="text-sm text-muted-foreground">Your submitted TXTs will appear here, including published and rejected pieces.</p>}
    {data.length > 0 && !data.some(s=>filter==='all'||s.status===filter) && <p>No submissions with this status.</p>}
    {data.filter(s=>filter==='all'||s.status===filter).map(s=><article key={s.id} className="rounded-2xl border border-border bg-card/50 p-5 space-y-3">
      <div className="text-xs text-muted-foreground">{labels[s.status]||s.status} · {new Date(s.submitted_at).toLocaleDateString('en-GB')}</div>
      <h2 className="font-display text-xl">{s.title}</h2>
      <details open={params.get('submission')===s.id || s.status==='revision_required'}>
        <summary className="cursor-pointer text-sm">View TXT and editor notes</summary>
        {s.feedback?.map((f,i)=><div key={i} className="my-4 border-l-2 border-foreground/40 pl-4">
          <h3 className="font-medium">Notes from editor</h3>
          <p className="text-xs text-muted-foreground">{labels[f.decision]||'Feedback'} · {new Date(f.sentAt).toLocaleDateString('en-GB')}</p>
          <p className="whitespace-pre-wrap text-sm mt-2">{f.notes}</p>
        </div>)}
        <p className="whitespace-pre-wrap text-sm leading-7 mt-4">{s.body}</p>
      </details>
      {s.status==='revision_required' && <button className="rounded-xl bg-foreground text-background px-4 py-2 text-sm" onClick={()=>navigate(`/create?revision=${s.id}`)}>Revise & resubmit</button>}
    </article>)}
  </section>;
}
