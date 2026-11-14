alter table public.creator_publications add column deleted_at timestamptz;
alter policy "Published Creator TXTs are readable" on public.creator_publications using (published_at is not null and deleted_at is null);
alter table public.creator_submissions drop constraint creator_submissions_status_check;
alter table public.creator_submissions add constraint creator_submissions_status_check check(status in ('pending','approved','rejected','revision_required','deleted'));
alter table public.creator_submissions add column publication_email_status text not null default 'not_sent' check(publication_email_status in ('not_sent','sent','failed'));
alter table public.creator_submissions add column publication_email_error text;
CREATE OR REPLACE FUNCTION public.complete_creator_review(p_id uuid, p_hash text, p_action text, p_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare s public.creator_submissions; new_status text; publication_id uuid;
begin
 select * into s from public.creator_submissions where id=p_id and approval_token_hash=p_hash and status='pending' for update;
 if not found then raise exception 'This review has already been completed.'; end if;
 if p_action not in ('approve','reject','request_revision') then raise exception 'Unknown review action'; end if;
 if p_action <> 'approve' and (length(trim(coalesce(p_notes,'')))=0 or length(p_notes)>10000) then raise exception 'Add notes for the creator (up to 10,000 characters).'; end if;
 new_status := case p_action when 'approve' then 'approved' when 'reject' then 'rejected' else 'revision_required' end;
 if p_action='approve' then
 insert into public.creator_publications(submission_id,creator_user_id,creator_name,content_type,title,body,word_count,experience) values(s.id,s.creator_user_id,s.creator_name,s.content_type,s.title,s.body,s.word_count,s.experience) returning id into publication_id;
 insert into public.notifications(user_id,type,payload) values(s.creator_user_id,'creator_feedback',jsonb_build_object('submission_id',s.id,'title',s.title,'decision','approved','publication_id',publication_id));
 else
 insert into public.notifications(user_id,type,payload) values(s.creator_user_id,'creator_feedback',jsonb_build_object('submission_id',s.id,'title',s.title,'decision',new_status,'notes',trim(p_notes)));
 end if;
 update public.creator_submissions set status=new_status,approval_token_hash=null,reviewed_at=now(),feedback=case when p_action='approve' then feedback else feedback || jsonb_build_array(jsonb_build_object('notes',trim(p_notes),'decision',new_status,'sentAt',now())) end where id=s.id;
 return jsonb_build_object('success',true,'status',new_status,'publicationId',publication_id);
end $function$

;
create function public.remove_creator_publication(p_submission uuid,p_creator uuid) returns void language plpgsql security invoker set search_path = public as $$
declare s public.creator_submissions;
begin
select * into s from public.creator_submissions where id=p_submission and creator_user_id=p_creator for update;
if not found then raise exception 'Submission not found'; end if;
if s.status='deleted' then return; end if;
if s.status<>'approved' then raise exception 'This TXT is not published';end if;
update public.creator_publications set deleted_at=now() where submission_id=s.id and creator_user_id=p_creator and deleted_at is null;
if not found then raise exception 'Publication not found';end if;
update public.creator_submissions set status='deleted' where id=s.id;
end $$;
revoke all on function public.remove_creator_publication(uuid,uuid) from public,anon,authenticated;
grant execute on function public.remove_creator_publication(uuid,uuid) to service_role;