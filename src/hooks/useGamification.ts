import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

    useEffect(() => {
        let mounted = true;

        async function fetchStats() {
            if (!userId) {
                if (mounted) setStats(s => ({ ...s, isLoading: false }));
                return;
            }

            try {
                // 1. Fetch exact high-level stats (streaks & total time)
                // @ts-ignore
                const { data: userStats } = await supabase
                    .from('user_reading_stats')
                    .select('*')
                    .eq('user_id', userId)
                    .maybeSingle();

                // 2. Fetch completed documents for Books vs Articles count
                const { data: documents } = await supabase
                    .from('documents')
                    .select('file_type, source, is_completed, title, word_count')
                    .eq('user_id', userId)
                    .eq('is_completed', true);

                let booksRead = 0;
                let articlesRead = 0;

                if (documents) {
                    documents.forEach(doc => {
                        const isBook = doc.file_type === 'epub' || 
                                       doc.file_type === 'mobi' || 
                                       doc.source === 'ebook' || 
                                       (doc.word_count && doc.word_count > 8000) ||
                                       /\.(epub|mobi|azw)$/i.test(doc.title);
                        if (isBook) booksRead++;
                        else articlesRead++;
                    });
                }

                // 3. Fetch reading session time windows directly
                const now = new Date();
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday as start
                startOfWeek.setHours(0, 0, 0, 0);

                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const startOfYear = new Date(now.getFullYear(), 0, 1);

                // @ts-ignore
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
                        const dur = session.duration_seconds;
                        
                        readYear += dur;
                        if (sessionDate >= startOfMonth) readMonth += dur;
                        if (sessionDate >= startOfWeek) readWeek += dur;
                        
                        totalSessionDuration += dur;
                        sessionCount++;
                    });
                }

                const avgSessionSecs = sessionCount > 0 ? totalSessionDuration / sessionCount : 0;

                if (mounted) {
                    setStats({
                        currentStreak: (userStats as any)?.current_streak || 0,
                        longestStreak: (userStats as any)?.longest_streak || 0,
                        booksRead,
                        articlesRead,
                        averageSessionMinutes: Math.round(avgSessionSecs / 60),
                        timeReadThisWeekSeconds: readWeek,
                        timeReadThisMonthSeconds: readMonth,
                        timeReadThisYearSeconds: readYear,
                        totalReadingTimeSeconds: (userStats as any)?.total_reading_time_seconds || 0,
                        isLoading: false,
                    });
                }

            } catch (err) {
                console.error('[useGamification] Error fetching stats:', err);
                if (mounted) setStats(s => ({ ...s, isLoading: false }));
            }
        }

        fetchStats();

        return () => {
            mounted = false;
        };
    }, [userId]);

    return stats;
}
