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
                // Fetch ALL documents to calculate everything from the Library source
                const { data: documents, error } = await supabase
                    .from('documents')
                    .select('total_reading_time, updated_at, is_completed, file_type, source, title, word_count')
                    .eq('user_id', userId);

                if (error) throw error;

                if (!documents || documents.length === 0) {
                    if (mounted) setStats(s => ({ ...s, isLoading: false }));
                    return;
                }

                let totalSecs = 0;
                let booksDone = 0;
                let articlesDone = 0;
                const activityDates = new Set<string>();

                documents.forEach(doc => {
                    totalSecs += (doc.total_reading_time || 0);

                    // Activity Tracking for streaks (using document updates)
                    if (doc.updated_at) {
                        activityDates.add(new Date(doc.updated_at).toISOString().split('T')[0]);
                    }

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

                // Streak Calculation Logic
                const sortedDates = Array.from(activityDates).sort((a, b) => b.localeCompare(a));
                let streak = 0;
                
                if (sortedDates.length > 0) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    // Standard streak: must have read today or yesterday to continue
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

                if (mounted) {
                    setStats({
                        currentStreak: streak,
                        longestStreak: streak,
                        booksRead: booksDone,
                        articlesRead: articlesDone,
                        averageSessionMinutes: 0,
                        timeReadThisWeekSeconds: 0,
                        timeReadThisMonthSeconds: 0,
                        timeReadThisYearSeconds: 0,
                        totalReadingTimeSeconds: totalSecs,
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
    }, [userId]);

    return stats;
}
