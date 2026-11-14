alter table public.creator_submissions drop constraint creator_submissions_status_check;
alter table public.creator_submissions add constraint creator_submissions_status_check check (status in ('pending','approved','rejected','revision_required'));
alter table public.creator_submissions add column feedback jsonb not null default '[]';
grant select (id,creator_user_id,title,body,content_type,word_count,status,submitted_at,reviewed_at,experience,feedback) on public.creator_submissions to authenticated;
create policy "Creators read own submission history" on public.creator_submissions for select to authenticated using ((select auth.uid()) = creator_user_id);
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in ('kin_request','kin_accepted','shared_item','pong_challenge','pong_accept','pong_ready','club_invitation','book_suggestion','creator_feedback'));
-- Restrictive policies prevent clients from impersonating the editor while
-- retaining the existing social-notification permissions.
create policy "Editorial notifications are server created" on public.notifications as restrictive for insert to authenticated with check (type <> 'creator_feedback');
create function public.protect_creator_notification() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if coalesce(auth.role(),'') <> 'service_role' and (old.type='creator_feedback' or new.type='creator_feedback') and (to_jsonb(old)-'is_read') is distinct from (to_jsonb(new)-'is_read') then
   raise exception 'Only the read status of editorial notifications can be changed.';
 end if;
 return new;
end $$;
create trigger protect_creator_notification before update on public.notifications for each row execute function public.protect_creator_notification();
-- Service-only, invoker-rights transaction. No browser can call this function.
create function public.complete_creator_review(p_id uuid,p_hash text,p_action text,p_notes text) returns jsonb language plpgsql security invoker set search_path = public as $$
declare s public.creator_submissions; new_status text; publication_id uuid;
begin
 select * into s from public.creator_submissions where id=p_id and approval_token_hash=p_hash and status='pending' for update;
 if not found then raise exception 'This review has already been completed.'; end if;
 if p_action not in ('approve','reject','request_revision') then raise exception 'Unknown review action'; end if;
 if p_action <> 'approve' and (length(trim(coalesce(p_notes,'')))=0 or length(p_notes)>10000) then raise exception 'Add notes for the creator (up to 10,000 characters).'; end if;
 new_status := case p_action when 'approve' then 'approved' when 'reject' then 'rejected' else 'revision_required' end;
 if p_action='approve' then
 insert into public.creator_publications(submission_id,creator_user_id,creator_name,content_type,title,body,word_count,experience) values(s.id,s.creator_user_id,s.creator_name,s.content_type,s.title,s.body,s.word_count,s.experience) returning id into publication_id;
 else
 insert into public.notifications(user_id,type,payload) values(s.creator_user_id,'creator_feedback',jsonb_build_object('submission_id',s.id,'title',s.title,'decision',new_status,'notes',trim(p_notes)));
 end if;
 update public.creator_submissions set status=new_status,approval_token_hash=null,reviewed_at=now(),feedback=case when p_action='approve' then feedback else feedback || jsonb_build_array(jsonb_build_object('notes',trim(p_notes),'decision',new_status,'sentAt',now())) end where id=s.id;
 return jsonb_build_object('success',true,'status',new_status,'publicationId',publication_id);
end $$;
revoke all on function public.complete_creator_review(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.complete_creator_review(uuid,text,text,text) to service_role;
