# Force Netlify Rebuild

This file is updated to trigger a Netlify deployment.
Last updated: 2026-01-29 10:57:00 UTC

The following critical changes need to be deployed:
- Rewritten getActiveBookSuggestion to avoid foreign key joins
- Rewritten getClubProgress to avoid foreign key joins  
- Rewritten getClubMembers to avoid foreign key joins
- RLS policies opened for club_book_suggestions and club_member_progress
