import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { syncLifetimeReadingTime } from '@/lib/documentDatabase';

export interface GamificationStats {
    currentStreak: number;
    longestStreak: number;
    booksRead: number;
    articlesRead: number;
    averageSessionMinutes: number;
    timeReadThisWeekSeconds: number;
    timeReadThisMonthSeconds: number;
    timeReadThisYearSeconds: number;
    totalReadingTimeSeconds: number;
    isLoading: boolean;
}

export function useGamification(userId?: string) {
    const [stats, setStats] = useState<GamificationStats>({
        currentStreak: 0,
        longestStreak: 0,
        booksRead: 0,
        articlesRead: 0,
        averageSessionMinutes: 0,
        timeReadThisWeekSeconds: 0,
        timeReadThisMonthSeconds: 0,
        timeReadThisYearSeconds: 0,
        totalReadingTimeSeconds: 0,
        isLoading: true,
    });
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        const handleUpdate = () => {
            console.log('[useGamification] Stats update detected, refreshing...');
            setRefreshTrigger(prev => prev + 1);
        };

        window.addEventListener('kin_stats_updated', handleUpdate);
        return () => window.removeEventListener('kin_stats_updated', handleUpdate);
    }, []);

    useEffect(() => {
        let mounted = true;

        async function fetchStats() {
            if (!userId) {
                if (mounted) setStats(s => ({ ...s, isLoading: false }));
                return;
            }

            try {
                // 1. Fetch exact streak stats from user_reading_stats (preserves correct streaks)
                const { data: userStats } = await supabase
                    .from('user_reading_stats')
                    .select('current_streak, longest_streak, lifetime_reading_seconds')
                    .eq('user_id', userId)
                    .maybeSingle();

                // 2. Fetch ALL documents to calculate exact reading times and book counts
                const { data: documents, error: docsError } = await supabase
                    .from('documents')
                    .select('total_reading_time, is_completed, file_type, source, title, word_count')
                    .eq('user_id', userId);

                if (docsError) throw docsError;

                let totalSecs = 0;
                let booksDone = 0;
                let articlesDone = 0;

                if (documents) {
                    documents.forEach(doc => {
                        totalSecs += (doc.total_reading_time || 0);

                        if (doc.is_completed) {
                            const isBook = doc.file_type === 'epub' || 
                                           doc.file_type === 'mobi' || 
                                           doc.source === 'ebook' || 
                                           (doc.word_count && doc.word_count > 8000) ||
                                           /\.(epub|mobi|azw)$/i.test(doc.title);
                            
                            if (isBook) booksDone++;
                            else articlesDone++;
                        }
                    });
                }

                // 3. Fetch recent reading sessions for localized analytics (weekly averages)
                const now = new Date();
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday as start
                startOfWeek.setHours(0, 0, 0, 0);

                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const startOfYear = new Date(now.getFullYear(), 0, 1);

                const { data: recentSessions } = await supabase
                    .from('reading_sessions')
                    .select('duration_seconds, created_at')
                    .eq('user_id', userId)
                    .gte('created_at', startOfYear.toISOString());

                let readYear = 0;
                let readMonth = 0;
                let readWeek = 0;
                let totalSessionDuration = 0;
                let sessionCount = 0;

                if (recentSessions) {
                    recentSessions.forEach((session: any) => {
                        const sessionDate = new Date(session.created_at);
                        const dur = session.duration_seconds || 0;
                        
                        readYear += dur;
                        if (sessionDate >= startOfMonth) readMonth += dur;
                        if (sessionDate >= startOfWeek) readWeek += dur;
                        
                        totalSessionDuration += dur;
                        sessionCount++;
                    });
                }

                const avgSessionSecs = sessionCount > 0 ? totalSessionDuration / sessionCount : 0;

                let finalCurrentStreak = (userStats as any)?.current_streak || 0;
                let finalLongestStreak = (userStats as any)?.longest_streak || 0;
                let lifetimeFromStats = (userStats as any)?.lifetime_reading_seconds || 0;

                // High-water mark: Total reading time should never go down.
                // We use the maximum of the stored lifetime value or the current sum of documents.
                let finalTotalSecs = Math.max(totalSecs, lifetimeFromStats);

                // If the sum of currently existing documents is higher than our stored lifetime 
                // (e.g. adding large new files or completing a session), sync the new high-water mark.
                if (totalSecs > lifetimeFromStats) {
                    void syncLifetimeReadingTime(userId, totalSecs);
                }

                if (mounted) {
                    setStats({
                        currentStreak: finalCurrentStreak,
                        longestStreak: finalLongestStreak,
                        booksRead: booksDone,
                        articlesRead: articlesDone,
                        averageSessionMinutes: Math.round(avgSessionSecs / 60),
                        timeReadThisWeekSeconds: readWeek,
                        timeReadThisMonthSeconds: readMonth,
                        timeReadThisYearSeconds: readYear,
                        totalReadingTimeSeconds: finalTotalSecs,
                        isLoading: false,
                    });
                }

            } catch (err) {
                console.error('[useGamification] Error fetching library stats:', err);
                if (mounted) setStats(s => ({ ...s, isLoading: false }));
            }
        }

        fetchStats();

        return () => {
            mounted = false;
        };
    }, [userId, refreshTrigger]);

    return stats;
}
