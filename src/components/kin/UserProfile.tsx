import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getInitials } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface UserProfileProps {
    userId: string;
}

interface Profile {
    display_name: string | null;
    avatar_url: string | null;
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

    const [stats, setStats] = useState({ total: 0, byType: { article: 0, ebook: 0, document: 0, link: 0 } });

    useEffect(() => {
        const fetchProfile = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            if (data) setProfile(data);
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
                    if (['ebook', 'epub', 'club_book', 'book'].includes(s) || (['document', 'text', 'txt', 'file'].includes(s) && words > 15000)) {
                        statsByType.ebook++;
                    } else if (['article', 'web'].includes(s)) {
                        statsByType.article++;
                    } else if (['document', 'text', 'txt', 'file'].includes(s)) {
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
        <div className="flex flex-col gap-5">
            {/* Header: Horizontal Layout */}
            <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-border shadow-sm">
                    <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
                        {getInitials(profile.display_name)}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-display font-bold leading-none mb-1.5 tracking-tight">{profile.display_name}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                        K<span className="lowercase font-sans text-[10px] relative -top-[0.5px]">i</span>N since {new Date(profile.created_at).getFullYear()}
                    </p>
                </div>

                <div className="text-right px-2">
                    <span className="block text-3xl font-display font-bold text-primary leading-none">{stats.total}</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Read</span>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-2">
                {[
                    { label: 'Arts', count: stats.byType.article },
                    { label: 'Books', count: stats.byType.ebook },
                    { label: 'Docs', count: stats.byType.document },
                    { label: 'Links', count: stats.byType.link }
                ].map(stat => (
                    <div key={stat.label} className="bg-secondary/20 rounded-lg py-2 px-1 text-center border border-transparent hover:border-border/40 transition-colors">
                        <span className="block text-sm font-bold">{stat.count}</span>
                        <span className="text-[8px] uppercase tracking-wider text-muted-foreground opacity-70">{stat.label}</span>
                    </div>
                ))}
            </div>

            <Separator className="bg-border/40" />

            <div className="space-y-5">
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
                                    <p className="text-foreground font-medium truncate leading-tight">{doc.title}</p>
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
                    <ScrollArea className="h-32 pr-3 -mr-2">
                        <div className="space-y-1">
                            {finished.length > 0 ? (
                                finished.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between text-xs p-2 rounded-md hover:bg-secondary/40 transition-colors group cursor-default">
                                        <p className="text-foreground/80 truncate flex-1 min-w-0 pr-3 group-hover:text-primary transition-colors">{doc.title}</p>
                                        <span className="text-[9px] text-muted-foreground/60 whitespace-nowrap tabular-nums">
                                            {doc.completed_at ? new Date(doc.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-'}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground italic p-1">No reading history yet.</p>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
};
