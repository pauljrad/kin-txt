import { supabase } from '@/integrations/supabase/client';

export interface Club {
    id: string;
    name: string;
    description: string | null;
    created_by: string;
    created_at: string;
}

export interface ClubMembership {
    id: string;
    club_id: string;
    user_id: string;
    status: 'pending' | 'accepted' | 'declined';
    joined_at: string;
}

export interface ClubBookSuggestion {
    id: string;
    club_id: string;
    suggested_by: string;
    document_id: string;
    title: string;
    status: 'pending' | 'active' | 'completed';
    created_at: string;
}

export interface ClubMemberProgress {
    id: string;
    suggestion_id: string;
    user_id: string;
    document_id: string | null;
    status: 'invited' | 'accepted' | 'declined';
    progress: number;
    current_word_index: number;
    updated_at: string;
}

/**
 * Create a new reading club
 */
export async function createClub(
    name: string,
    description: string | null,
    memberIds: string[]
): Promise<{ club: Club | null; error: Error | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { club: null, error: new Error('User not authenticated') };
        }

        // Create the club
        const { data: club, error: clubError } = await supabase
            .from('kin_clubs' as any)
            .insert({
                name,
                description,
                created_by: user.id
            })
            .select()
            .single();

        if (clubError) throw clubError;

        // Add creator as accepted member
        await supabase.from('club_memberships' as any).insert({
            club_id: club.id,
            user_id: user.id,
            status: 'accepted'
        });

        // Invite other members
        if (memberIds.length > 0) {
            await inviteMembers(club.id, memberIds);
        }

        return { club, error: null };
    } catch (error) {
        console.error('Error creating club:', error);
        return { club: null, error: error as Error };
    }
}

/**
 * Invite members to a club
 */
export async function inviteMembers(
    clubId: string,
    userIds: string[]
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const memberships = userIds.map(userId => ({
            club_id: clubId,
            user_id: userId,
            status: 'pending'
        }));

        const { error } = await supabase
            .from('club_memberships' as any)
            .insert(memberships);

        if (error) throw error;

        // Create notifications for invited users
        const { data: { user } } = await supabase.auth.getUser();
        // Fetch club name for the payload (optimization)
        const { data: club } = await supabase
            .from('kin_clubs' as any)
            .select('name')
            .eq('id', clubId)
            .single();

        const notifications = userIds.map(userId => ({
            user_id: userId,
            type: 'club_invitation',
            payload: {
                club_id: clubId,
                sender_id: user?.id,
                club_name: (club as any)?.name
            }
        }));

        await supabase.from('notifications' as any).insert(notifications);



        return { success: true, error: null };
    } catch (error) {
        console.error('Error inviting members:', error);
        return { success: false, error: error as Error };
    }
}

/**
 * Accept or decline a club invitation
 */
export async function updateMembershipStatus(
    membershipId: string,
    status: 'accepted' | 'declined'
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { error } = await supabase
            .from('club_memberships' as any)
            .update({ status })
            .eq('id', membershipId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (error) {
        console.error('Error updating membership:', error);
        return { success: false, error: error as Error };
    }
}

/**
 * Get clubs for current user
 */
export async function getUserClubs(): Promise<{
    clubs: (Club & { membership_status: string })[];
    error: Error | null;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { clubs: [], error: new Error('User not authenticated') };
        }

        const { data, error } = await supabase
            .from('club_memberships' as any)
            .select(`
        status,
        kin_clubs (
          id,
          name,
          description,
          created_by,
          created_at
        )
      `)
            .eq('user_id', user.id);

        if (error) throw error;

        const clubs = data
            ?.filter(m => m.kin_clubs)
            .map(m => ({
                ...m.kin_clubs,
                membership_status: m.status
            })) || [];

        return { clubs, error: null };
    } catch (error) {
        console.error('Error getting user clubs:', error);
        return { clubs: [], error: error as Error };
    }
}

/**
 * Get club members
 */
export async function getClubMembers(clubId: string): Promise<{
    members: any[];
    error: Error | null;
}> {
    try {
        console.log('[getClubMembers] Starting query for clubId:', clubId);

        // First, get all memberships for this club
        const { data: memberships, error: membershipError } = await supabase
            .from('club_memberships' as any)
            .select('id, user_id, status, joined_at')
            .eq('club_id', clubId);

        console.log('[getClubMembers] Memberships query result:', { memberships, membershipError });

        if (membershipError) throw membershipError;
        if (!memberships || memberships.length === 0) {
            console.log('[getClubMembers] No memberships found');
            return { members: [], error: null };
        }

        // Then, get all profiles for these users
        const userIds = memberships.map((m: any) => m.user_id);
        console.log('[getClubMembers] Fetching profiles for userIds:', userIds);

        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, display_name, email, avatar_url')
            .in('id', userIds);

        console.log('[getClubMembers] Profiles query result:', { profiles, profileError });

        if (profileError) throw profileError;

        // Combine the data
        const members = memberships.map((membership: any) => ({
            ...membership,
            profiles: profiles?.find((p: any) => p.id === membership.user_id) || null
        }));

        console.log('[getClubMembers] Final combined members:', members);
        return { members, error: null };
    } catch (error) {
        console.error('[getClubMembers] Error getting club members:', error);
        return { members: [], error: error as Error };
    }
}

