import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getInitials, getAvatarColor } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Flame, Clock } from "lucide-react";
import { useGamification } from "@/hooks/useGamification";
import { ReadingTimeBadge, AvatarLapel } from "./ReadingTimeBadge";

interface UserProfileProps {
    userId: string;
}

interface Profile {
    display_name: string | null;
    avatar_url: string | null;
    avatar_color: string | null;
    created_at: string;
}

interface ReadingHistory {
    id: string;
    title: string;
    completed_at: string | null;
    is_completed: boolean;
    updated_at: string;
}

export const UserProfile = ({ userId }: UserProfileProps) => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [history, setHistory] = useState<ReadingHistory[]>([]);
    const { toast } = useToast();
    const gamification = useGamification(userId);

    const [stats, setStats] = useState({ total: 0, byType: { article: 0, ebook: 0, document: 0, link: 0 } });

    useEffect(() => {
        const fetchProfile = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            if (data) setProfile(data as any);
        };

        const fetchHistory = async () => {
            const { data, error } = await supabase
                .from('documents')
                .select('id, title, completed_at, is_completed, updated_at, source, word_count')
                .eq('user_id', userId);

            if (error) {
                console.error("Error fetching history:", error);
                return;
            }

            if (data) {
                // Calculate Stats
                const completed = data.filter(d => d.is_completed);

                const statsByType = {
                    article: 0,
                    ebook: 0,
                    document: 0,
                    link: 0
                };

                completed.forEach(d => {
                    const s = (d.source || '').toLowerCase();
                    const words = d.word_count || 0;

                    // Logic: Ebooks are explicit 'ebook' source OR documents > 15k words
                    if (['ebook', 'epub', 'club_book', 'book'].includes(s) || (['document', 'text', 'txt', 'file', 'paste'].includes(s) && words > 15000)) {
                        statsByType.ebook++;
                    } else if (['article', 'web'].includes(s)) {
                        statsByType.article++;
                    } else if (['document', 'text', 'txt', 'file', 'paste'].includes(s)) {
                        statsByType.document++;
                    } else if (['link', 'url'].includes(s)) {
                        statsByType.link++;
                    } else {
                        // Fallback for unclassified sources, put into 'link'
                        statsByType.link++;
                    }
                });

                setStats({
                    total: completed.length,
                    byType: statsByType
                });

                // Set History Lists
                // Sort by update time for both
                const sorted = data.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                setHistory(sorted as any);
            }
        };

        fetchProfile();
        fetchHistory();
    }, [userId, toast]);

    if (!profile) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Profile...</div>;

    const reading = history.filter(doc => !doc.is_completed).slice(0, 3); // Limit to 3 recent
    const finished = history.filter(doc => doc.is_completed);

    return (
        <div className="flex flex-col gap-5 w-full h-full max-h-[60vh] overflow-hidden">
            {/* Header: Horizontal Layout */}
            <div className="flex items-start gap-4 shrink-0 w-full pr-10 sm:pr-0">
                <div className="relative shrink-0">
                    <Avatar className="h-16 w-16 border-2 border-border shadow-sm">
                        <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
                        <AvatarFallback
                            className="text-2xl font-bold"
                            style={{ backgroundColor: getAvatarColor((profile as any).id, profile.avatar_color), color: '#000' }}
                        >
                            {getInitials(profile.display_name)}
                        </AvatarFallback>
                    </Avatar>
                    <AvatarLapel totalReadingTimeSeconds={gamification.totalReadingTimeSeconds} size={16} />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center pt-1">
                    <h3 className="text-lg font-display font-bold leading-tight mb-1 tracking-tight break-words pr-2">{profile.display_name}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium truncate">
                        K<span className="lowercase font-sans text-[10px] relative -top-[0.5px]">i</span>N since {new Date(profile.created_at).getFullYear()}
                    </p>
                </div>

                <div className="text-center pl-2 shrink-0 pt-1 min-w-[3rem]">
                    <span className="block text-3xl font-display font-bold text-primary leading-none">{stats.total}</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Read</span>
                </div>
            </div>

            {/* Stats Bar & Gamification */}
            <div className="flex flex-col gap-2 shrink-0 w-full mb-1">
                <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex flex-col items-center justify-center text-center">
                        <Flame className="h-4 w-4 text-orange-500 mb-1 opacity-90 drop-shadow-md" />
                        <span className="text-xl font-display text-foreground leading-none mb-1">{gamification.currentStreak}</span>
                        <span className="text-[8px] text-muted-foreground uppercase tracking-widest font-bold">Day Streak</span>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/10 border border-border/20 flex flex-col items-center justify-center text-center">
                        <Clock className="h-4 w-4 text-primary mb-1 opacity-70" />
                        <span className="text-xl font-display text-foreground leading-none mb-1">{Math.floor(gamification.totalReadingTimeSeconds / 60)}</span>
                        <span className="text-[8px] text-muted-foreground uppercase tracking-widest font-bold">Total Mins</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {[
                        { label: 'Articles', count: gamification.articlesRead },
                        { label: 'Books', count: gamification.booksRead },
                        { label: 'KiNs', count: stats.total },
                    ].map(stat => (
                        <div key={stat.label} className="bg-secondary/20 rounded-lg py-2 px-1 text-center border border-transparent hover:border-border/40 transition-colors">
                            <span className="block text-sm font-bold">{stat.count}</span>
                            <span className="text-[8px] uppercase tracking-wider text-muted-foreground opacity-70">{stat.label}</span>
                        </div>
                    ))}
                </div>

                {/* Reading Time Badges */}
                <ReadingTimeBadge totalReadingTimeSeconds={gamification.totalReadingTimeSeconds} />
            </div>

            <Separator className="bg-border/40 shrink-0" />

            <div className="space-y-5 overflow-y-auto pr-1">
                {/* Currently Reading */}
                <div>
                    <h4 className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-pulse shadow-[0_0_8px_rgba(255,214,0,0.5)]" />
                        Reading Now
                    </h4>
                    <div className="space-y-1.5">
                        {reading.length > 0 ? (
                            reading.map(doc => (
                                <div key={doc.id} className="text-sm p-3 rounded-lg bg-secondary/30 border border-border/40 group hover:border-primary/30 transition-colors">
                                    <p className="text-foreground font-medium leading-tight break-words">{doc.title}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1.5">
                                        Last read {new Date(doc.updated_at).toLocaleDateString()}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="text-xs text-muted-foreground/50 italic px-2 py-1">
                                Not reading anything currently.
                            </div>
                        )}
                    </div>
                </div>

                {/* Recently Finished */}
                <div>
                    <h4 className="text-[10px] font-bold text-muted-foreground/70 mb-2.5 uppercase tracking-widest pl-0.5">History</h4>
                    <div className="space-y-1">
                        {finished.length > 0 ? (
                            finished.map(doc => (
                                <div key={doc.id} className="flex items-start justify-between text-xs p-2 rounded-md hover:bg-secondary/40 transition-colors group cursor-default">
                                    <p className="text-foreground/80 flex-1 min-w-0 pr-3 group-hover:text-primary transition-colors break-words leading-tight">{doc.title}</p>
                                    <span className="text-[9px] text-muted-foreground/60 whitespace-nowrap tabular-nums mt-0.5 shrink-0">
                                        {doc.completed_at ? new Date(doc.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-'}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-muted-foreground italic p-1">No reading history yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
