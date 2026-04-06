import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GamificationStats {
    currentStreak: number;
    longestStreak: number;
    booksRead: number;
    articlesRead: number;
    averageSessionMinutes: number; // Keeping for interface stability but could be 0
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
                // Fetch ALL documents for this user to calculate everything from one source
                const { data: documents, error } = await supabase
                    .from('documents')
                    .select('total_reading_time, updated_at, completed_at, is_completed, file_type, source, title, word_count')
                    .eq('user_id', userId);

                if (error) throw error;

                if (!documents || documents.length === 0) {
                    if (mounted) setStats(s => ({ ...s, isLoading: false }));
                    return;
                }

                // Date Ranges
                const now = new Date();
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);

                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const startOfYear = new Date(now.getFullYear(), 0, 1);

                let totalSecs = 0;
                let booksDone = 0;
                let articlesDone = 0;
                let weekSecs = 0;
                let monthSecs = 0;
                let yearSecs = 0;

                // For Streak calculation
                const activityDates = new Set<string>();

                documents.forEach(doc => {
                    const time = doc.total_reading_time || 0;
                    totalSecs += time;

                    // Activity Tracking (for streaks)
                    if (doc.updated_at) {
                        activityDates.add(new Date(doc.updated_at).toISOString().split('T')[0]);
                    }
                    if (doc.completed_at) {
                        activityDates.add(new Date(doc.completed_at).toISOString().split('T')[0]);
                    }

                    // Categorization and Finished stats
                    if (doc.is_completed) {
                        const isBook = doc.file_type === 'epub' || 
                                       doc.file_type === 'mobi' || 
                                       doc.source === 'ebook' || 
                                       (doc.word_count && doc.word_count > 8000) ||
                                       /\.(epub|mobi|azw)$/i.test(doc.title);
                        
                        if (isBook) booksDone++;
                        else articlesDone++;

                        // Attribution logic: If finished in this period, count its total time for that period
                        if (doc.completed_at) {
                            const completedDate = new Date(doc.completed_at);
                            if (completedDate >= startOfYear) yearSecs += time;
                            if (completedDate >= startOfMonth) monthSecs += time;
                            if (completedDate >= startOfWeek) weekSecs += time;
                        }
                    }
                });

                // Streak Calculation Logic
                const sortedDates = Array.from(activityDates).sort((a, b) => b.localeCompare(a));
                let streak = 0;
                
                if (sortedDates.length > 0) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    let checkDate = (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) 
                                    ? sortedDates[0] 
                                    : null;

                    if (checkDate) {
                        let currentPos = new Date(checkDate);
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

                if (mounted) {
                    setStats({
                        currentStreak: streak,
                        longestStreak: streak, // Simple approximation for now
                        booksRead: booksDone,
                        articlesRead: articlesDone,
                        averageSessionMinutes: 0,
                        timeReadThisWeekSeconds: weekSecs,
                        timeReadThisMonthSeconds: monthSecs,
                        timeReadThisYearSeconds: yearSecs,
                        totalReadingTimeSeconds: totalSecs,
                        isLoading: false,
                    });
                }

            } catch (err) {
                console.error('[useGamification] Error fetching document-based stats:', err);
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