/**
 * Suggest a book for the club to read
 */
export async function suggestBook(
    clubId: string,
    documentId: string,
    title: string
): Promise<{ suggestion: ClubBookSuggestion | null; error: Error | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { suggestion: null, error: new Error('User not authenticated') };
        }

        // Create suggestion
        const { data: suggestion, error: suggestionError } = await supabase
            .from('club_book_suggestions' as any)
            .insert({
                club_id: clubId,
                suggested_by: user.id,
                document_id: documentId,
                title,
                status: 'pending'
            })
            .select()
            .single();

        if (suggestionError) throw suggestionError;

        // Get ALL accepted club members (including the suggester)
        const { data: members } = await supabase
            .from('club_memberships' as any)
            .select('user_id')
            .eq('club_id', clubId)
            .eq('status', 'accepted');

        if (members && members.length > 0) {
            // Create progress records for ALL members (including suggester)
            const progressRecords = members.map(m => ({
                suggestion_id: suggestion.id,
                user_id: m.user_id,
                status: m.user_id === user.id ? 'accepted' : 'invited',
                progress: 0,
                current_word_index: 0
            }));

            await supabase
                .from('club_member_progress' as any)
                .insert(progressRecords);

            // Send notifications to other members (not the suggester)
            const otherMembers = members.filter(m => m.user_id !== user.id);
            if (otherMembers.length > 0) {
                const notifications = otherMembers.map(m => ({
                    user_id: m.user_id,
                    type: 'book_suggestion',
                    payload: {
                        suggestion_id: suggestion.id,
                        club_id: clubId,
                        message: `A new book has been suggested for your club: ${title}`
                    }
                }));

                await supabase.from('notifications' as any).insert(notifications);
            }
        }

        return { suggestion, error: null };
    } catch (error) {
        console.error('Error suggesting book:', error);
        return { suggestion: null, error: error as Error };
    }
}

/**
 * Accept a book suggestion and clone it to user's library
 */
export async function acceptBookSuggestion(
    suggestionId: string
): Promise<{ document: any | null; error: Error | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { document: null, error: new Error('User not authenticated') };
        }

        // Get suggestion details
        const { data: suggestion, error: suggestionError } = await supabase
            .from('club_book_suggestions' as any)
            .select('document_id, title')
            .eq('id', suggestionId)
            .single();

        if (suggestionError) throw suggestionError;

        // Clone document to user's library
        const { data: sourceDoc, error: docError } = await supabase
            .from('documents' as any)
            .select('*')
            .eq('id', suggestion.document_id)
            .single();

        if (docError) throw docError;

        // Create new document for user
        const { data: newDoc, error: insertError } = await supabase
            .from('documents' as any)
            .insert({
                user_id: user.id,
                title: sourceDoc.title,
                content: sourceDoc.content,
                preview: sourceDoc.preview,
                word_count: sourceDoc.word_count,
                source: 'club_book',
                file_type: sourceDoc.file_type,
                current_word_index: 0,
                progress: 0
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // Update progress record
        await supabase
            .from('club_member_progress' as any)
            .update({
                status: 'accepted',
                document_id: newDoc.id
            })
            .eq('suggestion_id', suggestionId)
            .eq('user_id', user.id);

        return { document: newDoc, error: null };
    } catch (error) {
        console.error('Error accepting book suggestion:', error);
        return { document: null, error: error as Error };
    }
}

/**
 * Get club reading progress for all members
 */
export async function getClubProgress(
    clubId: string,
    suggestionId: string
): Promise<{ progress: any[]; error: Error | null }> {
    try {
        // First, get all progress records
        const { data: progressRecords, error: progressError } = await supabase
            .from('club_member_progress' as any)
            .select('id, user_id, status, progress, current_word_index, updated_at')
            .eq('suggestion_id', suggestionId);

        if (progressError) throw progressError;
        if (!progressRecords || progressRecords.length === 0) {
            return { progress: [], error: null };
        }

        // Then, get all profiles for these users
        const userIds = progressRecords.map((p: any) => p.user_id);
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', userIds);

        if (profileError) throw profileError;

        // Combine the data
        const progress = progressRecords.map((record: any) => ({
            ...record,
            profiles: profiles?.find((p: any) => p.id === record.user_id) || null
        }));

        return { progress, error: null };
    } catch (error) {
        console.error('Error getting club progress:', error);
        return { progress: [], error: error as Error };
    }
}

/**
 * Update member's reading progress
 */
