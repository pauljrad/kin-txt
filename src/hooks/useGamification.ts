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
                // 1. Fetch ALL documents for the "Library Grand Total"
                const { data: documents } = await supabase
                    .from('documents')
                    .select('total_reading_time, is_completed, file_type, source, title, word_count, updated_at')
                    .eq('user_id', userId);

                // 2. Fetch ALL granular sessions for the "Temporal Stats" (Week/Month/Year/Streak)
                // @ts-ignore
                const { data: sessions } = await supabase
                    .from('reading_sessions')
                    .select('duration_seconds, created_at')
                    .eq('user_id', userId);

                let libraryTotalSecs = 0;
                let booksDone = 0;
                let articlesDone = 0;

                if (documents) {
                    documents.forEach(doc => {
                        libraryTotalSecs += (doc.total_reading_time || 0);
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

                // Date Ranges for temporal attribution
                const now = new Date();
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);

                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const startOfYear = new Date(now.getFullYear(), 0, 1);

                let weekSecs = 0;
                let monthSecs = 0;
                let yearSecs = 0;
                let totalSessionSecs = 0;
                
                const activityDates = new Set<string>();

                if (sessions) {
                    sessions.forEach((session: any) => {
                        const dur = session.duration_seconds || 0;
                        const createdAt = new Date(session.created_at);
                        const dateStr = createdAt.toISOString().split('T')[0];

                        activityDates.add(dateStr);
                        
                        totalSessionSecs += dur;
                        if (createdAt >= startOfYear) yearSecs += dur;
                        if (createdAt >= startOfMonth) monthSecs += dur;
                        if (createdAt >= startOfWeek) weekSecs += dur;
                    });
                }

                // If sessions are empty (new system), we can supplement the streak with document updated_at 
                // to avoid showing 0 for old power users who haven't logged a new session yet.
                if (activityDates.size === 0 && documents) {
                    documents.forEach(doc => {
                        if (doc.updated_at) {
                            activityDates.add(new Date(doc.updated_at).toISOString().split('T')[0]);
                        }
                    });
                }

                // Streak Calculation
                const sortedDates = Array.from(activityDates).sort((a, b) => b.localeCompare(a));
                let streak = 0;
                if (sortedDates.length > 0) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    if (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) {
                        let currentPos = new Date(sortedDates[0]);
                        while (true) {
                            const dStr = currentPos.toISOString().split('T')[0];
                            if (activityDates.has(dStr)) {
                                streak++;
                                currentPos.setDate(currentPos.getDate() - 1);
                            } else {
                                break;
                            }
                        }
                    }
                }

                const avgSessionMins = sessions && sessions.length > 0 ? (totalSessionSecs / sessions.length) / 60 : 0;

                if (mounted) {
                    setStats({
                        currentStreak: streak,
                        longestStreak: streak,
                        booksRead: booksDone,
                        articlesRead: articlesDone,
                        averageSessionMinutes: Math.round(avgSessionMins),
                        timeReadThisWeekSeconds: weekSecs,
                        timeReadThisMonthSeconds: monthSecs,
                        timeReadThisYearSeconds: yearSecs,
                        totalReadingTimeSeconds: libraryTotalSecs, // THE LIBRARY TOTAL SOURCE
                        isLoading: false,
                    });
                }

            } catch (err) {
                console.error('[useGamification] Error fetching hybrid stats:', err);
                if (mounted) setStats(s => ({ ...s, isLoading: false }));
            }
        }

        fetchStats();
        return () => { mounted = false; };
    }, [userId]);

    return stats;
}