export async function updateMemberProgress(
    suggestionId: string,
    progress: number,
    currentWordIndex: number
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: new Error('User not authenticated') };
        }

        const { error } = await supabase
            .from('club_member_progress' as any)
            .update({
                progress,
                current_word_index: currentWordIndex,
                updated_at: new Date().toISOString()
            })
            .eq('suggestion_id', suggestionId)
            .eq('user_id', user.id);

        if (error) throw error;
        return { success: true, error: null };
    } catch (error) {
        console.error('Error updating progress:', error);
        return { success: false, error: error as Error };
    }
}

/**
 * Get active book suggestion for a club
 */
export async function getActiveBookSuggestion(
    clubId: string
): Promise<{ suggestion: any | null; error: Error | null }> {
    try {
        console.log('[getActiveBookSuggestion] Querying for clubId:', clubId);

        // First, get the suggestion
        const { data: suggestion, error: suggestionError } = await supabase
            .from('club_book_suggestions' as any)
            .select('*')
            .eq('club_id', clubId)
            .in('status', ['pending', 'active'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        console.log('[getActiveBookSuggestion] Suggestion query result:', { suggestion, suggestionError });

        if (suggestionError) throw suggestionError;
        if (!suggestion) {
            console.log('[getActiveBookSuggestion] No active suggestion found');
            return { suggestion: null, error: null };
        }

        // Then, get the profile of the suggester
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', suggestion.suggested_by)
            .single();

        if (profileError) {
            console.warn('Could not fetch suggester profile:', profileError);
        }

        // Combine the data
        const enrichedSuggestion = {
            ...suggestion,
            profiles: profile || null
        };

        console.log('[getActiveBookSuggestion] Returning enriched suggestion:', enrichedSuggestion);
        return { suggestion: enrichedSuggestion, error: null };
    } catch (error) {
        console.error('[getActiveBookSuggestion] Error getting active suggestion:', error);
        return { suggestion: null, error: error as Error };
    }
}

/**
 * Leave a club
 * If the user is the last member, delete the club and all related data
 */
export async function leaveClub(clubId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: new Error('User not authenticated') };
        }

        // Remove the user's membership
        const { error: deleteError } = await supabase
            .from('club_memberships' as any)
            .delete()
            .eq('club_id', clubId)
            .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        // Check if there are any remaining members
        const { data: remainingMembers, error: countError } = await supabase
            .from('club_memberships' as any)
            .select('id')
            .eq('club_id', clubId);

        if (countError) throw countError;

        // If no members left, delete the club and all related data
        if (!remainingMembers || remainingMembers.length === 0) {
            // Delete club book suggestions
            await supabase
                .from('club_book_suggestions' as any)
                .delete()
                .eq('club_id', clubId);

            // Delete club member progress
            await supabase
                .from('club_member_progress' as any)
                .delete()
                .eq('club_id', clubId);

            // Delete the club itself
            await supabase
                .from('kin_clubs' as any)
                .delete()
                .eq('id', clubId);
        }

        return { success: true, error: null };
    } catch (error) {
        console.error('Error leaving club:', error);
        return { success: false, error: error as Error };
    }
}

/**
 * Update club reading progress for a document
 * Call this when a user makes progress reading a club book
 */
export async function updateClubProgress(
    documentId: string,
    currentWordIndex: number,
    totalWords: number
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: new Error('User not authenticated') };
        }

        console.log('[updateClubProgress] Checking for club book:', { documentId, currentWordIndex, totalWords });

        // Find active suggestion for this document
        const { data: suggestion, error: suggestionError } = await supabase
            .from('club_book_suggestions' as any)
            .select('id, club_id, title')
            .eq('document_id', documentId)
            .in('status', ['pending', 'active'])
            .maybeSingle();

        console.log('[updateClubProgress] Suggestion query result:', { suggestion, suggestionError });

        if (suggestionError) throw suggestionError;

        if (!suggestion) {
            // Not a club book, skip
            console.log('[updateClubProgress] Not a club book, skipping');
            return { success: true, error: null };
        }

        // Calculate progress percentage
        const progress = totalWords > 0 ? Math.round((currentWordIndex / totalWords) * 100) : 0;

        console.log('[updateClubProgress] Updating progress:', { suggestionId: suggestion.id, userId: user.id, progress, currentWordIndex });

        // Update or create progress record
        const { error: updateError } = await supabase
            .from('club_member_progress' as any)
            .upsert({
                suggestion_id: suggestion.id,
                user_id: user.id,
                progress,
                current_word_index: currentWordIndex,
                status: 'reading'
            }, {
                onConflict: 'suggestion_id,user_id'
            });

        if (updateError) {
            console.error('[updateClubProgress] Update error:', updateError);
            throw updateError;
        }

        console.log('[updateClubProgress] Successfully updated club progress');
        return { success: true, error: null };
    } catch (error) {
        console.error('Error updating club progress:', error);
        return { success: false, error: error as Error };
    }
}
